import { AppButton } from '@design-system/components/AppButton';
import type { LessonRevision } from '@services/authoring';

import { TeacherDraftCard } from './TeacherDraftCard';

interface TeacherDraftListProps {
  readonly revisions: readonly LessonRevision[];
  readonly isLoading: boolean;
  readonly error: string | null;
  readonly emptyMessage: string;
  readonly onRetry: () => void;
  readonly onOpenRevision: (revision: LessonRevision) => void;
}

export function TeacherDraftList({
  revisions,
  isLoading,
  error,
  emptyMessage,
  onRetry,
  onOpenRevision,
}: TeacherDraftListProps) {
  if (isLoading) {
    return <p role="status">جارٍ تحميل مسوداتك...</p>;
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
    return <p>{emptyMessage}</p>;
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      {revisions.map((revision) => (
        <TeacherDraftCard key={revision.id} revision={revision} onOpen={onOpenRevision} />
      ))}
    </div>
  );
}
