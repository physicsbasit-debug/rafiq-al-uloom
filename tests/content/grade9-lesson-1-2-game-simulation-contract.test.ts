import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  grade9Lesson12ExplanationReservations,
  grade9Lesson12GameReservations,
  grade9Lesson12GoldenExperience,
} from '@content/learning-design/grade9-lesson-1-2-experience-contract';
import { findLearningExperienceReservationConflicts } from '@content/learning-design/learning-experience-reservation-guard';

describe('Grade 9 lesson 1-2 game + simulation round 2 contract', () => {
  it('keeps simulation inside the existing activity path and reserves the second round', () => {
    const activitySource = readFileSync(
      resolve(
        process.cwd(),
        'src/features/activities/length-volume/Grade9LengthVolumeActivities.tsx'
      ),
      'utf8'
    );
    expect(activitySource).toContain('مختبر الحجم المتغير');
    expect(activitySource).toContain('الجولة 2 من 2');
    expect(activitySource).toContain('ابنِ الحجم المطلوب');
    expect(activitySource).toContain('1 cm³ = 1 mL');
    expect(grade9Lesson12GoldenExperience.filter(({ path }) => path === 'activity')).toHaveLength(
      9
    );
  });

  it('reserves exactly four Precision Engineer missions with distinct transfer keys', () => {
    expect(grade9Lesson12GameReservations).toHaveLength(4);
    expect(new Set(grade9Lesson12GameReservations.map(({ questionKey }) => questionKey)).size).toBe(
      4
    );
    expect(new Set(grade9Lesson12GameReservations.map(({ visualKey }) => visualKey)).size).toBe(4);
    expect(
      new Set(grade9Lesson12GameReservations.map(({ cognitiveFunction }) => cognitiveFunction)).size
    ).toBe(4);
    expect(new Set(grade9Lesson12GameReservations.map(({ contextKey }) => contextKey)).size).toBe(
      4
    );
  });

  it('has no cross-path question, visual, cognitive, or context collision', () => {
    expect(
      findLearningExperienceReservationConflicts([
        ...grade9Lesson12ExplanationReservations,
        ...grade9Lesson12GoldenExperience,
        ...grade9Lesson12GameReservations,
      ])
    ).toEqual([]);
  });

  it('keeps the industrial package visual distinct from the transparent geometry simulation', () => {
    const gameSource = readFileSync(
      resolve(process.cwd(), 'src/features/games/precision-engineer/PrecisionEngineerGame.tsx'),
      'utf8'
    );
    const activitySource = readFileSync(
      resolve(
        process.cwd(),
        'src/features/activities/length-volume/Grade9LengthVolumeActivities.tsx'
      ),
      'utf8'
    );
    expect(gameSource).toContain('علبة تغليف صناعية');
    expect(activitySource).toContain('نموذج هندسي شفاف');
    expect(gameSource).not.toContain('مكعبات وحدة حجم شفافة');
  });
});
