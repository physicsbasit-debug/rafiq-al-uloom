import { AppCard } from '@design-system/components/AppCard';
import type { LessonRevision } from '@services/authoring';

import {
  formatTeacherRevisionUpdatedAt,
  teacherRevisionStatusLabel,
} from './teacher-workspace.utils';

interface TeacherDraftCardProps {
  readonly revision: LessonRevision;
  readonly onOpen: (revision: LessonRevision) => void;
}

export function TeacherDraftCard({ revision, onOpen }: TeacherDraftCardProps) {
  const statusLabel = teacherRevisionStatusLabel(revision.status);
  const updatedAt = formatTeacherRevisionUpdatedAt(revision.updatedAt);

  return (
    <AppCard
      title={revision.payload.lesson.title}
      subtitle={`${statusLabel} • الإصدار ${revision.revisionNumber} • آخر تحديث ${updatedAt}`}
      onClick={() => onOpen(revision)}
    />
  );
}
