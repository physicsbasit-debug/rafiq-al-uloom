import type { LessonRevision, ReviewDecision } from '@services/authoring';

export interface ReviewerDecisionCommitted {
  readonly revisionId: string;
  readonly decision: ReviewDecision;
  readonly publishedEntityId: string | null;
}

export interface ReviewerWorkspaceProps {
  readonly onOpenRevision?: (revision: LessonRevision) => void;
}
