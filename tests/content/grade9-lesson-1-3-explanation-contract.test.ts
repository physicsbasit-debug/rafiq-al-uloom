import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import {
  grade9Lesson13ExplanationNumbers,
  grade9Lesson13ExplanationStages,
  grade9Lesson13PathReservations,
} from '@content/learning-design/grade9-lesson-1-3-learning-design';
import { grade9Lesson13GoldenExplanation } from '@content/learning-design/grade9-lesson-1-3-experience-contract';
import { grade9Lesson11GoldenExperience } from '@content/learning-design/grade9-lesson-1-1-experience-contract';
import { grade9Lesson12GoldenExperience } from '@content/learning-design/grade9-lesson-1-2-experience-contract';

describe('Grade 9 lesson 1-3 Golden explanation contract', () => {
  it('يقفل ست مراحل شرح أساسي مستقلة بالمفاتيح والوظائف والسياقات', () => {
    expect(grade9Lesson13GoldenExplanation).toHaveLength(6);
    expect(grade9Lesson13GoldenExplanation.every(({ path }) => path === 'explanation')).toBe(true);

    for (const key of ['questionKey', 'visualKey', 'cognitiveFunction', 'contextKey'] as const) {
      const values = grade9Lesson13GoldenExplanation.map((moment) => moment[key]);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('يربط المراحل الثلاث الأولى بقياس الزمن والأخيرة بالقياس المتكرر والزمن الدوري', () => {
    expect(
      grade9Lesson13GoldenExplanation.slice(0, 3).map(({ objectiveKey }) => objectiveKey)
    ).toEqual(Array(3).fill('g9-s1-u1-l3-o2'));
    expect(
      grade9Lesson13GoldenExplanation.slice(3).map(({ objectiveKey }) => objectiveKey)
    ).toEqual(Array(3).fill('g9-s1-u1-l3-o3'));
    expect(grade9Lesson13ExplanationStages.map(({ id }) => id)).toEqual(
      grade9Lesson13GoldenExplanation.map(({ id }) => id)
    );
  });

  it('يثبت قراءة تناظرية بسيطة 2:14 وقراءة رقمية مستقلة أكثر تفصيلًا', () => {
    const { stopwatchReadings } = grade9Lesson13ExplanationNumbers;
    expect(stopwatchReadings.analogMinutes).toBe(2);
    expect(stopwatchReadings.analogSeconds).toBe(14);
    expect(stopwatchReadings.analogDisplay).toBe('2:14');
    expect(stopwatchReadings.digitalDisplay).toBe('00:02:14.37');
  });

  it('يثبت موقف 12 تأرجحًا بعيدًا عن أرقام سؤال المراجعة الرسمي', () => {
    const { pendulumMultiple } = grade9Lesson13ExplanationNumbers;
    expect(pendulumMultiple.oscillations).toBe(12);
    expect(pendulumMultiple.totalSeconds / pendulumMultiple.oscillations).toBeCloseTo(1.23, 10);

    const reviewOnly = grade9Lesson13PathReservations.reviewOnly;
    expect(reviewOnly.oscillationCounts).toEqual([20, 50]);
    expect(reviewOnly.twentyOscillationsSeconds).toBe(17.4);
    expect(reviewOnly.fiftyOscillationsSeconds).toBe(43.2);
    expect(reviewOnly.framesPerSecond).toBe(25);
    expect(reviewOnly.frameIntervalSeconds).toBe(0.04);
  });

  it('يثبت بيانات المرحلة السادسة النهائية ومفاتيحها دون أسماء مرتبطة بعدد قديم', () => {
    const { strategyComparison } = grade9Lesson13ExplanationNumbers;
    expect(strategyComparison.referencePeriodSeconds).toBe(1.36);
    expect(strategyComparison.singleCycleTrialsSeconds).toEqual([1.08, 1.58, 1.16]);
    expect(strategyComparison.manyCycleCount).toBe(16);
    expect(strategyComparison.manyCycleReferenceTotalSeconds).toBe(21.76);
    expect(strategyComparison.manyCycleObservedTotalSeconds).toBe(21.99);

    const derived =
      strategyComparison.manyCycleObservedTotalSeconds / strategyComparison.manyCycleCount;
    expect(derived).toBeCloseTo(1.374375, 6);
    expect(Number(derived.toFixed(2))).toBe(1.37);

    const deviations = strategyComparison.singleCycleTrialsSeconds.map((value) =>
      Number((value - strategyComparison.referencePeriodSeconds).toFixed(2))
    );
    expect(deviations).toEqual([-0.28, 0.22, -0.2]);
    expect(
      Number(
        (
          strategyComparison.manyCycleObservedTotalSeconds -
          strategyComparison.manyCycleReferenceTotalSeconds
        ).toFixed(2)
      )
    ).toBe(0.23);

    const stage6 = grade9Lesson13GoldenExplanation[5];
    expect(stage6.visualKey).toBe('g9-l13-measurement-strategy-comparison-v1');
    expect(stage6.contextKey).toBe('reference-period-protocol-comparison');
  });

  it('يحجز تجربة ساعة الجسم للأنشطة', () => {
    expect(grade9Lesson13PathReservations.activityOnly.bodyClockPulseCounts).toEqual([10, 50]);
  });

  it('لا يعيد استخدام مفاتيح 1-1 أو 1-2 حرفيًا في الشرح الجديد', () => {
    const previous = [...grade9Lesson11GoldenExperience, ...grade9Lesson12GoldenExperience];

    for (const key of ['questionKey', 'visualKey', 'cognitiveFunction', 'contextKey'] as const) {
      const previousValues = new Set(
        previous.map((moment) => moment[key]).filter((value): value is string => Boolean(value))
      );
      for (const moment of grade9Lesson13GoldenExplanation) {
        const value = moment[key];
        if (value) expect(previousValues.has(value)).toBe(false);
      }
    }
  });

  it('يثبت أن قراءتي المرحلة 2 مستقلتان في المفاتيح والسياق', () => {
    const stage2 = grade9Lesson13GoldenExplanation[1];

    expect(stage2.visualKey).toBe('g9-l13-analog-digital-independent-readings-v2');
    expect(stage2.contextKey).toBe('independent-analog-and-digital-readings');
  });

  it('يقفل نص المرحلة 3 ويحذف جسر ساعة الجسم من الشرح الأساسي', () => {
    const source = readFileSync(
      'src/features/student/lesson-view/Grade9TimeMeasurementLesson.tsx',
      'utf8'
    );

    expect(source).toContain(
      'في هذا الشرح نفترض أن زمن الاستجابة قد يضيف خطأً بنحو 0.2–0.3 ثانية.'
    );
    expect(source).not.toContain('كتابك يوضح أن زمن استجابة الإنسان');
    expect(source).not.toContain('نبضة قلب واحدة');
    expect(source).not.toContain('rafiq-body-clock-bridge');
  });
});
