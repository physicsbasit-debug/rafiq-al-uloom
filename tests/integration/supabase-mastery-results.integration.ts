import { Buffer } from 'node:buffer';
import { createHash, randomUUID } from 'node:crypto';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  psqlAdmin,
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
} from './helpers/supabase-auth-fixtures';

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;
const scoringPolicyVersion = 'mastery-equal-weight-v1';

interface TestQuestion {
  id: string;
  correctAnswerIndex: number;
  choices: string[];
}

interface OfficialResult {
  attemptId: string;
  submissionId: string;
  lessonId: string;
  questionCount: number;
  correctCount: number;
  percentage: number;
  scoringPolicyVersion: string;
  scoringFingerprint: string;
  completedAt: string;
}

type RpcResult =
  | { status: 'saved' | 'already_saved'; result: OfficialResult }
  | {
      status: 'rejected';
      reason:
        | 'not_authenticated'
        | 'not_authorized'
        | 'lesson_not_available'
        | 'invalid_response_set'
        | 'question_set_mismatch'
        | 'scoring_contract_stale'
        | 'submission_conflict';
    };

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function buildScoringFingerprint(lessonId: string, questions: TestQuestion[]): string {
  const questionMaterial = [...questions]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(
      (question) =>
        `${Buffer.byteLength(question.id, 'utf8')}:${question.id}:${question.correctAnswerIndex}:${question.choices.length}`
    )
    .join('\n');
  const material = `${scoringPolicyVersion}\n${Buffer.byteLength(lessonId, 'utf8')}:${lessonId}\n${questionMaterial}`;
  return createHash('sha256').update(material, 'utf8').digest('hex');
}

function answersFor(questions: TestQuestion[], selectedIndexes?: number[]) {
  return questions.map((question, index) => ({
    questionId: question.id,
    selectedChoiceIndex: selectedIndexes?.[index] ?? question.correctAnswerIndex,
  }));
}

async function submit(
  identity: AuthIdentity,
  lessonId: string,
  questions: TestQuestion[],
  options: {
    submissionId?: string;
    fingerprint?: string;
    answers?: Array<{ questionId: string; selectedChoiceIndex: number }>;
  } = {}
): Promise<{ data: RpcResult | null; error: { code?: string; message?: string } | null }> {
  const { data, error } = await identity.client.rpc('submit_mastery_attempt', {
    p_submission_id: options.submissionId ?? randomUUID(),
    p_lesson_id: lessonId,
    p_started_at: new Date(Date.now() - 30_000).toISOString(),
    p_expected_scoring_fingerprint:
      options.fingerprint ?? buildScoringFingerprint(lessonId, questions),
    p_answers: options.answers ?? answersFor(questions),
  });

  return { data: data as RpcResult | null, error };
}

function expectPermissionDenied(error: { code?: string; message?: string } | null): void {
  expect(error).not.toBeNull();
  expect(error?.code).toBe('42501');
  expect(error?.message?.toLowerCase()).toContain('permission denied');
}

