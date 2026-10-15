import type { Question } from '@shared-types/quiz.types';
import type { AnswersByQuestionId } from '@utils/scoring';

export const MASTERY_SCORING_POLICY_VERSION = 'mastery-equal-weight-v1' as const;

export type MasteryExperienceContextValue =
  | string
  | number
  | boolean
  | null
  | readonly MasteryExperienceContextValue[]
  | { readonly [key: string]: MasteryExperienceContextValue };

export type MasteryExperienceContext = Readonly<Record<string, MasteryExperienceContextValue>>;

export type MasteryAttemptRejectionReason =
  | 'not_authenticated'
  | 'not_authorized'
  | 'invalid_response_set'
  | 'lesson_not_available'
  | 'scoring_contract_stale'
  | 'question_set_mismatch'
  | 'submission_conflict';

export type MasteryAttemptUnavailableReason = 'network_error' | 'service_unavailable' | 'unknown';

export type MasteryResultReconciliation = 'matched_local_result' | 'display_reconciled_to_server';

export interface MasteryAnswerSubmission {
  readonly questionId: string;
  readonly selectedChoiceIndex: number;
}

export interface MasteryAttemptRepositorySubmission {
  readonly submissionId: string;
  readonly lessonId: string;
  readonly startedAt: string;
  readonly expectedScoringFingerprint: string;
  readonly answers: readonly MasteryAnswerSubmission[];
  readonly experienceContext?: MasteryExperienceContext;
}

export interface MasteryAttemptServiceSubmission {
  readonly submissionId: string;
  readonly lessonId: string;
  readonly startedAt: string;
  readonly questions: readonly Question[];
  readonly answersByQuestionId: AnswersByQuestionId;
  readonly experienceContext?: MasteryExperienceContext;
}

export interface OfficialMasteryAttemptResult {
  readonly attemptId: string;
  readonly submissionId: string;
  readonly lessonId: string;
  readonly questionCount: number;
  readonly correctCount: number;
  readonly percentage: number;
  readonly scoringPolicyVersion: typeof MASTERY_SCORING_POLICY_VERSION;
  readonly scoringFingerprint: string;
  readonly completedAt: string;
}

export type MasteryAttemptRepositoryResult =
  | {
      readonly status: 'saved';
      readonly result: OfficialMasteryAttemptResult;
    }
  | {
      readonly status: 'already_saved';
      readonly result: OfficialMasteryAttemptResult;
    }
  | {
      readonly status: 'rejected';
      readonly reason: MasteryAttemptRejectionReason;
    }
  | {
      readonly status: 'unavailable';
      readonly reason: MasteryAttemptUnavailableReason;
    };

export type MasteryAttemptSubmissionResult =
  | {
      readonly status: 'saved';
      readonly result: OfficialMasteryAttemptResult;
      readonly reconciliation: MasteryResultReconciliation;
    }
  | {
      readonly status: 'already_saved';
      readonly result: OfficialMasteryAttemptResult;
      readonly reconciliation: MasteryResultReconciliation;
    }
  | {
      readonly status: 'rejected';
      readonly reason: MasteryAttemptRejectionReason;
    }
  | {
      readonly status: 'unavailable';
      readonly reason: MasteryAttemptUnavailableReason;
    };

export interface MasteryResultsRequestOptions {
  readonly signal?: AbortSignal;
}
