import type { ContentSource, ContentStatus } from './content.types';

export interface Inquiry {
  id: string;
  lessonId: string;
  title: string;
  instructions: string;
  objectiveIds: string[];
  context: string;
  drivingQuestion: string;
  hypothesisPrompt: string;
  observationPrompt: string;
  conclusionPrompt: string;
  status: ContentStatus;
  source: ContentSource;
}

function requireNonBlank(value: string, field: string, inquiryId: string): void {
  if (!value.trim()) {
    throw new Error(`Invalid inquiry "${inquiryId}": ${field} must not be blank.`);
  }
}

export function assertInquiry(inquiry: Inquiry): Inquiry {
  const id = inquiry.id || '<unknown>';

  requireNonBlank(inquiry.id, 'id', id);
  requireNonBlank(inquiry.lessonId, 'lessonId', id);
  requireNonBlank(inquiry.title, 'title', id);
  requireNonBlank(inquiry.instructions, 'instructions', id);
  requireNonBlank(inquiry.context, 'context', id);
  requireNonBlank(inquiry.drivingQuestion, 'drivingQuestion', id);
  requireNonBlank(inquiry.hypothesisPrompt, 'hypothesisPrompt', id);
  requireNonBlank(inquiry.observationPrompt, 'observationPrompt', id);
  requireNonBlank(inquiry.conclusionPrompt, 'conclusionPrompt', id);

  if (inquiry.objectiveIds.length === 0) {
    throw new Error(`Invalid inquiry "${id}": objectiveIds must not be empty.`);
  }

  const normalizedObjectiveIds = inquiry.objectiveIds.map((objectiveId) => objectiveId.trim());
  if (normalizedObjectiveIds.some((objectiveId) => objectiveId.length === 0)) {
    throw new Error(`Invalid inquiry "${id}": objectiveIds must not contain blanks.`);
  }

  if (new Set(normalizedObjectiveIds).size !== normalizedObjectiveIds.length) {
    throw new Error(`Invalid inquiry "${id}": objectiveIds must not contain duplicates.`);
  }

  return inquiry;
}
