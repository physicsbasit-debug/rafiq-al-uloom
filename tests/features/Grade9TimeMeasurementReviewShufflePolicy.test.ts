import { describe, expect, it } from 'vitest';

import {
  buildReviewChoiceLayout,
  type ReviewChoiceIdentity,
} from '@features/student/review-questions/review-choice-layout';

function makeChoices(questionIndex: number): ReviewChoiceIdentity[] {
  return ['a', 'b', 'c', 'd'].map((suffix, optionIndex) => ({
    id: `q${questionIndex + 1}-${suffix}`,
    text: `خيار ${questionIndex + 1}-${suffix}`,
    diagnosis: optionIndex === 0 ? 'correct' : `distractor-${optionIndex}`,
    correct: optionIndex === 0,
  }));
}

describe('Lesson 1-3 review shuffle policy', () => {
  it('يغير موضع العرض فقط ويحفظ هوية الخيار وتشخيصه', () => {
    const original = makeChoices(0);
    const shown = buildReviewChoiceLayout(original, {
      seed: 17,
      questionIndex: 0,
      attempt: 1,
      preserveOrder: false,
    });

    expect(new Set(shown.map((choice) => choice.id))).toEqual(
      new Set(original.map((choice) => choice.id))
    );

    for (const choice of shown) {
      const source = original.find((item) => item.id === choice.id);
      expect(choice.text).toBe(source?.text);
      expect(choice.diagnosis).toBe(source?.diagnosis);
      expect(choice.correct).toBe(source?.correct);
    }
  });

  it('لا يخلط ما يعتمد معناه على ترتيب الخيارات', () => {
    const original = makeChoices(0);
    const shown = buildReviewChoiceLayout(original, {
      seed: 29,
      questionIndex: 0,
      attempt: 1,
      preserveOrder: true,
    });

    expect(shown.map((choice) => choice.id)).toEqual(original.map((choice) => choice.id));
  });

  it('يعيد الخلط عند إعادة المحاولة', () => {
    const original = makeChoices(0);
    const first = buildReviewChoiceLayout(original, {
      seed: 41,
      questionIndex: 0,
      attempt: 1,
      preserveOrder: false,
    });
    const retry = buildReviewChoiceLayout(original, {
      seed: 41,
      questionIndex: 0,
      attempt: 2,
      preserveOrder: false,
    });

    expect(retry.map((choice) => choice.id)).not.toEqual(first.map((choice) => choice.id));
  });

  it.each([3, 7, 11, 19, 31, 47])(
    'يوزع موضع الصحيح عبر الأسئلة الخمسة دون أكثر من تكرارين في الموضع نفسه - seed %i',
    (seed) => {
      const positions = Array.from({ length: 5 }, (_, questionIndex) => {
        const layout = buildReviewChoiceLayout(makeChoices(questionIndex), {
          seed,
          questionIndex,
          attempt: 1,
          preserveOrder: false,
        });
        return layout.findIndex((choice) => choice.correct);
      });

      expect(new Set(positions).size).toBeGreaterThan(1);

      const counts = new Map<number, number>();
      for (const position of positions) {
        counts.set(position, (counts.get(position) ?? 0) + 1);
      }
      expect(Math.max(...counts.values())).toBeLessThanOrEqual(2);
    }
  );
});
