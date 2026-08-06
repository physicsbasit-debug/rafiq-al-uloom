import type { Question } from '@shared-types/quiz.types';
import { calculateScore, type AnswersByQuestionId } from '@utils/scoring';

import { isAbortError, unavailableResult } from './mastery-results.errors';
import {
  createMasteryScoringFingerprint,
  type Sha256HexDigest,
} from './mastery-results.fingerprint';
import type { MasteryResultsRepository } from './mastery-results.repository';
import { supabaseMasteryResultsRepository } from './supabase-mastery-results.repository';
import type {
  MasteryAnswerSubmission,
  MasteryAttemptRejectionReason,
  MasteryAttemptServiceSubmission,
  MasteryAttemptSubmissionResult,
  MasteryResultsRequestOptions,
  OfficialMasteryAttemptResult,
} from './mastery-results.types';

export interface MasteryResultsService {
  submitAttempt(
    submission: MasteryAttemptServiceSubmission,
    options?: MasteryResultsRequestOptions
  ): Promise<MasteryAttemptSubmissionResult>;
}

export interface MasteryResultsServiceOptions {
  readonly digestSha256Hex?: Sha256HexDigest;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function rejected(reason: MasteryAttemptRejectionReason): MasteryAttemptSubmissionResult {
  return { status: 'rejected', reason };
}

function hasValidQuestionContract(question: Question): boolean {
  return (
    question.type === 'multiple_choice' &&
    question.choices.length > 0 &&
    Number.isInteger(question.correctAnswerIndex) &&
    question.correctAnswerIndex >= 0 &&
    question.correctAnswerIndex < question.choices.length
  );
}

function validateQuestionSet(
  lessonId: string,
  questions: readonly Question[]
): MasteryAttemptRejectionReason | null {
  if (questions.length === 0) {
    return 'question_set_mismatch';
  }

  const ids = new Set<string>();
  for (const question of questions) {
    if (!question.id || question.lessonId !== lessonId || ids.has(question.id)) {
      return 'question_set_mismatch';
    }

    ids.add(question.id);
    if (!hasValidQuestionContract(question)) {
      return 'scoring_contract_stale';
    }
  }

  return null;
}

function toAnswerSubmissions(
  questions: readonly Question[],
  answersByQuestionId: AnswersByQuestionId
): MasteryAnswerSubmission[] | null {
  const questionIds = new Set(questions.map((question) => question.id));
  const suppliedIds = Object.keys(answersByQuestionId);

  if (suppliedIds.length !== questionIds.size || suppliedIds.some((id) => !questionIds.has(id))) {
    return null;
  }

  const answers: MasteryAnswerSubmission[] = [];
  for (const question of questions) {
    const selectedChoiceIndex = answersByQuestionId[question.id];
    if (
      !Number.isInteger(selectedChoiceIndex) ||
      (selectedChoiceIndex as number) < 0 ||
      (selectedChoiceIndex as number) >= question.choices.length
    ) {
      return null;
    }

    answers.push({
      questionId: question.id,
      selectedChoiceIndex: selectedChoiceIndex as number,
    });
  }

  return answers;
}

function resultsMatch(
  localQuestions: readonly Question[],
  localAnswers: AnswersByQuestionId,
  official: OfficialMasteryAttemptResult
): boolean {
  const local = calculateScore([...localQuestions], localAnswers);
  return (
    local.totalQuestions === official.questionCount &&
    local.correctAnswers === official.correctCount &&
    Math.abs(local.score - official.percentage) <= Number.EPSILON * 100
  );
}

export function createMasteryResultsService(
  repository: MasteryResultsRepository,
  options: MasteryResultsServiceOptions = {}
): MasteryResultsService {
  return {
    async submitAttempt(submission, requestOptions = {}) {
      requestOptions.signal?.throwIfAborted();

      if (
        !UUID_PATTERN.test(submission.submissionId) ||
        !submission.lessonId ||
        Number.isNaN(Date.parse(submission.startedAt))
      ) {
        return rejected('invalid_response_set');
      }

      const questionSetError = validateQuestionSet(submission.lessonId, submission.questions);
      if (questionSetError) {
        return rejected(questionSetError);
      }

      const answers = toAnswerSubmissions(submission.questions, submission.answersByQuestionId);
      if (!answers) {
        return rejected('invalid_response_set');
      }

      try {
        const expectedScoringFingerprint = await createMasteryScoringFingerprint(
          submission.lessonId,
          submission.questions,
          options.digestSha256Hex
        );
        requestOptions.signal?.throwIfAborted();

        const result = await repository.submitAttempt(
          {
            submissionId: submission.submissionId,
            lessonId: submission.lessonId,
            startedAt: submission.startedAt,
            expectedScoringFingerprint,
            answers,
          },
          requestOptions
        );

        if (result.status === 'saved' || result.status === 'already_saved') {
          return {
            ...result,
            reconciliation: resultsMatch(
              submission.questions,
              submission.answersByQuestionId,
              result.result
            )
              ? 'matched_local_result'
              : 'display_reconciled_to_server',
          };
        }

        return result;
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        return unavailableResult(error);
      }
    },
  };
}

let defaultService: MasteryResultsService | undefined;

function getDefaultService(): MasteryResultsService {
  defaultService ??= createMasteryResultsService(supabaseMasteryResultsRepository);
  return defaultService;
}

export const masteryResultsService: MasteryResultsService = {
  submitAttempt: (submission, options) => getDefaultService().submitAttempt(submission, options),
};
