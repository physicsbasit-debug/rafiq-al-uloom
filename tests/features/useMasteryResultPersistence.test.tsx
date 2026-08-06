// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useMasteryResultPersistence } from '@features/mastery/useMasteryResultPersistence';
import type { AuthState } from '@services/auth/auth.types';
import type { AuthorizationState } from '@services/auth/authorization.types';
import type {
  MasteryAttemptSubmissionResult,
  MasteryResultsService,
} from '@services/mastery-results';
import type { Question } from '@shared-types/quiz.types';

const SUBMISSION_ID = '10000000-0000-4000-8000-000000000001';
const STARTED_AT = '2026-08-06T12:00:00.000Z';

const questions: Question[] = [
  {
    id: 'question-1',
    lessonId: 'lesson-1',
    type: 'multiple_choice',
    prompt: 'سؤال تجريبي',
    choices: ['أ', 'ب'],
    correctAnswerIndex: 0,
    explanation: 'شرح',
    objectiveId: 'objective-1',
    difficulty: 'medium',
    status: 'approved',
    source: 'curriculum_seed',
  },
];

const authenticatedState: AuthState = {
  status: 'authenticated',
  user: {
    id: '30000000-0000-4000-8000-000000000003',
    email: 'student@example.com',
    emailConfirmedAt: STARTED_AT,
  },
  session: {
    expiresAt: null,
    user: {
      id: '30000000-0000-4000-8000-000000000003',
      email: 'student@example.com',
      emailConfirmedAt: STARTED_AT,
    },
  },
};

const activeAuthorization: AuthorizationState = {
  status: 'authorized',
  profile: {
    id: '30000000-0000-4000-8000-000000000003',
    displayName: 'طالب',
    role: 'student',
    status: 'active',
    createdAt: STARTED_AT,
    updatedAt: STARTED_AT,
  },
};

function officialResult() {
  return {
    attemptId: '20000000-0000-4000-8000-000000000002',
    submissionId: SUBMISSION_ID,
    lessonId: 'lesson-1',
    questionCount: 1,
    correctCount: 1,
    percentage: 100,
    scoringPolicyVersion: 'mastery-equal-weight-v1' as const,
    scoringFingerprint: 'a'.repeat(64),
    completedAt: '2026-08-06T12:01:00.000Z',
  };
}

function createService(
  implementation: MasteryResultsService['submitAttempt']
): MasteryResultsService & { submitAttempt: ReturnType<typeof vi.fn> } {
  return {
    submitAttempt: vi.fn(implementation),
  };
}

function activeDependencies(service: MasteryResultsService) {
  return {
    service,
    contentProvider: 'supabase' as const,
    authorization: {
      authState: authenticatedState,
      authorizationState: activeAuthorization,
    },
    createSubmissionId: () => SUBMISSION_ID,
    now: () => STARTED_AT,
  };
}

