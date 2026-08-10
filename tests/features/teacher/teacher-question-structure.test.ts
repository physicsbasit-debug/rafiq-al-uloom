import { describe, expect, it } from 'vitest';

import {
  createQuestionKey,
  getQuestionStateIssue,
  isObjectiveKeyAvailable,
  removeQuestionByKey,
  replaceQuestion,
  validateQuestionDraft,
  type TeacherQuestionFormDraft,
} from '@features/teacher/workspace/teacher-lesson-structure';
import type { LessonRevisionPayload } from '@services/authoring';

type ObjectiveDraft = LessonRevisionPayload['objectives'][number];
type QuestionDraft = LessonRevisionPayload['questions'][number];

const objectives: readonly ObjectiveDraft[] = [
  { key: 'teacher-objective-1', text: 'يفسر انعكاس الموجات' },
  { key: 'legacy-objective', text: 'هدف موروث' },
];

const question: QuestionDraft = {
  key: 'teacher-question-1',
  purpose: 'review',
  type: 'multiple_choice',
  prompt: 'ما معنى الانعكاس؟',
  choices: ['ارتداد الموجة', 'تغيّر ترددها'],
  correctAnswerIndex: 0,
  explanation: 'الانعكاس هو ارتداد الموجة عن حاجز.',
  objectiveKey: 'teacher-objective-1',
  difficulty: 'easy',
};

function form(overrides: Partial<TeacherQuestionFormDraft> = {}): TeacherQuestionFormDraft {
  return {
    purpose: 'review',
    prompt: '  ما معنى الانعكاس؟  ',
    choices: ['  ارتداد الموجة  ', 'تغيّر ترددها'],
    correctAnswerIndex: 0,
    explanation: '  شرح الإجابة  ',
    objectiveKey: 'teacher-objective-1',
    difficulty: 'medium',
    ...overrides,
  };
}

describe('teacher question structural helpers', () => {
  it('ينشئ question key داخليًا دون الاعتماد على النص أو ترتيب المصفوفة أو legacy keys', () => {
    const questions: readonly QuestionDraft[] = [
      question,
      { ...question, key: 'legacy-question', prompt: 'موروث' },
      { ...question, key: 'teacher-question-7', prompt: 'سؤال 7' },
    ];

    expect(createQuestionKey(questions)).toBe('teacher-question-8');
    expect(createQuestionKey([...questions].reverse())).toBe('teacher-question-8');
  });

  it('يتحقق أن objectiveKey يأتي من الأهداف الحالية فقط', () => {
    expect(isObjectiveKeyAvailable(objectives, 'teacher-objective-1')).toBe(true);
    expect(isObjectiveKeyAvailable(objectives, 'deleted-objective')).toBe(false);
  });

  it('يحوّل Form Buffer صالحًا إلى بيانات Question منقحة دون key أو type موازيين', () => {
    expect(validateQuestionDraft(form(), objectives)).toEqual({
      valid: true,
      question: {
        purpose: 'review',
        prompt: 'ما معنى الانعكاس؟',
        choices: ['ارتداد الموجة', 'تغيّر ترددها'],
        correctAnswerIndex: 0,
        explanation: 'شرح الإجابة',
        objectiveKey: 'teacher-objective-1',
        difficulty: 'medium',
      },
    });
  });

  it('يرفض prompt الفارغ أو أقل من اختيارين أو أي اختيار فارغ', () => {
    expect(validateQuestionDraft(form({ prompt: '   ' }), objectives)).toMatchObject({
      valid: false,
      reason: 'empty_prompt',
    });
    expect(validateQuestionDraft(form({ choices: ['واحد'] }), objectives)).toMatchObject({
      valid: false,
      reason: 'too_few_choices',
    });
    expect(validateQuestionDraft(form({ choices: ['أ', '   '] }), objectives)).toMatchObject({
      valid: false,
      reason: 'empty_choice',
    });
  });

  it('يرفض الإجابة الصحيحة المفقودة أو الخارجة عن نطاق choices', () => {
    expect(validateQuestionDraft(form({ correctAnswerIndex: null }), objectives)).toMatchObject({
      valid: false,
      reason: 'missing_correct_answer',
    });
    expect(validateQuestionDraft(form({ correctAnswerIndex: 2 }), objectives)).toMatchObject({
      valid: false,
      reason: 'correct_answer_out_of_range',
    });
  });

  it('يرفض الشرح الفارغ أو objectiveKey المفقود أو الذي اختفى من الحالة الحالية', () => {
    expect(validateQuestionDraft(form({ explanation: '   ' }), objectives)).toMatchObject({
      valid: false,
      reason: 'empty_explanation',
    });
    expect(validateQuestionDraft(form({ objectiveKey: '' }), objectives)).toMatchObject({
      valid: false,
      reason: 'missing_objective',
    });
    expect(validateQuestionDraft(form({ objectiveKey: 'deleted-objective' }), objectives)).toMatchObject({
      valid: false,
      reason: 'objective_not_available',
    });
  });

  it('يقبل review وmastery ضمن البنية نفسها ويقيّد difficulty بعقد TypeScript', () => {
    expect(validateQuestionDraft(form({ purpose: 'mastery', difficulty: 'hard' }), objectives)).toMatchObject({
      valid: true,
    });
    expect(
      validateQuestionDraft(
        form({ difficulty: 'unsupported' as TeacherQuestionFormDraft['difficulty'] }),
        objectives
      )
    ).toMatchObject({ valid: false, reason: 'invalid_difficulty' });
  });

  it('يكشف dangling objectiveKey والحالات البنيوية الفاسدة في committed questions', () => {
    expect(getQuestionStateIssue([question], objectives)).toBeNull();
    expect(getQuestionStateIssue([{ ...question, objectiveKey: 'deleted-objective' }], objectives)).toBe(
      'dangling_objective'
    );
    expect(getQuestionStateIssue([{ ...question, choices: ['واحد'] }], objectives)).toBe(
      'too_few_choices'
    );
    expect(getQuestionStateIssue([{ ...question, correctAnswerIndex: 7 }], objectives)).toBe(
      'invalid_correct_answer'
    );
  });

  it('يكشف question keys الفارغة أو المكررة', () => {
    expect(getQuestionStateIssue([{ ...question, key: '' }], objectives)).toBe('empty_key');
    expect(getQuestionStateIssue([question, { ...question, prompt: 'ثان' }], objectives)).toBe(
      'duplicate_key'
    );
  });

  it('يستبدل السؤال المحدد ويحافظ على بقية المصفوفة دون mutation', () => {
    const second = { ...question, key: 'teacher-question-2', prompt: 'سؤال ثان' };
    const original = [question, second] as const;
    const replacement = { ...question, prompt: 'سؤال معدل' };
    const updated = replaceQuestion(original, question.key, replacement);

    expect(updated).toEqual([replacement, second]);
    expect(original[0]).toBe(question);
    expect(replacement.key).toBe(question.key);
  });

  it('يحذف السؤال المحدد فقط دون المساس ببقية المفاتيح', () => {
    const second = { ...question, key: 'teacher-question-2', prompt: 'سؤال ثان' };
    expect(removeQuestionByKey([question, second], question.key)).toEqual([second]);
  });
});
