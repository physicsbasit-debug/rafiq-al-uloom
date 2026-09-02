import { describe, expect, it } from 'vitest';
import {
  buildLessonActivities,
  toExperimentActivity,
  toMatchingActivity,
  toSimulationActivity,
} from '@features/activities/activity-adapters';
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
  objective: 'هدف بشري',
  objectiveIds: ['objective-two'],
  tools: ['أداة'],
  steps: ['خطوة'],
  safetyNotes: ['تنبيه'],
  safetyLevel: 'teacher_supervised',
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

describe('activity adapters', () => {
  it('ينتج matching wrapper ويحافظ على payload دون mutation', () => {
    const snapshot = structuredClone(game);
    const activity = toMatchingActivity(game);

    expect(activity).toMatchObject({
      id: 'game-one',
      lessonId: 'lesson-one',
      kind: 'matching',
      title: 'مطابقة',
      objectiveIds: ['objective-one'],
      status: 'approved',
      source: 'curriculum_seed',
    });
    expect(activity.content).toBe(game);
    expect(activity.objectiveIds).not.toBe(game.objectiveIds);
    expect(game).toEqual(snapshot);
  });

  it('ينتج experiment wrapper ويحافظ على safety بلا rewriting', () => {
    const snapshot = structuredClone(experiment);
    const activity = toExperimentActivity(experiment);

    expect(activity.kind).toBe('experiment');
    expect(activity.content).toBe(experiment);
    expect(activity.content.safetyLevel).toBe('teacher_supervised');
    expect(activity.objectiveIds).toEqual(['objective-two']);
    expect(experiment).toEqual(snapshot);
  });

  it('ينتج simulation wrapper ويحافظ على config دون mutation', () => {
    const snapshot = structuredClone(simulation);
    const activity = toSimulationActivity(simulation);

    expect(activity.kind).toBe('simulation');
    expect(activity.content).toBe(simulation);
    expect(activity.objectiveIds).toEqual(['objective-three']);
    expect(simulation).toEqual(snapshot);
  });

  it.each([
    { objectiveIds: [], label: 'empty' },
    { objectiveIds: [''], label: 'blank' },
    { objectiveIds: ['objective-one', 'objective-one'], label: 'duplicate' },
  ])('يرفض objectiveIds غير الصالحة: $label', ({ objectiveIds }) => {
    expect(() => toMatchingActivity({ ...game, objectiveIds })).toThrow();
  });

  it('يرفض خلط محتوى أكثر من درس', () => {
    expect(() =>
      buildLessonActivities([game], [{ ...experiment, lessonId: 'lesson-two' }], [simulation])
    ).toThrow(/multiple lessons/);
  });

  it('يرتب الأنشطة حسب registry ويحافظ على ترتيب repository داخل النوع', () => {
    const gameTwo = { ...game, id: 'game-two', title: 'مطابقة 2' };
    const experimentTwo = { ...experiment, id: 'experiment-two', title: 'تجربة 2' };

    expect(
      buildLessonActivities([gameTwo, game], [experimentTwo, experiment], [simulation]).map(
        (activity) => activity.id
      )
    ).toEqual(['game-two', 'game-one', 'experiment-two', 'experiment-one', 'simulation-one']);
  });
});
