import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSupabaseAuthoringRepositories } from '@services/authoring/supabase-authoring.repositories';
import type {
  AuthoringRejectionReason,
  LessonRevisionPayload,
} from '@services/authoring/authoring.types';

interface DbResponse {
  readonly data: unknown | null;
  readonly error: unknown;
}

function payload(): LessonRevisionPayload {
  return {
    lesson: {
      unitId: 'unit-1',
      title: 'Lesson',
      displayOrder: 3,
      summary: 'Summary',
      keyConcepts: ['concept'],
      examples: ['example'],
      misconceptions: ['misconception'],
    },
    objectives: [{ key: 'o1', text: 'Objective' }],
    questions: [
      {
        key: 'q1',
        purpose: 'mastery',
        type: 'multiple_choice',
        prompt: 'Question?',
        choices: ['A', 'B'],
        correctAnswerIndex: 0,
        explanation: 'Because',
        objectiveKey: 'o1',
        difficulty: 'easy',
      },
    ],
    games: [],
    experiments: [],
    simulations: [],
    inquiries: [],
    dataActivities: [],
  };
}

function revisionRow(status = 'draft') {
  return {
    id: '10000000-0000-4000-8000-000000000001',
    entity_type: 'lesson',
    entity_id: null,
    published_entity_id: null,
    supersedes_revision_id: null,
    author_id: '20000000-0000-4000-8000-000000000002',
    status,
    payload: payload(),
    base_fingerprint: null,
    revision_number: 1,
    created_at: '2026-08-07T00:00:00.000Z',
    updated_at: '2026-08-07T00:01:00.000Z',
    submitted_at: null,
  };
}

function reviewEventRow() {
  return {
    id: '30000000-0000-4000-8000-000000000003',
    revision_id: '10000000-0000-4000-8000-000000000001',
    reviewer_id: '40000000-0000-4000-8000-000000000004',
    decision: 'reject',
    note: 'Needs correction',
    created_at: '2026-08-07T00:02:00.000Z',
  };
}

function createThenable(response: DbResponse) {
  const promise = Promise.resolve(response);
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    abortSignal: vi.fn(),
    then: promise.then.bind(promise),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.order.mockReturnValue(query);
  query.abortSignal.mockReturnValue(query);
  return query;
}

function createClientMock(options: {
  readonly tableResponses?: Record<string, DbResponse>;
  readonly rpcResponse?: DbResponse;
}) {
  const queries = new Map<string, ReturnType<typeof createThenable>>();
  const from = vi.fn((table: string) => {
    const query = createThenable(options.tableResponses?.[table] ?? { data: [], error: null });
    queries.set(table, query);
    return query;
  });

  const rpcQuery = createThenable(options.rpcResponse ?? { data: null, error: null });
  const rpc = vi.fn(() => rpcQuery);

  return {
    client: { from, rpc } as unknown as Pick<SupabaseClient, 'from' | 'rpc'>,
    from,
    rpc,
    rpcQuery,
    queries,
  };
}

