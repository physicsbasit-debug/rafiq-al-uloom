import { describe, expect, it } from 'vitest';

import {
  findGoldenLearningConflicts,
  hasGoldenLearningConflicts,
  type GoldenLearningMoment,
} from '@content/learning-design/learning-experience-guard';

const BASE: GoldenLearningMoment = {
  id: 'review-a',
  path: 'review',
  questionKey: 'question-a',
  visualKey: '/visual-a.svg',
  cognitiveFunction: 'cognitive-a',
  objectiveKey: 'objective-a',
  skill: 'skill-a',
};

describe('Golden learning experience guard', () => {
  it('allows distinct learning moments across paths', () => {
    const moments: GoldenLearningMoment[] = [
      BASE,
      {
        ...BASE,
        id: 'mastery-b',
        path: 'mastery',
        questionKey: 'question-b',
        visualKey: '/visual-b.svg',
        cognitiveFunction: 'cognitive-b',
      },
    ];

    expect(findGoldenLearningConflicts(moments)).toEqual([]);
    expect(hasGoldenLearningConflicts(moments)).toBe(false);
  });

  it('rejects recycling the same semantic question across different paths', () => {
    const conflicts = findGoldenLearningConflicts([
      BASE,
      {
        ...BASE,
        id: 'mastery-copy',
        path: 'mastery',
        visualKey: '/different.svg',
        cognitiveFunction: 'different-cognitive-function',
      },
    ]);

    expect(conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'question',
          key: 'question-a',
          firstPath: 'review',
          secondPath: 'mastery',
        }),
      ])
    );
  });

  it('rejects recycling the same instructional visual across different paths', () => {
    const conflicts = findGoldenLearningConflicts([
      BASE,
      {
        ...BASE,
        id: 'game-copy',
        path: 'game',
        questionKey: 'different-question',
        cognitiveFunction: 'different-cognitive-function',
      },
    ]);

    expect(conflicts.some(({ kind }) => kind === 'visual')).toBe(true);
  });

  it('rejects recycling the same precise cognitive function across different paths', () => {
    const conflicts = findGoldenLearningConflicts([
      BASE,
      {
        ...BASE,
        id: 'activity-copy',
        path: 'activity',
        questionKey: 'different-question',
        visualKey: '/different.svg',
      },
    ]);

    expect(conflicts.some(({ kind }) => kind === 'cognitive')).toBe(true);
  });

  it('does not flag intentional variation inside the same path', () => {
    const variation: GoldenLearningMoment = {
      ...BASE,
      id: 'review-variation',
      questionKey: BASE.questionKey,
      visualKey: BASE.visualKey,
      cognitiveFunction: BASE.cognitiveFunction,
    };

    expect(findGoldenLearningConflicts([BASE, variation])).toEqual([]);
  });
});
