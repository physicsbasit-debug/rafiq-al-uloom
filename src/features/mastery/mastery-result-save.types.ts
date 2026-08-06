import type { AuthorizationDecisionReason } from '@services/auth/authorization.policy';
import type {
  MasteryAttemptSubmissionResult,
  MasteryResultReconciliation,
  OfficialMasteryAttemptResult,
} from '@services/mastery-results';

export type MasterySaveNotApplicableReason = 'guest' | 'local_content';

export type MasterySaveAuthorizationFailureReason = Exclude<
  AuthorizationDecisionReason,
  'allowed' | 'guest'
>;

export type MasterySaveSubmissionFailure = Extract<
  MasteryAttemptSubmissionResult,
  { readonly status: 'rejected' | 'unavailable' }
>;

export type MasterySaveFailure =
  | {
      readonly kind: 'authorization';
      readonly reason: MasterySaveAuthorizationFailureReason;
    }
  | {
      readonly kind: 'submission';
      readonly result: MasterySaveSubmissionFailure;
    };

export type MasterySaveState =
  | { readonly status: 'idle' }
  | {
      readonly status: 'saving';
      readonly submissionId: string;
    }
  | {
      readonly status: 'saved';
      readonly submissionStatus: 'saved' | 'already_saved';
      readonly result: OfficialMasteryAttemptResult;
      readonly reconciliation: MasteryResultReconciliation;
    }
  | {
      readonly status: 'failed';
      readonly failure: MasterySaveFailure;
      readonly retryable: boolean;
    }
  | {
      readonly status: 'not_applicable';
      readonly reason: MasterySaveNotApplicableReason;
    };
