import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSupabaseMasteryResultsRepository } from '@services/mastery-results/supabase-mastery-results.repository';
import type {
  MasteryAttemptRejectionReason,
  MasteryAttemptRepositorySubmission,
} from '@services/mastery-results/mastery-results.types';

interface RpcResponse {
  readonly data: unknown | null;
  readonly error: unknown;
}

function validSubmission(): MasteryAttemptRepositorySubmission {
  return {
    submissionId: '10000000-0000-4000-8000-000000000001',
    lessonId: 'lesson-1',
    startedAt: '2026-08-06T00:00:00.000Z',
    expectedScoringFingerprint: 'a'.repeat(64),
    answers: [{ questionId: 'question-1', selectedChoiceIndex: 1 }],
  };
}

function validResult(status: 'saved' | 'already_saved' = 'saved') {
  return {
    status,
    result: {
      attemptId: '20000000-0000-4000-8000-000000000002',
      submissionId: '10000000-0000-4000-8000-000000000001',
      lessonId: 'lesson-1',
      questionCount: 1,
      correctCount: 1,
      percentage: 100,
      scoringPolicyVersion: 'mastery-equal-weight-v1',
      scoringFingerprint: 'a'.repeat(64),
      completedAt: '2026-08-06T00:01:00.000Z',
    },
  };
}

function createRpcMock(response: RpcResponse | Promise<RpcResponse>) {
  const responsePromise = Promise.resolve(response);
  const query = {
    abortSignal: vi.fn(),
    then: responsePromise.then.bind(responsePromise),
  };
  query.abortSignal.mockReturnValue(query);

  const rpc = vi.fn(() => query);
  return {
    client: { rpc } as unknown as Pick<SupabaseClient, 'rpc'>,
    rpc,
    query,
  };
}

