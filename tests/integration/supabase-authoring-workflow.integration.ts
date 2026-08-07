import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  buildLessonRevisionPayload,
  nextDisplayOrder,
  type AuthoringRpcResult,
  type LessonRevisionPayload,
} from './helpers/authoring-fixtures';
import {
  psqlAdmin,
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
} from './helpers/supabase-auth-fixtures';

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function asRpc(data: unknown): AuthoringRpcResult {
  return data as AuthoringRpcResult;
}

describeIntegration('Phase 3-1 trusted lesson authoring workflow', () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const sourceLessonId = `p31-source-${runId}`;
  const sourceObjectiveId = `p31-source-objective-${runId}`;
  const sourceQuestionId = `p31-source-question-${runId}`;
  const sourceDisplayOrder = nextDisplayOrder(1);
  const newDisplayOrder = nextDisplayOrder(2);
  const publishedLessonIds = new Set<string>();

  let fixtures: SupabaseAuthFixtures;
  let teacher: AuthIdentity;
  let reviewer: AuthIdentity;
  let student: AuthIdentity;
  let newDraftId = '';
  let rejectedDraftId = '';
  let successorDraftId = '';
  let existingDraftId = '';
  let existingRejectedId = '';
  let existingSuccessorId = '';
  let newPayload: LessonRevisionPayload;
  let existingPayload: LessonRevisionPayload;
  let sourceSummary = '';
  let historicalAttemptId = '';

  beforeAll(async () => {
    fixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());
    teacher = await fixtures.createIdentity('p31-workflow-teacher', 'teacher', 'active');
    reviewer = await fixtures.createIdentity('p31-workflow-reviewer', 'reviewer', 'active');
    student = await fixtures.createIdentity('p31-workflow-student', 'student', 'active');

    sourceSummary = `Original canonical summary ${runId}`;

    psqlAdmin(`
      INSERT INTO public.lessons (
        id, unit_id, title, display_order, summary, key_concepts, examples,
        misconceptions, status, source
      ) VALUES (
        ${sqlLiteral(sourceLessonId)},
        'g10-phy-waves-unit',
        ${sqlLiteral(`Source lesson ${runId}`)},
        ${sourceDisplayOrder},
        ${sqlLiteral(sourceSummary)},
        ARRAY['source concept']::text[],
        ARRAY['source example']::text[],
        ARRAY['source misconception']::text[],
        'approved',
        'curriculum_seed'
      );

      INSERT INTO public.objectives (id, lesson_id, text)
      VALUES (
        ${sqlLiteral(sourceObjectiveId)},
        ${sqlLiteral(sourceLessonId)},
        'Historical source objective'
      );

      INSERT INTO public.questions (
        id, lesson_id, purpose, type, prompt, choices, correct_answer_index,
        explanation, objective_id, difficulty, status, source
      ) VALUES (
        ${sqlLiteral(sourceQuestionId)},
        ${sqlLiteral(sourceLessonId)},
        'mastery',
        'multiple_choice',
        'Historical source question',
        ARRAY['A','B','C','D']::text[],
        0,
        'Historical source explanation',
        ${sqlLiteral(sourceObjectiveId)},
        'easy',
        'approved',
        'curriculum_seed'
      );
    `);

    historicalAttemptId = psqlAdmin(`
      WITH inserted_attempt AS (
        INSERT INTO public.mastery_attempts (
          user_id, lesson_id, submission_id, started_at, question_count, correct_count,
          percentage, scoring_policy_version, scoring_fingerprint, request_fingerprint
        ) VALUES (
          ${sqlLiteral(student.user.id)}::uuid,
          ${sqlLiteral(sourceLessonId)},
          gen_random_uuid(),
          now(),
          1,
          1,
          100,
          'mastery-equal-weight-v1',
          repeat('a', 64),
          repeat('b', 64)
        )
        RETURNING id
      )
      SELECT id FROM inserted_attempt;
    `);

    psqlAdmin(`
      INSERT INTO public.mastery_attempt_answers (
        attempt_id, question_id, question_order, selected_choice_index, is_correct
      ) VALUES (
        ${sqlLiteral(historicalAttemptId)}::uuid,
        ${sqlLiteral(sourceQuestionId)},
        0,
        0,
        true
      );
    `);

    newPayload = buildLessonRevisionPayload(runId, newDisplayOrder);
    existingPayload = buildLessonRevisionPayload(
      `${runId}-existing`,
      sourceDisplayOrder,
      `Updated source lesson ${runId}`
    );
  });

  afterAll(async () => {
    if (!fixtures) return;

    const authorIds = [teacher?.user.id].filter(Boolean) as string[];
    if (authorIds.length > 0) {
      const rows = psqlAdmin(`
        SELECT COALESCE(string_agg(published_entity_id, E'\\n'), '')
        FROM public.content_revisions
        WHERE author_id = ${sqlLiteral(authorIds[0])}
          AND published_entity_id IS NOT NULL;
      `);
      for (const id of rows.split(/\r?\n/).map((value) => value.trim()).filter(Boolean)) {
        publishedLessonIds.add(id);
      }
    }

    const canonicalIds = [sourceLessonId, ...publishedLessonIds];
    const canonicalList = canonicalIds.map(sqlLiteral).join(', ');

    if (historicalAttemptId) {
      psqlAdmin(`
        DELETE FROM public.mastery_attempt_answers
        WHERE attempt_id = ${sqlLiteral(historicalAttemptId)}::uuid;
        DELETE FROM public.mastery_attempts
        WHERE id = ${sqlLiteral(historicalAttemptId)}::uuid;
      `);
    }

    if (canonicalIds.length > 0) {
      psqlAdmin(`
        DELETE FROM public.game_objectives
        WHERE game_id IN (SELECT id FROM public.games WHERE lesson_id IN (${canonicalList}));
        DELETE FROM public.questions WHERE lesson_id IN (${canonicalList});
        DELETE FROM public.games WHERE lesson_id IN (${canonicalList});
        DELETE FROM public.experiments WHERE lesson_id IN (${canonicalList});
        DELETE FROM public.objectives WHERE lesson_id IN (${canonicalList});
      `);
    }

    psqlAdmin(`
      DELETE FROM public.content_review_events
      WHERE revision_id IN (
        SELECT id FROM public.content_revisions
        WHERE author_id = ${sqlLiteral(teacher.user.id)}
      );
      DELETE FROM public.content_revisions
      WHERE author_id = ${sqlLiteral(teacher.user.id)};
      DELETE FROM public.lessons
      WHERE id IN (${canonicalList});
    `);

    await fixtures.cleanup();
  });

  it('creates a server-owned teacher draft and keeps it out of the reviewer queue', async () => {
    const response = await teacher.client.rpc('create_lesson_revision', {
      p_payload: newPayload,
    });

    expect(response.error).toBeNull();
    const data = asRpc(response.data);
    expect(data.status).toBe('created');
    if (data.status !== 'created') throw new Error('Expected created revision.');

    newDraftId = data.revision.id;
    expect(data.revision.entityId).toBeNull();
    expect(data.revision.baseFingerprint).toBeNull();
    expect(data.revision.revisionNumber).toBe(1);

    const adminRow = await fixtures.adminClient
      .from('content_revisions')
      .select('id, author_id, status, entity_id, base_fingerprint')
      .eq('id', newDraftId)
      .single();
    expect(adminRow.error).toBeNull();
    expect(adminRow.data).toMatchObject({
      id: newDraftId,
      author_id: teacher.user.id,
      status: 'draft',
      entity_id: null,
      base_fingerprint: null,
    });

    const reviewerQueue = await reviewer.client
      .from('content_revisions')
      .select('id')
      .eq('id', newDraftId);
    expect(reviewerQueue.error).toBeNull();
    expect(reviewerQueue.data).toEqual([]);
  });

  it('saves and submits the teacher draft through trusted transitions', async () => {
    const changed = {
      ...newPayload,
      lesson: {
        ...newPayload.lesson,
        summary: `Saved draft summary ${runId}`,
      },
    } satisfies LessonRevisionPayload;

    const saved = await teacher.client.rpc('save_lesson_revision', {
      p_revision_id: newDraftId,
      p_payload: changed,
    });
    expect(saved.error).toBeNull();
    expect(asRpc(saved.data)).toEqual({ status: 'saved', revisionId: newDraftId });

    const submitted = await teacher.client.rpc('submit_lesson_revision', {
      p_revision_id: newDraftId,
    });
    expect(submitted.error).toBeNull();
    expect(asRpc(submitted.data)).toEqual({ status: 'submitted', revisionId: newDraftId });

    const reviewerQueue = await reviewer.client
      .from('content_revisions')
      .select('id, status, author_id')
      .eq('id', newDraftId);
    expect(reviewerQueue.error).toBeNull();
    expect(reviewerQueue.data).toEqual([
      { id: newDraftId, status: 'pending_review', author_id: teacher.user.id },
    ]);
  });

  it('records rejection append-only and creates a new successor revision', async () => {
    const rejected = await reviewer.client.rpc('review_lesson_revision', {
      p_revision_id: newDraftId,
      p_decision: 'reject',
      p_note: 'Clarify the explanation before approval.',
    });
    expect(rejected.error).toBeNull();
    expect(asRpc(rejected.data)).toEqual({
      status: 'rejected_by_reviewer',
      revisionId: newDraftId,
    });
    rejectedDraftId = newDraftId;

    const teacherEvents = await teacher.client
      .from('content_review_events')
      .select('revision_id, reviewer_id, decision, note')
      .eq('revision_id', rejectedDraftId);
    expect(teacherEvents.error).toBeNull();
    expect(teacherEvents.data).toEqual([
      {
        revision_id: rejectedDraftId,
        reviewer_id: reviewer.user.id,
        decision: 'reject',
        note: 'Clarify the explanation before approval.',
      },
    ]);

    const revisedPayload = {
      ...newPayload,
      lesson: {
        ...newPayload.lesson,
        summary: `Revised after rejection ${runId}`,
      },
    } satisfies LessonRevisionPayload;

    const successor = await teacher.client.rpc('create_lesson_revision', {
      p_payload: revisedPayload,
      p_supersedes_revision_id: rejectedDraftId,
    });
    expect(successor.error).toBeNull();
    const successorData = asRpc(successor.data);
    expect(successorData.status).toBe('created');
    if (successorData.status !== 'created') throw new Error('Expected successor revision.');

    successorDraftId = successorData.revision.id;
    expect(successorData.revision.revisionNumber).toBe(2);

    const submitted = await teacher.client.rpc('submit_lesson_revision', {
      p_revision_id: successorDraftId,
    });
    expect(submitted.error).toBeNull();
    expect(asRpc(submitted.data)).toEqual({
      status: 'submitted',
      revisionId: successorDraftId,
    });

    const oldEvents = await teacher.client
      .from('content_review_events')
      .select('decision, note')
      .eq('revision_id', rejectedDraftId);
    expect(oldEvents.error).toBeNull();
    expect(oldEvents.data).toHaveLength(1);
  });

  it('approves a pending successor and publishes a complete canonical lesson graph atomically', async () => {
    const approved = await reviewer.client.rpc('review_lesson_revision', {
      p_revision_id: successorDraftId,
      p_decision: 'approve',
      p_note: 'Ready for publication.',
    });
    expect(approved.error).toBeNull();
    const data = asRpc(approved.data);
    expect(data.status).toBe('approved');
    if (data.status !== 'approved') throw new Error('Expected approved revision.');

    publishedLessonIds.add(data.publishedEntityId);

    const lesson = await student.client
      .from('lessons')
      .select('id, title, status, source')
      .eq('id', data.publishedEntityId)
      .single();
    expect(lesson.error).toBeNull();
    expect(lesson.data).toMatchObject({
      id: data.publishedEntityId,
      status: 'approved',
      source: 'teacher_authored',
    });

    const [objectives, questions, games, experiments, links] = await Promise.all([
      student.client.from('objectives').select('id').eq('lesson_id', data.publishedEntityId),
      student.client
        .from('questions')
        .select('id, status, source')
        .eq('lesson_id', data.publishedEntityId),
      student.client
        .from('games')
        .select('id, status, source')
        .eq('lesson_id', data.publishedEntityId),
      student.client
        .from('experiments')
        .select('id, status, source')
        .eq('lesson_id', data.publishedEntityId),
      student.client.from('game_objectives').select('game_id, objective_id'),
    ]);

    for (const result of [objectives, questions, games, experiments, links]) {
      expect(result.error).toBeNull();
    }
    expect(objectives.data).toHaveLength(2);
    expect(questions.data).toHaveLength(2);
    expect(games.data).toHaveLength(1);
    expect(experiments.data).toHaveLength(1);
    expect(links.data?.filter((row) => row.game_id.startsWith(data.publishedEntityId))).toHaveLength(
      2
    );

    const approvalEvent = await reviewer.client
      .from('content_review_events')
      .select('reviewer_id, decision, note')
      .eq('revision_id', successorDraftId);
    expect(approvalEvent.error).toBeNull();
    expect(approvalEvent.data).toEqual([
      {
        reviewer_id: reviewer.user.id,
        decision: 'approve',
        note: 'Ready for publication.',
      },
    ]);
  });

  it('derives the canonical base fingerprint on the server for an existing lesson revision', async () => {
    const created = await teacher.client.rpc('create_lesson_revision', {
      p_payload: existingPayload,
      p_entity_id: sourceLessonId,
    });
    expect(created.error).toBeNull();
    const data = asRpc(created.data);
    expect(data.status).toBe('created');
    if (data.status !== 'created') throw new Error('Expected existing-content revision.');

    existingDraftId = data.revision.id;
    expect(data.revision.entityId).toBe(sourceLessonId);
    expect(data.revision.baseFingerprint).toMatch(/^[0-9a-f]{64}$/);

    const submitted = await teacher.client.rpc('submit_lesson_revision', {
      p_revision_id: existingDraftId,
    });
    expect(submitted.error).toBeNull();
    expect(asRpc(submitted.data)).toEqual({ status: 'submitted', revisionId: existingDraftId });
  });

  it('rejects stale approval without publishing or forging an audit decision', async () => {
    psqlAdmin(`
      UPDATE public.lessons
      SET summary = ${sqlLiteral(`Externally changed summary ${runId}`)}
      WHERE id = ${sqlLiteral(sourceLessonId)};
    `);

    try {
      const beforeLessons = psqlAdmin(`
        SELECT count(*)
        FROM public.lessons
        WHERE id LIKE 'lesson-%'
          AND title = ${sqlLiteral(existingPayload.lesson.title)};
      `);

      const stale = await reviewer.client.rpc('review_lesson_revision', {
        p_revision_id: existingDraftId,
        p_decision: 'approve',
      });
      expect(stale.error).toBeNull();
      expect(asRpc(stale.data)).toEqual({ status: 'rejected', reason: 'stale_revision' });

      const revision = await fixtures.adminClient
        .from('content_revisions')
        .select('status, published_entity_id')
        .eq('id', existingDraftId)
        .single();
      expect(revision.error).toBeNull();
      expect(revision.data).toEqual({ status: 'pending_review', published_entity_id: null });

      const events = await fixtures.adminClient
        .from('content_review_events')
        .select('id')
        .eq('revision_id', existingDraftId);
      expect(events.error).toBeNull();
      expect(events.data).toEqual([]);

      const afterLessons = psqlAdmin(`
        SELECT count(*)
        FROM public.lessons
        WHERE id LIKE 'lesson-%'
          AND title = ${sqlLiteral(existingPayload.lesson.title)};
      `);
      expect(afterLessons).toBe(beforeLessons);
    } finally {
      psqlAdmin(`
        UPDATE public.lessons
        SET summary = ${sqlLiteral(sourceSummary)}
        WHERE id = ${sqlLiteral(sourceLessonId)};
      `);
    }

    const rejected = await reviewer.client.rpc('review_lesson_revision', {
      p_revision_id: existingDraftId,
      p_decision: 'reject',
      p_note: 'Canonical content changed; rebuild the revision.',
    });
    expect(rejected.error).toBeNull();
    expect(asRpc(rejected.data)).toEqual({
      status: 'rejected_by_reviewer',
      revisionId: existingDraftId,
    });
    existingRejectedId = existingDraftId;
  });

  it('publishes an existing lesson as a new canonical version while retaining historical rows', async () => {
    const successor = await teacher.client.rpc('create_lesson_revision', {
      p_payload: existingPayload,
      p_entity_id: sourceLessonId,
      p_supersedes_revision_id: existingRejectedId,
    });
    expect(successor.error).toBeNull();
    const successorData = asRpc(successor.data);
    expect(successorData.status).toBe('created');
    if (successorData.status !== 'created') throw new Error('Expected existing successor.');
    existingSuccessorId = successorData.revision.id;

    const submitted = await teacher.client.rpc('submit_lesson_revision', {
      p_revision_id: existingSuccessorId,
    });
    expect(submitted.error).toBeNull();

    const approved = await reviewer.client.rpc('review_lesson_revision', {
      p_revision_id: existingSuccessorId,
      p_decision: 'approve',
    });
    expect(approved.error).toBeNull();
    const approvedData = asRpc(approved.data);
    expect(approvedData.status).toBe('approved');
    if (approvedData.status !== 'approved') throw new Error('Expected approved successor.');
    publishedLessonIds.add(approvedData.publishedEntityId);

    const oldLesson = await fixtures.adminClient
      .from('lessons')
      .select('id, status, archived_at')
      .eq('id', sourceLessonId)
      .single();
    expect(oldLesson.error).toBeNull();
    expect(oldLesson.data?.status).toBe('draft');
    expect(oldLesson.data?.archived_at).not.toBeNull();

    const historicalQuestion = await fixtures.adminClient
      .from('questions')
      .select('id, lesson_id, prompt')
      .eq('id', sourceQuestionId)
      .single();
    expect(historicalQuestion.error).toBeNull();
    expect(historicalQuestion.data).toMatchObject({
      id: sourceQuestionId,
      lesson_id: sourceLessonId,
      prompt: 'Historical source question',
    });

    const historicalAnswer = await fixtures.adminClient
      .from('mastery_attempt_answers')
      .select('attempt_id, question_id, is_correct')
      .eq('attempt_id', historicalAttemptId)
      .single();
    expect(historicalAnswer.error).toBeNull();
    expect(historicalAnswer.data).toEqual({
      attempt_id: historicalAttemptId,
      question_id: sourceQuestionId,
      is_correct: true,
    });

    const hiddenOldLesson = await student.client
      .from('lessons')
      .select('id')
      .eq('id', sourceLessonId);
    expect(hiddenOldLesson.error).toBeNull();
    expect(hiddenOldLesson.data).toEqual([]);

    const visibleNewLesson = await student.client
      .from('lessons')
      .select('id, status')
      .eq('id', approvedData.publishedEntityId);
    expect(visibleNewLesson.error).toBeNull();
    expect(visibleNewLesson.data).toEqual([
      { id: approvedData.publishedEntityId, status: 'approved' },
    ]);
  });
});
