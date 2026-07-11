import type { Grade, Lesson, Objective, Semester, Subject, Unit } from '@shared-types/content.types';
import type { Experiment } from '@shared-types/experiment.types';
import type { Game } from '@shared-types/game.types';
import type { Question } from '@shared-types/quiz.types';
import {
  learningCatalogGrades,
  learningCatalogSemesters,
  learningCatalogSubjects,
  learningCatalogUnits,
} from '@content/seed/learning-catalog.seed';
import {
  grade10PhysicsWavesExperiments,
  grade10PhysicsWavesGames,
  grade10PhysicsWavesLessons,
  grade10PhysicsWavesObjectives,
  grade10PhysicsWavesReviewQuestions,
} from '@content/seed/grade10-physics-waves';

/**
 * local-content.repository
 *
 * هذه هي الطبقة الوحيدة التي تستورد ملفات seed.
 * مكوّنات الواجهة لا تستورد seed مباشرة.
 *
 * القاعدة:
 * - لا كتابة.
 * - لا شبكة.
 * - لا Supabase.
 * - لا AI.
 * - لا اشتقاق Grade/Subject/Unit من unitId.
 */

export function getGrades(): Grade[] {
  return learningCatalogGrades.slice().sort((a, b) => a.order - b.order);
}

export function getSemestersByGrade(gradeId: string): Semester[] {
  return learningCatalogSemesters
    .filter((semester) => semester.gradeId === gradeId)
    .sort((a, b) => a.order - b.order);
}

export function getSubjectsBySemester(semesterId: string): Subject[] {
  const subjectIdsInSemester = new Set(
    learningCatalogUnits
      .filter((unit) => unit.semesterId === semesterId)
      .map((unit) => unit.subjectId),
  );

  return learningCatalogSubjects.filter((subject) => subjectIdsInSemester.has(subject.id));
}

export function getUnitsBySubjectAndSemester(subjectId: string, semesterId: string): Unit[] {
  return learningCatalogUnits
    .filter((unit) => unit.subjectId === subjectId && unit.semesterId === semesterId)
    .sort((a, b) => a.order - b.order);
}

export function getUnitsBySubject(subjectId: string): Unit[] {
  return learningCatalogUnits
    .filter((unit) => unit.subjectId === subjectId)
    .sort((a, b) => a.order - b.order);
}

export function getLessonsByUnit(unitId: string): Lesson[] {
  return grade10PhysicsWavesLessons
    .filter((lesson) => lesson.unitId === unitId)
    .sort((a, b) => a.order - b.order);
}

export function getLessonById(lessonId: string): Lesson | undefined {
  return grade10PhysicsWavesLessons.find((lesson) => lesson.id === lessonId);
}

export function getObjectivesByLesson(lessonId: string): Objective[] {
  return grade10PhysicsWavesObjectives.filter((objective) => objective.lessonId === lessonId);
}

export function getObjectivesByIds(objectiveIds: string[]): Objective[] {
  const requestedIds = new Set(objectiveIds);

  return grade10PhysicsWavesObjectives.filter((objective) => requestedIds.has(objective.id));
}

export function getExperimentsByLesson(lessonId: string): Experiment[] {
  return grade10PhysicsWavesExperiments.filter((experiment) => experiment.lessonId === lessonId);
}

export function getReviewQuestionsByLesson(lessonId: string): Question[] {
  return grade10PhysicsWavesReviewQuestions.filter((question) => question.lessonId === lessonId);
}

export function getGamesByLesson(lessonId: string): Game[] {
  return grade10PhysicsWavesGames.filter((game) => game.lessonId === lessonId);
}
