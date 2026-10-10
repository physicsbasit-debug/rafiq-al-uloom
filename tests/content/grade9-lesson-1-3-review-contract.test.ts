// @vitest-environment node

import { describe, expect, it } from 'vitest';

import {
  grade9Lesson13ReviewDesign,
  grade9Lesson13ReviewQuestion5Steps,
} from '@content/learning-design/grade9-lesson-1-3-learning-design';
import { grade9Lesson13GoldenReview } from '@content/learning-design/grade9-lesson-1-3-experience-contract';
import { semester1ReferenceReviewQuestions } from '@content/seed/semester1-reference-lessons.seed';

const lessonId = 'g9-phy-s1-u1-l3';
const questions = semester1ReferenceReviewQuestions.filter(
  (question) => question.lessonId === lessonId
);

describe('Grade 9 lesson 1-3 approved review contract', () => {
  it('يقفل خمس مفردات بالتدرج المعتمد فقط', () => {
    expect(questions).toHaveLength(5);
    expect(grade9Lesson13GoldenReview).toHaveLength(5);
    expect(grade9Lesson13ReviewDesign.map(({ role }) => role)).toEqual([
      'recall',
      'apply',
      'visual_read',
      'misconception',
      'concept_link',
    ]);
  });

  it('يبقي RQ1 استرجاعًا لمعنى الفترة ولا يعيد صياغة الفرق بين القراءتين', () => {
    const q1 = questions[0];
    expect(q1.prompt).toContain('فترة زمنية');
    expect(q1.prompt).not.toContain('الفرق بين القراءتين');
    expect(grade9Lesson13ReviewDesign[0].visualKey).toBe('g9-l13-review-period-timeline-v1');
  });

  it('يقفل RQ2 على السؤال الرسمي 5-1 والوحدات العربية', () => {
    const q2 = questions[1];
    expect(q2.prompt).toContain('يعرض التلفاز 25 صورة كل ثانية');
    expect(q2.prompt).not.toContain('fps');
    expect(q2.choices).toContain('0.04 ثانية');
    expect(q2.choices.join(' ')).not.toMatch(/\b0\.04\s*s\b/);
    expect(grade9Lesson13GoldenReview[1].questionKey).toBe('5-1-review-only');
  });

  it('يطلب في RQ3 القيمة المتوسطة فقط ويبقي 0.84 مموهًا تشخيصيًا', () => {
    const q3 = questions[2];
    expect(q3.prompt).toContain('القيمة المتوسطة');
    expect(q3.prompt).not.toContain('الوسيط');
    expect(q3.choices).toContain('0.86 ثانية');
    expect(q3.choices).toContain('0.84 ثانية');
    expect(q3.explanation).not.toContain('استبعاد');
  });

  it('يجعل RQ4 كشف خطأ مفاهيمي عن نصف دورة لا تمييزًا نصيًا مجردًا', () => {
    const q4 = questions[3];
    expect(q4.prompt).toContain('قال طالب');
    expect(q4.prompt).toContain('الطرف المقابل');
    expect(q4.choices[q4.correctAnswerIndex]).toContain('يعود');
    expect(grade9Lesson13ReviewDesign[3].visualKey).toBe('g9-l13-review-pendulum-path-v1');
  });

  it('يحجز RQ5 للسؤال 6-1 بثلاث خطوات مستقلة وأرقامه المعتمدة', () => {
    const q5 = questions[4];
    expect(q5.prompt).toContain('20 تأرجحًا');
    expect(q5.prompt).toContain('17.4 ثانية');
    expect(q5.prompt).toContain('50 تأرجحًا');
    expect(q5.prompt).toContain('43.2 ثانية');
    expect(grade9Lesson13GoldenReview[4].questionKey).toBe('6-1-review-only');
    expect(grade9Lesson13ReviewQuestion5Steps).toHaveLength(3);

    const [calculation, accuracy, errors] = grade9Lesson13ReviewQuestion5Steps;
    expect(calculation.correctAnswer).toContain('0.870 ثانية');
    expect(calculation.correctAnswer).toContain('0.864 ثانية');
    expect(accuracy.correctAnswer).toContain('50 تأرجحًا');
    expect(errors.correctAnswer).toContain('زمن الاستجابة');
    expect(errors.correctAnswer).toContain('عد');
  });
});
