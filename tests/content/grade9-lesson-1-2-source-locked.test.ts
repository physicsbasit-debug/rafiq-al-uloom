import { describe, expect, it } from 'vitest';
import {
  grade9LengthVolumeReferenceLesson,
  semester1ReferenceObjectives,
} from '@content/seed/semester1-reference-lessons.seed';
import { isStudentReferencePreviewLesson } from '@content/student-reference-preview';

describe('Grade 9 lesson 1-2 source lock', () => {
  it('يحفظ الدرس مسودة قابلة للمعاينة حتى تكتمل بقية المسارات', () => {
    expect(grade9LengthVolumeReferenceLesson).toMatchObject({
      id: 'g9-phy-s1-u1-l2',
      unitId: 'g9-phy-s1-u1-length-time',
      title: '1-2 قياس الطول والحجم',
      order: 2,
      status: 'draft',
      source: 'curriculum_seed',
    });
    expect(isStudentReferencePreviewLesson('g9-phy-s1-u1-l2')).toBe(true);
  });

  it('يستخدم الهدفين الرسميين المشتركين دون اختلاق هدف جديد', () => {
    const lessonObjectives = semester1ReferenceObjectives.filter(
      ({ lessonId }) => lessonId === 'g9-phy-s1-u1-l2'
    );

    expect(lessonObjectives.map(({ text }) => text)).toEqual([
      'يستخدم المسطرة والمخبار المدرج لإيجاد الطول أو الحجم، ويصف استخدامهما.',
      'يفهم كيف يستخدم أداة الميكرومتر لقياس الأبعاد الصغيرة جدًا.',
    ]);
    expect(grade9LengthVolumeReferenceLesson.objectiveIds).toEqual([
      'g9-s1-u1-l2-o1',
      'g9-s1-u1-l2-o4',
    ]);
  });

  it('يقفل المفاهيم الرئيسة للشرح الأساسي على محتوى الطول والحجم', () => {
    expect(grade9LengthVolumeReferenceLesson.keyConcepts).toEqual(
      expect.arrayContaining([
        expect.stringContaining('المسطرة'),
        expect.stringContaining('الميكرومتر'),
        expect.stringContaining('المخبار المدرج'),
        expect.stringContaining('الإزاحة'),
      ])
    );
  });
});
