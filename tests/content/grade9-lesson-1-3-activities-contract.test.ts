import { describe, expect, it } from 'vitest';

import { grade9Lesson13BodyClockActivity } from '@content/learning-design/grade9-lesson-1-3-learning-design';

describe('grade 9 lesson 1-3 Activities B body-clock contract', () => {
  it('يثبت تسلسل 10 + 10 + 50 نبضة وسياسة نافذة 6–12 ثانية', () => {
    expect(grade9Lesson13BodyClockActivity.pulseCounts).toEqual([10, 10, 50]);
    expect(grade9Lesson13BodyClockActivity.tenPulseTrials).toBe(2);
    expect(grade9Lesson13BodyClockActivity.tenPulseSuggestedWindowSeconds).toEqual([6, 12]);
    expect(grade9Lesson13BodyClockActivity.tenPulseWindowIsWarningOnly).toBe(true);
  });

  it('يثبت التنبؤ والمتوسط والمقارنة وسياسة التغذية الراجعة', () => {
    expect(grade9Lesson13BodyClockActivity.predictionBeforeMeasurement).toBe(true);
    expect(grade9Lesson13BodyClockActivity.predictionOptions).toBe(3);
    expect(grade9Lesson13BodyClockActivity.meanOfTenPulseTrialsRequired).toBe(true);
    expect(grade9Lesson13BodyClockActivity.compareFiftyPulseMethod).toBe(true);
    expect(grade9Lesson13BodyClockActivity.feedbackPolicy).toEqual({
      firstWrong: 'hint',
      secondWrong: 'reveal',
    });
  });

  it('يحصر القياسات الخام في الجلسة الحالية فقط', () => {
    expect(grade9Lesson13BodyClockActivity.rawMeasurementsPersistence).toBe('session-local-only');
    expect(grade9Lesson13BodyClockActivity.serverPersistenceAllowed).toBe(false);
  });

  it('لا يستخدم مصطلح الخطأ النسبي في العقد', () => {
    expect(JSON.stringify(grade9Lesson13BodyClockActivity)).not.toContain('الخطأ النسبي');
  });
});
