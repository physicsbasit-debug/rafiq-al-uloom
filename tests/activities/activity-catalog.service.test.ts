import { describe, expect, it, vi } from 'vitest';
import { createActivityCatalogService } from '@services/activities/activity-catalog.service';
import type { ContentRepository } from '@services/data/content.repository';
import type { Experiment } from '@shared-types/experiment.types';
import type { Game } from '@shared-types/game.types';
import type { Inquiry } from '@shared-types/inquiry.types';
import type { Simulation } from '@shared-types/simulation.types';

const game: Game = {
  id: 'game-one',
  lessonId: 'lesson-one',
  type: 'matching',
  title: 'مطابقة',
  instructions: 'طابق.',
  items: [{ left: 'أ', right: 'ب' }],
  objectiveIds: ['objective-one'],
  status: 'approved',
  source: 'curriculum_seed',
};

const experiment: Experiment = {
  id: 'experiment-one',
  lessonId: 'lesson-one',
  title: 'تجربة',
  objective: 'هدف',
  objectiveIds: ['objective-two'],
  tools: ['أداة'],
  steps: ['خطوة'],
  safetyNotes: ['تنبيه'],
  safetyLevel: 'safe_home',
  observationPrompt: 'لاحظ',
  conclusionPrompt: 'استنتج',
  homeAlternative: null,
  status: 'approved',
  source: 'curriculum_seed',
};

const simulation: Simulation = {
  id: 'simulation-one',
  lessonId: 'lesson-one',
  title: 'محاكاة',
  instructions: 'غيّر القيم ولاحظ.',
  objectiveIds: ['objective-three'],
  config: {
    engineKind: 'transverse_wave_v1',
    mediumSpeedMps: 12,
    frequencyHz: { min: 0.5, max: 4, step: 0.5, initial: 1 },
    amplitudeM: { min: 0.2, max: 1, step: 0.1, initial: 0.5 },
  },
  status: 'approved',
  source: 'curriculum_seed',
};

const inquiry: Inquiry = {
  id: 'inquiry-one',
  lessonId: 'lesson-one',
  title: 'استقصاء',
  instructions: 'سجّل استدلالك.',
  objectiveIds: ['objective-four'],
  context: 'حالة علمية.',
  drivingQuestion: 'ماذا تستنتج؟',
  hypothesisPrompt: 'فرضيتك؟',
  observationPrompt: 'دليلك؟',
  conclusionPrompt: 'استنتاجك؟',
  status: 'approved',
  source: 'curriculum_seed',
};

function repositoryWith(
  getGamesByLesson: ContentRepository['getGamesByLesson'],
  getExperimentsByLesson: ContentRepository['getExperimentsByLesson'],
  getSimulationsByLesson: ContentRepository['getSimulationsByLesson'] = vi
    .fn()
    .mockResolvedValue([]),
  getInquiriesByLesson: ContentRepository['getInquiriesByLesson'] = vi.fn().mockResolvedValue([])
): ContentRepository {
  return {
    getGamesByLesson,
    getExperimentsByLesson,
    getSimulationsByLesson,
    getInquiriesByLesson,
    getDataActivitiesByLesson: vi.fn().mockResolvedValue([]),
  } as ContentRepository;
}

describe('ActivityCatalogService', () => {
  it('يجلب الأنواع الأربعة مرة واحدة وبنفس AbortSignal', async () => {
    const getGamesByLesson = vi.fn().mockResolvedValue([game]);
    const getExperimentsByLesson = vi.fn().mockResolvedValue([experiment]);
    const getSimulationsByLesson = vi.fn().mockResolvedValue([simulation]);
    const getInquiriesByLesson = vi.fn().mockResolvedValue([inquiry]);
    const service = createActivityCatalogService(
      repositoryWith(
        getGamesByLesson,
        getExperimentsByLesson,
        getSimulationsByLesson,
        getInquiriesByLesson
      )
    );
    const controller = new AbortController();

    const result = await service.getActivitiesByLesson('lesson-one', {
      signal: controller.signal,
    });

    for (const method of [
      getGamesByLesson,
      getExperimentsByLesson,
      getSimulationsByLesson,
      getInquiriesByLesson,
    ]) {
      expect(method).toHaveBeenCalledTimes(1);
      expect(method).toHaveBeenCalledWith('lesson-one', { signal: controller.signal });
    }

    expect(result.map((activity) => activity.kind)).toEqual([
      'matching',
      'experiment',
      'simulation',
      'inquiry',
    ]);
  });

  it('يبدأ طلبات repository الأربعة قبل انتظار أي واحد منها', async () => {
    let resolveGames!: (value: Game[]) => void;
    let resolveExperiments!: (value: Experiment[]) => void;
    let resolveSimulations!: (value: Simulation[]) => void;
    let resolveInquiries!: (value: Inquiry[]) => void;

    const gamesPromise = new Promise<Game[]>((resolve) => {
      resolveGames = resolve;
    });
    const experimentsPromise = new Promise<Experiment[]>((resolve) => {
      resolveExperiments = resolve;
    });
    const simulationsPromise = new Promise<Simulation[]>((resolve) => {
      resolveSimulations = resolve;
    });
    const inquiriesPromise = new Promise<Inquiry[]>((resolve) => {
      resolveInquiries = resolve;
    });

    const getGamesByLesson = vi.fn(() => gamesPromise);
    const getExperimentsByLesson = vi.fn(() => experimentsPromise);
    const getSimulationsByLesson = vi.fn(() => simulationsPromise);
    const getInquiriesByLesson = vi.fn(() => inquiriesPromise);
    const service = createActivityCatalogService(
      repositoryWith(
        getGamesByLesson,
        getExperimentsByLesson,
        getSimulationsByLesson,
        getInquiriesByLesson
      )
    );

    const resultPromise = service.getActivitiesByLesson('lesson-one');

    expect(getGamesByLesson).toHaveBeenCalledTimes(1);
    expect(getExperimentsByLesson).toHaveBeenCalledTimes(1);
    expect(getSimulationsByLesson).toHaveBeenCalledTimes(1);
    expect(getInquiriesByLesson).toHaveBeenCalledTimes(1);

    resolveGames([game]);
    resolveExperiments([experiment]);
    resolveSimulations([simulation]);
    resolveInquiries([inquiry]);

    await expect(resultPromise).resolves.toHaveLength(4);
  });

  it('يمرر فشل repository بدل إخفائه', async () => {
    const service = createActivityCatalogService(
      repositoryWith(
        vi.fn().mockRejectedValue(new Error('games failed')),
        vi.fn().mockResolvedValue([experiment])
      )
    );

    await expect(service.getActivitiesByLesson('lesson-one')).rejects.toThrow('games failed');
  });

  it('يرفض نشاطًا أعاده repository من درس آخر', async () => {
    const service = createActivityCatalogService(
      repositoryWith(
        vi.fn().mockResolvedValue([{ ...game, lessonId: 'lesson-two' }]),
        vi.fn().mockResolvedValue([])
      )
    );

    await expect(service.getActivitiesByLesson('lesson-one')).rejects.toThrow(/outside lesson/);
  });
});
