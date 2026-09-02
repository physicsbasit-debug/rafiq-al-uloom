import { buildLessonActivities } from '@features/activities/activity-adapters';
import type { AvailableLearningActivity } from '@shared-types/activity.types';
import type {
  ContentRepository,
  RepositoryRequestOptions,
} from '@services/data/content.repository';

export interface ActivityCatalogService {
  getActivitiesByLesson(
    lessonId: string,
    options?: RepositoryRequestOptions
  ): Promise<AvailableLearningActivity[]>;
}

export function createActivityCatalogService(
  repository: ContentRepository
): ActivityCatalogService {
  return {
    async getActivitiesByLesson(
      lessonId: string,
      options?: RepositoryRequestOptions
    ): Promise<AvailableLearningActivity[]> {
      if (!lessonId.trim()) {
        throw new Error('lessonId must not be blank when loading activities.');
      }

      const [games, experiments, simulations] = await Promise.all([
        repository.getGamesByLesson(lessonId, options),
        repository.getExperimentsByLesson(lessonId, options),
        repository.getSimulationsByLesson(lessonId, options),
      ]);

      const activities = buildLessonActivities(games, experiments, simulations);

      if (activities.some((activity) => activity.lessonId !== lessonId)) {
        throw new Error(
          `Invalid lesson activity catalog: repository returned activity outside lesson "${lessonId}".`
        );
      }

      return activities;
    },
  };
}
