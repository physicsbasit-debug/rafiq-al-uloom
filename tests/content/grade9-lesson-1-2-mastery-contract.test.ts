import { describe, expect, it } from 'vitest';

import {
  grade9Lesson12MasteryDesign,
  grade9Lesson12ReviewDesign,
} from '@content/learning-design/grade9-lesson-1-2-learning-design';
import {
  grade9Lesson12ExplanationReservations,
  grade9Lesson12GameReservations,
  grade9Lesson12GoldenExperience,
  grade9Lesson12MasteryReservations,
} from '@content/learning-design/grade9-lesson-1-2-experience-contract';
import { findLearningExperienceReservationConflicts } from '@content/learning-design/learning-experience-reservation-guard';
import {
  semester1ReferenceMasteryQuestions,
  semester1ReferenceReviewQuestions,
} from '@content/seed/semester1-reference-lessons.seed';

const LESSON_ID = 'g9-phy-s1-u1-l2';
const reviewQuestions = semester1ReferenceReviewQuestions.filter(
  (question) => question.lessonId === LESSON_ID
);
const masteryQuestions = semester1ReferenceMasteryQuestions.filter(
  (question) => question.lessonId === LESSON_ID
);

describe('Grade 9 lesson 1-2 mastery contract', () => {
  it('يبني خمس مواقف إتقان جديدة مستقلة عن أسئلة المراجعة', () => {
    expect(masteryQuestions).toHaveLength(5);
    expect(new Set(masteryQuestions.map((question) => question.id)).size).toBe(5);
    const reviewPrompts = new Set(reviewQuestions.map((question) => question.prompt));
    for (const question of masteryQuestions) {
      expect(reviewPrompts.has(question.prompt)).toBe(false);
      expect(question.status).toBe('approved');
    }
  });

  it('يغطي مهارات الطول والقياس غير المباشر والميكرومتر والحجم المنتظم والإزاحة', () => {
    const dimensions = masteryQuestions.map(
      (question) => grade9Lesson12MasteryDesign[question.id]?.masteryDimension
    );
    expect(dimensions).toEqual([
      'القياس بالمسطرة وتصحيح نقطة البداية',
      'القياس غير المباشر للأبعاد الصغيرة',
      'قراءة الميكرومتر',
      'استنتاج حجم مجهول من الإزاحة الكلية',
      'استنتاج بعد مجهول من حجم معلوم',
    ]);
  });

  it('لا يحول الإتقان إلى نسخة من أدوار المراجعة الخمسة', () => {
    const reviewStages = new Set(
      Object.values(grade9Lesson12ReviewDesign).map((item) => item.stageLabel)
    );
    const masteryStages = Object.values(grade9Lesson12MasteryDesign).map((item) => item.stageLabel);
    expect(masteryStages).toHaveLength(5);
    expect(masteryStages.every((stage) => !reviewStages.has(stage))).toBe(true);
  });

  it('يحتفظ بمصدر منهجي داخلي لكل موقف إتقان', () => {
    for (const item of Object.values(grade9Lesson12MasteryDesign)) {
      expect(item.sourceBasis.length).toBeGreaterThan(0);
      expect(['apply', 'analyze', 'transfer']).toContain(item.cognitiveLevel);
    }
  });

  it('يثبت MQ4/MQ5 A/B ضد الحجوزات الـ27 السابقة بلا تصادم عبر المسارات', () => {
    const existingReservations = [
      ...grade9Lesson12ExplanationReservations,
      ...grade9Lesson12GoldenExperience,
      ...grade9Lesson12GameReservations,
    ];
    expect(existingReservations).toHaveLength(27);
    expect(grade9Lesson12MasteryReservations).toHaveLength(4);
    expect(
      findLearningExperienceReservationConflicts([
        ...existingReservations,
        ...grade9Lesson12MasteryReservations,
      ])
    ).toEqual([]);
  });
});