function abortError(): Error {
  return Object.assign(new Error('aborted'), { name: 'AbortError' });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Supabase mastery results repository', () => {
  it('يستدعي RPC الوحيدة بالأسماء الفعلية دون user_id أو score', async () => {
    const mock = createRpcMock({ data: validResult(), error: null });
    const repository = createSupabaseMasteryResultsRepository(mock.client);
    const submission = validSubmission();

    await repository.submitAttempt(submission);

    expect(mock.rpc).toHaveBeenCalledWith('submit_mastery_attempt', {
      p_submission_id: submission.submissionId,
      p_lesson_id: submission.lessonId,
      p_started_at: submission.startedAt,
      p_expected_scoring_fingerprint: submission.expectedScoringFingerprint,
      p_answers: submission.answers,
      p_experience_context: null,
    });
    expect(mock.rpc.mock.calls[0]?.[1]).not.toHaveProperty('user_id');
    expect(mock.rpc.mock.calls[0]?.[1]).not.toHaveProperty('score');
  });

  it.each(['saved', 'already_saved'] as const)('يحوّل نتيجة %s حرفيًا', async (status) => {
    const repository = createSupabaseMasteryResultsRepository(
      createRpcMock({ data: validResult(status), error: null }).client
    );

    await expect(repository.submitAttempt(validSubmission())).resolves.toEqual(validResult(status));
  });

  it.each([
    'not_authenticated',
    'not_authorized',
    'invalid_response_set',
    'lesson_not_available',
    'scoring_contract_stale',
    'question_set_mismatch',
    'submission_conflict',
  ] as const)('يحافظ على سبب رفض RPC الدقيق: %s', async (reason: MasteryAttemptRejectionReason) => {
    const repository = createSupabaseMasteryResultsRepository(
      createRpcMock({ data: { status: 'rejected', reason }, error: null }).client
    );

    await expect(repository.submitAttempt(validSubmission())).resolves.toEqual({
      status: 'rejected',
      reason,
    });
  });

  it('يمرر AbortSignal إلى طلب RPC', async () => {
    const mock = createRpcMock({ data: validResult(), error: null });
    const controller = new AbortController();
    const repository = createSupabaseMasteryResultsRepository(mock.client);

    await repository.submitAttempt(validSubmission(), { signal: controller.signal });

    expect(mock.query.abortSignal).toHaveBeenCalledWith(controller.signal);
  });

  it('يفحص الإلغاء قبل استدعاء RPC', async () => {
    const mock = createRpcMock({ data: validResult(), error: null });
    const controller = new AbortController();
    controller.abort();
    const repository = createSupabaseMasteryResultsRepository(mock.client);

    await expect(
      repository.submitAttempt(validSubmission(), { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it('يعيد network_error دون تسريب رسالة Supabase', async () => {
    const repository = createSupabaseMasteryResultsRepository(
      createRpcMock({ data: null, error: new TypeError('fetch failed with secret detail') }).client
    );

    await expect(repository.submitAttempt(validSubmission())).resolves.toEqual({
      status: 'unavailable',
      reason: 'network_error',
    });
  });

  it('يعيد service_unavailable لأخطاء الخادم', async () => {
    const repository = createSupabaseMasteryResultsRepository(
      createRpcMock({ data: null, error: { status: 503, message: 'database unavailable' } }).client
    );

    await expect(repository.submitAttempt(validSubmission())).resolves.toEqual({
      status: 'unavailable',
      reason: 'service_unavailable',
    });
  });

  it('يفشل مغلقًا عند شكل استجابة غير معروف ويسجل diagnostic فقط', async () => {
    const diagnostics: Error[] = [];
    const repository = createSupabaseMasteryResultsRepository(
      createRpcMock({ data: { status: 'invented' }, error: null }).client,
      { reportDiagnostic: (error) => diagnostics.push(error) }
    );

    await expect(repository.submitAttempt(validSubmission())).resolves.toEqual({
      status: 'unavailable',
      reason: 'unknown',
    });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.message).toBe('submitMasteryAttempt: unknown');
  });

  it('يعيد رمي AbortError الواردة من RPC', async () => {
    const repository = createSupabaseMasteryResultsRepository(
      createRpcMock({ data: null, error: abortError() }).client
    );

    await expect(repository.submitAttempt(validSubmission())).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  describe('يمرر experienceContext إلى RPC ويستخدم null عند غيابه', () => {
    it('يرسل experienceContext نفسه في p_experience_context عند وجوده', async () => {
      const mock = createRpcMock({
        data: validResult(),
        error: null,
      });

      const repository = createSupabaseMasteryResultsRepository(mock.client);

      const experienceContext = {
        schema: 'g9-l13-time-mastery-v1',
        scoreNof5: '4/5',
        lessonMasteryLevel: 'good',
        objective2_1Status: 'mastered',
        objective3_1Status: 'needs_reinforcement',
        allObjectivesMastered: false,
        diagnostics: [null, 'manual-reaction-limit', null, null, null],
        attemptCount: 2,
        variantHistory: {
          mq1: ['water-vessel-target-mark'],
          mq2: ['ramp-release-1_27'],
          mq3: ['ball-drop-1_8m'],
          mq4: ['spring-cart-8-in-5_92'],
          mq5: ['flex-platform-reference-up'],
        },
      } as const;

      const submission = {
        ...validSubmission(),
        experienceContext,
      };

      await repository.submitAttempt(submission);

      expect(mock.rpc).toHaveBeenCalledTimes(1);

      expect(mock.rpc).toHaveBeenCalledWith(
        'submit_mastery_attempt',
        expect.objectContaining({
          p_submission_id: submission.submissionId,
          p_lesson_id: submission.lessonId,
          p_started_at: submission.startedAt,
          p_expected_scoring_fingerprint: submission.expectedScoringFingerprint,
          p_answers: submission.answers,
          p_experience_context: experienceContext,
        })
      );
    });

    it('يرسل p_experience_context=null صراحة عند غياب السياق', async () => {
      const mock = createRpcMock({
        data: validResult(),
        error: null,
      });

      const repository = createSupabaseMasteryResultsRepository(mock.client);

      const submission = validSubmission();

      await repository.submitAttempt(submission);

      expect(mock.rpc).toHaveBeenCalledTimes(1);

      expect(mock.rpc).toHaveBeenCalledWith(
        'submit_mastery_attempt',
        expect.objectContaining({
          p_submission_id: submission.submissionId,
          p_lesson_id: submission.lessonId,
          p_started_at: submission.startedAt,
          p_expected_scoring_fingerprint: submission.expectedScoringFingerprint,
          p_answers: submission.answers,
          p_experience_context: null,
        })
      );
    });
  });
});
