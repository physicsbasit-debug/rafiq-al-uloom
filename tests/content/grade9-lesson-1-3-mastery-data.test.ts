import { describe, expect, it } from 'vitest';

import {
  GRADE9_L13_MASTERY_VARIANTS,
  MQ2_FINAL_OPTIONS,
} from '@content/learning-design/grade9-lesson-1-3-mastery-design';
import {
  grade9Lesson13GoldenExplanation,
  grade9Lesson13GoldenReview,
} from '@content/learning-design/grade9-lesson-1-3-experience-contract';

const allVariants = [
  ...GRADE9_L13_MASTERY_VARIANTS.mq1,
  ...GRADE9_L13_MASTERY_VARIANTS.mq2,
  ...GRADE9_L13_MASTERY_VARIANTS.mq3,
  ...GRADE9_L13_MASTERY_VARIANTS.mq4,
  ...GRADE9_L13_MASTERY_VARIANTS.mq5,
];

describe('L13 mastery data contract', () => {
  it('يثبت 2/2/3/2/2 متغيرات حقيقية عبر MQ1–MQ5', () => {
    expect(GRADE9_L13_MASTERY_VARIANTS.mq1).toHaveLength(2);
    expect(GRADE9_L13_MASTERY_VARIANTS.mq2).toHaveLength(2);
    expect(GRADE9_L13_MASTERY_VARIANTS.mq3).toHaveLength(3);
    expect(GRADE9_L13_MASTERY_VARIANTS.mq4).toHaveLength(2);
    expect(GRADE9_L13_MASTERY_VARIANTS.mq5).toHaveLength(2);
  });

  it('يبقي physicsTeacherReviewed=false لكل متغير', () => {
    expect(allVariants.every((variant) => variant.physicsTeacherReviewed === false)).toBe(true);
  });

  it('يحجز variantKey/contextKey/visualKey بلا تكرار', () => {
    for (const field of ['variantKey', 'contextKey', 'visualKey'] as const) {
      const values = allVariants.map((variant) => variant[field]);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('لا يعيد سياقات الشرح أو المراجعة', () => {
    const existingContexts = new Set(
      [...grade9Lesson13GoldenExplanation, ...grade9Lesson13GoldenReview]
        .map((moment) => moment.contextKey)
        .filter(Boolean)
    );

    for (const variant of allVariants) {
      expect(existingContexts.has(variant.contextKey)).toBe(false);
    }
  });

  it('يثبت خيارات MQ2 الأربعة حرفيًا', () => {
    expect(MQ2_FINAL_OPTIONS.map((option) => option.text)).toEqual([
      'صحيح؛ لأن عرض منزلتين عشريتين يعني دقة القياس حتى 0.01 ثانية.',
      'غير صحيح؛ لأن التشغيل اليدوي يضيف أثر زمن الاستجابة رغم عرض منزلتين عشريتين.',
      'غير صحيح؛ لأن المؤقت الرقمي لا يناسب قياس الفترات الزمنية القصيرة.',
      'صحيح؛ لأن المؤقت الرقمي يلغي أثر استجابة الشخص عند التشغيل.',
    ]);

    for (const variant of GRADE9_L13_MASTERY_VARIANTS.mq2) {
      expect(variant.correctOptionId).toBe('manual-reaction-limit');
      expect(variant.prompt).not.toContain('شاشتك أسرع من يدك');
    }
  });

  it('يثبت مجموعات MQ3 الثلاث بترتيب الإدخال غير المرتب', () => {
    expect(
      GRADE9_L13_MASTERY_VARIANTS.mq3.map((variant) => ({
        height: variant.heightLabel,
        readings: variant.readingsHundredths,
        sum: variant.sumHundredths,
        mean: variant.meanHundredths,
        median: variant.medianHundredths,
      }))
    ).toEqual([
      {
        height: '1.8 م',
        readings: [55, 66, 58, 67, 59],
        sum: 305,
        mean: 61,
        median: 59,
      },
      {
        height: '1.2 م',
        readings: [47, 58, 42, 54, 49],
        sum: 250,
        mean: 50,
        median: 49,
      },
      {
        height: '0.8 م',
        readings: [36, 44, 38, 45, 37],
        sum: 200,
        mean: 40,
        median: 38,
      },
    ]);

    expect(
      GRADE9_L13_MASTERY_VARIANTS.mq3.every(
        (variant) => variant.displayRounding === 'half-up-to-hundredth'
      )
    ).toBe(true);
  });

  it('يثبت بيانات MQ4 المحسوبة', () => {
    expect(
      GRADE9_L13_MASTERY_VARIANTS.mq4.map((variant) => ({
        cycles: variant.cycles,
        total: variant.totalHundredths,
        correct: variant.correctHundredths,
        multiplied: variant.multipliedHundredths,
        reversed: variant.reversedTargetThousandths,
        tolerance: variant.reversedToleranceThousandths,
      }))
    ).toEqual([
      {
        cycles: 8,
        total: 592,
        correct: 74,
        multiplied: 4736,
        reversed: 1351,
        tolerance: 5,
      },
      {
        cycles: 10,
        total: 730,
        correct: 73,
        multiplied: 7300,
        reversed: 1370,
        tolerance: 5,
      },
    ]);
  });

  it('يجعل MQ5 الثاني سياق مقعد زنبركي لا مجرد عكس اتجاه المنصة', () => {
    const second = GRADE9_L13_MASTERY_VARIANTS.mq5[1];

    expect(second.variantKey).toBe('spring-seat-reference-down');
    expect(second.contextKey).toContain('spring-seat');
    expect(second.visualKey).toContain('spring-seat');
    expect(second.prompt).toContain('مقعد زنبركي');
    expect(second.prompt).not.toContain('بندول');
  });
});
