import type { SupabaseClient } from '@supabase/supabase-js';

import type { ContentRepository, RepositoryRequestOptions } from './content.repository';
import { orderEntitiesByIds, uniqueIdsInOrder } from './content-ordering';
import { getSupabaseClient } from './supabase-client';
import {
  mapExperimentRow,
  mapGameObjectiveRow,
  mapGameRow,
  mapGradeRow,
  mapLessonRow,
  mapObjectiveRow,
  mapQuestionRow,
  mapSemesterRow,
  mapSubjectRow,
  mapUnitRow,
} from './supabase-content.mappers';
import type {
  ExperimentRow,
  GameObjectiveRow,
  GameRow,
  GradeRow,
  LessonRow,
  ObjectiveRow,
  QuestionRow,
  SemesterRow,
  SubjectRow,
  UnitRow,
} from './supabase-content.rows';

type QueryResponse<T> = PromiseLike<{ data: T | null; error: unknown }>;

type QueryBuilder = {
  select(columns: string): QueryBuilder;
  eq(column: string, value: unknown): QueryBuilder;
  in(column: string, values: readonly unknown[]): QueryBuilder;
  order(column: string, options?: { ascending?: boolean }): QueryBuilder;
  limit(count: number): QueryBuilder;
  abortSignal(signal: AbortSignal): QueryBuilder;
};

const COLUMNS = {
  grades: 'id,name,display_order',
  semesters: 'id,grade_id,name,display_order',
  subjects: 'id,grade_id,name,theme_color',
  units: 'id,subject_id,semester_id,title,display_order',
  lessons:
    'id,unit_id,title,display_order,summary,key_concepts,examples,misconceptions,status,source',
  objectives: 'id,lesson_id,text',
  questions:
    'id,lesson_id,purpose,type,prompt,choices,correct_answer_index,explanation,objective_id,difficulty,status,source',
  games: 'id,lesson_id,type,title,instructions,items,status,source',
  experiments:
    'id,lesson_id,title,objective,tools,steps,safety_notes,safety_level,observation_prompt,conclusion_prompt,home_alternative,status,source',
  gameObjectives: 'game_id,objective_id,position',
} as const;

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}

function formatSupabaseError(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return error.message;
  }

  return String(error);
}

async function executeQuery<T>(operation: string, query: QueryResponse<T>): Promise<T> {
  try {
    const { data, error } = await query;

    if (error) {
      if (isAbortError(error)) {
        throw error;
      }

      throw new Error(`${operation}: ${formatSupabaseError(error)}`, {
        cause: error,
      });
    }

    if (data === null) {
      throw new Error(`${operation}: returned no data`);
    }

    return data;
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    if (error instanceof Error && error.message.startsWith(`${operation}:`)) {
      throw error;
    }

    throw new Error(`${operation}: ${formatSupabaseError(error)}`, {
      cause: error,
    });
  }
}

function queryFrom(client: SupabaseClient, table: string): QueryBuilder {
  return client.from(table) as unknown as QueryBuilder;
}

function withAbortSignal(query: QueryBuilder, options?: RepositoryRequestOptions): QueryBuilder {
  options?.signal?.throwIfAborted();
  return options?.signal ? query.abortSignal(options.signal) : query;
}

