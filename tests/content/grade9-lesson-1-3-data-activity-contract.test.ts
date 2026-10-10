import { describe, expect, it } from 'vitest';

import { grade9Lesson13PulseDataActivity } from '@content/learning-design/grade9-lesson-1-3-learning-design';

describe('lesson 1-3 pulse data activity contract', () => {
  it('يثبت مجموعتي الراحة وبعد النشاط الخفيف', () => {
    expect(grade9Lesson13PulseDataActivity.datasets.rest).toEqual([8.4, 8.7, 8.2, 8.5, 8.6]);
    expect(grade9Lesson13PulseDataActivity.datasets.afterLightActivity).toEqual([
      6.3, 6.1, 5.9, 6.2, 6.0,
    ]);
  });

  it('يثبت الوسم الحرفي وعدم طلب متوسط جديد', () => {
    expect(grade9Lesson13PulseDataActivity.preparedDataLabel).toBe('بيانات توضيحية معدّة للنشاط');
    expect(grade9Lesson13PulseDataActivity.calculateNewAverage).toBe(false);
  });

  it('يثبت أن المطلوب مقارنة واستنتاج لا إعادة حساب', () => {
    expect(grade9Lesson13PulseDataActivity.studentTasks).toEqual([
      'compare-two-datasets',
      'identify-shorter-times',
      'infer-faster-pulse',
      'select-direct-evidence',
    ]);
  });
});
