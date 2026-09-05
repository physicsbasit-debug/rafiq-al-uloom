import type { LessonRevisionPayload } from '@services/authoring';

import { getActivityStructureIssues } from './teacher-activity-structure';
import { getQuestionStateIssue } from './teacher-lesson-structure';

export type SubmissionReadinessReason =
  | 'missing_objective'
  | 'missing_question'
  | 'missing_mastery_question'
  | 'invalid_question_structure'
  | 'dangling_objective'
  | 'missing_activity_objective_link'
  | 'dangling_activity_objective'
  | 'invalid_activity_structure';

export interface LessonSubmissionReadiness {
  readonly ready: boolean;
  readonly reasons: readonly SubmissionReadinessReason[];
}

export function getLessonSubmissionReadiness(
  payload: LessonRevisionPayload
): LessonSubmissionReadiness {
  const reasons: SubmissionReadinessReason[] = [];

  if (payload.objectives.length === 0) {
    reasons.push('missing_objective');
  }

  if (payload.questions.length === 0) {
    reasons.push('missing_question');
  }

  if (!payload.questions.some((question) => question.purpose === 'mastery')) {
    reasons.push('missing_mastery_question');
  }

  const questionStateIssue = getQuestionStateIssue(payload.questions, payload.objectives);

  if (questionStateIssue === 'dangling_objective') {
    reasons.push('dangling_objective');
  } else if (questionStateIssue !== null) {
    reasons.push('invalid_question_structure');
  }

  const activityIssues = getActivityStructureIssues(payload, 'submission');

  if (activityIssues.some((issue) => issue.kind === 'missing_objective_link')) {
    reasons.push('missing_activity_objective_link');
  }

  if (activityIssues.some((issue) => issue.kind === 'dangling_objective_key')) {
    reasons.push('dangling_activity_objective');
  }

  if (
    activityIssues.some(
      (issue) => issue.kind !== 'missing_objective_link' && issue.kind !== 'dangling_objective_key'
    )
  ) {
    reasons.push('invalid_activity_structure');
  }

  return {
    ready: reasons.length === 0,
    reasons,
  };
}
