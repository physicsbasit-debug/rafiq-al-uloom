import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  learningCatalogGrades,
  learningCatalogSemesters,
  learningCatalogSubjects,
  learningCatalogUnits,
} from '../src/content/seed/learning-catalog.seed';
import {
  grade10PhysicsWavesExperiments,
  grade10PhysicsWavesGames,
  grade10PhysicsWavesLessons,
  grade10PhysicsWavesMasteryQuestions,
  grade10PhysicsWavesObjectives,
  grade10PhysicsWavesReviewQuestions,
} from '../src/content/seed/grade10-physics-waves';
import type { Experiment } from '../src/types/experiment.types';
import type { Game } from '../src/types/game.types';
import type { Grade, Lesson, Objective, Semester, Subject, Unit } from '../src/types/content.types';
import type { Question } from '../src/types/quiz.types';

export type SeedQuestion = Question & { purpose: 'review' | 'mastery' };

export interface SeedData {
  grades: Grade[];
  semesters: Semester[];
  subjects: Subject[];
  units: Unit[];
  lessons: Lesson[];
  objectives: Objective[];
  questions: SeedQuestion[];
  games: Game[];
  experiments: Experiment[];
}

export const currentSeedData: SeedData = {
  grades: learningCatalogGrades,
  semesters: learningCatalogSemesters,
  subjects: learningCatalogSubjects,
  units: learningCatalogUnits,
  lessons: grade10PhysicsWavesLessons,
  objectives: grade10PhysicsWavesObjectives,
  questions: [
    ...grade10PhysicsWavesReviewQuestions.map((question) => ({
      ...question,
      purpose: 'review' as const,
    })),
    ...grade10PhysicsWavesMasteryQuestions.map((question) => ({
      ...question,
      purpose: 'mastery' as const,
    })),
  ],
  games: grade10PhysicsWavesGames,
  experiments: grade10PhysicsWavesExperiments,
};

function assertUniqueIds(entityName: string, values: Array<{ id: string }>): void {
  const seen = new Set<string>();

  for (const value of values) {
    if (seen.has(value.id)) {
      throw new Error(`Duplicate ${entityName} id: ${value.id}`);
    }
    seen.add(value.id);
  }
}

function requireReference(
  entityName: string,
  entityId: string,
  fieldName: string,
  referencedId: string,
  validIds: Set<string>
): void {
  if (!validIds.has(referencedId)) {
    throw new Error(
      `Invalid seed reference: ${entityName} ${entityId} has missing ${fieldName} ${referencedId}`
    );
  }
}

export function validateSeedGraph(seedData: SeedData): void {
  assertUniqueIds('grade', seedData.grades);
  assertUniqueIds('semester', seedData.semesters);
  assertUniqueIds('subject', seedData.subjects);
  assertUniqueIds('unit', seedData.units);
  assertUniqueIds('lesson', seedData.lessons);
  assertUniqueIds('objective', seedData.objectives);
  assertUniqueIds('question', seedData.questions);
  assertUniqueIds('game', seedData.games);
  assertUniqueIds('experiment', seedData.experiments);

  const gradeIds = new Set(seedData.grades.map(({ id }) => id));
  const semesterIds = new Set(seedData.semesters.map(({ id }) => id));
  const subjectIds = new Set(seedData.subjects.map(({ id }) => id));
  const unitIds = new Set(seedData.units.map(({ id }) => id));
  const lessonIds = new Set(seedData.lessons.map(({ id }) => id));
  const objectiveIds = new Set(seedData.objectives.map(({ id }) => id));
  const semestersById = new Map(seedData.semesters.map((semester) => [semester.id, semester]));
  const subjectsById = new Map(seedData.subjects.map((subject) => [subject.id, subject]));
  const objectivesById = new Map(seedData.objectives.map((objective) => [objective.id, objective]));

  for (const semester of seedData.semesters) {
    requireReference('semester', semester.id, 'gradeId', semester.gradeId, gradeIds);
  }

  for (const subject of seedData.subjects) {
    requireReference('subject', subject.id, 'gradeId', subject.gradeId, gradeIds);
  }

  for (const unit of seedData.units) {
    requireReference('unit', unit.id, 'subjectId', unit.subjectId, subjectIds);
    requireReference('unit', unit.id, 'semesterId', unit.semesterId, semesterIds);

    const subject = subjectsById.get(unit.subjectId);
    const semester = semestersById.get(unit.semesterId);
    if (subject && semester && subject.gradeId !== semester.gradeId) {
      throw new Error(
        `Invalid seed relationship: unit ${unit.id} links subject ${subject.id} and semester ${semester.id} from different grades`
      );
    }
  }

  for (const objective of seedData.objectives) {
    requireReference('objective', objective.id, 'lessonId', objective.lessonId, lessonIds);
  }

  for (const lesson of seedData.lessons) {
    requireReference('lesson', lesson.id, 'unitId', lesson.unitId, unitIds);
    for (const objectiveId of lesson.objectiveIds) {
      requireReference('lesson', lesson.id, 'objectiveId', objectiveId, objectiveIds);
      const objective = objectivesById.get(objectiveId);
      if (objective && objective.lessonId !== lesson.id) {
        throw new Error(
          `Invalid seed relationship: lesson ${lesson.id} references objective ${objectiveId} owned by lesson ${objective.lessonId}`
        );
      }
    }
  }

  for (const question of seedData.questions) {
    requireReference('question', question.id, 'lessonId', question.lessonId, lessonIds);
    requireReference('question', question.id, 'objectiveId', question.objectiveId, objectiveIds);

    const objective = objectivesById.get(question.objectiveId);
    if (objective && objective.lessonId !== question.lessonId) {
      throw new Error(
        `Invalid seed relationship: question ${question.id} references objective ${question.objectiveId} from another lesson`
      );
    }

    if (question.correctAnswerIndex < 0 || question.correctAnswerIndex >= question.choices.length) {
      throw new Error(`Invalid correctAnswerIndex for question ${question.id}`);
    }
  }

  for (const game of seedData.games) {
    requireReference('game', game.id, 'lessonId', game.lessonId, lessonIds);
    for (const objectiveId of game.objectiveIds) {
      requireReference('game', game.id, 'objectiveId', objectiveId, objectiveIds);
      const objective = objectivesById.get(objectiveId);
      if (objective && objective.lessonId !== game.lessonId) {
        throw new Error(
          `Invalid seed relationship: game ${game.id} references objective ${objectiveId} from another lesson`
        );
      }
    }
  }

  for (const experiment of seedData.experiments) {
    requireReference('experiment', experiment.id, 'lessonId', experiment.lessonId, lessonIds);
  }
}

