import type {
  MasteryAttemptRepositoryResult,
  MasteryAttemptRepositorySubmission,
  MasteryResultsRequestOptions,
} from './mastery-results.types';

export interface MasteryResultsRepository {
  submitAttempt(
    submission: MasteryAttemptRepositorySubmission,
    options?: MasteryResultsRequestOptions
  ): Promise<MasteryAttemptRepositoryResult>;
}