function submitCurrent(result: { current: ReturnType<typeof useMasteryResultPersistence> }) {
  act(() => {
    result.current.submitAttempt({
      questions,
      answersByQuestionId: { 'question-1': 0 },
    });
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useMasteryResultPersistence', () => {
  it('يبدأ بحالة idle', () => {
    const service = createService(async () => ({
      status: 'saved',
      result: officialResult(),
      reconciliation: 'matched_local_result',
    }));
    const { result } = renderHook(() =>
      useMasteryResultPersistence('lesson-1', activeDependencies(service))
    );

    expect(result.current.state).toEqual({ status: 'idle' });
  });

  it('يثبت startedAt عند بدء جلسة الاختبار قبل الإنهاء', async () => {
    const now = vi.fn(() => STARTED_AT);
    const service = createService(async () => ({
      status: 'saved',
      result: officialResult(),
      reconciliation: 'matched_local_result',
    }));
    const { result } = renderHook(() =>
      useMasteryResultPersistence('lesson-1', {
        ...activeDependencies(service),
        now,
      })
    );

    expect(now).toHaveBeenCalledTimes(1);
    submitCurrent(result);
    await waitFor(() => expect(result.current.state.status).toBe('saved'));
    expect(service.submitAttempt.mock.calls[0][0].startedAt).toBe(STARTED_AT);
    expect(now).toHaveBeenCalledTimes(1);
  });

  it('يعيد not_applicable للمزوّد المحلي دون إنشاء submissionId أو استدعاء الخدمة', async () => {
    const createSubmissionId = vi.fn(() => SUBMISSION_ID);
    const service = createService(async () => ({
      status: 'saved',
      result: officialResult(),
      reconciliation: 'matched_local_result',
    }));
    const { result } = renderHook(() =>
      useMasteryResultPersistence('lesson-1', {
        ...activeDependencies(service),
        contentProvider: 'local',
        createSubmissionId,
      })
    );

    submitCurrent(result);
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'not_applicable', reason: 'local_content' })
    );
    expect(createSubmissionId).not.toHaveBeenCalled();
    expect(service.submitAttempt).not.toHaveBeenCalled();
  });

  it('يعيد not_applicable للزائر دون إنشاء submissionId أو استدعاء الخدمة', async () => {
    const createSubmissionId = vi.fn(() => SUBMISSION_ID);
    const service = createService(async () => ({
      status: 'saved',
      result: officialResult(),
      reconciliation: 'matched_local_result',
    }));
    const { result } = renderHook(() =>
      useMasteryResultPersistence('lesson-1', {
        ...activeDependencies(service),
        authorization: {
          authState: { status: 'guest' },
          authorizationState: null,
        },
        createSubmissionId,
      })
    );

    submitCurrent(result);
    await waitFor(() =>
      expect(result.current.state).toEqual({ status: 'not_applicable', reason: 'guest' })
    );
    expect(createSubmissionId).not.toHaveBeenCalled();
    expect(service.submitAttempt).not.toHaveBeenCalled();
  });

  it('لا يستدعي الخدمة قبل سماح authorizeOperation', async () => {
    const service = createService(async () => ({
      status: 'saved',
      result: officialResult(),
      reconciliation: 'matched_local_result',
    }));
    const pendingAuthorization: AuthorizationState = {
      status: 'pending',
      profile: { ...activeAuthorization.profile, status: 'pending' },
    };
    const { result } = renderHook(() =>
      useMasteryResultPersistence('lesson-1', {
        ...activeDependencies(service),
        authorization: {
          authState: authenticatedState,
          authorizationState: pendingAuthorization,
        },
      })
    );

    submitCurrent(result);
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: 'failed',
        failure: { kind: 'authorization', reason: 'account_pending' },
        retryable: false,
      })
    );
    expect(service.submitAttempt).not.toHaveBeenCalled();
  });

  it('ينتقل من saving إلى saved مع النتيجة الرسمية', async () => {
    let resolve!: (value: MasteryAttemptSubmissionResult) => void;
    const service = createService(
      () => new Promise<MasteryAttemptSubmissionResult>((done) => (resolve = done))
    );
    const { result } = renderHook(() =>
      useMasteryResultPersistence('lesson-1', activeDependencies(service))
    );

    submitCurrent(result);
    await waitFor(() => expect(result.current.state.status).toBe('saving'));

    act(() => {
      resolve({
        status: 'saved',
        result: officialResult(),
        reconciliation: 'matched_local_result',
      });
    });
    await waitFor(() => expect(result.current.state.status).toBe('saved'));
  });

  it('يحافظ على سبب رفض RPC الحرفي بلا إعادة تصنيف', async () => {
    const service = createService(async () => ({
      status: 'rejected',
      reason: 'submission_conflict',
    }));
    const { result } = renderHook(() =>
      useMasteryResultPersistence('lesson-1', activeDependencies(service))
    );

    submitCurrent(result);
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: 'failed',
        failure: {
          kind: 'submission',
          result: { status: 'rejected', reason: 'submission_conflict' },
        },
        retryable: false,
      })
    );
  });

  it('يعيد المحاولة غير المتاحة بنفس submissionId وstartedAt', async () => {
    let callCount = 0;
    const service = createService(async () => {
      callCount += 1;
      return callCount === 1
        ? { status: 'unavailable', reason: 'network_error' }
        : {
            status: 'already_saved',
            result: officialResult(),
            reconciliation: 'matched_local_result',
          };
    });
    const { result } = renderHook(() =>
      useMasteryResultPersistence('lesson-1', activeDependencies(service))
    );

    submitCurrent(result);
    await waitFor(() => expect(result.current.state.status).toBe('failed'));
    const firstSubmission = service.submitAttempt.mock.calls[0][0];

    act(() => result.current.retry());
    await waitFor(() => expect(result.current.state.status).toBe('saved'));
    const secondSubmission = service.submitAttempt.mock.calls[1][0];

    expect(secondSubmission.submissionId).toBe(firstSubmission.submissionId);
    expect(secondSubmission.startedAt).toBe(firstSubmission.startedAt);
    expect(secondSubmission).toEqual(firstSubmission);
  });

  it('لا يعيد محاولة رفض غير قابل للتكرار', async () => {
    const service = createService(async () => ({
      status: 'rejected',
      reason: 'scoring_contract_stale',
    }));
    const { result } = renderHook(() =>
      useMasteryResultPersistence('lesson-1', activeDependencies(service))
    );

    submitCurrent(result);
    await waitFor(() => expect(result.current.state.status).toBe('failed'));
    act(() => result.current.retry());
    expect(service.submitAttempt).toHaveBeenCalledTimes(1);
  });

  it('يحوّل خطأ غير متوقع إلى unavailable unknown بلا تسريب الرسالة الخام', async () => {
    const service = createService(async () => {
      throw new Error('raw backend message');
    });
    const { result } = renderHook(() =>
      useMasteryResultPersistence('lesson-1', activeDependencies(service))
    );

    submitCurrent(result);
    await waitFor(() =>
      expect(result.current.state).toEqual({
        status: 'failed',
        failure: {
          kind: 'submission',
          result: { status: 'unavailable', reason: 'unknown' },
        },
        retryable: true,
      })
    );
  });

  it('يلغي الطلب عند فك تركيب المكوّن ولا يحدّث حالة قديمة', async () => {
    const service = createService(
      (_submission, options) =>
        new Promise<MasteryAttemptSubmissionResult>((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => {
            reject(new DOMException('Aborted', 'AbortError'));
          });
        })
    );
    const { result, unmount } = renderHook(() =>
      useMasteryResultPersistence('lesson-1', activeDependencies(service))
    );

    submitCurrent(result);
    await waitFor(() => expect(result.current.state.status).toBe('saving'));
    const signal = service.submitAttempt.mock.calls[0][1]?.signal;
    unmount();
    expect(signal?.aborted).toBe(true);
  });
});
