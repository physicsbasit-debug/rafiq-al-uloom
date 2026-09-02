import { describe, expect, it, vi } from 'vitest';
import { createActivityCatalogService } from '@services/activities/activity-catalog.service';
import type { ContentRepository } from '@services/data/content.repository';
import type { Experiment } from '@shared-types/experiment.types';
import type { Game } from '@shared-types/game.types';
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

function repositoryWith(
  getGamesByLesson: ContentRepository['getGamesByLesson'],
  getExperimentsByLesson: ContentRepository['getExperimentsByLesson'],
  getSimulationsByLesson: ContentRepository['getSimulationsByLesson'] = vi
    .fn()
    .mockResolvedValue([])
): ContentRepository {
  return {
    getGamesByLesson,
    getExperimentsByLesson,
    getSimulationsByLesson,
  } as ContentRepository;
}

describe('ActivityCatalogService', () => {
  it('يجلب games وexperiments وsimulations مرة واحدة وبنفس AbortSignal', async () => {
    const getGamesByLesson = vi.fn().mockResolvedValue([game]);
    const getExperimentsByLesson = vi.fn().mockResolvedValue([experiment]);
    const getSimulationsByLesson = vi.fn().mockResolvedValue([simulation]);
    const service = createActivityCatalogService(
      repositoryWith(getGamesByLesson, getExperimentsByLesson, getSimulationsByLesson)
    );
    const controller = new AbortController();

    const result = await service.getActivitiesByLesson('lesson-one', {
      signal: controller.signal,
    });

    expect(getGamesByLesson).toHaveBeenCalledTimes(1);
    expect(getExperimentsByLesson).toHaveBeenCalledTimes(1);
    expect(getSimulationsByLesson).toHaveBeenCalledTimes(1);
    expect(getGamesByLesson).toHaveBeenCalledWith('lesson-one', {
      signal: controller.signal,
    });
    expect(getExperimentsByLesson).toHaveBeenCalledWith('lesson-one', {
      signal: controller.signal,
    });
    expect(getSimulationsByLesson).toHaveBeenCalledWith('lesson-one', {
      signal: controller.signal,
    });
    expect(result.map((activity) => activity.kind)).toEqual([
      'matching',
      'experiment',
      'simulation',
    ]);
  });

  it('يبدأ طلبي repository قبل انتظار أي واحد منهما', async () => {
    let resolveGames!: (value: Game[]) => void;
    let resolveExperiments!: (value: Experiment[]) => void;
    let resolveSimulations!: (value: Simulation[]) => void;
    const gamesPromise = new Promise<Game[]>((resolve) => {
      resolveGames = resolve;
    });
    const experimentsPromise = new Promise<Experiment[]>((resolve) => {
      resolveExperiments = resolve;
    });
    const simulationsPromise = new Promise<Simulation[]>((resolve) => {
      resolveSimulations = resolve;
    });
    const getGamesByLesson = vi.fn(() => gamesPromise);
    const getExperimentsByLesson = vi.fn(() => experimentsPromise);
    const getSimulationsByLesson = vi.fn(() => simulationsPromise);
    const service = createActivityCatalogService(
      repositoryWith(getGamesByLesson, getExperimentsByLesson, getSimulationsByLesson)
    );

    const resultPromise = service.getActivitiesByLesson('lesson-one');

    expect(getGamesByLesson).toHaveBeenCalledTimes(1);
    expect(getExperimentsByLesson).toHaveBeenCalledTimes(1);
    expect(getSimulationsByLesson).toHaveBeenCalledTimes(1);

    resolveGames([game]);
    resolveExperiments([experiment]);
    resolveSimulations([simulation]);

    await expect(resultPromise).resolves.toHaveLength(3);
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
