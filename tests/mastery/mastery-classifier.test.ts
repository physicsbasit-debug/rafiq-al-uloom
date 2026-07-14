import { describe, expect, it } from 'vitest';
import { classifyMasteryScore } from '@features/mastery/mastery-classifier';
import { getMasteryRecommendation } from '@features/mastery/recommendations';
import type { MasteryClassification } from '@shared-types/mastery.types';

describe('mastery-classifier: حدود التصنيف', () => {
  it.each([
    [0, 'يحتاج مراجعة'],
    [59, 'يحتاج مراجعة'],
    [60, 'قريب من الإتقان'],
    [79, 'قريب من الإتقان'],
    [80, 'متقن'],
    [100, 'متقن'],
  ] as Array<[number, MasteryClassification]>)('يصنف درجة %s تصنيفًا صحيحًا', (score, expected) => {
    expect(classifyMasteryScore(score)).toBe(expected);
  });

  it('يعطي توصية نصية لكل تصنيف', () => {
    const classifications: MasteryClassification[] = ['متقن', 'قريب من الإتقان', 'يحتاج مراجعة'];

    for (const classification of classifications) {
      expect(getMasteryRecommendation(classification).length).toBeGreaterThan(10);
    }
  });
});