function abortError(): Error {
  return Object.assign(new Error('aborted'), { name: 'AbortError' });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Supabase authoring repositories', () => {
  it('يقرأ مسودات المعلم عبر RLS دون تمرير author_id من العميل', async () => {
    const mock = createClientMock({
      tableResponses: { content_revisions: { data: [revisionRow()], error: null } },
    });
    const { authoring } = createSupabaseAuthoringRepositories(mock.client);

    await expect(authoring.listOwnRevisions()).resolves.toMatchObject({
      status: 'success',
      revisions: [{ id: '10000000-0000-4000-8000-000000000001', status: 'draft' }],
    });

    expect(mock.from).toHaveBeenCalledWith('content_revisions');
    const query = mock.queries.get('content_revisions');
    expect(query?.eq).not.toHaveBeenCalledWith('author_id', expect.anything());
  });

  it('يطبع payload التاريخية عند القراءة دون اختراع روابط أهداف', async () => {
    const legacyPayload = { ...payload() } as unknown as Record<string, unknown>;

    delete legacyPayload.simulations;
    delete legacyPayload.inquiries;
    delete legacyPayload.dataActivities;

    legacyPayload.experiments = [
      {
        key: 'legacy-experiment',
        title: 'Legacy experiment',
        objective: 'Observe',
        tools: ['tool'],
        steps: ['step'],
        safetyNotes: ['safe'],
        safetyLevel: 'safe_home',
        observationPrompt: 'Observe?',
        conclusionPrompt: 'Conclude?',
        homeAlternative: null,
      },
    ];

    const mock = createClientMock({
      tableResponses: {
        content_revisions: {
          data: [{ ...revisionRow(), payload: legacyPayload }],
          error: null,
        },
      },
    });

    const { authoring } = createSupabaseAuthoringRepositories(mock.client);

    await expect(authoring.listOwnRevisions()).resolves.toMatchObject({
      status: 'success',
      revisions: [
        {
          payload: {
            simulations: [],
            inquiries: [],
            dataActivities: [],
            experiments: [
              {
                key: 'legacy-experiment',
                objectiveKeys: [],
              },
            ],
          },
        },
      ],
    });
  });

  it('يقرأ أحداث مراجعة المسودة المحددة فقط', async () => {
    const mock = createClientMock({
      tableResponses: { content_review_events: { data: [reviewEventRow()], error: null } },
    });
    const { authoring } = createSupabaseAuthoringRepositories(mock.client);

    await expect(
      authoring.listReviewEvents('10000000-0000-4000-8000-000000000001')
    ).resolves.toMatchObject({
      status: 'success',
      events: [{ decision: 'reject', note: 'Needs correction' }],
    });

    expect(mock.queries.get('content_review_events')?.eq).toHaveBeenCalledWith(
      'revision_id',
      '10000000-0000-4000-8000-000000000001'
    );
  });

  it('يحصر هوية المؤلف في الخادم عند إنشاء revision', async () => {
    const mock = createClientMock({
      rpcResponse: {
        data: {
          status: 'created',
          revision: {
            id: '10000000-0000-4000-8000-000000000001',
            entityId: null,
            revisionNumber: 1,
            baseFingerprint: null,
          },
        },
        error: null,
      },
    });
    const { authoring } = createSupabaseAuthoringRepositories(mock.client);

    await authoring.createLessonRevision({ payload: payload() });

    expect(mock.rpc).toHaveBeenCalledWith('create_lesson_revision', {
      p_payload: payload(),
      p_entity_id: null,
      p_supersedes_revision_id: null,
    });
    expect(mock.rpc.mock.calls[0]?.[1]).not.toHaveProperty('author_id');
    expect(mock.rpc.mock.calls[0]?.[1]).not.toHaveProperty('user_id');
  });

  it('يمرر save وsubmit بالأسماء الفعلية للعقد الخادمي', async () => {
    const revisionId = '10000000-0000-4000-8000-000000000001';
    const saveMock = createClientMock({
      rpcResponse: { data: { status: 'saved', revisionId }, error: null },
    });
    const submitMock = createClientMock({
      rpcResponse: { data: { status: 'submitted', revisionId }, error: null },
    });

    await createSupabaseAuthoringRepositories(saveMock.client).authoring.saveLessonRevision(
      revisionId,
      payload()
    );
    await createSupabaseAuthoringRepositories(submitMock.client).authoring.submitLessonRevision(
      revisionId
    );

    expect(saveMock.rpc).toHaveBeenCalledWith('save_lesson_revision', {
      p_revision_id: revisionId,
      p_payload: payload(),
    });
    expect(submitMock.rpc).toHaveBeenCalledWith('submit_lesson_revision', {
      p_revision_id: revisionId,
    });
  });

  it('يجلب المراجع pending_review فقط ويترك RLS تحسم دور المراجع', async () => {
    const row = { ...revisionRow('pending_review'), submitted_at: '2026-08-07T00:02:00.000Z' };
    const mock = createClientMock({
      tableResponses: { content_revisions: { data: [row], error: null } },
    });
    const { review } = createSupabaseAuthoringRepositories(mock.client);

    await expect(review.listPendingRevisions()).resolves.toMatchObject({
      status: 'success',
      revisions: [{ status: 'pending_review' }],
    });

    expect(mock.queries.get('content_revisions')?.eq).toHaveBeenCalledWith(
      'status',
      'pending_review'
    );
  });

  it('لا يرسل reviewer_id عند الاعتماد أو الرفض', async () => {
    const revisionId = '10000000-0000-4000-8000-000000000001';
    const mock = createClientMock({
      rpcResponse: {
        data: {
          status: 'approved',
          revisionId,
          publishedEntityId: 'lesson-published',
        },
        error: null,
      },
    });
    const { review } = createSupabaseAuthoringRepositories(mock.client);

    await review.reviewLessonRevision({ revisionId, decision: 'approve', note: null });

    expect(mock.rpc).toHaveBeenCalledWith('review_lesson_revision', {
      p_revision_id: revisionId,
      p_decision: 'approve',
      p_note: null,
    });
    expect(mock.rpc.mock.calls[0]?.[1]).not.toHaveProperty('reviewer_id');
  });

  it.each([
    'not_authenticated',
    'not_authorized',
    'invalid_payload',
    'unit_not_available',
    'lesson_not_available',
    'source_revision_not_available',
    'source_revision_mismatch',
    'revision_not_editable',
    'revision_not_submittable',
    'revision_not_reviewable',
    'invalid_decision',
    'review_note_required',
    'stale_revision',
    'canonical_position_conflict',
  ] as const)('يحافظ على سبب رفض الخادم الدقيق: %s', async (reason: AuthoringRejectionReason) => {
    const mock = createClientMock({
      rpcResponse: { data: { status: 'rejected', reason }, error: null },
    });
    const { authoring } = createSupabaseAuthoringRepositories(mock.client);

    await expect(
      authoring.submitLessonRevision('10000000-0000-4000-8000-000000000001')
    ).resolves.toEqual({
      status: 'rejected',
      reason,
    });
  });

  it('يمرر AbortSignal ولا يحول AbortError إلى unavailable', async () => {
    const mock = createClientMock({
      rpcResponse: { data: null, error: abortError() },
    });
    const controller = new AbortController();
    const { authoring } = createSupabaseAuthoringRepositories(mock.client);

    await expect(
      authoring.submitLessonRevision('10000000-0000-4000-8000-000000000001', {
        signal: controller.signal,
      })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(mock.rpcQuery.abortSignal).toHaveBeenCalledWith(controller.signal);
  });

  it('يعيد network_error بلا تسريب تفاصيل Supabase', async () => {
    const mock = createClientMock({
      rpcResponse: { data: null, error: new TypeError('fetch failed with private detail') },
    });
    const { authoring } = createSupabaseAuthoringRepositories(mock.client);

    await expect(
      authoring.submitLessonRevision('10000000-0000-4000-8000-000000000001')
    ).resolves.toEqual({ status: 'unavailable', reason: 'network_error' });
  });

  it('يفشل مغلقًا عند استجابة RPC غير معروفة ويسجل diagnostic فقط', async () => {
    const diagnostics: Error[] = [];
    const mock = createClientMock({
      rpcResponse: { data: { status: 'invented' }, error: null },
    });
    const { authoring } = createSupabaseAuthoringRepositories(mock.client, {
      reportDiagnostic: (error) => diagnostics.push(error),
    });

    await expect(
      authoring.submitLessonRevision('10000000-0000-4000-8000-000000000001')
    ).resolves.toEqual({ status: 'unavailable', reason: 'unknown' });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toBe('submitLessonRevision: unknown');
  });
});
