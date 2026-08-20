import {
  validateAiProviderOutputRuntime,
  type RuntimeAiGenerationRequest,
  type RuntimeAiGenerationResult,
} from '../../../src/services/ai-authoring/ai-authoring.runtime-contract.ts';

function buildRawSuggestion(request: RuntimeAiGenerationRequest): unknown {
  switch (request.target) {
    case 'lesson_summary':
      return {
        text: `ملخص تجريبي محلي لدرس: ${request.context.lessonTitle}`,
      };
    case 'objective':
      return {
        text: `أن يفسر المتعلم الفكرة الرئيسة في درس ${request.context.lessonTitle} تفسيرًا علميًا واضحًا.`,
      };
    case 'review_question':
    case 'mastery_question':
      return {
        prompt: `أي العبارات الآتية ترتبط مباشرة بهدف الدرس «${request.context.objectives[0].text}»؟`,
        choices: ['العبارة المرتبطة مباشرة بالهدف', 'عبارة مشتتة أولى', 'عبارة مشتتة ثانية'],
        correctAnswerIndex: 0,
        explanation: 'الإجابة الأولى هي الأكثر ارتباطًا بالهدف المحدد في الطلب.',
        objectiveKey: request.context.objectives[0].key,
        difficulty: 'medium',
      };
  }
}

export function generateFakeServerResult(
  request: RuntimeAiGenerationRequest
): RuntimeAiGenerationResult {
  const validation = validateAiProviderOutputRuntime(request, buildRawSuggestion(request));

  if (!validation.valid) {
    return {
      status: 'invalid_output',
      target: request.target,
      reason: validation.reason,
    };
  }

  return {
    status: 'success',
    target: request.target,
    suggestion: validation.suggestion,
    meta: {
      generationId: crypto.randomUUID(),
      providerFamily: 'local_fake',
      modelLabel: 'phase-4-3a-deterministic',
      generatedAt: new Date().toISOString(),
      target: request.target,
    },
  } as RuntimeAiGenerationResult;
}
