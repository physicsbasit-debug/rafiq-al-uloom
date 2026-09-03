import { describe, expect, it, vi } from 'vitest';
import { createActivityCatalogService } from '@services/activities/activity-catalog.service';
import type { ContentRepository } from '@services/data/content.repository';
import type { ScientificDataActivity } from '@shared-types/data-activity.types';

const dataActivity: ScientificDataActivity = {
  id: 'data-catalog-one',
  lessonId: 'lesson-one',
  title: 'نشاط بيانات',
  instructions: 'اقرأ البيانات.',
  objectiveIds: ['objective-one'],
  config: {
    engineKind: 'data_graph_v1',
    context: 'سياق.',
    presentation: {
      mode: 'table',
      xAxisLabel: 'x',
      yAxisLabel: 'y',
    },
    dataset: {
      x: { label: 'x', unit: '', values: [1, 2] },
      series: [{ id: 'y', label: 'y', unit: '', values: [2, 4] }],
    },
    tasks: [
      {
        id: 'read',
        prompt: 'اقرأ القيمة.',
        unit: '',
        rule: { kind: 'read_value', seriesId: 'y', pointIndex: 1 },
      },
    ],
  },
  status: 'approved',
  source: 'curriculum_seed',
};

describe('Data activity catalog integration', () => {
  it('يجلب Data من repository ويحوّلها إلى LearningActivity دون mutation', async () => {
    const getDataActivitiesByLesson = vi.fn().mockResolvedValue([dataActivity]);
    const repository = {
      getGamesByLesson: vi.fn().mockResolvedValue([]),
      getExperimentsByLesson: vi.fn().mockResolvedValue([]),
      getSimulationsByLesson: vi.fn().mockResolvedValue([]),
      getInquiriesByLesson: vi.fn().mockResolvedValue([]),
      getDataActivitiesByLesson,
    } as unknown as ContentRepository;
    const controller = new AbortController();

    const result = await createActivityCatalogService(repository).getActivitiesByLesson('lesson-one', {
      signal: controller.signal,
    });

    expect(getDataActivitiesByLesson).toHaveBeenCalledTimes(1);
    expect(getDataActivitiesByLesson).toHaveBeenCalledWith('lesson-one', {
      signal: controller.signal,
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: 'data-catalog-one',
      lessonId: 'lesson-one',
      kind: 'data',
      title: 'نشاط بيانات',
      objectiveIds: ['objective-one'],
    });

    const wrapper = result[0];
    if (!wrapper || wrapper.kind !== 'data') {
      throw new Error('Expected one data activity wrapper.');
    }

    expect(wrapper.content).toBe(dataActivity);
    expect(wrapper.objectiveIds).not.toBe(dataActivity.objectiveIds);
  });
});
