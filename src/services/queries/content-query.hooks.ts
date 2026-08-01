import { useCallback, useMemo } from 'react';
import type {
  Grade,
  Lesson,
  Objective,
  Semester,
  Subject,
  Unit,
} from '@shared-types/content.types';
import type { Experiment } from '@shared-types/experiment.types';
import type { Game } from '@shared-types/game.types';
import type { Question } from '@shared-types/quiz.types';
import { getContentRepository } from '@services/data/content-repository.provider';
import { useAsyncQuery } from './use-async-query';

const EMPTY_GRADES: Grade[] = [];
const EMPTY_SEMESTERS: Semester[] = [];
const EMPTY_SUBJECTS: Subject[] = [];
const EMPTY_UNITS: Unit[] = [];
const EMPTY_LESSONS: Lesson[] = [];
const EMPTY_OBJECTIVES: Objective[] = [];
const EMPTY_EXPERIMENTS: Experiment[] = [];
const EMPTY_QUESTIONS: Question[] = [];
const EMPTY_GAMES: Game[] = [];

export function useGrades() {
  const queryFn = useCallback(
    (signal: AbortSignal) => getContentRepository().getGrades({ signal }),
    []
  );

  return useAsyncQuery({
    queryKey: 'grades',
    initialData: EMPTY_GRADES,
    queryFn,
  });
}

export function useSemestersByGrade(gradeId: string) {
  const queryFn = useCallback(
    (signal: AbortSignal) => getContentRepository().getSemestersByGrade(gradeId, { signal }),
    [gradeId]
  );

  return useAsyncQuery({
    queryKey: `semesters:${gradeId}`,
    initialData: EMPTY_SEMESTERS,
    queryFn,
  });
}

export function useSubjectsBySemester(semesterId: string) {
  const queryFn = useCallback(
    (signal: AbortSignal) =>
      getContentRepository().getSubjectsBySemester(semesterId, { signal }),
    [semesterId]
  );

  return useAsyncQuery({
    queryKey: `subjects:${semesterId}`,
    initialData: EMPTY_SUBJECTS,
    queryFn,
  });
}

export function useUnitsBySubjectAndSemester(subjectId: string, semesterId: string) {
  const queryFn = useCallback(
    (signal: AbortSignal) =>
      getContentRepository().getUnitsBySubjectAndSemester(subjectId, semesterId, {
        signal,
      }),
    [semesterId, subjectId]
  );

  return useAsyncQuery({
    queryKey: `units:${semesterId}:${subjectId}`,
    initialData: EMPTY_UNITS,
    queryFn,
  });
}

export function useUnitsBySubject(subjectId: string) {
  const queryFn = useCallback(
    (signal: AbortSignal) => getContentRepository().getUnitsBySubject(subjectId, { signal }),
    [subjectId]
  );

  return useAsyncQuery({
    queryKey: `subject-units:${subjectId}`,
    initialData: EMPTY_UNITS,
    queryFn,
  });
}

export function useLessonsByUnit(unitId: string) {
  const queryFn = useCallback(
    (signal: AbortSignal) => getContentRepository().getLessonsByUnit(unitId, { signal }),
    [unitId]
  );

  return useAsyncQuery({
    queryKey: `lessons:${unitId}`,
    initialData: EMPTY_LESSONS,
    queryFn,
  });
}

export function useLesson(lessonId: string) {
  const queryFn = useCallback(
    (signal: AbortSignal) => getContentRepository().getLessonById(lessonId, { signal }),
    [lessonId]
  );

  return useAsyncQuery({
    queryKey: `lesson:${lessonId}`,
    initialData: undefined,
    queryFn,
  });
}

export function useLessonObjectives(lessonId: string) {
  const queryFn = useCallback(
    (signal: AbortSignal) =>
      getContentRepository().getObjectivesByLesson(lessonId, { signal }),
    [lessonId]
  );

  return useAsyncQuery({
    queryKey: `lesson-objectives:${lessonId}`,
    initialData: EMPTY_OBJECTIVES,
    queryFn,
  });
}

export function useLessonExperiments(lessonId: string) {
  const queryFn = useCallback(
    (signal: AbortSignal) =>
      getContentRepository().getExperimentsByLesson(lessonId, { signal }),
    [lessonId]
  );

  return useAsyncQuery({
    queryKey: `lesson-experiments:${lessonId}`,
    initialData: EMPTY_EXPERIMENTS,
    queryFn,
  });
}

export function useReviewQuestions(lessonId: string) {
  const queryFn = useCallback(
    (signal: AbortSignal) =>
      getContentRepository().getReviewQuestionsByLesson(lessonId, { signal }),
    [lessonId]
  );

  return useAsyncQuery({
    queryKey: `review-questions:${lessonId}`,
    initialData: EMPTY_QUESTIONS,
    queryFn,
  });
}

export function useMasteryQuestions(lessonId: string) {
  const queryFn = useCallback(
    (signal: AbortSignal) =>
      getContentRepository().getMasteryQuestionsByLesson(lessonId, { signal }),
    [lessonId]
  );

  return useAsyncQuery({
    queryKey: `mastery-questions:${lessonId}`,
    initialData: EMPTY_QUESTIONS,
    queryFn,
  });
}

export function useObjectivesByIds(objectiveIds: string[]) {
  const objectiveIdsKey = JSON.stringify(objectiveIds);

  const stableObjectiveIds = useMemo(
    () => JSON.parse(objectiveIdsKey) as string[],
    [objectiveIdsKey]
  );

  const queryFn = useCallback(
    (signal: AbortSignal) =>
      getContentRepository().getObjectivesByIds(stableObjectiveIds, { signal }),
    [stableObjectiveIds]
  );

  return useAsyncQuery({
    queryKey: `objectives:${objectiveIdsKey}`,
    initialData: EMPTY_OBJECTIVES,
    queryFn,
  });
}

export function useGamesByLesson(lessonId: string) {
  const queryFn = useCallback(
    (signal: AbortSignal) => getContentRepository().getGamesByLesson(lessonId, { signal }),
    [lessonId]
  );

  return useAsyncQuery({
    queryKey: `games:${lessonId}`,
    initialData: EMPTY_GAMES,
    queryFn,
  });
}
