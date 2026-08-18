import { describe, expect, it } from 'vitest';

import { DeterministicAiAuthoringProvider, type AiGenerationRequest } from '@services/ai-authoring';

const request: AiGenerationRequest = {
  target: 'mastery_question',
  context: {
    language: 'ar',
    gradeLabel: 'الصف العاشر',
    subjectLabel: 'الفيزياء',
    unitTitle: 'الحركة',
    lessonTitle: 'القوة المحصلة',
    objectives: [{ key: 'teacher-objective-1', text: 'أن يفسر أثر القوة المحصلة.' }],
  },
};

describe('DeterministicAiAuthoringProvider', () => {
  it('ينجح حتميًا لكل target مع suggestion مناسبة', async () => {
    const provider = new DeterministicAiAuthoringProvider();
    const requests: readonly AiGenerationRequest[] = [
      {
        target: 'lesson_summary',
        context: {
          language: 'ar',
          gradeLabel: 'الصف العاشر',
          subjectLabel: 'الفيزياء',
          unitTitle: 'الحركة',
          lessonTitle: 'القوة المحصلة',
        },
      },
      {
        target: 'objective',
        context: {
          language: 'ar',
          gradeLabel: 'الصف العاشر',
          subjectLabel: 'الفيزياء',
          unitTitle: 'الحركة',
          lessonTitle: 'القوة المحصلة',
        },
      },
      {
        ...request,
        target: 'review_question',
      },
      request,
    ];

    const results = await Promise.all(requests.map((item) => provider.generate(item)));

    expect(results.every((result) => result.status === 'success')).toBe(true);
  });

  it('يعيد النتيجة نفسها للطلب نفسه', async () => {
    const provider = new DeterministicAiAuthoringProvider();

    const first = await provider.generate(request);
    const second = await provider.generate(request);

    expect(first).toEqual(second);
    expect(first.status).toBe('success');
  });

  it('لا يضع purpose أو key داخل اقتراح السؤال', async () => {
    const result = await new DeterministicAiAuthoringProvider().generate(request);

    expect(result.status).toBe('success');
    if (result.status === 'success') {
      expect(result.suggestion).not.toHaveProperty('purpose');
      expect(result.suggestion).not.toHaveProperty('key');
      expect(result.meta.providerFamily).toBe('deterministic');
    }
  });

  it('يعيد rejected حتميًا عند ضبط السلوك لذلك', async () => {
    const provider = new DeterministicAiAuthoringProvider({ behavior: 'rejected' });

    await expect(provider.generate(request)).resolves.toEqual({
      status: 'rejected',
      target: 'mastery_question',
      reason: 'provider_rejected',
    });
  });

  it('يعيد unavailable حتميًا عند ضبط السلوك لذلك', async () => {
    const provider = new DeterministicAiAuthoringProvider({ behavior: 'unavailable' });

    await expect(provider.generate(request)).resolves.toEqual({
      status: 'unavailable',
      target: 'mastery_question',
      reason: 'provider_unavailable',
    });
  });

  it('يعيد invalid_output من خلال نفس عقد التحقق', async () => {
    const provider = new DeterministicAiAuthoringProvider({ behavior: 'invalid_output' });

    await expect(provider.generate(request)).resolves.toEqual({
      status: 'invalid_output',
      target: 'mastery_question',
      reason: 'objective_not_in_request',
    });
  });

  it('يرفض طلب سؤال بلا أهداف قبل بناء أي اقتراح', async () => {
    const invalidRequest: AiGenerationRequest = {
      target: 'review_question',
      context: {
        language: 'ar',
        gradeLabel: 'الصف العاشر',
        subjectLabel: 'الفيزياء',
        unitTitle: 'الحركة',
        lessonTitle: 'القوة المحصلة',
        objectives: [],
      },
    };

    await expect(new DeterministicAiAuthoringProvider().generate(invalidRequest)).resolves.toEqual({
      status: 'rejected',
      target: 'review_question',
      reason: 'invalid_request',
      requestReason: 'question_requires_objectives',
    });
  });

  it('يلتقط الإلغاء الفوري حتى مع latencyMs الافتراضي صفر', async () => {
    const controller = new AbortController();
    const provider = new DeterministicAiAuthoringProvider();
    const pending = provider.generate(request, { signal: controller.signal });

    controller.abort();

    await expect(pending).resolves.toEqual({ status: 'aborted', target: 'mastery_question' });
  });

  it('يلغي الطلب المعلّق عند AbortSignal بلا اقتراح متأخر', async () => {
    const controller = new AbortController();
    const provider = new DeterministicAiAuthoringProvider({ latencyMs: 50 });
    const pending = provider.generate(request, { signal: controller.signal });

    controller.abort();

    await expect(pending).resolves.toEqual({ status: 'aborted', target: 'mastery_question' });
  });
});
