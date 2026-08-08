import type { LessonRevision } from '@services/authoring';

export interface ReviewerWorkspaceProps {
  readonly onOpenRevision?: (revision: LessonRevision) => void;
}
