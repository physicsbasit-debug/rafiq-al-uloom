import { describe, expect, it } from 'vitest';

import {
  validateAiGenerationRequest,
  validateAiProviderOutput,
  type AiGenerationRequest,
} from '@services/ai-authoring';

const lessonContext = {
  language: 'ar',
  gradeLabel: 'الصف العاشر',
  subjectLabel: 'الفيزياء',
  unitTitle: 'الحركة',
  lessonTitle: 'القوة المحصلة',
} as const;

const objective = { key: 'teacher-objective-1', text: 'أن يفسر أثر القوة المحصلة.' } as const;

function questionRequest(target: 'review_question' | 'mastery_question'): AiGenerationRequest {
  return {
    target,
    context: {
      ...lessonContext,
      objectives: [objective],
    },
  };
}

const validQuestionOutput = {
  prompt: 'ما أثر القوة المحصلة في حركة الجسم؟',
  choices: ['تغير الحركة', 'لا يحدث أي تغير'],
  correctAnswerIndex: 0,
  explanation: 'القوة المحصلة قد تغير سرعة الجسم أو اتجاهه.',
  objectiveKey: objective.key,
  difficulty: 'medium',
} as const;

describe('AI authoring contract', () => {
  it('يقبل طلبات الأهداف الأربعة بالعقد الأدنى المطلوب', () => {
    const requests: readonly AiGenerationRequest[] = [
      { target: 'lesson_summary', context: lessonContext },
      { target: 'objective', context: lessonContext },
      questionRequest('review_question'),
      questionRequest('mastery_question'),
    ];

    for (const request of requests) {
      expect(validateAiGenerationRequest(request)).toEqual({ valid: true });
    }
  });

  it.each([undefined, null, 42, 'bad-request', [], true])(
    'يرفض غلاف طلب غير كائني بلا استثناء: %p',
    (request) => {
      expect(() => validateAiGenerationRequest(request)).not.toThrow();
      expect(validateAiGenerationRequest(request)).toEqual({
        valid: false,
        reason: 'invalid_request_shape',
      });
    }
  );

  it.each(['generate_full_lesson', 42, null, {}, []])(
    'يرفض target غير معروف أو من نوع خاطئ: %p',
    (target) => {
      const request = { target, context: lessonContext };

      expect(() => validateAiGenerationRequest(request)).not.toThrow();
      expect(validateAiGenerationRequest(request)).toEqual({
        valid: false,
        reason: 'invalid_target',
      });
    }
  );

  it.each(['purpose', 'revision', 'provider'])(
    'يرفض الحقل العلوي الزائد في غلاف الطلب: %s',
    (extraKey) => {
      const request = {
        target: 'objective',
        context: lessonContext,
        [extraKey]: 'unexpected',
      };

      expect(validateAiGenerationRequest(request)).toEqual({
        valid: false,
        reason: 'unexpected_request_fields',
      });
    }
  );

  it('يرفض طلب سؤال بلا أهداف حالية', () => {
    const request: AiGenerationRequest = {
      target: 'review_question',
      context: { ...lessonContext, objectives: [] },
    };

    expect(validateAiGenerationRequest(request)).toEqual({
      valid: false,
      reason: 'question_requires_objectives',
    });
  });

  it.each([undefined, null, 42, 'not-an-array', {}])(
    'يرفض objectives غير المصفوفية بلا استثناء: %p',
    (objectives) => {
      const request = {
        target: 'review_question',
        context: { ...lessonContext, objectives },
      } as unknown as AiGenerationRequest;

      expect(() => validateAiGenerationRequest(request)).not.toThrow();
      expect(validateAiGenerationRequest(request)).toEqual({
        valid: false,
        reason: 'invalid_objective_context',
      });
    }
  );

  it.each([undefined, 'en'])('يرفض لغة مفقودة أو غير عربية: %p', (language) => {
    const request = {
      target: 'objective',
      context: { ...lessonContext, language },
    } as unknown as AiGenerationRequest;

    expect(validateAiGenerationRequest(request)).toEqual({
      valid: false,
      reason: 'invalid_context',
    });
  });

  it('يرفض مفاتيح أهداف مكررة داخل سياق السؤال', () => {
    const request: AiGenerationRequest = {
      target: 'mastery_question',
      context: { ...lessonContext, objectives: [objective, objective] },
    };

    expect(validateAiGenerationRequest(request)).toEqual({
      valid: false,
      reason: 'duplicate_objective_key',
    });
  });

  it('يقبل اقتراح ملخص بنيوي صالح ويزيل الفراغ الخارجي', () => {
    const request = { target: 'lesson_summary', context: lessonContext } as const;
    const result = validateAiProviderOutput(request, { text: '  ملخص واضح للدرس.  ' });

    expect(result).toEqual({
      valid: true,
      suggestion: { kind: 'lesson_summary', text: 'ملخص واضح للدرس.' },
    });
  });

  it('يقبل اقتراح سؤال متسق ذاتيًا مع أهداف الطلب', () => {
    const request = questionRequest('review_question') as Extract<
      AiGenerationRequest,
      { target: 'review_question' }
    >;
    const result = validateAiProviderOutput(request, validQuestionOutput);

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.suggestion).toMatchObject({
        kind: 'question',
        objectiveKey: objective.key,
        difficulty: 'medium',
      });
      expect(result.suggestion).not.toHaveProperty('purpose');
      expect(result.suggestion).not.toHaveProperty('key');
    }
  });
});