describeIntegration('Phase 2-D1 mastery result persistence', { concurrent: false }, () => {
  const runId = randomUUID().replaceAll('-', '').slice(0, 16);
  const lessonId = `d1-mastery-lesson-${runId}`;
  const objectiveId = `d1-mastery-objective-${runId}`;
  const displayOrder = 920_000_000 + (Number.parseInt(runId.slice(0, 6), 16) % 50_000_000);
  const questions: TestQuestion[] = [
    { id: `d1-mq-a-${runId}`, correctAnswerIndex: 0, choices: ['A', 'B', 'C', 'D'] },
    { id: `d1-mq-b-${runId}`, correctAnswerIndex: 1, choices: ['A', 'B', 'C', 'D'] },
    { id: `d1-mq-c-${runId}`, correctAnswerIndex: 2, choices: ['A', 'B', 'C', 'D'] },
  ];

  let fixtures: SupabaseAuthFixtures;
  let activeStudent: AuthIdentity;
  let activeTeacher: AuthIdentity;
  let activeReviewer: AuthIdentity;
  let pendingStudent: AuthIdentity;
  let suspendedStudent: AuthIdentity;

  beforeAll(async () => {
    fixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());

    psqlAdmin(`
      INSERT INTO public.lessons (
        id, unit_id, title, display_order, summary, key_concepts,
        examples, misconceptions, status, source
      ) VALUES (
        ${sqlLiteral(lessonId)},
        'g10-phy-waves-unit',
        'D1 mastery persistence fixture',
        ${displayOrder},
        'Dedicated approved lesson for Phase 2-D1 integration tests.',
        ARRAY['D1']::text[],
        ARRAY['D1']::text[],
        ARRAY['D1']::text[],
        'approved',
        'curriculum_seed'
      );

      INSERT INTO public.objectives (id, lesson_id, text)
      VALUES (${sqlLiteral(objectiveId)}, ${sqlLiteral(lessonId)}, 'D1 objective');

      INSERT INTO public.questions (
        id, lesson_id, purpose, type, prompt, choices,
        correct_answer_index, explanation, objective_id,
        difficulty, status, source
      ) VALUES
        (${sqlLiteral(questions[0].id)}, ${sqlLiteral(lessonId)}, 'mastery', 'multiple_choice',
          'D1 question A', ARRAY['A','B','C','D']::text[], 0, 'A', ${sqlLiteral(objectiveId)},
          'easy', 'approved', 'curriculum_seed'),
        (${sqlLiteral(questions[1].id)}, ${sqlLiteral(lessonId)}, 'mastery', 'multiple_choice',
          'D1 question B', ARRAY['A','B','C','D']::text[], 1, 'B', ${sqlLiteral(objectiveId)},
          'medium', 'approved', 'curriculum_seed'),
        (${sqlLiteral(questions[2].id)}, ${sqlLiteral(lessonId)}, 'mastery', 'multiple_choice',
          'D1 question C', ARRAY['A','B','C','D']::text[], 2, 'C', ${sqlLiteral(objectiveId)},
          'hard', 'approved', 'curriculum_seed');
    `);

    activeStudent = await fixtures.createIdentity('d1-active-student', 'student', 'active');
    activeTeacher = await fixtures.createIdentity('d1-active-teacher', 'teacher', 'active');
    activeReviewer = await fixtures.createIdentity('d1-active-reviewer', 'reviewer', 'active');
    pendingStudent = await fixtures.createIdentity('d1-pending-student');
    suspendedStudent = await fixtures.createIdentity(
      'd1-suspended-student',
      'student',
      'suspended'
    );
  });

  afterAll(async () => {
    if (fixtures) await fixtures.cleanup();
    psqlAdmin(`
      DELETE FROM public.questions WHERE lesson_id = ${sqlLiteral(lessonId)};
      DELETE FROM public.objectives WHERE id = ${sqlLiteral(objectiveId)};
      DELETE FROM public.lessons WHERE id = ${sqlLiteral(lessonId)};
    `);
  });

  it.each([
    ['student', () => activeStudent],
    ['teacher', () => activeTeacher],
    ['reviewer', () => activeReviewer],
  ] as const)(
    'allows active %s to save only a server-scored own attempt',
    async (_role, getIdentity) => {
      const response = await submit(getIdentity(), lessonId, questions, {
        answers: answersFor(questions, [0, 0, 2]),
      });

      expect(response.error).toBeNull();
      expect(response.data?.status).toBe('saved');
      if (response.data?.status !== 'saved') throw new Error('Expected saved mastery result.');

      expect(response.data.result.lessonId).toBe(lessonId);
      expect(response.data.result.questionCount).toBe(3);
      expect(response.data.result.correctCount).toBe(2);
      expect(response.data.result.percentage).toBeCloseTo((2 / 3) * 100, 12);
      expect(response.data.result.scoringPolicyVersion).toBe(scoringPolicyVersion);
      expect(response.data.result.scoringFingerprint).toBe(
        buildScoringFingerprint(lessonId, questions)
      );
    }
  );

  it('returns the same attempt for an identical idempotent retry', async () => {
    const submissionId = randomUUID();
    const first = await submit(activeStudent, lessonId, questions, { submissionId });
    const second = await submit(activeStudent, lessonId, questions, { submissionId });

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect(first.data?.status).toBe('saved');
    expect(second.data?.status).toBe('already_saved');
    if (!first.data || !second.data || !('result' in first.data) || !('result' in second.data)) {
      throw new Error('Expected two successful idempotent results.');
    }
    expect(second.data.result.attemptId).toBe(first.data.result.attemptId);
  });

  it('handles two genuinely concurrent submissions with the same submission id', async () => {
    const submissionId = randomUUID();
    const [first, second] = await Promise.all([
      submit(activeStudent, lessonId, questions, { submissionId }),
      submit(activeStudent, lessonId, questions, { submissionId }),
    ]);

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();
    expect([first.data?.status, second.data?.status].sort()).toEqual(['already_saved', 'saved']);

    if (!first.data || !second.data || !('result' in first.data) || !('result' in second.data)) {
      throw new Error('Expected two successful concurrent idempotent results.');
    }

    expect(second.data.result.attemptId).toBe(first.data.result.attemptId);
  });

  it('rejects reusing one submission id with different answers', async () => {
    const submissionId = randomUUID();
    const first = await submit(activeStudent, lessonId, questions, { submissionId });
    const conflict = await submit(activeStudent, lessonId, questions, {
      submissionId,
      answers: answersFor(questions, [1, 1, 2]),
    });

    expect(first.error).toBeNull();
    expect(conflict.error).toBeNull();
    expect(conflict.data).toEqual({ status: 'rejected', reason: 'submission_conflict' });
  });

  it('rejects an unavailable lesson without saving an attempt', async () => {
    const missingLessonId = `missing-${runId}`;
    const response = await submit(activeStudent, missingLessonId, questions, {
      fingerprint: buildScoringFingerprint(missingLessonId, questions),
    });

    expect(response.error).toBeNull();
    expect(response.data).toEqual({ status: 'rejected', reason: 'lesson_not_available' });
  });

  it('rejects a stale scoring fingerprint without saving an attempt', async () => {
    const submissionId = randomUUID();
    const response = await submit(activeStudent, lessonId, questions, {
      submissionId,
      fingerprint: '0'.repeat(64),
    });

    expect(response.error).toBeNull();
    expect(response.data).toEqual({ status: 'rejected', reason: 'scoring_contract_stale' });

    const after = await fixtures.adminClient
      .from('mastery_attempts')
      .select('id')
      .eq('user_id', activeStudent.user.id)
      .eq('submission_id', submissionId);
    expect(after.error).toBeNull();
    expect(after.data).toEqual([]);
  });

  it('rejects missing, additional, or duplicate question ids as question_set_mismatch', async () => {
    const cases = [
      answersFor(questions).slice(0, 2),
      [...answersFor(questions), { questionId: `foreign-${runId}`, selectedChoiceIndex: 0 }],
      [answersFor(questions)[0], answersFor(questions)[0], answersFor(questions)[2]],
    ];

    for (const answers of cases) {
      const response = await submit(activeStudent, lessonId, questions, { answers });
      expect(response.error).toBeNull();
      expect(response.data).toEqual({ status: 'rejected', reason: 'question_set_mismatch' });
    }
  });

  it('rejects negative, fractional, and out-of-range choice indexes', async () => {
    const invalidCases: Array<Array<{ questionId: string; selectedChoiceIndex: number }>> = [
      answersFor(questions, [-1, 1, 2]),
      answersFor(questions, [0.5, 1, 2]),
      answersFor(questions, [4, 1, 2]),
    ];

    for (const answers of invalidCases) {
      const response = await submit(activeStudent, lessonId, questions, { answers });
      expect(response.error).toBeNull();
      expect(response.data).toEqual({ status: 'rejected', reason: 'invalid_response_set' });
    }
  });

  it('rejects pending and suspended accounts before any insert', async () => {
    for (const identity of [pendingStudent, suspendedStudent]) {
      const submissionId = randomUUID();
      const response = await submit(identity, lessonId, questions, { submissionId });
      expect(response.error).toBeNull();
      expect(response.data).toEqual({ status: 'rejected', reason: 'not_authorized' });

      const after = await fixtures.adminClient
        .from('mastery_attempts')
        .select('id')
        .eq('user_id', identity.user.id)
        .eq('submission_id', submissionId);
      expect(after.error).toBeNull();
      expect(after.data).toEqual([]);
    }
  });

  it('denies anonymous RPC execution at the function privilege layer', async () => {
    const { error } = await fixtures.anonymousClient.rpc('submit_mastery_attempt', {
      p_submission_id: randomUUID(),
      p_lesson_id: lessonId,
      p_started_at: new Date().toISOString(),
      p_expected_scoring_fingerprint: buildScoringFingerprint(lessonId, questions),
      p_answers: answersFor(questions),
    });

    expectPermissionDenied(error);
  });

  it('lets an active user read only their own attempts and answers', async () => {
    const saved = await submit(activeStudent, lessonId, questions);
    if (saved.data?.status !== 'saved') throw new Error('Expected saved mastery result.');

    const ownAttempts = await activeStudent.client
      .from('mastery_attempts')
      .select('id, user_id, lesson_id')
      .eq('id', saved.data.result.attemptId);
    const foreignAttempts = await activeTeacher.client
      .from('mastery_attempts')
      .select('id, user_id, lesson_id')
      .eq('id', saved.data.result.attemptId);
    const ownAnswers = await activeStudent.client
      .from('mastery_attempt_answers')
      .select('question_id, selected_choice_index, is_correct')
      .eq('attempt_id', saved.data.result.attemptId)
      .order('question_order');
    const foreignAnswers = await activeTeacher.client
      .from('mastery_attempt_answers')
      .select('question_id')
      .eq('attempt_id', saved.data.result.attemptId);

    expect(ownAttempts.error).toBeNull();
    expect(ownAttempts.data).toHaveLength(1);
    expect(foreignAttempts.error).toBeNull();
    expect(foreignAttempts.data).toEqual([]);
    expect(ownAnswers.error).toBeNull();
    expect(ownAnswers.data).toHaveLength(3);
    expect(foreignAnswers.error).toBeNull();
    expect(foreignAnswers.data).toEqual([]);
  });

  it('denies direct INSERT, UPDATE, and DELETE on result tables', async () => {
    const saved = await submit(activeStudent, lessonId, questions);
    if (saved.data?.status !== 'saved') throw new Error('Expected saved mastery result.');

    const insertResult = await activeStudent.client.from('mastery_attempts').insert({
      id: randomUUID(),
      user_id: activeStudent.user.id,
      lesson_id: lessonId,
      submission_id: randomUUID(),
      started_at: new Date().toISOString(),
      question_count: 3,
      correct_count: 3,
      percentage: 100,
      scoring_policy_version: scoringPolicyVersion,
      scoring_fingerprint: buildScoringFingerprint(lessonId, questions),
      request_fingerprint: '0'.repeat(64),
    });
    const updateResult = await activeStudent.client
      .from('mastery_attempts')
      .update({ percentage: 100 })
      .eq('id', saved.data.result.attemptId);
    const deleteResult = await activeStudent.client
      .from('mastery_attempts')
      .delete()
      .eq('id', saved.data.result.attemptId);
    const answerInsert = await activeStudent.client.from('mastery_attempt_answers').insert({
      attempt_id: saved.data.result.attemptId,
      question_id: questions[0].id,
      question_order: 99,
      selected_choice_index: 0,
      is_correct: true,
    });

    expectPermissionDenied(insertResult.error);
    expectPermissionDenied(updateResult.error);
    expectPermissionDenied(deleteResult.error);
    expectPermissionDenied(answerInsert.error);
  });

  it('rolls back the attempt atomically when answer persistence fails', async () => {
    const submissionId = randomUUID();
    const functionName = `d1_reject_answer_${runId}`;
    const triggerName = `d1_reject_answer_trigger_${runId}`;

    psqlAdmin(`
      CREATE FUNCTION public.${functionName}()
      RETURNS trigger
      LANGUAGE plpgsql
      SET search_path = ''
      AS $$
      BEGIN
        IF NEW.question_id = ${sqlLiteral(questions[1].id)} THEN
          RAISE EXCEPTION 'D1 forced answer failure';
        END IF;
        RETURN NEW;
      END;
      $$;

      CREATE TRIGGER ${triggerName}
      BEFORE INSERT ON public.mastery_attempt_answers
      FOR EACH ROW
      EXECUTE FUNCTION public.${functionName}();
    `);

    try {
      const response = await submit(activeStudent, lessonId, questions, { submissionId });
      expect(response.error).not.toBeNull();

      const after = await fixtures.adminClient
        .from('mastery_attempts')
        .select('id')
        .eq('user_id', activeStudent.user.id)
        .eq('submission_id', submissionId);
      expect(after.error).toBeNull();
      expect(after.data).toEqual([]);
    } finally {
      psqlAdmin(`
        DROP TRIGGER IF EXISTS ${triggerName} ON public.mastery_attempt_answers;
        DROP FUNCTION IF EXISTS public.${functionName}();
      `);
    }
  });

  it('cascades attempts and answers when the auth user is deleted', async () => {
    const identity = await fixtures.createIdentity('d1-cascade-user', 'student', 'active');
    const saved = await submit(identity, lessonId, questions);
    if (saved.data?.status !== 'saved') throw new Error('Expected saved mastery result.');

    await fixtures.deleteUser(identity.user.id);

    const attemptCount = psqlAdmin(`
      SELECT count(*)
      FROM public.mastery_attempts
      WHERE id = ${sqlLiteral(saved.data.result.attemptId)};
    `);
    const answerCount = psqlAdmin(`
      SELECT count(*)
      FROM public.mastery_attempt_answers
      WHERE attempt_id = ${sqlLiteral(saved.data.result.attemptId)};
    `);

    expect(attemptCount).toBe('0');
    expect(answerCount).toBe('0');
  });
});
