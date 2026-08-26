import { validateAiProviderOutput } from './ai-authoring.contract';
import type {
  AiGenerationRequest,
  AiGenerationResult,
  AiInvalidOutputReason,
  AiRejectedReason,
  AiRequestValidationReason,
  AiUnavailableReason,
} from './ai-authoring.types';

export type GatewayAiGenerationResultValidation =
  { readonly valid: true; readonly result: AiGenerationResult } | { readonly valid: false };

const INVALID_OUTPUT_REASONS = new Set<AiInvalidOutputReason>([
  'not_object',
  'unexpected_fields',
  'invalid_text',
  'invalid_prompt',
  'invalid_choices',
  'invalid_correct_answer',
  'invalid_explanation',
  'invalid_objective_key',
  'objective_not_in_request',
  'invalid_difficulty',
]);

const REQUEST_VALIDATION_REASONS = new Set<AiRequestValidationReason>([
  'invalid_request_shape',
  'unexpected_request_fields',
  'invalid_target',
  'invalid_context',
  'unexpected_context_fields',
  'question_requires_objectives',
  'invalid_objective_context',
  'duplicate_objective_key',
]);

const REJECTED_REASONS = new Set<AiRejectedReason>(['invalid_request', 'provider_rejected']);
const UNAVAILABLE_REASONS = new Set<AiUnavailableReason>(['provider_unavailable']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length === expected.length && keys.every((key) => expected.includes(key));
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isInvalidOutputReason(value: unknown): value is AiInvalidOutputReason {
  return typeof value === 'string' && INVALID_OUTPUT_REASONS.has(value as AiInvalidOutputReason);
}

function isRequestValidationReason(value: unknown): value is AiRequestValidationReason {
  return (
    typeof value === 'string' && REQUEST_VALIDATION_REASONS.has(value as AiRequestValidationReason)
  );
}

function isRejectedReason(value: unknown): value is AiRejectedReason {
  return typeof value === 'string' && REJECTED_REASONS.has(value as AiRejectedReason);
}

function isUnavailableReason(value: unknown): value is AiUnavailableReason {
  return typeof value === 'string' && UNAVAILABLE_REASONS.has(value as AiUnavailableReason);
}

function matchesValidatedSuggestion(
  request: AiGenerationRequest,
  networkSuggestion: Record<string, unknown>
): boolean {
  if (request.target === 'lesson_summary') {
    if (
      !hasExactKeys(networkSuggestion, ['kind', 'text']) ||
      networkSuggestion.kind !== 'lesson_summary'
    ) {
      return false;
    }

    const validation = validateAiProviderOutput(request, { text: networkSuggestion.text });
    return (
      validation.valid &&
      validation.suggestion.kind === 'lesson_summary' &&
      validation.suggestion.text === networkSuggestion.text
    );
  }

  if (request.target === 'objective') {
    if (
      !hasExactKeys(networkSuggestion, ['kind', 'text']) ||
      networkSuggestion.kind !== 'objective'
    ) {
      return false;
    }

    const validation = validateAiProviderOutput(request, { text: networkSuggestion.text });
    return (
      validation.valid &&
      validation.suggestion.kind === 'objective' &&
      validation.suggestion.text === networkSuggestion.text
    );
  }

  if (
    !hasExactKeys(networkSuggestion, [
      'kind',
      'prompt',
      'choices',
      'correctAnswerIndex',
      'explanation',
      'objectiveKey',
      'difficulty',
    ]) ||
    networkSuggestion.kind !== 'question'
  ) {
    return false;
  }

  const validation = validateAiProviderOutput(request, {
    prompt: networkSuggestion.prompt,
    choices: networkSuggestion.choices,
    correctAnswerIndex: networkSuggestion.correctAnswerIndex,
    explanation: networkSuggestion.explanation,
    objectiveKey: networkSuggestion.objectiveKey,
    difficulty: networkSuggestion.difficulty,
  });

  if (!validation.valid || validation.suggestion.kind !== 'question') {
    return false;
  }

  const networkChoices = networkSuggestion.choices;
  if (!Array.isArray(networkChoices)) {
    return false;
  }

  return (
    validation.suggestion.prompt === networkSuggestion.prompt &&
    validation.suggestion.correctAnswerIndex === networkSuggestion.correctAnswerIndex &&
    validation.suggestion.explanation === networkSuggestion.explanation &&
    validation.suggestion.objectiveKey === networkSuggestion.objectiveKey &&
    validation.suggestion.difficulty === networkSuggestion.difficulty &&
    validation.suggestion.choices.length === networkChoices.length &&
    validation.suggestion.choices.every((choice, index) => choice === networkChoices[index])
  );
}

function isValidSuccessResult(
  request: AiGenerationRequest,
  value: Record<string, unknown>
): boolean {
  if (!hasExactKeys(value, ['status', 'target', 'suggestion', 'meta'])) {
    return false;
  }
  if (
    value.status !== 'success' ||
    value.target !== request.target ||
    !isRecord(value.suggestion)
  ) {
    return false;
  }
  if (
    !isRecord(value.meta) ||
    !hasExactKeys(value.meta, [
      'generationId',
      'providerFamily',
      'modelLabel',
      'generatedAt',
      'target',
    ])
  ) {
    return false;
  }
  if (
    !isNonBlankString(value.meta.generationId) ||
    !isNonBlankString(value.meta.providerFamily) ||
    !isNonBlankString(value.meta.modelLabel) ||
    !isNonBlankString(value.meta.generatedAt) ||
    value.meta.target !== request.target
  ) {
    return false;
  }

  return matchesValidatedSuggestion(request, value.suggestion);
}

function isValidInvalidOutputResult(
  request: AiGenerationRequest,
  value: Record<string, unknown>
): boolean {
  return (
    hasExactKeys(value, ['status', 'target', 'reason']) &&
    value.status === 'invalid_output' &&
    value.target === request.target &&
    isInvalidOutputReason(value.reason)
  );
}

function isValidRejectedResult(
  request: AiGenerationRequest,
  value: Record<string, unknown>
): boolean {
  const hasRequestReason = Object.prototype.hasOwnProperty.call(value, 'requestReason');
  const expectedKeys = hasRequestReason
    ? ['status', 'target', 'reason', 'requestReason']
    : ['status', 'target', 'reason'];

  if (
    !hasExactKeys(value, expectedKeys) ||
    value.status !== 'rejected' ||
    value.target !== request.target ||
    !isRejectedReason(value.reason)
  ) {
    return false;
  }

  return !hasRequestReason || isRequestValidationReason(value.requestReason);
}

function isValidUnavailableResult(
  request: AiGenerationRequest,
  value: Record<string, unknown>
): boolean {
  return (
    hasExactKeys(value, ['status', 'target', 'reason']) &&
    value.status === 'unavailable' &&
    value.target === request.target &&
    isUnavailableReason(value.reason)
  );
}

function isValidAbortedResult(
  request: AiGenerationRequest,
  value: Record<string, unknown>
): boolean {
  return (
    hasExactKeys(value, ['status', 'target']) &&
    value.status === 'aborted' &&
    value.target === request.target
  );
}

export function validateGatewayAiGenerationResult(
  request: AiGenerationRequest,
  value: unknown
): GatewayAiGenerationResultValidation {
  if (!isRecord(value) || typeof value.status !== 'string') {
    return { valid: false };
  }

  const valid =
    (value.status === 'success' && isValidSuccessResult(request, value)) ||
    (value.status === 'invalid_output' && isValidInvalidOutputResult(request, value)) ||
    (value.status === 'rejected' && isValidRejectedResult(request, value)) ||
    (value.status === 'unavailable' && isValidUnavailableResult(request, value)) ||
    (value.status === 'aborted' && isValidAbortedResult(request, value));

  return valid ? { valid: true, result: value as AiGenerationResult } : { valid: false };
}
