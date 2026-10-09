import { describe, expect, it } from 'vitest';
import { grade9Lesson12ReviewDesign } from '@content/learning-design/grade9-lesson-1-2-learning-design';
import { grade9Lesson12GoldenExperience } from '@content/learning-design/grade9-lesson-1-2-experience-contract';
import { findGoldenLearningConflicts } from '@content/learning-design/learning-experience-guard';
import { semester1ReferenceReviewQuestions } from '@content/seed/semester1-reference-lessons.seed';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Grade 9 lesson 1-2 Golden review contract', () => {
  const review = semester1ReferenceReviewQuestions.filter(
    ({ lessonId }) => lessonId === 'g9-phy-s1-u1-l2'
  );

  it('locks exactly five review moments in the agreed progression', () => {
    expect(review).toHaveLength(5);
    expect(review.map(({ id }) => id)).toEqual([
      'g9-s1-u1-l2-rq1',
      'g9-s1-u1-l2-rq2',
      'g9-s1-u1-l2-rq3',
      'g9-s1-u1-l2-rq4',
      'g9-s1-u1-l2-rq5',
    ]);
    expect(review.every(({ status }) => status === 'approved')).toBe(true);
    expect(review.map(({ id }) => grade9Lesson12ReviewDesign[id]?.reviewRole)).toEqual([
      'recall',
      'apply',
      'visual_read',
      'misconception',
      'concept_link',
    ]);
  });

  it('reserves all five review questions and visuals inside the expanded cross-path registry', () => {
    const reviewMoments = grade9Lesson12GoldenExperience.filter(({ path }) => path === 'review');
    expect(reviewMoments).toHaveLength(5);
    expect(findGoldenLearningConflicts(grade9Lesson12GoldenExperience)).toEqual([]);

    const contractIds = new Set(reviewMoments.map(({ id }) => id));
    expect(review.every(({ id }) => contractIds.has(id))).toBe(true);
    expect(new Set(reviewMoments.map(({ questionKey }) => questionKey)).size).toBe(5);
    expect(new Set(reviewMoments.map(({ visualKey }) => visualKey)).size).toBe(5);
    expect(new Set(reviewMoments.map(({ cognitiveFunction }) => cognitiveFunction)).size).toBe(5);
    expect(new Set(reviewMoments.map(({ contextKey }) => contextKey)).size).toBe(5);
  });

  it('allows intentional spaced-practice repetition of skill while keeping question, visual, cognitive, and context keys unique', () => {
    const reviewMoment = grade9Lesson12GoldenExperience[0];
    const futureMasteryMoment = {
      ...reviewMoment,
      id: 'g9-s1-u1-l2-future-mastery-tool-choice',
      path: 'mastery' as const,
      questionKey: 'future-new-tool-choice-context',
      visualKey: 'g9-l12-future-new-tool-visual-v1',
      cognitiveFunction: 'future-transfer-tool-choice',
      contextKey: 'future-thin-wire-tool-choice-transfer',
    };

    expect(futureMasteryMoment.skill).toBe(reviewMoment.skill);
    expect(findGoldenLearningConflicts([reviewMoment, futureMasteryMoment])).toEqual([]);
  });

  it('locks the fixed curved-path assumption so it does not conflict with straightening a free wire', () => {
    const question = review.find(({ id }) => id === 'g9-s1-u1-l2-rq5');
    expect(question?.prompt).toContain('مثبّت على لوحة');
    expect(question?.prompt).toContain('لا يمكن فرده');
    expect(question?.choices.some((choice) => choice.includes('خيط مرن'))).toBe(true);
  });

  it('keeps scientific values under ScientificText in the custom review surface', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/student/review-questions/Grade9LengthVolumeReview.tsx'),
      'utf8'
    );
    expect(source).toContain('ScientificText');
    expect(source).not.toContain('<bdi');
    expect(source).not.toContain('📏');
    expect(source).not.toContain('◉');
    expect(source).not.toContain('▥');
  });

  it('keeps the lesson-1-2 review isolated from the approved lesson-1-1 generic review flow', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/student/review-questions/ReviewQuestionsView.tsx'),
      'utf8'
    );
    expect(source).toContain("lessonId === 'g9-phy-s1-u1-l2'");
    expect(source).toContain('Grade9LengthVolumeReview');
    expect(source).toContain('ReviewQuestionsContent');
  });
});