export function sqlText(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function sqlNullableText(value: string | null): string {
  return value === null ? 'NULL' : sqlText(value);
}

export function sqlTextArray(values: string[]): string {
  if (values.length === 0) {
    return 'ARRAY[]::text[]';
  }
  return `ARRAY[${values.map(sqlText).join(', ')}]::text[]`;
}

export function sqlJson(value: unknown): string {
  return `${sqlText(JSON.stringify(value))}::jsonb`;
}

export function sqlInteger(value: number): string {
  if (!Number.isInteger(value)) {
    throw new Error(`Expected integer seed value, received: ${value}`);
  }
  return String(value);
}

function createInsertStatement(
  table: string,
  columns: string[],
  rows: string[][],
  conflictTarget: string,
  updateColumns: string[]
): string {
  if (rows.length === 0) {
    return `-- No rows for public.${table}`;
  }

  const values = rows.map((row) => `  (${row.join(', ')})`).join(',\n');
  const updateClause = updateColumns
    .map((column) => `${column} = EXCLUDED.${column}`)
    .join(',\n  ');

  return `INSERT INTO public.${table} (${columns.join(', ')})\nVALUES\n${values}\nON CONFLICT (${conflictTarget}) DO UPDATE SET\n  ${updateClause};`;
}

export function buildSeedSql(seedData: SeedData): string {
  validateSeedGraph(seedData);

  const statements: string[] = [
    '-- Generated by scripts/generate-supabase-seed.ts.',
    '-- Do not edit manually. Regenerate from src/content/seed/*.ts.',
    '-- The supported application path is a clean database via `npx supabase db reset`.',
    '',
    createInsertStatement(
      'grades',
      ['id', 'name', 'display_order'],
      seedData.grades.map((grade) => [
        sqlText(grade.id),
        sqlText(grade.name),
        sqlInteger(grade.order),
      ]),
      'id',
      ['name', 'display_order']
    ),
    '',
    createInsertStatement(
      'semesters',
      ['id', 'grade_id', 'name', 'display_order'],
      seedData.semesters.map((semester) => [
        sqlText(semester.id),
        sqlText(semester.gradeId),
        sqlText(semester.name),
        sqlInteger(semester.order),
      ]),
      'id',
      ['grade_id', 'name', 'display_order']
    ),
    '',
    createInsertStatement(
      'subjects',
      ['id', 'grade_id', 'name', 'theme_color'],
      seedData.subjects.map((subject) => [
        sqlText(subject.id),
        sqlText(subject.gradeId),
        sqlText(subject.name),
        sqlText(subject.themeColor),
      ]),
      'id',
      ['grade_id', 'name', 'theme_color']
    ),
    '',
    createInsertStatement(
      'units',
      ['id', 'subject_id', 'semester_id', 'title', 'display_order'],
      seedData.units.map((unit) => [
        sqlText(unit.id),
        sqlText(unit.subjectId),
        sqlText(unit.semesterId),
        sqlText(unit.title),
        sqlInteger(unit.order),
      ]),
      'id',
      ['subject_id', 'semester_id', 'title', 'display_order']
    ),
    '',
    createInsertStatement(
      'lessons',
      [
        'id',
        'unit_id',
        'title',
        'display_order',
        'summary',
        'key_concepts',
        'examples',
        'misconceptions',
        'status',
        'source',
      ],
      seedData.lessons.map((lesson) => [
        sqlText(lesson.id),
        sqlText(lesson.unitId),
        sqlText(lesson.title),
        sqlInteger(lesson.order),
        sqlText(lesson.summary),
        sqlTextArray(lesson.keyConcepts),
        sqlTextArray(lesson.examples),
        sqlTextArray(lesson.misconceptions),
        sqlText(lesson.status),
        sqlText(lesson.source),
      ]),
      'id',
      [
        'unit_id',
        'title',
        'display_order',
        'summary',
        'key_concepts',
        'examples',
        'misconceptions',
        'status',
        'source',
      ]
    ),
    '',
    createInsertStatement(
      'objectives',
      ['id', 'lesson_id', 'text'],
      seedData.objectives.map((objective) => [
        sqlText(objective.id),
        sqlText(objective.lessonId),
        sqlText(objective.text),
      ]),
      'id',
      ['lesson_id', 'text']
    ),
    '',
    createInsertStatement(
      'questions',
      [
        'id',
        'lesson_id',
        'purpose',
        'type',
        'prompt',
        'choices',
        'correct_answer_index',
        'explanation',
        'objective_id',
        'difficulty',
        'status',
        'source',
      ],
      seedData.questions.map((question) => [
        sqlText(question.id),
        sqlText(question.lessonId),
        sqlText(question.purpose),
        sqlText(question.type),
        sqlText(question.prompt),
        sqlTextArray(question.choices),
        sqlInteger(question.correctAnswerIndex),
        sqlText(question.explanation),
        sqlText(question.objectiveId),
        sqlText(question.difficulty),
        sqlText(question.status),
        sqlText(question.source),
      ]),
      'id',
      [
        'lesson_id',
        'purpose',
        'type',
        'prompt',
        'choices',
        'correct_answer_index',
        'explanation',
        'objective_id',
        'difficulty',
        'status',
        'source',
      ]
    ),
    '',
    createInsertStatement(
      'games',
      ['id', 'lesson_id', 'type', 'title', 'instructions', 'items', 'status', 'source'],
      seedData.games.map((game) => [
        sqlText(game.id),
        sqlText(game.lessonId),
        sqlText(game.type),
        sqlText(game.title),
        sqlText(game.instructions),
        sqlJson(game.items),
        sqlText(game.status),
        sqlText(game.source),
      ]),
      'id',
      ['lesson_id', 'type', 'title', 'instructions', 'items', 'status', 'source']
    ),
    '',
    createInsertStatement(
      'experiments',
      [
        'id',
        'lesson_id',
        'title',
        'objective',
        'tools',
        'steps',
        'safety_notes',
        'safety_level',
        'observation_prompt',
        'conclusion_prompt',
        'home_alternative',
        'status',
        'source',
      ],
      seedData.experiments.map((experiment) => [
        sqlText(experiment.id),
        sqlText(experiment.lessonId),
        sqlText(experiment.title),
        sqlText(experiment.objective),
        sqlTextArray(experiment.tools),
        sqlTextArray(experiment.steps),
        sqlTextArray(experiment.safetyNotes),
        sqlText(experiment.safetyLevel),
        sqlText(experiment.observationPrompt),
        sqlText(experiment.conclusionPrompt),
        sqlNullableText(experiment.homeAlternative),
        sqlText(experiment.status),
        sqlText(experiment.source),
      ]),
      'id',
      [
        'lesson_id',
        'title',
        'objective',
        'tools',
        'steps',
        'safety_notes',
        'safety_level',
        'observation_prompt',
        'conclusion_prompt',
        'home_alternative',
        'status',
        'source',
      ]
    ),
    '',
    createInsertStatement(
      'game_objectives',
      ['game_id', 'objective_id', 'position'],
      seedData.games.flatMap((game) =>
        game.objectiveIds.map((objectiveId, position) => [
          sqlText(game.id),
          sqlText(objectiveId),
          sqlInteger(position),
        ])
      ),
      'game_id, objective_id',
      ['position']
    ),
    '',
  ];

  return `${statements.join('\n')}\n`;
}

export function generateSupabaseSeed(
  seedData: SeedData = currentSeedData,
  outputPath = resolve(process.cwd(), 'supabase/seed.sql')
): string {
  const sql = buildSeedSql(seedData);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, sql, 'utf8');
  return outputPath;
}

const isDirectExecution =
  process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const outputPath = generateSupabaseSeed();
  console.log(`Generated ${outputPath}`);
}
