import { useState } from 'react';

import { reviewService, type LessonRevision, type ReviewService } from '@services/authoring';

import { ReviewerPendingList } from './ReviewerPendingList';
import { ReviewerRevisionReview } from './ReviewerRevisionReview';
import type { ReviewerDecisionCommitted, ReviewerWorkspaceProps } from './reviewer-workspace.types';
import { useReviewerPendingRevisions } from './useReviewerPendingRevisions';

interface ReviewerWorkspaceInternalProps extends ReviewerWorkspaceProps {
  readonly service?: ReviewService;
}

const noopOpenRevision: (revision: LessonRevision) => void = () => undefined;

export function ReviewerWorkspace({
  service = reviewService,
  onOpenRevision = noopOpenRevision,
}: ReviewerWorkspaceInternalProps) {
  const { revisions, isLoading, error, reload } = useReviewerPendingRevisions(service);
  const [selectedRevision, setSelectedRevision] = useState<LessonRevision | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const openRevision = (revision: LessonRevision) => {
    setSuccessMessage(null);
    setSelectedRevision(revision);
    onOpenRevision(revision);
  };

  const decisionCommitted = (outcome: ReviewerDecisionCommitted) => {
    setSelectedRevision(null);
    setSuccessMessage(
      outcome.decision === 'approve'
        ? 'تم اعتماد النسخة بنجاح.'
        : 'تم رفض النسخة وإعادتها للتعديل بنجاح.'
    );
    reload();
  };

  if (selectedRevision) {
    return (
      <ReviewerRevisionReview
        service={service}
        revision={selectedRevision}
        onBack={() => setSelectedRevision(null)}
        onDecisionCommitted={decisionCommitted}
      />
    );
  }

  return (
    <section aria-labelledby="reviewer-workspace-title">
      <div style={{ marginBottom: '1rem' }}>
        <h2 id="reviewer-workspace-title" style={{ margin: 0 }}>
          مساحة المراجع
        </h2>
        <p style={{ margin: '0.35rem 0 0' }}>
          راجع نسخ الدروس المرسلة بانتظار الاعتماد أو الإعادة للتعديل.
        </p>
      </div>

      {successMessage ? (
        <p role="status" style={{ marginBottom: '1rem' }}>
          {successMessage}
        </p>
      ) : null}

      <ReviewerPendingList
        revisions={revisions}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        onOpenRevision={openRevision}
      />
    </section>
  );
}
