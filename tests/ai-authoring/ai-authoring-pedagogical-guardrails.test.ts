import { describe, expect, it } from 'vitest';

import {
  MIN_PEDAGOGICAL_TEXT_LENGTH,
  validateGuardedAiProviderOutputRuntime,
} from '../../src/services/ai-authoring/ai-authoring.pedagogical-guardrails.runtime';
import type { RuntimeAiGenerationRequest } from '../../src/services/ai-authoring/ai-authoring.runtime-contract';

const summaryRequest: RuntimeAiGenerationRequest = {
  target: 'lesson_summary',
  context: {
    language: 'ar',
    gradeLabel: 'الصف العاشر',
    subjectLabel: 'الفيزياء',
    unitTitle: 'الموجات',
    lessonTitle: 'الانعكاس',
  },
};

const objectiveRequest: RuntimeAiGenerationRequest = {
  target: 'objective',
  context: summaryRequest.context,
};

const reviewRequest: RuntimeAiGenerationRequest = {
  target: 'review_question',
  context: {
    ...summaryRequest.context,
    objectives: [{ key: 'objective-1', text: 'يفسر انعكاس الموجات.' }],
  },
};

function validQuestion() {
  return {
    prompt: 'أي العبارات تصف انعكاس الموجة؟',
    choices: ['ارتداد الموجة', 'توقف الموجة', 'مرور الموجة'],
    correctAnswerIndex: 0,
    explanation: 'الانعكاس هو ارتداد الموجة عند السطح.',
    objectiveKey: 'objective-1',
    difficulty: 'medium',
  };
}

describe('Phase 4-4 pedagogical guardrails', () => {
  it('يثبت أن حد النص شبه الفارغ محافظ ومنخفض', () => {
    expect(MIN_PEDAGOGICAL_TEXT_LENGTH).toBe(3);
    expect(validateGuardedAiProviderOutputRuntime(objectiveRequest, { text: 'فسر' }).valid).toBe(
      true
    );
  });

  it('يمرر الملخص العربي', () => {
    expect(
      validateGuardedAiProviderOutputRuntime(summaryRequest, {
        text: 'ملخص عربي موجز للدرس.',
      }).valid
    ).toBe(true);
  });

  it('يرفض الملخص الإنجليزي فقط', () => {
    expect(
      validateGuardedAiProviderOutputRuntime(summaryRequest, {
        text: 'Reflection summary.',
      })
    ).toEqual({ valid: false, reason: 'invalid_text' });
  });

  it.each(['أ', 'لا'])('يرفض النص شبه الفارغ %s', (text) => {
    expect(validateGuardedAiProviderOutputRuntime(objectiveRequest, { text })).toEqual({
      valid: false,
      reason: 'invalid_text',
    });
  });

  it('يرفض prompt إنجليزيًا فقط', () => {
    expect(
      validateGuardedAiProviderOutputRuntime(reviewRequest, {
        ...validQuestion(),
        prompt: 'Which statement describes reflection?',
      })
    ).toEqual({ valid: false, reason: 'invalid_prompt' });
  });

  it('يرفض prompt شبه فارغ', () => {
    expect(
      validateGuardedAiProviderOutputRuntime(reviewRequest, {
        ...validQuestion(),
        prompt: 'ما',
      })
    ).toEqual({ valid: false, reason: 'invalid_prompt' });
  });

  it('يرفض explanation إنجليزيًا فقط', () => {
    expect(
      validateGuardedAiProviderOutputRuntime(reviewRequest, {
        ...validQuestion(),
        explanation: 'Reflection is the return of a wave.',
      })
    ).toEqual({ valid: false, reason: 'invalid_explanation' });
  });

  it('يرفض explanation شبه فارغ', () => {
    expect(
      validateGuardedAiProviderOutputRuntime(reviewRequest, {
        ...validQuestion(),
        explanation: 'هو',
      })
    ).toEqual({ valid: false, reason: 'invalid_explanation' });
  });

  it('يرفض الخيارات المتكررة بعد NFKC وtrim ودمج الفراغات فقط', () => {
    expect(
      validateGuardedAiProviderOutputRuntime(reviewRequest, {
        ...validQuestion(),
        choices: ['H₂O', ' H2O ', 'NaCl'],
      })
    ).toEqual({ valid: false, reason: 'invalid_choices' });
  });

  it('لا يفرض العربية على الخيارات العلمية', () => {
    const result = validateGuardedAiProviderOutputRuntime(reviewRequest, {
      ...validQuestion(),
      choices: ['H₂O', 'NaCl', '3 m/s'],
      correctAnswerIndex: 2,
    });
    expect(result.valid).toBe(true);
  });

  it('يحافظ على سبب structural objectiveKey قبل الحراس التربوية', () => {
    expect(
      validateGuardedAiProviderOutputRuntime(reviewRequest, {
        ...validQuestion(),
        objectiveKey: 'missing-objective',
      })
    ).toEqual({ valid: false, reason: 'objective_not_in_request' });
  });

  it('يمرر سؤال مراجعة عربيًا صالحًا', () => {
    expect(validateGuardedAiProviderOutputRuntime(reviewRequest, validQuestion()).valid).toBe(true);
  });
});
