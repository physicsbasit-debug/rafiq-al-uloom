import { describe, expect, it } from 'vitest';

import { grade9Lesson11GoldenExperience } from '@content/learning-design/grade9-lesson-1-1-experience-contract';
import { findGoldenLearningConflicts } from '@content/learning-design/learning-experience-guard';
import {
  semester1ReferenceMasteryQuestions,
  semester1ReferenceReviewQuestions,
} from '@content/seed/semester1-reference-lessons.seed';

describe('Grade 9 lesson 1-1 Golden no-reuse contract', () => {
  it('covers every active learning moment in the approved four student paths', () => {
    const countByPath = grade9Lesson11GoldenExperience.reduce<Record<string, number>>(
      (counts, moment) => ({ ...counts, [moment.path]: (counts[moment.path] ?? 0) + 1 }),
      {}
    );

    expect(countByPath).toEqual({
      review: 5,
      activity: 3,
      game: 4,
      mastery: 5,
    });
    expect(grade9Lesson11GoldenExperience).toHaveLength(17);
  });

  it('has no repeated question, instructional visual, or cognitive function across paths', () => {
    expect(findGoldenLearningConflicts(grade9Lesson11GoldenExperience)).toEqual([]);
  });

  it('keeps all review and mastery seed questions registered in the contract', () => {
    const lessonId = 'g9-phy-s1-u1-l1';
    const seedQuestionIds = [
      ...semester1ReferenceReviewQuestions,
      ...semester1ReferenceMasteryQuestions,
    ]
      .filter((question) => question.lessonId === lessonId)
      .map((question) => question.id);

    const contractIds = new Set(grade9Lesson11GoldenExperience.map(({ id }) => id));
    expect(seedQuestionIds).toHaveLength(10);
    expect(seedQuestionIds.every((id) => contractIds.has(id))).toBe(true);
  });

  it('keeps GPS exclusive to the simulation path in the golden lesson', () => {
    const gpsMoments = grade9Lesson11GoldenExperience.filter(({ questionKey, visualKey }) =>
      `${questionKey} ${visualKey ?? ''}`.toLowerCase().includes('gps')
    );

    expect(gpsMoments).toHaveLength(1);
    expect(gpsMoments[0]?.path).toBe('activity');
    expect(gpsMoments[0]?.id).toBe('g9-s1-u1-l1-activity-simulation');
  });

  it('stores complete internal metadata without leaking placeholder keys', () => {
    grade9Lesson11GoldenExperience.forEach((moment) => {
      expect(moment.id.trim()).not.toBe('');
      expect(moment.questionKey.trim()).not.toBe('');
      expect(moment.cognitiveFunction.trim()).not.toBe('');
      expect(moment.objectiveKey.trim()).not.toBe('');
      expect(moment.skill.trim()).not.toBe('');
      expect(moment.questionKey).not.toMatch(/todo|placeholder|temp/i);
      expect(moment.cognitiveFunction).not.toMatch(/todo|placeholder|temp/i);
    });
  });
});