function groupObjectiveIdsByLesson(rows: readonly ObjectiveRow[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  for (const row of rows) {
    const ids = grouped.get(row.lesson_id) ?? [];
    ids.push(row.id);
    grouped.set(row.lesson_id, ids);
  }

  return grouped;
}

function groupObjectiveIdsByGame(rows: readonly GameObjectiveRow[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();

  for (const rawRow of rows) {
    const row = mapGameObjectiveRow(rawRow);
    const ids = grouped.get(row.game_id) ?? [];
    ids.push(row.objective_id);
    grouped.set(row.game_id, ids);
  }

  return grouped;
}

export function createSupabaseContentRepository(
  client: SupabaseClient = getSupabaseClient()
): ContentRepository {
  return {
    async getGrades(options) {
      const query = withAbortSignal(
        queryFrom(client, 'grades').select(COLUMNS.grades).order('display_order'),
        options
      );
      const rows = await executeQuery<GradeRow[]>(
        'getGrades',
        query as unknown as QueryResponse<GradeRow[]>
      );
      return rows.map(mapGradeRow);
    },

    async getSemestersByGrade(gradeId, options) {
      const query = withAbortSignal(
        queryFrom(client, 'semesters')
          .select(COLUMNS.semesters)
          .eq('grade_id', gradeId)
          .order('display_order'),
        options
      );
      const rows = await executeQuery<SemesterRow[]>(
        'getSemestersByGrade',
        query as unknown as QueryResponse<SemesterRow[]>
      );
      return rows.map(mapSemesterRow);
    },

    async getSubjectsBySemester(semesterId, options) {
      const unitQuery = withAbortSignal(
        queryFrom(client, 'units')
          .select('subject_id')
          .eq('semester_id', semesterId)
          .order('display_order'),
        options
      );
      const unitRows = await executeQuery<Array<Pick<UnitRow, 'subject_id'>>>(
        'getSubjectsBySemester:units',
        unitQuery as unknown as QueryResponse<Array<Pick<UnitRow, 'subject_id'>>>
      );
      const subjectIds = uniqueIdsInOrder(unitRows.map((row) => row.subject_id));

      if (subjectIds.length === 0) {
        return [];
      }

      const subjectQuery = withAbortSignal(
        queryFrom(client, 'subjects').select(COLUMNS.subjects).in('id', subjectIds),
        options
      );
      const rows = await executeQuery<SubjectRow[]>(
        'getSubjectsBySemester:subjects',
        subjectQuery as unknown as QueryResponse<SubjectRow[]>
      );
      return orderEntitiesByIds(rows.map(mapSubjectRow), subjectIds);
    },

    async getUnitsBySubjectAndSemester(subjectId, semesterId, options) {
      const query = withAbortSignal(
        queryFrom(client, 'units')
          .select(COLUMNS.units)
          .eq('subject_id', subjectId)
          .eq('semester_id', semesterId)
          .order('display_order'),
        options
      );
      const rows = await executeQuery<UnitRow[]>(
        'getUnitsBySubjectAndSemester',
        query as unknown as QueryResponse<UnitRow[]>
      );
      return rows.map(mapUnitRow);
    },

    async getUnitsBySubject(subjectId, options) {
      const query = withAbortSignal(
        queryFrom(client, 'units')
          .select(COLUMNS.units)
          .eq('subject_id', subjectId)
          .order('display_order'),
        options
      );
      const rows = await executeQuery<UnitRow[]>(
        'getUnitsBySubject',
        query as unknown as QueryResponse<UnitRow[]>
      );
      return rows.map(mapUnitRow);
    },

    async getLessonsByUnit(unitId, options) {
      const lessonQuery = withAbortSignal(
        queryFrom(client, 'lessons')
          .select(COLUMNS.lessons)
          .eq('unit_id', unitId)
          .order('display_order'),
        options
      );
      const lessons = await executeQuery<LessonRow[]>(
        'getLessonsByUnit:lessons',
        lessonQuery as unknown as QueryResponse<LessonRow[]>
      );

      if (lessons.length === 0) {
        return [];
      }

      const lessonIds = lessons.map((lesson) => lesson.id);
      const objectiveQuery = withAbortSignal(
        queryFrom(client, 'objectives')
          .select(COLUMNS.objectives)
          .in('lesson_id', lessonIds)
          .order('lesson_id')
          .order('id'),
        options
      );
      const objectives = await executeQuery<ObjectiveRow[]>(
        'getLessonsByUnit:objectives',
        objectiveQuery as unknown as QueryResponse<ObjectiveRow[]>
      );
      const objectiveIdsByLesson = groupObjectiveIdsByLesson(objectives);

      return lessons.map((lesson) =>
        mapLessonRow(lesson, objectiveIdsByLesson.get(lesson.id) ?? [])
      );
    },

    async getLessonById(lessonId, options) {
      const lessonQuery = withAbortSignal(
        queryFrom(client, 'lessons').select(COLUMNS.lessons).eq('id', lessonId).limit(1),
        options
      );
      const lessons = await executeQuery<LessonRow[]>(
        'getLessonById:lesson',
        lessonQuery as unknown as QueryResponse<LessonRow[]>
      );
      const lesson = lessons[0];

      if (!lesson) {
        return undefined;
      }

      const objectiveQuery = withAbortSignal(
        queryFrom(client, 'objectives')
          .select(COLUMNS.objectives)
          .eq('lesson_id', lessonId)
          .order('id'),
        options
      );
      const objectives = await executeQuery<ObjectiveRow[]>(
        'getLessonById:objectives',
        objectiveQuery as unknown as QueryResponse<ObjectiveRow[]>
      );
      return mapLessonRow(
        lesson,
        objectives.map((objective) => objective.id)
      );
    },

    async getObjectivesByLesson(lessonId, options) {
      const query = withAbortSignal(
        queryFrom(client, 'objectives')
          .select(COLUMNS.objectives)
          .eq('lesson_id', lessonId)
          .order('id'),
        options
      );
      const rows = await executeQuery<ObjectiveRow[]>(
        'getObjectivesByLesson',
        query as unknown as QueryResponse<ObjectiveRow[]>
      );
      return rows.map(mapObjectiveRow);
    },

    async getObjectivesByIds(objectiveIds, options) {
      options?.signal?.throwIfAborted();

      if (objectiveIds.length === 0) {
        return [];
      }

      const query = withAbortSignal(
        queryFrom(client, 'objectives').select(COLUMNS.objectives).in('id', objectiveIds),
        options
      );
      const rows = await executeQuery<ObjectiveRow[]>(
        'getObjectivesByIds',
        query as unknown as QueryResponse<ObjectiveRow[]>
      );
      return orderEntitiesByIds(rows.map(mapObjectiveRow), objectiveIds);
    },

    async getExperimentsByLesson(lessonId, options) {
      const query = withAbortSignal(
        queryFrom(client, 'experiments')
          .select(COLUMNS.experiments)
          .eq('lesson_id', lessonId)
          .order('id'),
        options
      );
      const rows = await executeQuery<ExperimentRow[]>(
        'getExperimentsByLesson',
        query as unknown as QueryResponse<ExperimentRow[]>
      );
      return rows.map(mapExperimentRow);
    },

    async getReviewQuestionsByLesson(lessonId, options) {
      const query = withAbortSignal(
        queryFrom(client, 'questions')
          .select(COLUMNS.questions)
          .eq('lesson_id', lessonId)
          .eq('purpose', 'review')
          .order('id'),
        options
      );
      const rows = await executeQuery<QuestionRow[]>(
        'getReviewQuestionsByLesson',
        query as unknown as QueryResponse<QuestionRow[]>
      );
      return rows.map(mapQuestionRow);
    },

    async getMasteryQuestionsByLesson(lessonId, options) {
      const query = withAbortSignal(
        queryFrom(client, 'questions')
          .select(COLUMNS.questions)
          .eq('lesson_id', lessonId)
          .eq('purpose', 'mastery')
          .order('id'),
        options
      );
      const rows = await executeQuery<QuestionRow[]>(
        'getMasteryQuestionsByLesson',
        query as unknown as QueryResponse<QuestionRow[]>
      );
      return rows.map(mapQuestionRow);
    },

    async getGamesByLesson(lessonId, options) {
      const gameQuery = withAbortSignal(
        queryFrom(client, 'games').select(COLUMNS.games).eq('lesson_id', lessonId).order('id'),
        options
      );
      const games = await executeQuery<GameRow[]>(
        'getGamesByLesson:games',
        gameQuery as unknown as QueryResponse<GameRow[]>
      );

      if (games.length === 0) {
        return [];
      }

      const gameIds = games.map((game) => game.id);
      const objectiveQuery = withAbortSignal(
        queryFrom(client, 'game_objectives')
          .select(COLUMNS.gameObjectives)
          .in('game_id', gameIds)
          .order('game_id')
          .order('position'),
        options
      );
      const objectiveRows = await executeQuery<GameObjectiveRow[]>(
        'getGamesByLesson:objectives',
        objectiveQuery as unknown as QueryResponse<GameObjectiveRow[]>
      );
      const objectiveIdsByGame = groupObjectiveIdsByGame(objectiveRows);

      return games.map((game) => mapGameRow(game, objectiveIdsByGame.get(game.id) ?? []));
    },
  };
}

let defaultRepository: ContentRepository | undefined;

function getDefaultRepository(): ContentRepository {
  defaultRepository ??= createSupabaseContentRepository(getSupabaseClient());
  return defaultRepository;
}

export const supabaseContentRepository: ContentRepository = {
  getGrades: (options) => getDefaultRepository().getGrades(options),
  getSemestersByGrade: (gradeId, options) =>
    getDefaultRepository().getSemestersByGrade(gradeId, options),
  getSubjectsBySemester: (semesterId, options) =>
    getDefaultRepository().getSubjectsBySemester(semesterId, options),
  getUnitsBySubjectAndSemester: (subjectId, semesterId, options) =>
    getDefaultRepository().getUnitsBySubjectAndSemester(subjectId, semesterId, options),
  getUnitsBySubject: (subjectId, options) =>
    getDefaultRepository().getUnitsBySubject(subjectId, options),
  getLessonsByUnit: (unitId, options) => getDefaultRepository().getLessonsByUnit(unitId, options),
  getLessonById: (lessonId, options) => getDefaultRepository().getLessonById(lessonId, options),
  getObjectivesByLesson: (lessonId, options) =>
    getDefaultRepository().getObjectivesByLesson(lessonId, options),
  getObjectivesByIds: (objectiveIds, options) =>
    getDefaultRepository().getObjectivesByIds(objectiveIds, options),
  getExperimentsByLesson: (lessonId, options) =>
    getDefaultRepository().getExperimentsByLesson(lessonId, options),
  getReviewQuestionsByLesson: (lessonId, options) =>
    getDefaultRepository().getReviewQuestionsByLesson(lessonId, options),
  getMasteryQuestionsByLesson: (lessonId, options) =>
    getDefaultRepository().getMasteryQuestionsByLesson(lessonId, options),
  getGamesByLesson: (lessonId, options) =>
    getDefaultRepository().getGamesByLesson(lessonId, options),
};
