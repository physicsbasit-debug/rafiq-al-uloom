import { reviewService, type LessonRevision, type ReviewService } from '@services/authoring';

import { ReviewerPendingList } from './ReviewerPendingList';
import type { ReviewerWorkspaceProps } from './reviewer-workspace.types';
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

      <ReviewerPendingList
        revisions={revisions}
        isLoading={isLoading}
        error={error}
        onRetry={reload}
        onOpenRevision={onOpenRevision}
      />
    </section>
  );
}
