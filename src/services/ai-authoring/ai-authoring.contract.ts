import type { Difficulty } from '@shared-types/quiz.types';

import type {
  AiAuthoringTarget,
  AiGenerationRequest,
  AiRequestValidationResult,
  AiMasteryQuestionRequest,
  AiReviewQuestionRequest,
  AiSuggestion,
  AiSuggestionValidationResult,
} from './ai-authoring.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isNonBlankStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.length >= 2 && value.every(isNonBlankString);
}

function isIntegerNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value);
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 'easy' || value === 'medium' || value === 'hard';
}

function isAiAuthoringTarget(value: unknown): value is AiAuthoringTarget {
  return (
    value === 'lesson_summary' ||
    value === 'objective' ||
    value === 'review_question' ||
    value === 'mastery_question'
  );
}

function hasOnlyExpectedKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const allowed = new Set(expected);
  return Object.keys(value).every((key) => allowed.has(key));
}

function validateLessonContext(
  target: AiAuthoringTarget,
  context: unknown
): AiRequestValidationResult {
  if (!isRecord(context)) {
    return { valid: false, reason: 'invalid_context' };
  }

  const allowedKeys =
    target === 'lesson_summary'
      ? ['language', 'gradeLabel', 'subjectLabel', 'unitTitle', 'lessonTitle', 'currentSummary']
      : target === 'review_question' || target === 'mastery_question'
        ? ['language', 'gradeLabel', 'subjectLabel', 'unitTitle', 'lessonTitle', 'objectives']
        : ['language', 'gradeLabel', 'subjectLabel', 'unitTitle', 'lessonTitle'];

  if (!hasOnlyExpectedKeys(context, allowedKeys)) {
    return { valid: false, reason: 'unexpected_context_fields' };
  }

  if (
    context.language !== 'ar' ||
    !isNonBlankString(context.gradeLabel) ||
    !isNonBlankString(context.subjectLabel) ||
    !isNonBlankString(context.unitTitle) ||
    !isNonBlankString(context.lessonTitle)
  ) {
    return { valid: false, reason: 'invalid_context' };
  }

  if (
    target === 'lesson_summary' &&
    context.currentSummary !== undefined &&
    typeof context.currentSummary !== 'string'
  ) {
    return { valid: false, reason: 'invalid_context' };
  }

  if (
    (target === 'review_question' || target === 'mastery_question') &&
    !Array.isArray(context.objectives)
  ) {
    return { valid: false, reason: 'invalid_objective_context' };
  }

  return { valid: true };
}

export function validateAiGenerationRequest(request: unknown): AiRequestValidationResult {
  if (!isRecord(request)) {
    return { valid: false, reason: 'invalid_request_shape' };
  }

  if (!hasOnlyExpectedKeys(request, ['target', 'context'])) {
    return { valid: false, reason: 'unexpected_request_fields' };
  }

  if (!isAiAuthoringTarget(request.target)) {
    return { valid: false, reason: 'invalid_target' };
  }

  const target = request.target;
  const contextValidation = validateLessonContext(target, request.context);
  if (!contextValidation.valid) {
    return contextValidation;
  }

  if (target !== 'review_question' && target !== 'mastery_question') {
    return { valid: true };
  }

  const context = request.context;
  if (!isRecord(context) || !Array.isArray(context.objectives)) {
    return { valid: false, reason: 'invalid_objective_context' };
  }

  if (context.objectives.length === 0) {
    return { valid: false, reason: 'question_requires_objectives' };
  }

  const seen = new Set<string>();
  for (const objective of context.objectives) {
    const objectiveValue: unknown = objective;
    if (!isRecord(objectiveValue) || !hasOnlyExpectedKeys(objectiveValue, ['key', 'text'])) {
      return { valid: false, reason: 'invalid_objective_context' };
    }
    if (!isNonBlankString(objectiveValue.key) || !isNonBlankString(objectiveValue.text)) {
      return { valid: false, reason: 'invalid_objective_context' };
    }
    if (seen.has(objectiveValue.key)) {
      return { valid: false, reason: 'duplicate_objective_key' };
    }
    seen.add(objectiveValue.key);
  }

  return { valid: true };
}

function validateTextSuggestion(
  target: 'lesson_summary' | 'objective',
  value: unknown
): AiSuggestionValidationResult {
  if (!isRecord(value)) return { valid: false, reason: 'not_object' };
  if (!hasOnlyExpectedKeys(value, ['text'])) {
    return { valid: false, reason: 'unexpected_fields' };
  }
  if (!isNonBlankString(value.text)) return { valid: false, reason: 'invalid_text' };

  const text = value.text.trim();
  const suggestion: AiSuggestion =
    target === 'lesson_summary' ? { kind: 'lesson_summary', text } : { kind: 'objective', text };

  return { valid: true, suggestion };
}

function validateQuestionSuggestion(
  request: AiReviewQuestionRequest | AiMasteryQuestionRequest,
  value: unknown
): AiSuggestionValidationResult {
  if (!isRecord(value)) return { valid: false, reason: 'not_object' };

  const expectedKeys = [
    'prompt',
    'choices',
    'correctAnswerIndex',
    'explanation',
    'objectiveKey',
    'difficulty',
  ] as const;
  if (!hasOnlyExpectedKeys(value, expectedKeys)) {
    return { valid: false, reason: 'unexpected_fields' };
  }

  if (!isNonBlankString(value.prompt)) return { valid: false, reason: 'invalid_prompt' };
  if (!isNonBlankStringArray(value.choices)) {
    return { valid: false, reason: 'invalid_choices' };
  }
  if (
    !isIntegerNumber(value.correctAnswerIndex) ||
    value.correctAnswerIndex < 0 ||
    value.correctAnswerIndex >= value.choices.length
  ) {
    return { valid: false, reason: 'invalid_correct_answer' };
  }
  if (!isNonBlankString(value.explanation)) {
    return { valid: false, reason: 'invalid_explanation' };
  }
  if (!isNonBlankString(value.objectiveKey)) {
    return { valid: false, reason: 'invalid_objective_key' };
  }

  // Self-consistency only: Phase 4-1 deliberately does not import teacher feature validators.
  // The accepted suggestion will pass through validateQuestionDraft in the Phase 4-2 adapter.
  if (!request.context.objectives.some((objective) => objective.key === value.objectiveKey)) {
    return { valid: false, reason: 'objective_not_in_request' };
  }

  if (!isDifficulty(value.difficulty)) {
    return { valid: false, reason: 'invalid_difficulty' };
  }

  return {
    valid: true,
    suggestion: {
      kind: 'question',
      prompt: value.prompt.trim(),
      choices: value.choices.map((choice) => choice.trim()),
      correctAnswerIndex: value.correctAnswerIndex,
      explanation: value.explanation.trim(),
      objectiveKey: value.objectiveKey.trim(),
      difficulty: value.difficulty,
    },
  };
}

export function validateAiProviderOutput(
  request: AiGenerationRequest,
  value: unknown
): AiSuggestionValidationResult {
  switch (request.target) {
    case 'lesson_summary':
      return validateTextSuggestion('lesson_summary', value);
    case 'objective':
      return validateTextSuggestion('objective', value);
    case 'review_question':
    case 'mastery_question':
      return validateQuestionSuggestion(request, value);
  }
}
