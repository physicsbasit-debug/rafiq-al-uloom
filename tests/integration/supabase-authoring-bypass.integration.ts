import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  buildLessonRevisionPayload,
  nextDisplayOrder,
  type AuthoringRpcResult,
} from './helpers/authoring-fixtures';
import {
  psqlAdmin,
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
} from './helpers/supabase-auth-fixtures';

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

interface DatabaseError {
  code?: string;
  message?: string;
}

function expectTablePermissionDenied(error: DatabaseError | null, table: string): void {
  expect(error).not.toBeNull();
  expect(error?.code).toBe('42501');

  const message = error?.message?.toLowerCase() ?? '';
  expect(message).toContain('permission denied');
  expect(message).toContain(table);
}

function expectFunctionPermissionDenied(error: DatabaseError | null): void {
  expect(error).not.toBeNull();
  expect(error?.code).toBe('42501');
  expect(error?.message?.toLowerCase()).toContain('permission denied');
}

function asRpc(data: unknown): AuthoringRpcResult {
  return data as AuthoringRpcResult;
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

describeIntegration('Phase 3-1 direct authoring and review bypass protection', () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const payload = buildLessonRevisionPayload(runId, nextDisplayOrder(20));

  let fixtures: SupabaseAuthFixtures;
  let teacher: AuthIdentity;
  let otherTeacher: AuthIdentity;
  let reviewer: AuthIdentity;
  let otherReviewer: AuthIdentity;
  let student: AuthIdentity;
  let pendingTeacher: AuthIdentity;
  let suspendedReviewer: AuthIdentity;
  let draftId = '';
  let pendingId = '';

  beforeAll(async () => {
    fixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());
    teacher = await fixtures.createIdentity('p31-bypass-teacher', 'teacher', 'active');
    otherTeacher = await fixtures.createIdentity('p31-bypass-other-teacher', 'teacher', 'active');
    reviewer = await fixtures.createIdentity('p31-bypass-reviewer', 'reviewer', 'active');
    otherReviewer = await fixtures.createIdentity('p31-bypass-other-reviewer', 'reviewer', 'active');
    student = await fixtures.createIdentity('p31-bypass-student', 'student', 'active');
    pendingTeacher = await fixtures.createIdentity('p31-bypass-pending-teacher', 'teacher', 'pending');
    suspendedReviewer = await fixtures.createIdentity(
      'p31-bypass-suspended-reviewer',
      'reviewer',
      'suspended'
    );

    const created = await teacher.client.rpc('create_lesson_revision', {
      p_payload: payload,
    });
    if (created.error) throw new Error(`Failed to create bypass draft: ${created.error.message}`);
    const createdData = asRpc(created.data);
    if (createdData.status !== 'created') throw new Error('Expected bypass draft creation.');
    draftId = createdData.revision.id;

    const pendingCreated = await teacher.client.rpc('create_lesson_revision', {
      p_payload: {
        ...payload,
        lesson: { ...payload.lesson, displayOrder: payload.lesson.displayOrder + 1 },
      },
    });
    if (pendingCreated.error) {
      throw new Error(`Failed to create pending bypass draft: ${pendingCreated.error.message}`);
    }
    const pendingData = asRpc(pendingCreated.data);
    if (pendingData.status !== 'created') throw new Error('Expected pending bypass draft creation.');
    pendingId = pendingData.revision.id;

    const submitted = await teacher.client.rpc('submit_lesson_revision', {
      p_revision_id: pendingId,
    });
    if (submitted.error || asRpc(submitted.data).status !== 'submitted') {
      throw new Error('Failed to submit bypass revision fixture.');
    }
  });

  afterAll(async () => {
    if (!fixtures) return;

    psqlAdmin(`
      DELETE FROM public.content_review_events
      WHERE revision_id IN (
        SELECT id FROM public.content_revisions
        WHERE author_id IN (
          ${sqlLiteral(teacher.user.id)},
          ${sqlLiteral(otherTeacher.user.id)},
          ${sqlLiteral(pendingTeacher.user.id)}
        )
      );
      DELETE FROM public.content_revisions
      WHERE author_id IN (
        ${sqlLiteral(teacher.user.id)},
        ${sqlLiteral(otherTeacher.user.id)},
        ${sqlLiteral(pendingTeacher.user.id)}
      );
    `);

    await fixtures.cleanup();
  });

  it('denies direct revision INSERT so author_id cannot be forged from PostgREST', async () => {
    const { error } = await teacher.client.from('content_revisions').insert({
      entity_type: 'lesson',
      author_id: otherTeacher.user.id,
      status: 'draft',
      payload,
      revision_number: 99,
    });

    expectTablePermissionDenied(error, 'content_revisions');
  });

  it('denies direct teacher UPDATE and DELETE even on an owned draft', async () => {
    const update = await teacher.client
      .from('content_revisions')
      .update({ payload: { ...payload, injected: true } })
      .eq('id', draftId);
    const deletion = await teacher.client.from('content_revisions').delete().eq('id', draftId);

    expectTablePermissionDenied(update.error, 'content_revisions');
    expectTablePermissionDenied(deletion.error, 'content_revisions');

    const after = await teacher.client
      .from('content_revisions')
      .select('id, status')
      .eq('id', draftId);
    expect(after.error).toBeNull();
    expect(after.data).toEqual([{ id: draftId, status: 'draft' }]);
  });

  it('denies reviewer direct payload mutation and direct review-event insertion', async () => {
    const update = await reviewer.client
      .from('content_revisions')
      .update({ payload: { ...payload, reviewerMutation: true } })
      .eq('id', pendingId);
    const eventInsert = await reviewer.client.from('content_review_events').insert({
      revision_id: pendingId,
      reviewer_id: otherReviewer.user.id,
      decision: 'approve',
    });

    expectTablePermissionDenied(update.error, 'content_revisions');
    expectTablePermissionDenied(eventInsert.error, 'content_review_events');
  });

  it('lets a teacher read only owned revisions and keeps drafts out of reviewer SELECT', async () => {
    const own = await teacher.client.from('content_revisions').select('id').eq('id', draftId);
    const foreign = await otherTeacher.client
      .from('content_revisions')
      .select('id')
      .eq('id', draftId);
    const reviewerDraft = await reviewer.client
      .from('content_revisions')
      .select('id')
      .eq('id', draftId);
    const reviewerPending = await reviewer.client
      .from('content_revisions')
      .select('id, status')
      .eq('id', pendingId);

    expect(own.error).toBeNull();
    expect(own.data).toEqual([{ id: draftId }]);
    expect(foreign.error).toBeNull();
    expect(foreign.data).toEqual([]);
    expect(reviewerDraft.error).toBeNull();
    expect(reviewerDraft.data).toEqual([]);
    expect(reviewerPending.error).toBeNull();
    expect(reviewerPending.data).toEqual([{ id: pendingId, status: 'pending_review' }]);
  });

  it('hides authoring tables from students, pending accounts, and suspended accounts', async () => {
    for (const identity of [student, pendingTeacher, suspendedReviewer]) {
      const revisions = await identity.client.from('content_revisions').select('id').eq('id', pendingId);
      const events = await identity.client.from('content_review_events').select('id');

      expect(revisions.error).toBeNull();
      expect(revisions.data).toEqual([]);
      expect(events.error).toBeNull();
      expect(events.data).toEqual([]);
    }
  });

  it('denies anonymous authoring-table reads at the privilege layer', async () => {
    const revisions = await fixtures.anonymousClient.from('content_revisions').select('id');
    const events = await fixtures.anonymousClient.from('content_review_events').select('id');

    expectTablePermissionDenied(revisions.error, 'content_revisions');
    expectTablePermissionDenied(events.error, 'content_review_events');
  });

  it('rejects active students and reviewers from teacher authoring RPCs', async () => {
    for (const identity of [student, reviewer]) {
      const response = await identity.client.rpc('create_lesson_revision', {
        p_payload: payload,
      });
      expect(response.error).toBeNull();
      expect(asRpc(response.data)).toEqual({ status: 'rejected', reason: 'not_authorized' });
    }
  });

  it('rejects pending teachers from teacher authoring RPCs', async () => {
    const response = await pendingTeacher.client.rpc('create_lesson_revision', {
      p_payload: payload,
    });

    expect(response.error).toBeNull();
    expect(asRpc(response.data)).toEqual({ status: 'rejected', reason: 'not_authorized' });
  });

  it('rejects teacher, student, and suspended reviewer from review transitions', async () => {
    for (const identity of [teacher, student, suspendedReviewer]) {
      const response = await identity.client.rpc('review_lesson_revision', {
        p_revision_id: pendingId,
        p_decision: 'approve',
      });
      expect(response.error).toBeNull();
      expect(asRpc(response.data)).toEqual({ status: 'rejected', reason: 'not_authorized' });
    }
  });

  it('prevents one teacher from saving or submitting another teacher revision', async () => {
    const save = await otherTeacher.client.rpc('save_lesson_revision', {
      p_revision_id: draftId,
      p_payload: payload,
    });
    const submit = await otherTeacher.client.rpc('submit_lesson_revision', {
      p_revision_id: draftId,
    });

    expect(save.error).toBeNull();
    expect(asRpc(save.data)).toEqual({ status: 'rejected', reason: 'revision_not_editable' });
    expect(submit.error).toBeNull();
    expect(asRpc(submit.data)).toEqual({
      status: 'rejected',
      reason: 'revision_not_submittable',
    });
  });


  it('prevents the owning teacher from editing a pending_review payload through the save RPC', async () => {
    const save = await teacher.client.rpc('save_lesson_revision', {
      p_revision_id: pendingId,
      p_payload: payload,
    });

    expect(save.error).toBeNull();
    expect(asRpc(save.data)).toEqual({ status: 'rejected', reason: 'revision_not_editable' });
  });

  it('allows reviewer decisions only for pending_review revisions', async () => {
    const approveDraft = await reviewer.client.rpc('review_lesson_revision', {
      p_revision_id: draftId,
      p_decision: 'approve',
    });
    const rejectDraft = await reviewer.client.rpc('review_lesson_revision', {
      p_revision_id: draftId,
      p_decision: 'reject',
      p_note: 'This draft was never submitted.',
    });

    expect(approveDraft.error).toBeNull();
    expect(asRpc(approveDraft.data)).toEqual({
      status: 'rejected',
      reason: 'revision_not_reviewable',
    });
    expect(rejectDraft.error).toBeNull();
    expect(asRpc(rejectDraft.data)).toEqual({
      status: 'rejected',
      reason: 'revision_not_reviewable',
    });
  });

  it('requires a rejection note and derives reviewer_id from auth.uid()', async () => {
    const missingNote = await reviewer.client.rpc('review_lesson_revision', {
      p_revision_id: pendingId,
      p_decision: 'reject',
      p_note: '',
    });
    expect(missingNote.error).toBeNull();
    expect(asRpc(missingNote.data)).toEqual({
      status: 'rejected',
      reason: 'review_note_required',
    });

    const rejected = await otherReviewer.client.rpc('review_lesson_revision', {
      p_revision_id: pendingId,
      p_decision: 'reject',
      p_note: 'Needs revision.',
    });
    expect(rejected.error).toBeNull();
    expect(asRpc(rejected.data)).toEqual({
      status: 'rejected_by_reviewer',
      revisionId: pendingId,
    });

    const event = await fixtures.adminClient
      .from('content_review_events')
      .select('reviewer_id, decision, note')
      .eq('revision_id', pendingId)
      .single();
    expect(event.error).toBeNull();
    expect(event.data).toEqual({
      reviewer_id: otherReviewer.user.id,
      decision: 'reject',
      note: 'Needs revision.',
    });
  });

  it('denies anonymous transition RPC execution at the function privilege layer', async () => {
    const create = await fixtures.anonymousClient.rpc('create_lesson_revision', {
      p_payload: payload,
    });
    const review = await fixtures.anonymousClient.rpc('review_lesson_revision', {
      p_revision_id: pendingId,
      p_decision: 'approve',
    });

    expectFunctionPermissionDenied(create.error);
    expectFunctionPermissionDenied(review.error);
  });

  it('still denies direct canonical lesson writes for teacher and reviewer', async () => {
    for (const identity of [teacher, reviewer]) {
      const update = await identity.client
        .from('lessons')
        .update({ title: `Denied Phase 3-1 ${runId}` })
        .eq('id', 'g10-phy-waves-l4');

      expectTablePermissionDenied(update.error, 'lessons');
    }
  });
});
