import { useEffect, useRef, useState } from 'react';

import type {
  AuthoringRejectionReason,
  AuthoringUnavailableReason,
  LessonRevision,
  ReviewDecision,
  ReviewService,
} from '@services/authoring';

import type { ReviewerDecisionCommitted } from './reviewer-workspace.types';
import {
  reviewerReviewIdentityMismatchMessage,
  reviewerReviewRejectionMessage,
  reviewerReviewUnexpectedSuccessMessage,
  reviewerReviewUnavailableMessage,
} from './reviewer-workspace.utils';

export type ReviewerRevisionReviewError =
  | {
      readonly kind: 'rejected';
      readonly reason: AuthoringRejectionReason;
      readonly message: string;
    }
  | {
      readonly kind: 'unavailable';
      readonly reason: AuthoringUnavailableReason;
      readonly message: string;
    }
  | {
      readonly kind: 'identity_mismatch' | 'unexpected_success';
      readonly message: string;
    };

interface UseReviewerRevisionReviewOptions {
  readonly service: ReviewService;
  readonly revision: LessonRevision;
  readonly onDecisionCommitted: (outcome: ReviewerDecisionCommitted) => void;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}

function resultError(
  result:
    | { readonly status: 'rejected'; readonly reason: AuthoringRejectionReason }
    | { readonly status: 'unavailable'; readonly reason: AuthoringUnavailableReason }
): ReviewerRevisionReviewError {
  if (result.status === 'rejected') {
    return {
      kind: 'rejected',
      reason: result.reason,
      message: reviewerReviewRejectionMessage(result.reason),
    };
  }
  return {
    kind: 'unavailable',
    reason: result.reason,
    message: reviewerReviewUnavailableMessage(result.reason),
  };
}

export function useReviewerRevisionReview({
  service,
  revision,
  onDecisionCommitted,
}: UseReviewerRevisionReviewOptions) {
  const reviewRevisionId = revision.id;
  const [reviewNote, setReviewNoteState] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);
  const [error, setError] = useState<ReviewerRevisionReviewError | null>(null);
  const reviewAbortRef = useRef<AbortController | null>(null);
  const reviewInFlightRef = useRef(false);

  useEffect(() => {
    return () => {
      reviewAbortRef.current?.abort();
      reviewAbortRef.current = null;
      reviewInFlightRef.current = false;
    };
  }, []);

  const isReviewLocked = () => isReviewing || reviewInFlightRef.current;

  const setReviewNote = (value: string) => {
    if (isReviewing || reviewInFlightRef.current) return;
    setReviewNoteState(value);
    if (error?.kind === 'rejected' && error.reason === 'review_note_required') {
      setError(null);
    }
  };

  const validateRejectNote = (): boolean => {
    if (reviewNote.trim()) return true;
    setError({
      kind: 'rejected',
      reason: 'review_note_required',
      message: reviewerReviewRejectionMessage('review_note_required'),
    });
    return false;
  };

  const review = async (decision: ReviewDecision) => {
    if (isReviewing || reviewInFlightRef.current || revision.status !== 'pending_review') return;

    const normalizedNote = decision === 'reject' ? reviewNote.trim() : null;
    if (decision === 'reject' && !normalizedNote) {
      validateRejectNote();
      return;
    }

    reviewInFlightRef.current = true;
    const controller = new AbortController();
    reviewAbortRef.current?.abort();
    reviewAbortRef.current = controller;
    setIsReviewing(true);
    setError(null);

    try {
      const result = await service.reviewLessonRevision(
        {
          revisionId: reviewRevisionId,
          decision,
          note: decision === 'approve' ? null : normalizedNote,
        },
        { signal: controller.signal }
      );

      if (controller.signal.aborted) return;

      if (result.status === 'approved' || result.status === 'rejected_by_reviewer') {
        if (result.revisionId !== reviewRevisionId) {
          setError({
            kind: 'identity_mismatch',
            message: reviewerReviewIdentityMismatchMessage(),
          });
          return;
        }

        const expectedStatus = decision === 'approve' ? 'approved' : 'rejected_by_reviewer';
        if (result.status !== expectedStatus) {
          setError({
            kind: 'unexpected_success',
            message: reviewerReviewUnexpectedSuccessMessage(),
          });
          return;
        }

        onDecisionCommitted({
          revisionId: reviewRevisionId,
          decision,
          publishedEntityId: result.status === 'approved' ? result.publishedEntityId : null,
        });
        return;
      }

      setError(resultError(result));
    } catch (caught) {
      if (isAbortError(caught) || controller.signal.aborted) return;
      setError({
        kind: 'unavailable',
        reason: 'unknown',
        message: reviewerReviewUnavailableMessage('unknown'),
      });
    } finally {
      if (reviewAbortRef.current === controller) {
        reviewAbortRef.current = null;
        reviewInFlightRef.current = false;
        setIsReviewing(false);
      }
    }
  };

  return {
    reviewRevisionId,
    reviewNote,
    isReviewLocked,
    setReviewNote,
    validateRejectNote,
    review,
    isReviewing,
    error,
  };
}
