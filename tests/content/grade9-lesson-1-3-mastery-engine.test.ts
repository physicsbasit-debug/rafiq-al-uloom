import { describe, expect, it } from 'vitest';

import { GRADE9_L13_MASTERY_VARIANTS } from '@content/learning-design/grade9-lesson-1-3-mastery-design';
import {
  buildMq3Choices,
  evaluateMq4NumericInput,
  orderMq1Candidates,
  selectMasteryVariant,
} from '@features/mastery/grade9-time-measurement/mastery-engine';

describe('L13 mastery engine RED', () => {
  it('اختيار المتغير حتمي للبذرة نفسها', () => {
    const variants = GRADE9_L13_MASTERY_VARIANTS.mq3;

    const first = selectMasteryVariant({
      variants,
      seed: 17,
      seenVariantKeys: [],
      lastVariantKey: null,
    });

    const second = selectMasteryVariant({
      variants,
      seed: 17,
      seenVariantKeys: [],
      lastVariantKey: null,
    });

    expect(second.variantKey).toBe(first.variantKey);
  });

  it('يفضل unseen أولًا ثم يمنع lastVariantKey عند استهلاك المخزون', () => {
    const variants = GRADE9_L13_MASTERY_VARIANTS.mq3;

    const unseen = selectMasteryVariant({
      variants,
      seed: 9,
      seenVariantKeys: [variants[0].variantKey],
      lastVariantKey: variants[0].variantKey,
    });

    expect(unseen.variantKey).not.toBe(variants[0].variantKey);

    const afterAllSeen = selectMasteryVariant({
      variants,
      seed: 9,
      seenVariantKeys: variants.map((variant) => variant.variantKey),
      lastVariantKey: variants[0].variantKey,
    });

    expect(afterAllSeen.variantKey).not.toBe(variants[0].variantKey);
  });

  it('بعد استهلاك المخزون يختار الأقل حداثة ولا يكرر المتغير الأخير', () => {
    const variants = GRADE9_L13_MASTERY_VARIANTS.mq3;
    const [first, second, third] = variants;

    const selected = selectMasteryVariant({
      variants,
      seed: 682,
      seenVariantKeys: [first.variantKey, second.variantKey, third.variantKey, first.variantKey],
      lastVariantKey: first.variantKey,
    });

    expect(selected.variantKey).toBe(second.variantKey);
    expect(selected.variantKey).not.toBe(first.variantKey);
  });

  it('خلط MQ1 لا يعرض A-B-C-D بترتيبها النسبي الصحيح', () => {
    const variant = GRADE9_L13_MASTERY_VARIANTS.mq1[0];

    for (let seed = 1; seed <= 80; seed += 1) {
      const ordered = orderMq1Candidates(variant, seed);
      const ids = ordered.map((step) => step.id);

      const positions = ['A', 'B', 'C', 'D'].map((id) => ids.indexOf(id));
      const correctRelativeOrder =
        positions[0] < positions[1] && positions[1] < positions[2] && positions[2] < positions[3];

      expect(correctRelativeOrder).toBe(false);
    }
  });

  it('خلط MQ1 لا يضع E وF معًا في أول موضعين', () => {
    const variant = GRADE9_L13_MASTERY_VARIANTS.mq1[0];

    for (let seed = 1; seed <= 80; seed += 1) {
      const firstTwo = orderMq1Candidates(variant, seed)
        .slice(0, 2)
        .map((step) => step.id);

      expect(new Set(firstTwo)).not.toEqual(new Set(['E', 'F']));
    }
  });

  it('MQ3 يعرض 4 خيارات فقط: الصحيح + الوسيط + مشتتين دوارين', () => {
    const variant = GRADE9_L13_MASTERY_VARIANTS.mq3[0];

    for (let rotation = 0; rotation < 3; rotation += 1) {
      const choices = buildMq3Choices(variant, rotation);

      expect(choices).toHaveLength(4);
      expect(choices.filter((choice) => choice.correct)).toHaveLength(1);
      expect(choices.some((choice) => choice.diagnostic === 'used-median-instead-of-mean')).toBe(
        true
      );

      const rotating = choices.filter((choice) =>
        [
          'used-total-instead-of-mean',
          'divided-by-too-few-trials',
          'divided-by-too-many-trials',
        ].includes(choice.diagnostic ?? '')
      );

      expect(rotating).toHaveLength(2);
    }
  });

  it('MQ3 يطبق half-up على 0.625 فيعرض 0.63', () => {
    const variant = GRADE9_L13_MASTERY_VARIANTS.mq3.find(
      (item) => item.variantKey === 'ball-drop-1_2m'
    );

    expect(variant).toBeDefined();

    const allChoices = [0, 1, 2].flatMap((rotation) => buildMq3Choices(variant!, rotation));

    const divideByFour = allChoices.find(
      (choice) => choice.diagnostic === 'divided-by-too-few-trials'
    );

    expect(divideByFour?.displayMs).toBe(630);
  });

  it('MQ3 يفحص الفصل على القيم المعروضة بعد التقريب: أكثر من 8 ms', () => {
    for (const variant of GRADE9_L13_MASTERY_VARIANTS.mq3) {
      for (let rotation = 0; rotation < 3; rotation += 1) {
        const choices = buildMq3Choices(variant, rotation);

        for (let i = 0; i < choices.length; i += 1) {
          for (let j = i + 1; j < choices.length; j += 1) {
            expect(Math.abs(choices[i].displayMs - choices[j].displayMs)).toBeGreaterThan(8);
          }
        }
      }
    }
  });

  it('MQ4 يقبل الصحيح بالتساوي التام لا بنافذة tolerance', () => {
    const variant = GRADE9_L13_MASTERY_VARIANTS.mq4[0];

    expect(evaluateMq4NumericInput('0.74', variant)).toEqual({ status: 'correct' });
    expect(evaluateMq4NumericInput('٠٫٧٤', variant)).toEqual({ status: 'correct' });
    expect(evaluateMq4NumericInput('0.7400', variant)).toEqual({ status: 'correct' });

    expect(evaluateMq4NumericInput('0.741', variant)).toEqual({
      status: 'wrong',
      diagnostic: 'generic-period-calculation-error',
    });
  });

  it('MQ4 يستخدم ±0.005 للتشخيص المعكوس فقط', () => {
    const variant = GRADE9_L13_MASTERY_VARIANTS.mq4[0];

    expect(evaluateMq4NumericInput('1.351', variant)).toEqual({
      status: 'wrong',
      diagnostic: 'reversed-division',
    });

    expect(evaluateMq4NumericInput('1.356', variant)).toEqual({
      status: 'wrong',
      diagnostic: 'reversed-division',
    });

    expect(evaluateMq4NumericInput('1.357', variant)).toEqual({
      status: 'wrong',
      diagnostic: 'generic-period-calculation-error',
    });
  });

  it('MQ4 يشخص الزمن الكلي والضرب ويطبق بيانات المتغير الثاني', () => {
    const first = GRADE9_L13_MASTERY_VARIANTS.mq4[0];
    const second = GRADE9_L13_MASTERY_VARIANTS.mq4[1];

    expect(evaluateMq4NumericInput('5.92', first)).toEqual({
      status: 'wrong',
      diagnostic: 'used-total-time',
    });

    expect(evaluateMq4NumericInput('47.36', first)).toEqual({
      status: 'wrong',
      diagnostic: 'multiplied-instead-of-divided',
    });

    expect(evaluateMq4NumericInput('0.73', second)).toEqual({ status: 'correct' });

    expect(evaluateMq4NumericInput('7.30', second)).toEqual({
      status: 'wrong',
      diagnostic: 'used-total-time',
    });

    expect(evaluateMq4NumericInput('73.00', second)).toEqual({
      status: 'wrong',
      diagnostic: 'multiplied-instead-of-divided',
    });

    expect(evaluateMq4NumericInput('1.370', second)).toEqual({
      status: 'wrong',
      diagnostic: 'reversed-division',
    });
  });

  it('MQ4 يرفض الفارغ والحروف والفواصل المتعددة والوحدة داخل الحقل', () => {
    const variant = GRADE9_L13_MASTERY_VARIANTS.mq4[0];

    expect(evaluateMq4NumericInput('   ', variant)).toEqual({ status: 'empty' });
    expect(evaluateMq4NumericInput('abc', variant)).toEqual({ status: 'invalid' });
    expect(evaluateMq4NumericInput('0.7.4', variant)).toEqual({ status: 'invalid' });
    expect(evaluateMq4NumericInput('0.74 ثانية', variant)).toEqual({ status: 'invalid' });
  });
});
