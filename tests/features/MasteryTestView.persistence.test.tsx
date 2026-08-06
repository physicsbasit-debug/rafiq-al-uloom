// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthSessionContext, type AuthSessionContextValue } from '@features/auth/useAuthSession';
import { MasteryTestView } from '@features/mastery/MasteryTestView';
import {
  masteryResultsService,
  type MasteryAttemptSubmissionResult,
} from '@services/mastery-results';
import { useMasteryQuestions } from '@services/queries/content-query.hooks';
import type { Question } from '@shared-types/quiz.types';

vi.mock('@services/queries/content-query.hooks', () => ({
  useMasteryQuestions: vi.fn(),
}));

const mockedUseMasteryQuestions = vi.mocked(useMasteryQuestions);
const questions: Question[] = [
  {
    id: 'question-one',
    lessonId: 'lesson-one',
    type: 'multiple_choice',
    prompt: 'ما وحدة قياس التردد؟',
    choices: ['هرتز', 'ثانية'],
    correctAnswerIndex: 0,
    explanation: 'يقاس التردد بوحدة الهرتز.',
    objectiveId: 'objective-one',
    difficulty: 'easy',
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'question-two',
    lessonId: 'lesson-one',
    type: 'multiple_choice',
    prompt: 'ما العلاقة بين التردد والزمن الدوري؟',
    choices: ['عكسية', 'طردية'],
    correctAnswerIndex: 0,
    explanation: 'التردد يساوي مقلوب الزمن الدوري.',
    objectiveId: 'objective-two',
    difficulty: 'medium',
    status: 'approved',
    source: 'curriculum_seed',
  },
];

const activeContext: AuthSessionContextValue = {
  authState: {
    status: 'authenticated',
    user: {
      id: '30000000-0000-4000-8000-000000000003',
      email: 'student@example.com',
      emailConfirmedAt: '2026-08-06T12:00:00.000Z',
    },
    session: {
      expiresAt: null,
      user: {
        id: '30000000-0000-4000-8000-000000000003',
        email: 'student@example.com',
        emailConfirmedAt: '2026-08-06T12:00:00.000Z',
      },
    },
  },
  authorizationState: {
    status: 'authorized',
    profile: {
      id: '30000000-0000-4000-8000-000000000003',
      displayName: 'طالب',
      role: 'student',
      status: 'active',
      createdAt: '2026-08-06T12:00:00.000Z',
      updatedAt: '2026-08-06T12:00:00.000Z',
    },
  },
  entryMode: 'closed',
  confirmationEmail: null,
  openSignIn: vi.fn(),
  openSignUp: vi.fn(),
  closeAuthEntry: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  refreshAuthorization: vi.fn(),
  retrySession: vi.fn(),
};

function officialResult(percentage = 100) {
  return {
    attemptId: '20000000-0000-4000-8000-000000000002',
    submissionId: '10000000-0000-4000-8000-000000000001',
    lessonId: 'lesson-one',
    questionCount: 2,
    correctCount: percentage === 100 ? 2 : 1,
    percentage,
    scoringPolicyVersion: 'mastery-equal-weight-v1' as const,
    scoringFingerprint: 'a'.repeat(64),
    completedAt: '2026-08-06T12:01:00.000Z',
  };
}

function mockQuestionsSuccess() {
  mockedUseMasteryQuestions.mockReturnValue({
    data: questions,
    isLoading: false,
    error: null,
    reload: vi.fn(),
  });
}

function renderActiveView() {
  return render(
    <AuthSessionContext.Provider value={activeContext}>
      <MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />
    </AuthSessionContext.Provider>
  );
}

function answerAndFinish() {
  fireEvent.click(screen.getByRole('button', { name: 'هرتز' }));
  fireEvent.click(screen.getByRole('button', { name: 'عكسية' }));
  fireEvent.click(screen.getByRole('button', { name: 'إنهاء الاختبار' }));
}

