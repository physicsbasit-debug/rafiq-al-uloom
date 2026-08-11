import type { LessonRevisionPayload } from '@services/authoring';

import { getQuestionStateIssue } from './teacher-lesson-structure';

export type SubmissionReadinessReason =
  | 'missing_objective'
  | 'missing_question'
  | 'missing_mastery_question'
  | 'invalid_question_structure'
  | 'dangling_objective';

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

  return {
    ready: reasons.length === 0,
    reasons,
  };
}
