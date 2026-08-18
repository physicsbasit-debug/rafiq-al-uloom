import type { Difficulty } from '@shared-types/quiz.types';

export type AiAuthoringLanguage = 'ar';

export type AiAuthoringTarget =
  'lesson_summary' | 'objective' | 'review_question' | 'mastery_question';

export interface AiLessonContext {
  readonly language: AiAuthoringLanguage;
  readonly gradeLabel: string;
  readonly subjectLabel: string;
  readonly unitTitle: string;
  readonly lessonTitle: string;
}

export interface AiLessonSummaryContext extends AiLessonContext {
  readonly currentSummary?: string;
}

export interface AiObjectiveContext {
  readonly key: string;
  readonly text: string;
}

export interface AiLessonSummaryRequest {
  readonly target: 'lesson_summary';
  readonly context: AiLessonSummaryContext;
}

export interface AiObjectiveRequest {
  readonly target: 'objective';
  readonly context: AiLessonContext;
}

export interface AiReviewQuestionRequest {
  readonly target: 'review_question';
  readonly context: AiLessonContext & {
    readonly objectives: readonly AiObjectiveContext[];
  };
}

export interface AiMasteryQuestionRequest {
  readonly target: 'mastery_question';
  readonly context: AiLessonContext & {
    readonly objectives: readonly AiObjectiveContext[];
  };
}

export type AiGenerationRequest =
  AiLessonSummaryRequest | AiObjectiveRequest | AiReviewQuestionRequest | AiMasteryQuestionRequest;

export interface AiLessonSummarySuggestion {
  readonly kind: 'lesson_summary';
  readonly text: string;
}

export interface AiObjectiveSuggestion {
  readonly kind: 'objective';
  readonly text: string;
}

export interface AiQuestionSuggestion {
  readonly kind: 'question';
  readonly prompt: string;
  readonly choices: readonly string[];
  readonly correctAnswerIndex: number;
  readonly explanation: string;
  readonly objectiveKey: string;
  readonly difficulty: Difficulty;
}

export interface AiSuggestionByTarget {
  readonly lesson_summary: AiLessonSummarySuggestion;
  readonly objective: AiObjectiveSuggestion;
  readonly review_question: AiQuestionSuggestion;
  readonly mastery_question: AiQuestionSuggestion;
}

export type AiSuggestion = AiSuggestionByTarget[AiAuthoringTarget];

export interface AiSuggestionMeta {
  readonly generationId: string;
  readonly providerFamily: string;
  readonly modelLabel: string;
  readonly generatedAt: string;
  readonly target: AiAuthoringTarget;
}

export type AiInvalidOutputReason =
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

export type AiRequestValidationReason =
  | 'invalid_request_shape'
  | 'unexpected_request_fields'
  | 'invalid_target'
  | 'invalid_context'
  | 'unexpected_context_fields'
  | 'question_requires_objectives'
  | 'invalid_objective_context'
  | 'duplicate_objective_key';

export type AiRejectedReason = 'invalid_request' | 'provider_rejected';
export type AiUnavailableReason = 'provider_unavailable';

export type AiGenerationSuccess = {
  [Target in AiAuthoringTarget]: {
    readonly status: 'success';
    readonly target: Target;
    readonly suggestion: AiSuggestionByTarget[Target];
    readonly meta: AiSuggestionMeta & { readonly target: Target };
  };
}[AiAuthoringTarget];

export type AiGenerationResult =
  | AiGenerationSuccess
  | {
      readonly status: 'invalid_output';
      readonly target: AiAuthoringTarget;
      readonly reason: AiInvalidOutputReason;
    }
  | {
      readonly status: 'rejected';
      readonly target: AiAuthoringTarget;
      readonly reason: AiRejectedReason;
      readonly requestReason?: AiRequestValidationReason;
    }
  | {
      readonly status: 'unavailable';
      readonly target: AiAuthoringTarget;
      readonly reason: AiUnavailableReason;
    }
  | {
      readonly status: 'aborted';
      readonly target: AiAuthoringTarget;
    };

export interface AiGenerationOptions {
  readonly signal?: AbortSignal;
}

export type AiRequestValidationResult =
  { readonly valid: true } | { readonly valid: false; readonly reason: AiRequestValidationReason };

export type AiSuggestionValidationResult<Target extends AiAuthoringTarget = AiAuthoringTarget> =
  | {
      readonly valid: true;
      readonly suggestion: AiSuggestionByTarget[Target];
    }
  | {
      readonly valid: false;
      readonly reason: AiInvalidOutputReason;
    };
