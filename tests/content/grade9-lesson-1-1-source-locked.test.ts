import { describe, expect, it } from 'vitest';
import {
  grade9ImportanceMeasurementReferenceLesson,
  semester1ReferenceExperiments,
  semester1ReferenceObjectives,
  semester1ReferenceReviewQuestions,
} from '@content/seed/semester1-reference-lessons.seed';
describe('Grade 9 lesson 1-1 source-locked content', () => {
  it('uses only the two official objective texts for the shared 1-1/1-2 block', () => {
    const objectives = semester1ReferenceObjectives
      .filter(({ lessonId }) => lessonId === 'g9-phy-s1-u1-l1')
      .map(({ text }) => text);
    expect(objectives).toEqual([
      'يستخدم المسطرة والمخبار المدرج لإيجاد الطول أو الحجم، ويصف استخدامهما.',
      'يفهم كيف يستخدم أداة الميكرومتر لقياس الأبعاد الصغيرة جدًا.',
    ]);
  });
  it('does not render source labels inside student-facing lesson data', () => {
    const value = [
      grade9ImportanceMeasurementReferenceLesson.summary,
      ...grade9ImportanceMeasurementReferenceLesson.keyConcepts,
      ...grade9ImportanceMeasurementReferenceLesson.examples,
      ...grade9ImportanceMeasurementReferenceLesson.misconceptions,
    ].join(' ');
    expect(value).not.toContain('دليل المعلم');
    expect(value).not.toContain('كتاب الطالب');
    expect(value).not.toContain('المصدر');
  });
  it('keeps lesson 1-1 focused on standards and timing precision', () => {
    expect(grade9ImportanceMeasurementReferenceLesson.summary).toContain('توحيدها');
    expect(grade9ImportanceMeasurementReferenceLesson.summary).toContain('الأقمار الصناعية');
    expect(
      semester1ReferenceReviewQuestions.some(({ prompt }) =>
        prompt.includes('نظام وحدات متفق عليه')
      )
    ).toBe(true);
  });
  it('does not invent a standalone practical experiment for lesson 1-1', () => {
    expect(
      semester1ReferenceExperiments.filter(({ lessonId }) => lessonId === 'g9-phy-s1-u1-l1')
    ).toHaveLength(0);
  });
});
