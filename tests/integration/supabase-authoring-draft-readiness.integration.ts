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

function jsonbLiteral(value: unknown): string {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function asRpc(data: unknown): AuthoringRpcResult {
  return data as AuthoringRpcResult;
}

function hasPublicExecuteGrant(signature: string): boolean {
  return (
    psqlAdmin(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_proc AS proc
        CROSS JOIN LATERAL aclexplode(
          COALESCE(proc.proacl, acldefault('f', proc.proowner))
        ) AS acl
        WHERE proc.oid = ${sqlLiteral(signature)}::regprocedure
          AND acl.grantee = 0
          AND acl.privilege_type = 'EXECUTE'
      );
    `) === 't'
  );
}

function incompletePayload(runId: string, displayOrder: number): LessonRevisionPayload {
  const payload = buildLessonRevisionPayload(runId, displayOrder);
  return {
    ...payload,
    objectives: [],
    questions: [],
    games: [],
    experiments: [],
  };
}

describeIntegration('Phase 3-5A Fix 2A draft save vs submission readiness', () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  let fixtures: SupabaseAuthFixtures;
  let teacher: AuthIdentity;
  let reviewer: AuthIdentity;

  beforeAll(async () => {
    fixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());
    teacher = await fixtures.createIdentity('p35a-fix2a-teacher', 'teacher', 'active');
    reviewer = await fixtures.createIdentity('p35a-fix2a-reviewer', 'reviewer', 'active');
  });

  afterAll(async () => {
    if (!fixtures || !teacher) return;

    psqlAdmin(`
      DELETE FROM public.content_review_events
      WHERE revision_id IN (
        SELECT id
        FROM public.content_revisions
        WHERE author_id = ${sqlLiteral(teacher.user.id)}
      );

      DELETE FROM public.content_revisions
      WHERE author_id = ${sqlLiteral(teacher.user.id)};
    `);

    await fixtures.cleanup();
  });

  it('keeps the historical one-argument validator strict and blocks both helper signatures from application roles', () => {
    const payload = incompletePayload(`${runId}-validator`, nextDisplayOrder(10));

    const strictResult = psqlAdmin(`
      SELECT public.lesson_revision_payload_error(${jsonbLiteral(payload)});
    `);
    expect(strictResult).toBe('invalid_payload');

    const relaxedResult = psqlAdmin(`
      SELECT COALESCE(
        public.lesson_revision_payload_error(${jsonbLiteral(payload)}, false),
        ''
      );
    `);
    expect(relaxedResult).toBe('');

    expect(hasPublicExecuteGrant('public.lesson_revision_payload_error(jsonb)')).toBe(false);
    expect(hasPublicExecuteGrant('public.lesson_revision_payload_error(jsonb,boolean)')).toBe(
      false
    );

    for (const role of ['anon', 'authenticated', 'service_role']) {
      const oneArg = psqlAdmin(`
        SELECT has_function_privilege(
          ${sqlLiteral(role)},
          'public.lesson_revision_payload_error(jsonb)',
          'EXECUTE'
        );
      `);
      const twoArg = psqlAdmin(`
        SELECT has_function_privilege(
          ${sqlLiteral(role)},
          'public.lesson_revision_payload_error(jsonb,boolean)',
          'EXECUTE'
        );
      `);

      expect(oneArg).toBe('f');
      expect(twoArg).toBe('f');
    }
  });

  it('creates and saves an incomplete draft but rejects submission until it is complete', async () => {
    const payload = incompletePayload(`${runId}-empty`, nextDisplayOrder(20));

    const created = await teacher.client.rpc('create_lesson_revision', {
      p_payload: payload,
    });
    expect(created.error).toBeNull();
    const createdData = asRpc(created.data);
    expect(createdData.status).toBe('created');
    if (createdData.status !== 'created') throw new Error('Expected incomplete draft creation.');

    const revisionId = createdData.revision.id;
    const changed: LessonRevisionPayload = {
      ...payload,
      lesson: {
        ...payload.lesson,
        summary: `Incomplete draft saved again ${runId}`,
      },
    };

    const saved = await teacher.client.rpc('save_lesson_revision', {
      p_revision_id: revisionId,
      p_payload: changed,
    });
    expect(saved.error).toBeNull();
    expect(asRpc(saved.data)).toEqual({ status: 'saved', revisionId });

    const submitted = await teacher.client.rpc('submit_lesson_revision', {
      p_revision_id: revisionId,
    });
    expect(submitted.error).toBeNull();
    expect(asRpc(submitted.data)).toEqual({ status: 'rejected', reason: 'invalid_payload' });

    const row = await fixtures.adminClient
      .from('content_revisions')
      .select('status, payload')
      .eq('id', revisionId)
      .single();
    expect(row.error).toBeNull();
    expect(row.data?.status).toBe('draft');
    expect(row.data?.payload).toMatchObject({
      objectives: [],
      questions: [],
      games: [],
      experiments: [],
    });
  });

  it('allows a review-only draft to be saved but still requires a mastery question at submission', async () => {
    const complete = buildLessonRevisionPayload(`${runId}-review-only`, nextDisplayOrder(30));
    const reviewOnly: LessonRevisionPayload = {
      ...complete,
      questions: complete.questions.filter((question) => question.purpose === 'review'),
    };

    const created = await teacher.client.rpc('create_lesson_revision', {
      p_payload: reviewOnly,
    });
    expect(created.error).toBeNull();
    const createdData = asRpc(created.data);
    expect(createdData.status).toBe('created');
    if (createdData.status !== 'created') throw new Error('Expected review-only draft creation.');

    const revisionId = createdData.revision.id;

    const saved = await teacher.client.rpc('save_lesson_revision', {
      p_revision_id: revisionId,
      p_payload: reviewOnly,
    });
    expect(saved.error).toBeNull();
    expect(asRpc(saved.data)).toEqual({ status: 'saved', revisionId });

    const submitted = await teacher.client.rpc('submit_lesson_revision', {
      p_revision_id: revisionId,
    });
    expect(submitted.error).toBeNull();
    expect(asRpc(submitted.data)).toEqual({ status: 'rejected', reason: 'invalid_payload' });
  });

  it('keeps reviewer approval strict if a pending revision is tampered to an incomplete payload', async () => {
    const complete = buildLessonRevisionPayload(`${runId}-review-defense`, nextDisplayOrder(35));

    const created = await teacher.client.rpc('create_lesson_revision', {
      p_payload: complete,
    });
    expect(created.error).toBeNull();
    const createdData = asRpc(created.data);
    expect(createdData.status).toBe('created');
    if (createdData.status !== 'created')
      throw new Error('Expected review-defense draft creation.');

    const revisionId = createdData.revision.id;
    const submitted = await teacher.client.rpc('submit_lesson_revision', {
      p_revision_id: revisionId,
    });
    expect(submitted.error).toBeNull();
    expect(asRpc(submitted.data)).toEqual({ status: 'submitted', revisionId });

    const incomplete = incompletePayload(`${runId}-review-defense-empty`, nextDisplayOrder(35));
    psqlAdmin(`
      UPDATE public.content_revisions
      SET payload = ${jsonbLiteral(incomplete)}
      WHERE id = ${sqlLiteral(revisionId)}
        AND status = 'pending_review';
    `);

    const approval = await reviewer.client.rpc('review_lesson_revision', {
      p_revision_id: revisionId,
      p_decision: 'approve',
    });
    expect(approval.error).toBeNull();
    expect(asRpc(approval.data)).toEqual({ status: 'rejected', reason: 'invalid_payload' });

    const row = await fixtures.adminClient
      .from('content_revisions')
      .select('status, published_entity_id')
      .eq('id', revisionId)
      .single();
    expect(row.error).toBeNull();
    expect(row.data).toEqual({ status: 'pending_review', published_entity_id: null });

    const events = await fixtures.adminClient
      .from('content_review_events')
      .select('id')
      .eq('revision_id', revisionId);
    expect(events.error).toBeNull();
    expect(events.data).toEqual([]);
  });

  it('continues to reject structurally invalid drafts even when completeness is optional', async () => {
    const payload = buildLessonRevisionPayload(`${runId}-invalid-link`, nextDisplayOrder(40));
    const structurallyInvalid: LessonRevisionPayload = {
      ...payload,
      questions: payload.questions.map((question, index) =>
        index === 0 ? { ...question, objectiveKey: 'missing-objective' } : question
      ),
    };

    const created = await teacher.client.rpc('create_lesson_revision', {
      p_payload: structurallyInvalid,
    });
    expect(created.error).toBeNull();
    expect(asRpc(created.data)).toEqual({ status: 'rejected', reason: 'invalid_payload' });
  });

  it('keeps unit availability validation unchanged for incomplete drafts', async () => {
    const payload = incompletePayload(`${runId}-bad-unit`, nextDisplayOrder(50));
    const unavailableUnit: LessonRevisionPayload = {
      ...payload,
      lesson: {
        ...payload.lesson,
        unitId: `missing-unit-${runId}`,
      },
    };

    const created = await teacher.client.rpc('create_lesson_revision', {
      p_payload: unavailableUnit,
    });
    expect(created.error).toBeNull();
    expect(asRpc(created.data)).toEqual({ status: 'rejected', reason: 'unit_not_available' });
  });

  it('allows an incomplete rejected successor draft without mutating the rejected source and blocks its submission', async () => {
    const complete = buildLessonRevisionPayload(`${runId}-successor-source`, nextDisplayOrder(60));

    const created = await teacher.client.rpc('create_lesson_revision', {
      p_payload: complete,
    });
    expect(created.error).toBeNull();
    const createdData = asRpc(created.data);
    expect(createdData.status).toBe('created');
    if (createdData.status !== 'created') throw new Error('Expected source draft creation.');

    const sourceRevisionId = createdData.revision.id;

    const submitted = await teacher.client.rpc('submit_lesson_revision', {
      p_revision_id: sourceRevisionId,
    });
    expect(submitted.error).toBeNull();
    expect(asRpc(submitted.data)).toEqual({
      status: 'submitted',
      revisionId: sourceRevisionId,
    });

    const rejected = await reviewer.client.rpc('review_lesson_revision', {
      p_revision_id: sourceRevisionId,
      p_decision: 'reject',
      p_note: 'Rework the structural content before resubmission.',
    });
    expect(rejected.error).toBeNull();
    expect(asRpc(rejected.data)).toEqual({
      status: 'rejected_by_reviewer',
      revisionId: sourceRevisionId,
    });

    const incomplete = incompletePayload(`${runId}-successor-empty`, nextDisplayOrder(61));
    const successor = await teacher.client.rpc('create_lesson_revision', {
      p_payload: incomplete,
      p_supersedes_revision_id: sourceRevisionId,
    });
    expect(successor.error).toBeNull();
    const successorData = asRpc(successor.data);
    expect(successorData.status).toBe('created');
    if (successorData.status !== 'created') throw new Error('Expected incomplete successor draft.');

    const successorRevisionId = successorData.revision.id;
    expect(successorData.revision.revisionNumber).toBe(2);

    const sourceRow = await fixtures.adminClient
      .from('content_revisions')
      .select('status, payload')
      .eq('id', sourceRevisionId)
      .single();
    expect(sourceRow.error).toBeNull();
    expect(sourceRow.data?.status).toBe('rejected');
    expect(sourceRow.data?.payload).toMatchObject(complete);

    const successorRow = await fixtures.adminClient
      .from('content_revisions')
      .select('status, supersedes_revision_id')
      .eq('id', successorRevisionId)
      .single();
    expect(successorRow.error).toBeNull();
    expect(successorRow.data).toEqual({
      status: 'draft',
      supersedes_revision_id: sourceRevisionId,
    });

    const blockedSubmit = await teacher.client.rpc('submit_lesson_revision', {
      p_revision_id: successorRevisionId,
    });
    expect(blockedSubmit.error).toBeNull();
    expect(asRpc(blockedSubmit.data)).toEqual({ status: 'rejected', reason: 'invalid_payload' });
  });
});
