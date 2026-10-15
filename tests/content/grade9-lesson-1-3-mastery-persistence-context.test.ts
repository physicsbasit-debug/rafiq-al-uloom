import { describe, expect, it } from 'vitest';

import { buildMasteryExperienceContext } from '@features/mastery/grade9-time-measurement/mastery-engine';

describe('L13 mastery persistence experience context', () => {
  it('يبني سياق الحفظ من التقرير والتشخيص والمحاولة وتاريخ المتغيرات', () => {
    const variantHistory = {
      mq1: ['water-vessel-target-mark', 'sand-funnel-target-mark'],
      mq2: ['ramp-release-1_27', 'ramp-two-marks-2_43'],
      mq3: ['ball-drop-1_8m', 'ball-drop-1_2m'],
      mq4: ['spring-cart-8-in-5_92', 'spring-cart-10-cycles-7_30'],
      mq5: ['flex-platform-reference-up', 'spring-seat-reference-down'],
    } as const;

    const context = buildMasteryExperienceContext({
      correctness: [true, false, true, true, false],
      diagnosticCodes: [
        null,
        'display-decimals-equal-accuracy',
        null,
        null,
        'correct-position-wrong-direction',
      ],
      attemptCount: 2,
      variantHistory,
    });

    expect(context).toEqual({
      schema: 'g9-l13-time-mastery-v1',
      scoreNof5: '3/5',
      lessonMasteryLevel: 'consolidating',
      objective2_1Status: 'needs_reinforcement',
      objective3_1Status: 'needs_reinforcement',
      allObjectivesMastered: false,
      diagnosticCodes: [
        null,
        'display-decimals-equal-accuracy',
        null,
        null,
        'correct-position-wrong-direction',
      ],
      attemptCount: 2,
      variantHistory,
    });
  });

  it('يرفض عدد نتائج أو تشخيصات لا يساوي خمسة', () => {
    const variantHistory = {
      mq1: ['water-vessel-target-mark'],
      mq2: ['ramp-release-1_27'],
      mq3: ['ball-drop-1_8m'],
      mq4: ['spring-cart-8-in-5_92'],
      mq5: ['flex-platform-reference-up'],
    } as const;

    expect(() =>
      buildMasteryExperienceContext({
        correctness: [true, true, true, true],
        diagnosticCodes: [null, null, null, null, null],
        attemptCount: 1,
        variantHistory,
      })
    ).toThrow();

    expect(() =>
      buildMasteryExperienceContext({
        correctness: [true, true, true, true, true],
        diagnosticCodes: [null, null, null, null],
        attemptCount: 1,
        variantHistory,
      })
    ).toThrow();
  });

  it('يرفض attemptCount غير موجب أو غير صحيح', () => {
    const variantHistory = {
      mq1: ['water-vessel-target-mark'],
      mq2: ['ramp-release-1_27'],
      mq3: ['ball-drop-1_8m'],
      mq4: ['spring-cart-8-in-5_92'],
      mq5: ['flex-platform-reference-up'],
    } as const;

    for (const attemptCount of [0, -1, 1.5]) {
      expect(() =>
        buildMasteryExperienceContext({
          correctness: [true, true, true, true, true],
          diagnosticCodes: [null, null, null, null, null],
          attemptCount,
          variantHistory,
        })
      ).toThrow();
    }
  });
});
