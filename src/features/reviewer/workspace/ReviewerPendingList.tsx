import { AppButton } from '@design-system/components/AppButton';
import type { LessonRevision } from '@services/authoring';

import { ReviewerRevisionCard } from './ReviewerRevisionCard';

interface ReviewerPendingListProps {
  readonly revisions: readonly LessonRevision[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly onRetry: () => void;
  readonly onOpenRevision: (revision: LessonRevision) => void;
}

export function ReviewerPendingList({
  revisions,
  isLoading,
  error,
  onRetry,
  onOpenRevision,
}: ReviewerPendingListProps) {
  if (isLoading) {
    return <p role="status">جارٍ تحميل قائمة المراجعة...</p>;
  }

  if (error) {
    return (
      <div role="alert">
        <p>{error}</p>
        <div style={{ maxWidth: '190px' }}>
          <AppButton label="إعادة المحاولة" variant="secondary" onClick={onRetry} />
        </div>
      </div>
    );
  }

  if (revisions.length === 0) {
    return <p>لا توجد دروس بانتظار المراجعة حاليًا.</p>;
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {revisions.map((revision) => (
        <ReviewerRevisionCard key={revision.id} revision={revision} onOpen={onOpenRevision} />
      ))}
    </div>
  );
}
