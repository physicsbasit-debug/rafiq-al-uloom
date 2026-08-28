import {
  validateAiProviderOutputRuntime,
  type RuntimeAiGenerationRequest,
  type RuntimeAiSuggestionValidationResult,
} from './ai-authoring.runtime-contract.ts';

export const MIN_PEDAGOGICAL_TEXT_LENGTH = 3;

const ARABIC_LETTER_PATTERN = /[\u0621-\u063A\u0641-\u064A]/u;

function hasArabicLetter(value: string): boolean {
  return ARABIC_LETTER_PATTERN.test(value);
}

const CONTENT_CODE_POINT_PATTERN = /[\p{L}\p{N}]/u;

function visibleCodePointLength(value: string): number {
  return Array.from(value).filter((character) => CONTENT_CODE_POINT_PATTERN.test(character)).length;
}

function passesTextFloor(value: string): boolean {
  return visibleCodePointLength(value) >= MIN_PEDAGOGICAL_TEXT_LENGTH;
}

function normalizeChoiceForDuplicateCheck(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/gu, ' ');
}

function hasDuplicateChoices(choices: readonly string[]): boolean {
  const normalized = choices.map(normalizeChoiceForDuplicateCheck);
  return new Set(normalized).size !== normalized.length;
}

export function validateGuardedAiProviderOutputRuntime(
  request: RuntimeAiGenerationRequest,
  value: unknown
): RuntimeAiSuggestionValidationResult {
  const structural = validateAiProviderOutputRuntime(request, value);
  if (!structural.valid) return structural;

  const suggestion = structural.suggestion;

  if (request.target === 'lesson_summary' || request.target === 'objective') {
    if (suggestion.kind !== 'lesson_summary' && suggestion.kind !== 'objective') {
      return { valid: false, reason: 'unexpected_fields' };
    }

    if (!hasArabicLetter(suggestion.text) || !passesTextFloor(suggestion.text)) {
      return { valid: false, reason: 'invalid_text' };
    }

    return structural;
  }

  if (suggestion.kind !== 'question') {
    return { valid: false, reason: 'unexpected_fields' };
  }

  if (!hasArabicLetter(suggestion.prompt) || !passesTextFloor(suggestion.prompt)) {
    return { valid: false, reason: 'invalid_prompt' };
  }

  if (!hasArabicLetter(suggestion.explanation) || !passesTextFloor(suggestion.explanation)) {
    return { valid: false, reason: 'invalid_explanation' };
  }

  if (hasDuplicateChoices(suggestion.choices)) {
    return { valid: false, reason: 'invalid_choices' };
  }

  return structural;
}
