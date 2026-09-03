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

export interface RepositoryRequestOptions {
  signal?: AbortSignal;
}

export interface ContentRepository {
  getGrades(options?: RepositoryRequestOptions): Promise<Grade[]>;

  getSemestersByGrade(gradeId: string, options?: RepositoryRequestOptions): Promise<Semester[]>;

  getSubjectsBySemester(semesterId: string, options?: RepositoryRequestOptions): Promise<Subject[]>;

  getUnitsBySubjectAndSemester(
    subjectId: string,
    semesterId: string,
    options?: RepositoryRequestOptions
  ): Promise<Unit[]>;

  getUnitsBySubject(subjectId: string, options?: RepositoryRequestOptions): Promise<Unit[]>;

  getLessonsByUnit(unitId: string, options?: RepositoryRequestOptions): Promise<Lesson[]>;

  getLessonById(lessonId: string, options?: RepositoryRequestOptions): Promise<Lesson | undefined>;

  getObjectivesByLesson(lessonId: string, options?: RepositoryRequestOptions): Promise<Objective[]>;

  getObjectivesByIds(
    objectiveIds: string[],
    options?: RepositoryRequestOptions
  ): Promise<Objective[]>;

  getExperimentsByLesson(
    lessonId: string,
    options?: RepositoryRequestOptions
  ): Promise<Experiment[]>;

  getReviewQuestionsByLesson(
    lessonId: string,
    options?: RepositoryRequestOptions
  ): Promise<Question[]>;

  getMasteryQuestionsByLesson(
    lessonId: string,
    options?: RepositoryRequestOptions
  ): Promise<Question[]>;

  getGamesByLesson(lessonId: string, options?: RepositoryRequestOptions): Promise<Game[]>;

  getSimulationsByLesson(
    lessonId: string,
    options?: RepositoryRequestOptions
  ): Promise<Simulation[]>;

  getInquiriesByLesson(lessonId: string, options?: RepositoryRequestOptions): Promise<Inquiry[]>;

  getDataActivitiesByLesson(
    lessonId: string,
    options?: RepositoryRequestOptions
  ): Promise<ScientificDataActivity[]>;
}
