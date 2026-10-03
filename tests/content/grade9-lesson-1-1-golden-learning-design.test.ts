import { describe, expect, it } from 'vitest';
import { grade9Lesson11QuestionDesign } from '@content/learning-design/grade9-lesson-1-1-learning-design';
import { getStudentQuestionVisual } from '@content/student-question-visuals';
import {
  semester1ReferenceMasteryQuestions,
  semester1ReferenceReviewQuestions,
} from '@content/seed/semester1-reference-lessons.seed';

describe('Grade 9 lesson 1-1 Golden learning design', () => {
  const review = semester1ReferenceReviewQuestions.filter(
    ({ lessonId }) => lessonId === 'g9-phy-s1-u1-l1'
  );
  const mastery = semester1ReferenceMasteryQuestions.filter(
    ({ lessonId }) => lessonId === 'g9-phy-s1-u1-l1'
  );

  it('keeps review as practice and mastery as deeper transfer', () => {
    expect(review).toHaveLength(5);
    expect(mastery).toHaveLength(5);
    expect(review.map(({ difficulty }) => difficulty)).toEqual([
      'easy',
      'medium',
      'medium',
      'hard',
      'hard',
    ]);
    expect(mastery.map(({ difficulty }) => difficulty)).toEqual([
      'medium',
      'medium',
      'hard',
      'hard',
      'hard',
    ]);
    expect(
      mastery.some(({ prompt }) =>
        ['مصنع', 'بلدين مختلفين', 'شركة', 'طائرة'].some((marker) => prompt.includes(marker))
      )
    ).toBe(true);
    expect(new Set([...review, ...mastery].map(({ prompt }) => prompt)).size).toBe(10);
  });

  it('stores internal design metadata for every Grade 9 review and mastery item', () => {
    const ids = [...review, ...mastery].map(({ id }) => id);
    expect(ids.every((id) => grade9Lesson11QuestionDesign[id])).toBe(true);
    expect(
      Object.values(grade9Lesson11QuestionDesign).filter(
        ({ cognitiveLevel }) => cognitiveLevel === 'transfer'
      ).length
    ).toBeGreaterThanOrEqual(3);
  });

  it('does not recycle the same visual asset across review and mastery questions', () => {
    const visualSources = [...review, ...mastery]
      .map(({ id }) => getStudentQuestionVisual(id)?.src)
      .filter((src): src is string => Boolean(src));
    expect(new Set(visualSources).size).toBe(visualSources.length);
  });

  it('locks the approved review sequence and keeps the visual incomplete rather than answer-giving', () => {
    expect(
      review.map(({ id }) => grade9Lesson11QuestionDesign[id]?.reviewRole)
    ).toEqual(['recall', 'apply', 'visual_read', 'misconception', 'concept_link']);

    expect(
      review.map(({ id }) => grade9Lesson11QuestionDesign[id]?.reviewSummaryGroup)
    ).toEqual([
      'النظام الدولي والوحدات',
      'المقارنة والتحويل',
      'النظام الدولي والوحدات',
      'الدقة وأهمية القياس',
      'المقارنة والتحويل',
    ]);

    expect(getStudentQuestionVisual('g9-s1-u1-l1-rq3')?.src).toBe(
      '/lesson-visuals/g9-review-lab-record.svg'
    );
    expect(getStudentQuestionVisual('g9-s1-u1-l1-rq5')).toBeUndefined();
  });

  it('locks mastery as five unseen transfer scenarios with unique evidence visuals', () => {
    expect(mastery.map(({ id }) => grade9Lesson11QuestionDesign[id]?.masteryDimension)).toEqual([
      'فهم القياس المكتمل',
      'استخدام الوحدات المشتركة والتواصل العلمي',
      'الدقة والموثوقية في القياس',
      'استخدام الوحدات المشتركة والتواصل العلمي',
      'تطبيق المفهوم في موقف جديد',
    ]);

    expect(mastery.map(({ prompt }) => prompt)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('طول القطعة = 25'),
        expect.stringContaining('بلدين مختلفين'),
        expect.stringContaining('الأداة الرقمية'),
        expect.stringContaining('0.8 m'),
        expect.stringContaining('جزءًا لطائرة'),
      ])
    );

    const masteryVisuals = mastery.map(({ id }) => getStudentQuestionVisual(id)?.src);
    expect(masteryVisuals.every(Boolean)).toBe(true);
    expect(new Set(masteryVisuals).size).toBe(5);
    expect(masteryVisuals.some((src) => src?.includes('gps'))).toBe(false);
  });

});
