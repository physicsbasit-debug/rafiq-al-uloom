import {
  validateAiGenerationRequestRuntime,
  validateAiProviderOutputRuntime,
  type RuntimeAiGenerationRequest,
} from './ai-authoring.runtime-contract';
import type {
  AiGenerationRequest,
  AiRequestValidationResult,
  AiSuggestionValidationResult,
} from './ai-authoring.types';

export function validateAiGenerationRequest(request: unknown): AiRequestValidationResult {
  return validateAiGenerationRequestRuntime(request) as AiRequestValidationResult;
}

export function validateAiProviderOutput(
  request: AiGenerationRequest,
  value: unknown
): AiSuggestionValidationResult {
  return validateAiProviderOutputRuntime(
    request as RuntimeAiGenerationRequest,
    value
  ) as AiSuggestionValidationResult;
}
