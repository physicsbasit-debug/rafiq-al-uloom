import {
  validateAiGenerationRequest,
  validateGuardedAiProviderOutput,
} from './ai-authoring.contract';
import type { AiAuthoringProvider } from './ai-authoring.provider';
import type {
  AiGenerationOptions,
  AiGenerationRequest,
  AiGenerationResult,
  AiSuggestion,
} from './ai-authoring.types';

export type DeterministicAiBehavior = 'success' | 'invalid_output' | 'rejected' | 'unavailable';

export interface DeterministicAiAuthoringProviderOptions {
  readonly behavior?: DeterministicAiBehavior;
  readonly latencyMs?: number;
  readonly generatedAt?: string;
}

const DEFAULT_GENERATED_AT = '2000-01-01T00:00:00.000Z';

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function createMetaBase(request: AiGenerationRequest, generatedAt: string) {
  return {
    generationId: `deterministic-${request.target}-${stableHash(JSON.stringify(request))}`,
    providerFamily: 'deterministic',
    modelLabel: 'phase-4-1-fixture-v1',
    generatedAt,
  };
}

function createSuccessResult(
  request: AiGenerationRequest,
  suggestion: AiSuggestion,
  generatedAt: string
): AiGenerationResult {
  const meta = createMetaBase(request, generatedAt);

  switch (request.target) {
    case 'lesson_summary':
      if (suggestion.kind !== 'lesson_summary') {
        return { status: 'invalid_output', target: request.target, reason: 'unexpected_fields' };
      }
      return {
        status: 'success',
        target: 'lesson_summary',
        suggestion,
        meta: { ...meta, target: 'lesson_summary' },
      };
    case 'objective':
      if (suggestion.kind !== 'objective') {
        return { status: 'invalid_output', target: request.target, reason: 'unexpected_fields' };
      }
      return {
        status: 'success',
        target: 'objective',
        suggestion,
        meta: { ...meta, target: 'objective' },
      };
    case 'review_question':
      if (suggestion.kind !== 'question') {
        return { status: 'invalid_output', target: request.target, reason: 'unexpected_fields' };
      }
      return {
        status: 'success',
        target: 'review_question',
        suggestion,
        meta: { ...meta, target: 'review_question' },
      };
    case 'mastery_question':
      if (suggestion.kind !== 'question') {
        return { status: 'invalid_output', target: request.target, reason: 'unexpected_fields' };
      }
      return {
        status: 'success',
        target: 'mastery_question',
        suggestion,
        meta: { ...meta, target: 'mastery_question' },
      };
  }
}

function buildValidRawSuggestion(request: AiGenerationRequest): unknown {
  switch (request.target) {
    case 'lesson_summary':
      return {
        text: `ملخص مقترح لدرس ${request.context.lessonTitle}.`,
      };
    case 'objective':
      return {
        text: `أن يشرح المتعلم الفكرة الأساسية في درس ${request.context.lessonTitle}.`,
      };
    case 'review_question':
    case 'mastery_question': {
      const objective = request.context.objectives[0];
      return {
        prompt: `أي العبارات الآتية ترتبط بالهدف: ${objective?.text ?? ''}؟`,
        choices: ['العبارة الأولى', 'العبارة الثانية', 'العبارة الثالثة'],
        correctAnswerIndex: 0,
        explanation: 'العبارة الأولى هي الإجابة المحددة في المزود الحتمي للاختبار.',
        objectiveKey: objective?.key ?? '',
        difficulty: 'medium',
      };
    }
  }
}

function buildInvalidRawSuggestion(request: AiGenerationRequest): unknown {
  if (request.target === 'lesson_summary' || request.target === 'objective') {
    return { text: '' };
  }
  return {
    prompt: 'سؤال غير صالح عمدًا',
    choices: ['أ', 'ب'],
    correctAnswerIndex: 0,
    explanation: 'اقتراح عدائي حتمي.',
    objectiveKey: '__missing_objective__',
    difficulty: 'medium',
  };
}

async function waitForLatency(milliseconds: number, signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return false;
  if (milliseconds <= 0) return true;

  return new Promise<boolean>((resolve) => {
    const timeout = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve(true);
    }, milliseconds);

    const onAbort = () => {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
      resolve(false);
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export class DeterministicAiAuthoringProvider implements AiAuthoringProvider {
  readonly #behavior: DeterministicAiBehavior;
  readonly #latencyMs: number;
  readonly #generatedAt: string;

  constructor(options: DeterministicAiAuthoringProviderOptions = {}) {
    this.#behavior = options.behavior ?? 'success';
    this.#latencyMs = Math.max(0, options.latencyMs ?? 0);
    this.#generatedAt = options.generatedAt ?? DEFAULT_GENERATED_AT;
  }

  async generate(
    request: AiGenerationRequest,
    options: AiGenerationOptions = {}
  ): Promise<AiGenerationResult> {
    const latencyCompleted = await waitForLatency(this.#latencyMs, options.signal);
    if (!latencyCompleted || options.signal?.aborted) {
      return { status: 'aborted', target: request.target };
    }

    const requestValidation = validateAiGenerationRequest(request);
    if (!requestValidation.valid) {
      return {
        status: 'rejected',
        target: request.target,
        reason: 'invalid_request',
        requestReason: requestValidation.reason,
      };
    }

    if (this.#behavior === 'unavailable') {
      return { status: 'unavailable', target: request.target, reason: 'provider_unavailable' };
    }
    if (this.#behavior === 'rejected') {
      return { status: 'rejected', target: request.target, reason: 'provider_rejected' };
    }

    const rawSuggestion =
      this.#behavior === 'invalid_output'
        ? buildInvalidRawSuggestion(request)
        : buildValidRawSuggestion(request);
    const validation = validateGuardedAiProviderOutput(request, rawSuggestion);

    if (!validation.valid) {
      return { status: 'invalid_output', target: request.target, reason: validation.reason };
    }

    return createSuccessResult(request, validation.suggestion, this.#generatedAt);
  }
}
