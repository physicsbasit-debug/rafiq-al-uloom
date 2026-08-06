import { randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createSupabaseContentRepository } from '@services/data/supabase-content.repository';
import {
  createMasteryResultsService,
  createMasteryScoringFingerprint,
  createSupabaseMasteryResultsRepository,
  type MasteryAttemptServiceSubmission,
  type MasteryResultsService,
} from '@services/mastery-results';
import type { Question } from '@shared-types/quiz.types';
import { calculateScore, type AnswersByQuestionId } from '@utils/scoring';

import {
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
} from './helpers/supabase-auth-fixtures';
import {
  answersForPattern,
  createMasteryResultsFixture,
  installMasteryResultsFixture,
  readQuestionIdsInDatabaseOrder,
  removeMasteryResultsFixture,
} from './helpers/mastery-results-fixtures';

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

const patterns = [
  { correctPattern: [false, false, false] },
  { correctPattern: [false, false, true] },
  { correctPattern: [false, true, false] },
  { correctPattern: [false, true, true] },
  { correctPattern: [true, false, false] },
  { correctPattern: [true, false, true] },
  { correctPattern: [true, true, false] },
  { correctPattern: [true, true, true] },
] as const;

function buildSubmission(
  lessonId: string,
  questions: readonly Question[],
  answersByQuestionId: AnswersByQuestionId,
  submissionId = randomUUID()
): MasteryAttemptServiceSubmission {
  return {
    submissionId,
    lessonId,
    startedAt: new Date(Date.now() - 30_000).toISOString(),
    questions,
    answersByQuestionId,
  };
}

describeIntegration('Phase 2-D4 mastery scoring parity', { concurrent: false }, () => {
  const fixture = createMasteryResultsFixture('d4-parity');
  let authFixtures: SupabaseAuthFixtures;
  let activeStudent: AuthIdentity;
  let service: MasteryResultsService;
  let questions: readonly Question[];

  beforeAll(async () => {
    installMasteryResultsFixture(fixture);
    authFixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());
    activeStudent = await authFixtures.createIdentity(
      'd4-parity-active-student',
      'student',
      'active'
    );

    const contentRepository = createSupabaseContentRepository(activeStudent.client);
    questions = await contentRepository.getMasteryQuestionsByLesson(fixture.lessonId);
    expect(questions).toHaveLength(3);

    service = createMasteryResultsService(
      createSupabaseMasteryResultsRepository(activeStudent.client)
    );
  }, 30_000);

  afterAll(async () => {
    try {
      await authFixtures.cleanup();
    } finally {
      removeMasteryResultsFixture(fixture);
    }
  }, 30_000);

  it.each(patterns)(
    'matches TypeScript and PostgreSQL for answer pattern %j',
    async ({ correctPattern }) => {
      const answersByQuestionId = answersForPattern(questions, correctPattern);
      const local = calculateScore([...questions], answersByQuestionId);
      const result = await service.submitAttempt(
        buildSubmission(fixture.lessonId, questions, answersByQuestionId)
      );

      expect(result.status).toBe('saved');
      if (result.status !== 'saved') {
        throw new Error(`Expected saved parity result, received ${result.status}.`);
      }

      expect(result.reconciliation).toBe('matched_local_result');
      expect(result.result.questionCount).toBe(local.totalQuestions);
      expect(result.result.correctCount).toBe(local.correctAnswers);
      expect(result.result.percentage).toBeCloseTo(local.score, 12);
    }
  );

  it('matches PostgreSQL order and scoring fingerprint for Arabic and non-ASCII identifiers', async () => {
    const databaseOrder = readQuestionIdsInDatabaseOrder(fixture.lessonId);
    expect(questions.map((question) => question.id)).toEqual(databaseOrder);

    const answersByQuestionId = answersForPattern(questions, [true, false, true]);
    const expectedFingerprint = await createMasteryScoringFingerprint(
      fixture.lessonId,
      questions
    );
    const result = await service.submitAttempt(
      buildSubmission(fixture.lessonId, questions, answersByQuestionId)
    );

    expect(result.status).toBe('saved');
    if (result.status !== 'saved') {
      throw new Error('Expected saved non-ASCII parity result.');
    }

    expect(result.reconciliation).toBe('matched_local_result');
    expect(result.result.scoringFingerprint).toBe(expectedFingerprint);
  });

  it('returns the identical official result for an idempotent already_saved replay', async () => {
    const submissionId = randomUUID();
    const answersByQuestionId = answersForPattern(questions, [true, true, false]);
    const submission = buildSubmission(
      fixture.lessonId,
      questions,
      answersByQuestionId,
      submissionId
    );

    const first = await service.submitAttempt(submission);
    const second = await service.submitAttempt(submission);

    expect(first.status).toBe('saved');
    expect(second.status).toBe('already_saved');
    if (first.status !== 'saved' || second.status !== 'already_saved') {
      throw new Error('Expected saved then already_saved parity results.');
    }

    expect(first.reconciliation).toBe('matched_local_result');
    expect(second.reconciliation).toBe('matched_local_result');
    expect(second.result).toEqual(first.result);
  });
});