beforeEach(() => {
  mockedUseMasteryQuestions.mockReset();
  mockQuestionsSuccess();
  vi.stubEnv('VITE_CONTENT_PROVIDER', 'supabase');
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('MasteryTestView result persistence integration', () => {
  it('يبقي حالة الحفظ idle قبل إنهاء الاختبار', () => {
    const submitSpy = vi.spyOn(masteryResultsService, 'submitAttempt');
    renderActiveView();
    expect(screen.queryByText(/جارٍ حفظ النتيجة/)).not.toBeInTheDocument();
    expect(screen.queryByText(/تم حفظ النتيجة/)).not.toBeInTheDocument();
    expect(submitSpy).not.toHaveBeenCalled();
  });

  it('يعرض النتيجة المحلية فورًا بينما الحفظ ما يزال saving', async () => {
    let resolve!: (value: MasteryAttemptSubmissionResult) => void;
    vi.spyOn(masteryResultsService, 'submitAttempt').mockReturnValue(
      new Promise<MasteryAttemptSubmissionResult>((done) => (resolve = done))
    );
    renderActiveView();

    answerAndFinish();
    expect(screen.getByRole('heading', { name: 'نتيجة اختبار الإتقان' })).toBeInTheDocument();
    expect(screen.getByText(/الدرجة:/)).toHaveTextContent('الدرجة: 100 من 100');
    expect(screen.getByText('جارٍ حفظ النتيجة في حسابك...')).toBeInTheDocument();

    act(() => {
      resolve({
        status: 'saved',
        result: officialResult(),
        reconciliation: 'matched_local_result',
      });
    });
    await waitFor(() => expect(screen.getByText('تم حفظ النتيجة في حسابك.')).toBeInTheDocument());
  });

  it('يعتمد الدرجة الرسمية بعد display_reconciled_to_server', async () => {
    let resolve!: (value: MasteryAttemptSubmissionResult) => void;
    vi.spyOn(masteryResultsService, 'submitAttempt').mockReturnValue(
      new Promise<MasteryAttemptSubmissionResult>((done) => (resolve = done))
    );
    renderActiveView();

    answerAndFinish();
    expect(screen.getByText(/الدرجة:/)).toHaveTextContent('الدرجة: 100 من 100');

    act(() => {
      resolve({
        status: 'saved',
        result: officialResult(50),
        reconciliation: 'display_reconciled_to_server',
      });
    });
    await waitFor(() => expect(screen.getByText(/الدرجة:/)).toHaveTextContent('الدرجة: 50 من 100'));
    expect(screen.getByText('تم حفظ النتيجة واعتماد الدرجة الرسمية.')).toBeInTheDocument();
    expect(screen.getByText('يحتاج مراجعة')).toBeInTheDocument();
  });

  it('يبقي النتيجة ظاهرة عند unavailable ويعيد المحاولة بنفس submissionId', async () => {
    vi.spyOn(masteryResultsService, 'submitAttempt')
      .mockResolvedValueOnce({ status: 'unavailable', reason: 'network_error' })
      .mockResolvedValueOnce({
        status: 'already_saved',
        result: officialResult(),
        reconciliation: 'matched_local_result',
      });
    renderActiveView();

    answerAndFinish();
    await waitFor(() =>
      expect(screen.getByText('ظهرت نتيجتك، لكن تعذر حفظها الآن.')).toBeInTheDocument()
    );
    expect(screen.getByText(/الدرجة:/)).toHaveTextContent('الدرجة: 100 من 100');
    const firstSubmission = vi.mocked(masteryResultsService.submitAttempt).mock.calls[0][0];

    fireEvent.click(screen.getByRole('button', { name: 'إعادة محاولة الحفظ' }));
    await waitFor(() => expect(screen.getByText('تم حفظ النتيجة في حسابك.')).toBeInTheDocument());
    const secondSubmission = vi.mocked(masteryResultsService.submitAttempt).mock.calls[1][0];
    expect(secondSubmission.submissionId).toBe(firstSubmission.submissionId);
    expect(secondSubmission.startedAt).toBe(firstSubmission.startedAt);
  });

  it('لا يعرض زر إعادة المحاولة لرفض RPC غير القابل للتكرار', async () => {
    vi.spyOn(masteryResultsService, 'submitAttempt').mockResolvedValue({
      status: 'rejected',
      reason: 'scoring_contract_stale',
    });
    renderActiveView();

    answerAndFinish();
    await waitFor(() =>
      expect(screen.getByText('ظهرت نتيجتك، لكن لم يتم اعتماد حفظها.')).toBeInTheDocument()
    );
    expect(screen.queryByRole('button', { name: 'إعادة محاولة الحفظ' })).not.toBeInTheDocument();
  });

  it('يعامل الزائر كـnot_applicable بلا رسالة خطأ أو استدعاء خدمة', async () => {
    const submitSpy = vi.spyOn(masteryResultsService, 'submitAttempt');
    render(<MasteryTestView lessonId="lesson-one" onBackToLesson={vi.fn()} />);

    answerAndFinish();
    expect(screen.getByText(/الدرجة:/)).toHaveTextContent('الدرجة: 100 من 100');
    await waitFor(() => expect(submitSpy).not.toHaveBeenCalled());
    expect(screen.queryByText(/تعذر حفظها/)).not.toBeInTheDocument();
    expect(screen.queryByText(/تم حفظ النتيجة/)).not.toBeInTheDocument();
  });

  it('يعامل المزوّد المحلي كـnot_applicable حتى للمستخدم النشط', async () => {
    vi.stubEnv('VITE_CONTENT_PROVIDER', 'local');
    const submitSpy = vi.spyOn(masteryResultsService, 'submitAttempt');
    renderActiveView();

    answerAndFinish();
    expect(screen.getByText(/الدرجة:/)).toHaveTextContent('الدرجة: 100 من 100');
    await waitFor(() => expect(submitSpy).not.toHaveBeenCalled());
    expect(screen.queryByText(/تعذر حفظها/)).not.toBeInTheDocument();
  });
});
