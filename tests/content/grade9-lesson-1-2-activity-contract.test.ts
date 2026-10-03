import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { grade9Lesson12ActivityCategories } from '@content/learning-design/grade9-lesson-1-2-activities-design';
import {
  grade9Lesson12ExplanationReservations,
  grade9Lesson12GoldenExperience,
} from '@content/learning-design/grade9-lesson-1-2-experience-contract';
import { findGoldenLearningConflicts } from '@content/learning-design/learning-experience-guard';
import { findLearningExperienceReservationConflicts } from '@content/learning-design/learning-experience-reservation-guard';

describe('Grade 9 lesson 1-2 Golden scientific activities contract', () => {
  const activities = grade9Lesson12GoldenExperience.filter(({ path }) => path === 'activity');
  const reviews = grade9Lesson12GoldenExperience.filter(({ path }) => path === 'review');

  it('locks exactly four top-level activity categories in the charter order', () => {
    expect(grade9Lesson12ActivityCategories.map(({ id }) => id)).toEqual([
      'inquiry',
      'simulation',
      'data',
      'experiment',
    ]);
    expect(grade9Lesson12ActivityCategories).toHaveLength(4);
  });

  it('reserves five review moments and nine distinct activity moments', () => {
    expect(reviews).toHaveLength(5);
    expect(activities).toHaveLength(9);
    expect(new Set(activities.map(({ questionKey }) => questionKey)).size).toBe(9);
    expect(new Set(activities.map(({ visualKey }) => visualKey)).size).toBe(9);
    expect(new Set(activities.map(({ cognitiveFunction }) => cognitiveFunction)).size).toBe(9);
    expect(new Set(activities.map(({ contextKey }) => contextKey)).size).toBe(9);
  });

  it('has no question, visual, cognitive, or context recycling across explanation, review, and activities', () => {
    expect(findGoldenLearningConflicts(grade9Lesson12GoldenExperience)).toEqual([]);
    expect(
      findLearningExperienceReservationConflicts([
        ...grade9Lesson12ExplanationReservations,
        ...grade9Lesson12GoldenExperience,
      ])
    ).toEqual([]);
  });

  it('allows spaced-practice skill repetition only when the transfer context is genuinely new', () => {
    const reviewIndirect = grade9Lesson12GoldenExperience.find(
      ({ id }) => id === 'g9-s1-u1-l2-rq2'
    );
    const activityIndirect = grade9Lesson12GoldenExperience.find(
      ({ id }) => id === 'g9-s1-u1-l2-activity-experiment-indirect'
    );

    expect(reviewIndirect?.skill).toBe(activityIndirect?.skill);
    expect(reviewIndirect?.questionKey).not.toBe(activityIndirect?.questionKey);
    expect(reviewIndirect?.visualKey).not.toBe(activityIndirect?.visualKey);
    expect(reviewIndirect?.cognitiveFunction).not.toBe(activityIndirect?.cognitiveFunction);
    expect(reviewIndirect?.contextKey).not.toBe(activityIndirect?.contextKey);
  });

  it('does not smuggle old explanation or review scenes back by changing only the numbers', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'src/features/activities/length-volume/Grade9LengthVolumeActivities.tsx'
      ),
      'utf8'
    );

    const forbiddenExactScenes = [
      '500 ورقة',
      '2.67 mm',
      '42 mL',
      '57 mL',
      '100 ورقة',
      '3.28 mm',
      '1000 mL',
      '6 mL',
      'سلك نحاسي رفيع جدًا',
      'مثبّت على لوحة ولا يمكن فرده',
    ];

    forbiddenExactScenes.forEach((scene) => expect(source).not.toContain(scene));
    expect(source).toContain('25 بطاقة');
    expect(source).toContain('حلقة نايلون');
    expect(source).toContain('قرص معدني رقيق');
    expect(source).toContain('حجر مصقول');
  });

  it('keeps all scientific quantities on ScientificText and never reintroduces hand-written bdi patches', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'src/features/activities/length-volume/Grade9LengthVolumeActivities.tsx'
      ),
      'utf8'
    );
    expect(source).toContain('ScientificText');
    expect(source).not.toContain('<bdi');
  });

  it('locks readable measurement instruments and the mL-to-cm³ bridge into the guided experiment', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'src/features/activities/length-volume/Grade9LengthVolumeActivities.tsx'
      ),
      'utf8'
    );

    expect(source).toContain('أصغر تقسيم في المسطرة = 1 mm');
    expect(source).toContain('كل تقسيم على التدريج الكسري = 0.01 mm');
    expect(source).toContain('التدريج الجانبي بوحدة mm');
    expect(source).toContain('1 mL = 1 cm³');
    expect(source).toContain('حجم الماء المزاح بالمليلتر');
    expect(source).toContain('اقرأ من أسفل السطح المقعر للماء');
  });
});
