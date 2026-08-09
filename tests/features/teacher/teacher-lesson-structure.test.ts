import { describe, expect, it } from 'vitest';

import {
  createObjectiveKey,
  getAvailableObjectiveOptions,
  getObjectiveStateIssue,
  hasDanglingObjectiveReferences,
  isObjectiveReferenced,
  removeObjectiveByKey,
  replaceObjectiveText,
  validateObjectiveDraft,
} from '@features/teacher/workspace/teacher-lesson-structure';
import type { LessonRevisionPayload } from '@services/authoring';

type ObjectiveDraft = LessonRevisionPayload['objectives'][number];
type QuestionDraft = LessonRevisionPayload['questions'][number];

const objectives: readonly ObjectiveDraft[] = [
  { key: 'teacher-objective-1', text: 'الهدف الأول' },
  { key: 'teacher-objective-2', text: 'الهدف الثاني' },
];

const question: QuestionDraft = {
  key: 'question-1',
  purpose: 'review',
  type: 'multiple_choice',
  prompt: 'سؤال مراجعة',
  choices: ['أ', 'ب'],
  correctAnswerIndex: 0,
  explanation: 'شرح',
  objectiveKey: 'teacher-objective-1',
  difficulty: 'easy',
};

describe('teacher lesson structural objective helpers', () => {
  it('ينظف نص الهدف ويرفض النص الفارغ دون إدراج عنصر فاسد', () => {
    expect(validateObjectiveDraft('   ')).toEqual({ valid: false, reason: 'empty_text' });
    expect(validateObjectiveDraft('  يفسر الظاهرة  ')).toEqual({
      valid: true,
      text: 'يفسر الظاهرة',
    });
  });

  it('ينشئ مفتاح هدف داخليًا من مساحة مفاتيح مستقرة لا من النص أو موضع المصفوفة', () => {
    expect(createObjectiveKey(objectives)).toBe('teacher-objective-3');
    expect(createObjectiveKey([...objectives].reverse())).toBe('teacher-objective-3');
  });

  it('يحافظ على مفتاح الهدف عند تعديل نصه', () => {
    const updated = replaceObjectiveText(objectives, 'teacher-objective-1', 'هدف معدل');
    expect(updated[0]).toEqual({ key: 'teacher-objective-1', text: 'هدف معدل' });
  });

  it('يكشف ارتباط السؤال بالهدف ويمنع اعتبار الهدف غير مستخدم', () => {
    expect(isObjectiveReferenced('teacher-objective-1', [question])).toBe(true);
    expect(isObjectiveReferenced('teacher-objective-2', [question])).toBe(false);
  });

  it('يكشف objectiveKey يتيمًا بوصفه خرقًا للـinvariant', () => {
    expect(hasDanglingObjectiveReferences(objectives, [question])).toBe(false);
    expect(
      hasDanglingObjectiveReferences(objectives, [
        { ...question, objectiveKey: 'missing-objective' },
      ])
    ).toBe(true);
  });

  it('يشتق خيارات الأهداف من الحالة الحالية نفسها', () => {
    expect(getAvailableObjectiveOptions(objectives)).toEqual([
      { key: 'teacher-objective-1', label: 'الهدف الأول' },
      { key: 'teacher-objective-2', label: 'الهدف الثاني' },
    ]);
  });

  it('يحذف الهدف المحدد فقط دون إعادة توليد مفاتيح البقية', () => {
    expect(removeObjectiveByKey(objectives, 'teacher-objective-1')).toEqual([
      { key: 'teacher-objective-2', text: 'الهدف الثاني' },
    ]);
  });

  it('يكشف مفاتيح الأهداف الفارغة أو المكررة والنصوص الفارغة', () => {
    expect(getObjectiveStateIssue(objectives)).toBeNull();
    expect(getObjectiveStateIssue([{ key: '', text: 'هدف' }])).toBe('empty_key');
    expect(getObjectiveStateIssue([{ key: 'o1', text: '   ' }])).toBe('empty_text');
    expect(
      getObjectiveStateIssue([
        { key: 'o1', text: 'أ' },
        { key: 'o1', text: 'ب' },
      ])
    ).toBe('duplicate_key');
  });
});
