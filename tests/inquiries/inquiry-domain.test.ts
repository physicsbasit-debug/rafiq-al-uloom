import { describe, expect, it } from 'vitest';
import { assertInquiry, type Inquiry } from '@shared-types/inquiry.types';

const inquiry: Inquiry = {
  id: 'inquiry-one',
  lessonId: 'lesson-one',
  title: 'استقصاء',
  instructions: 'اقرأ وسجل استدلالك.',
  objectiveIds: ['objective-one'],
  context: 'حالة علمية.',
  drivingQuestion: 'ماذا تستنتج؟',
  hypothesisPrompt: 'اكتب فرضيتك.',
  observationPrompt: 'اكتب دليلك.',
  conclusionPrompt: 'اكتب استنتاجك.',
  status: 'approved',
  source: 'curriculum_seed',
};

describe('Inquiry domain', () => {
  it('يقبل عقد Inquiry صالحًا دون mutation', () => {
    const snapshot = structuredClone(inquiry);
    expect(assertInquiry(inquiry)).toBe(inquiry);
    expect(inquiry).toEqual(snapshot);
  });

  it.each([
    ['id', ''],
    ['lessonId', ' '],
    ['title', ''],
    ['instructions', ''],
    ['context', ''],
    ['drivingQuestion', ''],
    ['hypothesisPrompt', ''],
    ['observationPrompt', ''],
    ['conclusionPrompt', ''],
  ] as const)('يرفض الحقل النصي الفارغ %s', (field, value) => {
    expect(() => assertInquiry({ ...inquiry, [field]: value })).toThrow(/must not be blank/);
  });

  it('يرفض objectiveIds الفارغة أو ذات الفراغات أو التكرار', () => {
    expect(() => assertInquiry({ ...inquiry, objectiveIds: [] })).toThrow(/must not be empty/);
    expect(() => assertInquiry({ ...inquiry, objectiveIds: [''] })).toThrow(
      /must not contain blanks/
    );
    expect(() =>
      assertInquiry({ ...inquiry, objectiveIds: ['objective-one', 'objective-one'] })
    ).toThrow(/must not contain duplicates/);
  });
});
