import { useCallback } from 'react';
import { createActivityCatalogService } from '@services/activities/activity-catalog.service';
import { getContentRepository } from '@services/data/content-repository.provider';
import { useAsyncQuery } from '@services/queries/use-async-query';
import type { AvailableLearningActivity } from '@shared-types/activity.types';

const EMPTY_ACTIVITIES: AvailableLearningActivity[] = [];

export function useActivitiesByLesson(lessonId: string) {
  const queryFn = useCallback(
    (signal: AbortSignal) =>
      createActivityCatalogService(getContentRepository()).getActivitiesByLesson(lessonId, {
        signal,
      }),
    [lessonId]
  );

  return useAsyncQuery({
    queryKey: `lesson-activities:${lessonId}`,
    initialData: EMPTY_ACTIVITIES,
    queryFn,
  });
}
