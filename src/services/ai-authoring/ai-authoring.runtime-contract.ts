export type RuntimeDifficulty = 'easy' | 'medium' | 'hard';

export type RuntimeAiAuthoringTarget =
  'lesson_summary' | 'objective' | 'review_question' | 'mastery_question';

export interface RuntimeAiLessonContext {
  readonly language: 'ar';
  readonly gradeLabel: string;
  readonly subjectLabel: string;
  readonly unitTitle: string;
  readonly lessonTitle: string;
}

export interface RuntimeAiLessonSummaryContext extends RuntimeAiLessonContext {
  readonly currentSummary?: string;
}

export interface RuntimeAiObjectiveContext {
  readonly key: string;
  readonly text: string;
}

export interface RuntimeAiLessonSummaryRequest {
  readonly target: 'lesson_summary';
  readonly context: RuntimeAiLessonSummaryContext;
}

export interface RuntimeAiObjectiveRequest {
  readonly target: 'objective';
  readonly context: RuntimeAiLessonContext;
}

export interface RuntimeAiReviewQuestionRequest {
  readonly target: 'review_question';
  readonly context: RuntimeAiLessonContext & {
    readonly objectives: readonly RuntimeAiObjectiveContext[];
  };
}

export interface RuntimeAiMasteryQuestionRequest {
  readonly target: 'mastery_question';
  readonly context: RuntimeAiLessonContext & {
    readonly objectives: readonly RuntimeAiObjectiveContext[];
  };
}

export type RuntimeAiGenerationRequest =
  | RuntimeAiLessonSummaryRequest
  | RuntimeAiObjectiveRequest
  | RuntimeAiReviewQuestionRequest
  | RuntimeAiMasteryQuestionRequest;

export interface RuntimeAiLessonSummarySuggestion {
  readonly kind: 'lesson_summary';
  readonly text: string;
}

export interface RuntimeAiObjectiveSuggestion {
  readonly kind: 'objective';
  readonly text: string;
}

export interface RuntimeAiQuestionSuggestion {
  readonly kind: 'question';
  readonly prompt: string;
  readonly choices: readonly string[];
  readonly correctAnswerIndex: number;
  readonly explanation: string;
  readonly objectiveKey: string;
  readonly difficulty: RuntimeDifficulty;
}

export interface RuntimeAiSuggestionByTarget {
  readonly lesson_summary: RuntimeAiLessonSummarySuggestion;
  readonly objective: RuntimeAiObjectiveSuggestion;
  readonly review_question: RuntimeAiQuestionSuggestion;
  readonly mastery_question: RuntimeAiQuestionSuggestion;
}

export type RuntimeAiSuggestion = RuntimeAiSuggestionByTarget[RuntimeAiAuthoringTarget];

export interface RuntimeAiSuggestionMeta {
  readonly generationId: string;
  readonly providerFamily: string;
  readonly modelLabel: string;
  readonly generatedAt: string;
  readonly target: RuntimeAiAuthoringTarget;
}

export type RuntimeAiInvalidOutputReason =
  | 'not_object'
  | 'unexpected_fields'
  | 'invalid_text'
  | 'invalid_prompt'
  | 'invalid_choices'
  | 'invalid_correct_answer'
  | 'invalid_explanation'
  | 'invalid_objective_key'
  | 'objective_not_in_request'
  | 'invalid_difficulty';

export type RuntimeAiRequestValidationReason =
  | 'invalid_request_shape'
  | 'unexpected_request_fields'
  | 'invalid_target'
  | 'invalid_context'
  | 'unexpected_context_fields'
  | 'question_requires_objectives'
  | 'invalid_objective_context'
  | 'duplicate_objective_key';

export type RuntimeAiRejectedReason = 'invalid_request' | 'provider_rejected';
export type RuntimeAiUnavailableReason = 'provider_unavailable';

export type RuntimeAiGenerationSuccess = {
  [Target in RuntimeAiAuthoringTarget]: {
    readonly status: 'success';
    readonly target: Target;
    readonly suggestion: RuntimeAiSuggestionByTarget[Target];
    readonly meta: RuntimeAiSuggestionMeta & { readonly target: Target };
  };
}[RuntimeAiAuthoringTarget];

export type RuntimeAiGenerationResult =
  | RuntimeAiGenerationSuccess
  | {
      readonly status: 'invalid_output';
      readonly target: RuntimeAiAuthoringTarget;
      readonly reason: RuntimeAiInvalidOutputReason;
    }
  | {
      readonly status: 'rejected';
      readonly target: RuntimeAiAuthoringTarget;
      readonly reason: RuntimeAiRejectedReason;
      readonly requestReason?: RuntimeAiRequestValidationReason;
    }
  | {
      readonly status: 'unavailable';
      readonly target: RuntimeAiAuthoringTarget;
      readonly reason: RuntimeAiUnavailableReason;
    }
  | {
      readonly status: 'aborted';
      readonly target: RuntimeAiAuthoringTarget;
    };

export type RuntimeAiRequestValidationResult =
  | { readonly valid: true }
  | { readonly valid: false; readonly reason: RuntimeAiRequestValidationReason };

export type RuntimeAiSuggestionValidationResult<
  Target extends RuntimeAiAuthoringTarget = RuntimeAiAuthoringTarget,
> =
  | {
      readonly valid: true;
      readonly suggestion: RuntimeAiSuggestionByTarget[Target];
    }
  | {
      readonly valid: false;
      readonly reason: RuntimeAiInvalidOutputReason;
    };

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

function isDifficulty(value: unknown): value is RuntimeDifficulty {
  return value === 'easy' || value === 'medium' || value === 'hard';
}

function isAiAuthoringTarget(value: unknown): value is RuntimeAiAuthoringTarget {
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
  target: RuntimeAiAuthoringTarget,
  context: unknown
): RuntimeAiRequestValidationResult {
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

export function validateAiGenerationRequestRuntime(
  request: unknown
): RuntimeAiRequestValidationResult {
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
): RuntimeAiSuggestionValidationResult<'lesson_summary' | 'objective'> {
  if (!isRecord(value)) return { valid: false, reason: 'not_object' };
  if (!hasOnlyExpectedKeys(value, ['text'])) {
    return { valid: false, reason: 'unexpected_fields' };
  }
  if (!isNonBlankString(value.text)) return { valid: false, reason: 'invalid_text' };

  const text = value.text.trim();
  return {
    valid: true,
    suggestion:
      target === 'lesson_summary' ? { kind: 'lesson_summary', text } : { kind: 'objective', text },
  };
}

function validateQuestionSuggestion(
  request: RuntimeAiReviewQuestionRequest | RuntimeAiMasteryQuestionRequest,
  value: unknown
): RuntimeAiSuggestionValidationResult<'review_question' | 'mastery_question'> {
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

export function validateAiProviderOutputRuntime(
  request: RuntimeAiGenerationRequest,
  value: unknown
): RuntimeAiSuggestionValidationResult {
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
