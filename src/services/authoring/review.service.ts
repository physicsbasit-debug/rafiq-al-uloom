import {
  authoringRejected,
  authoringUnavailableResult,
  isAbortError,
} from './authoring.errors';
import type { ReviewRepository } from './review.repository';
import { supabaseReviewRepository } from './supabase-authoring.repositories';
import type {
  AuthoringRequestOptions,
  LessonRevisionListResult,
  ReviewLessonRevisionInput,
  ReviewLessonRevisionResult,
} from './authoring.types';

export interface ReviewService {
  listPendingRevisions(options?: AuthoringRequestOptions): Promise<LessonRevisionListResult>;
  reviewLessonRevision(
    input: ReviewLessonRevisionInput,
    options?: AuthoringRequestOptions
  ): Promise<ReviewLessonRevisionResult>;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function guardRepositoryCall<T>(call: () => Promise<T>): Promise<T | ReturnType<typeof authoringUnavailableResult>> {
  try {
    return await call();
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }
    return authoringUnavailableResult(error);
  }
}

export function createReviewService(repository: ReviewRepository): ReviewService {
  return {
    async listPendingRevisions(options = {}) {
      options.signal?.throwIfAborted();
      return guardRepositoryCall(() => repository.listPendingRevisions(options));
    },

    async reviewLessonRevision(input, options = {}) {
      options.signal?.throwIfAborted();

      if (!UUID_PATTERN.test(input.revisionId)) {
        return authoringRejected('invalid_revision_id');
      }

      if (input.decision !== 'approve' && input.decision !== 'reject') {
        return authoringRejected('invalid_decision');
      }

      const normalizedNote = input.note?.trim() || null;
      if (input.decision === 'reject' && normalizedNote === null) {
        return authoringRejected('review_note_required');
      }

      return guardRepositoryCall(() =>
        repository.reviewLessonRevision(
          {
            revisionId: input.revisionId,
            decision: input.decision,
            note: normalizedNote,
          },
          options
        )
      );
    },
  };
}

let defaultService: ReviewService | undefined;

function getDefaultService(): ReviewService {
  defaultService ??= createReviewService(supabaseReviewRepository);
  return defaultService;
}

export const reviewService: ReviewService = {
  listPendingRevisions: (options) => getDefaultService().listPendingRevisions(options),
  reviewLessonRevision: (input, options) =>
    getDefaultService().reviewLessonRevision(input, options),
};
