import type { LessonRevision, LessonRevisionStatus } from '@services/authoring';

export type TeacherRevisionFilter = 'all' | LessonRevisionStatus;

export interface TeacherWorkspaceProps {
  readonly onCreateLesson?: () => void;
  readonly onOpenRevision?: (revision: LessonRevision) => void;
}
