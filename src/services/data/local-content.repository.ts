import type {
  Grade,
  Lesson,
  Objective,
  Semester,
  Subject,
  Unit,
} from '@shared-types/content.types';
import type { ScientificDataActivity } from '@shared-types/data-activity.types';
import type { Experiment } from '@shared-types/experiment.types';
import type { Game } from '@shared-types/game.types';
import type { Inquiry } from '@shared-types/inquiry.types';
import type { Question } from '@shared-types/quiz.types';
import type { Simulation } from '@shared-types/simulation.types';
import {
  learningCatalogGrades,
  learningCatalogSemesters,
  learningCatalogSubjects,
  learningCatalogUnits,
} from '@content/seed/learning-catalog.seed';
import { grade10PhysicsWavesDataActivities } from '@content/seed/grade10-physics-waves-data';
import {
  grade10PhysicsWavesExperiments,
  grade10PhysicsWavesGames,
  grade10PhysicsWavesInquiries,
  grade10PhysicsWavesLessons,
  grade10PhysicsWavesMasteryQuestions,
  grade10PhysicsWavesObjectives,
  grade10PhysicsWavesReviewQuestions,
  grade10PhysicsWavesSimulations,
} from '@content/seed/grade10-physics-waves';
import { orderEntitiesByIds, uniqueIdsInOrder } from './content-ordering';

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
  const subjectIdsInSemester = uniqueIdsInOrder(
    learningCatalogUnits
      .filter((unit) => unit.semesterId === semesterId)
      .sort((a, b) => a.order - b.order)
      .map((unit) => unit.subjectId)
  );

  return orderEntitiesByIds(learningCatalogSubjects, subjectIdsInSemester);
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
  return orderEntitiesByIds(grade10PhysicsWavesObjectives, objectiveIds);
}

export function getExperimentsByLesson(lessonId: string): Experiment[] {
  return grade10PhysicsWavesExperiments.filter((experiment) => experiment.lessonId === lessonId);
}

export function getReviewQuestionsByLesson(lessonId: string): Question[] {
  return grade10PhysicsWavesReviewQuestions.filter((question) => question.lessonId === lessonId);
}

export function getMasteryQuestionsByLesson(lessonId: string): Question[] {
  return grade10PhysicsWavesMasteryQuestions.filter((question) => question.lessonId === lessonId);
}

export function getGamesByLesson(lessonId: string): Game[] {
  return grade10PhysicsWavesGames.filter((game) => game.lessonId === lessonId);
}

export function getSimulationsByLesson(lessonId: string): Simulation[] {
  return grade10PhysicsWavesSimulations.filter((simulation) => simulation.lessonId === lessonId);
}

export function getInquiriesByLesson(lessonId: string): Inquiry[] {
  return grade10PhysicsWavesInquiries.filter((inquiry) => inquiry.lessonId === lessonId);
}

export function getDataActivitiesByLesson(lessonId: string): ScientificDataActivity[] {
  return grade10PhysicsWavesDataActivities.filter((activity) => activity.lessonId === lessonId);
}
