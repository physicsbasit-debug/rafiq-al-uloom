import { AppCard } from '@design-system/components/AppCard';
import type { LessonRevision } from '@services/authoring';

import { formatReviewerSubmittedAt } from './reviewer-workspace.utils';

interface ReviewerRevisionCardProps {
  readonly revision: LessonRevision;
  readonly onOpen: (revision: LessonRevision) => void;
}

export function ReviewerRevisionCard({ revision, onOpen }: ReviewerRevisionCardProps) {
  const submittedAt = formatReviewerSubmittedAt(revision);

  return (
    <AppCard
      title={revision.payload.lesson.title}
      subtitle={`قيد المراجعة • الإصدار ${revision.revisionNumber} • أُرسل ${submittedAt}`}
      onClick={() => onOpen(revision)}
    />
  );
}
