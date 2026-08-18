import { describe, expect, it } from 'vitest';

import { validateAiProviderOutput, type AiGenerationRequest } from '@services/ai-authoring';

const objective = { key: 'teacher-objective-1', text: 'أن يفسر أثر القوة المحصلة.' } as const;
const questionRequest: Extract<AiGenerationRequest, { target: 'review_question' }> = {
  target: 'review_question',
  context: {
    language: 'ar',
    gradeLabel: 'الصف العاشر',
    subjectLabel: 'الفيزياء',
    unitTitle: 'الحركة',
    lessonTitle: 'القوة المحصلة',
    objectives: [objective],
  },
};

const validQuestion = {
  prompt: 'ما أثر القوة المحصلة؟',
  choices: ['تغير الحركة', 'لا تغير الحركة'],
  correctAnswerIndex: 0,
  explanation: 'القوة المحصلة تغير حالة الحركة عند عدم اتزانها.',
  objectiveKey: objective.key,
  difficulty: 'medium',
};

describe('AI authoring adversarial output', () => {
  it('يرفض سؤالًا بلا correctAnswerIndex', () => {
    const withoutAnswer = {
      prompt: validQuestion.prompt,
      choices: validQuestion.choices,
      explanation: validQuestion.explanation,
      objectiveKey: validQuestion.objectiveKey,
      difficulty: validQuestion.difficulty,
    };

    expect(validateAiProviderOutput(questionRequest, withoutAnswer)).toEqual({
      valid: false,
      reason: 'invalid_correct_answer',
    });
  });

  it('يرفض objectiveKey غير موجود في الأهداف التي أرسلها الطلب نفسه', () => {
    // This is intentionally self-consistency validation only. Phase 4-1 must not import
    // validateQuestionDraft or any teacher feature code; Phase 4-2 performs that domain validation.
    const output = { ...validQuestion, objectiveKey: 'teacher-objective-999' };

    expect(validateAiProviderOutput(questionRequest, output)).toEqual({
      valid: false,
      reason: 'objective_not_in_request',
    });
  });

  it('يرفض difficulty خارج النوع المشترك المدعوم', () => {
    const output = { ...validQuestion, difficulty: 'extreme' };

    expect(validateAiProviderOutput(questionRequest, output)).toEqual({
      valid: false,
      reason: 'invalid_difficulty',
    });
  });

  it('يرفض أن يحاول AI اقتراح purpose بدل أن يحدده المعلم', () => {
    const output = { ...validQuestion, purpose: 'mastery' };

    expect(validateAiProviderOutput(questionRequest, output)).toEqual({
      valid: false,
      reason: 'unexpected_fields',
    });
  });

  it('يرفض هدفًا فارغًا قبل وصوله إلى Suggestion Buffer', () => {
    const request = {
      target: 'objective',
      context: {
        language: 'ar',
        gradeLabel: 'الصف العاشر',
        subjectLabel: 'الفيزياء',
        unitTitle: 'الحركة',
        lessonTitle: 'القوة المحصلة',
      },
    } as const;

    expect(validateAiProviderOutput(request, { text: '   ' })).toEqual({
      valid: false,
      reason: 'invalid_text',
    });
  });
});
