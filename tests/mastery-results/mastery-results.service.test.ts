import { describe, expect, it, vi } from 'vitest';

import { createMasteryResultsService } from '@services/mastery-results/mastery-results.service';
import type { MasteryResultsRepository } from '@services/mastery-results/mastery-results.repository';
import type { Question } from '@shared-types/quiz.types';

function question(
  id: string,
  lessonId = 'lesson-1',
  correctAnswerIndex = 1,
  choices = ['A', 'B', 'C']
): Question {
  return {
    id,
    lessonId,
    type: 'multiple_choice',
    prompt: id,
    choices,
    correctAnswerIndex,
    explanation: 'شرح',
    objectiveId: 'objective-1',
    difficulty: 'medium',
    status: 'approved',
    source: 'curriculum_seed',
  };
}

function serviceInput() {
  return {
    submissionId: '10000000-0000-4000-8000-000000000001',
    lessonId: 'lesson-1',
    startedAt: '2026-08-06T00:00:00.000Z',
    questions: [question('question-b', 'lesson-1', 0), question('question-a', 'lesson-1', 1)],
    answersByQuestionId: {
      'question-a': 1,
      'question-b': 2,
    },
  } as const;
}

function officialResult(overrides: Record<string, unknown> = {}) {
  return {
    attemptId: '20000000-0000-4000-8000-000000000002',
    submissionId: '10000000-0000-4000-8000-000000000001',
    lessonId: 'lesson-1',
    questionCount: 2,
    correctCount: 1,
    percentage: 50,
    scoringPolicyVersion: 'mastery-equal-weight-v1' as const,
    scoringFingerprint: 'a'.repeat(64),
    completedAt: '2026-08-06T00:01:00.000Z',
    ...overrides,
  };
}

function repositoryReturning(
  result: Awaited<ReturnType<MasteryResultsRepository['submitAttempt']>>
): MasteryResultsRepository & { submitAttempt: ReturnType<typeof vi.fn> } {
  return {
    submitAttempt: vi.fn().mockResolvedValue(result),
  };
}

describe('Mastery results service', () => {
  it('يبني البصمة والحمولة داخل الخدمة ويرتب الإجابات بالمعرف', async () => {
    const repository = repositoryReturning({ status: 'saved', result: officialResult() });
    const service = createMasteryResultsService(repository, {
      digestSha256Hex: async () => 'a'.repeat(64),
    });

    await expect(service.submitAttempt(serviceInput())).resolves.toEqual({
      status: 'saved',
      result: officialResult(),
      reconciliation: 'matched_local_result',
    });

    expect(repository.submitAttempt).toHaveBeenCalledWith(
      {
        submissionId: '10000000-0000-4000-8000-000000000001',
        lessonId: 'lesson-1',
        startedAt: '2026-08-06T00:00:00.000Z',
        expectedScoringFingerprint: 'a'.repeat(64),
        answers: [
          { questionId: 'question-b', selectedChoiceIndex: 2 },
          { questionId: 'question-a', selectedChoiceIndex: 1 },
        ],
      },
      {}
    );
  });

  it('يميّز تسوية العرض بعد نجاح الحفظ عن رفض RPC', async () => {
    const repository = repositoryReturning({
      status: 'already_saved',
      result: officialResult({ correctCount: 2, percentage: 100 }),
    });
    const service = createMasteryResultsService(repository, {
      digestSha256Hex: async () => 'a'.repeat(64),
    });

    const result = await service.submitAttempt(serviceInput());

    expect(result).toEqual({
      status: 'already_saved',
      result: officialResult({ correctCount: 2, percentage: 100 }),
      reconciliation: 'display_reconciled_to_server',
    });
  });

  it.each([
    ['not_authenticated'],
    ['not_authorized'],
    ['lesson_not_available'],
    ['scoring_contract_stale'],
    ['question_set_mismatch'],
    ['submission_conflict'],
  ] as const)('يمرر رفض Repository دون إعادة تصنيفه: %s', async (reason) => {
    const repository = repositoryReturning({ status: 'rejected', reason });
    const service = createMasteryResultsService(repository, {
      digestSha256Hex: async () => 'a'.repeat(64),
    });

    await expect(service.submitAttempt(serviceInput())).resolves.toEqual({
      status: 'rejected',
      reason,
    });
  });

  it('يرفض محليًا submissionId غير صالح قبل Repository', async () => {
    const repository = repositoryReturning({ status: 'saved', result: officialResult() });
    const service = createMasteryResultsService(repository);

    await expect(
      service.submitAttempt({ ...serviceInput(), submissionId: 'not-a-uuid' })
    ).resolves.toEqual({ status: 'rejected', reason: 'invalid_response_set' });
    expect(repository.submitAttempt).not.toHaveBeenCalled();
  });

  it('يرفض محليًا مجموعة أسئلة مكررة قبل Repository', async () => {
    const repository = repositoryReturning({ status: 'saved', result: officialResult() });
    const service = createMasteryResultsService(repository);
    const input = serviceInput();

    await expect(
      service.submitAttempt({
        ...input,
        questions: [question('same'), question('same')],
        answersByQuestionId: { same: 1 },
      })
    ).resolves.toEqual({ status: 'rejected', reason: 'question_set_mismatch' });
    expect(repository.submitAttempt).not.toHaveBeenCalled();
  });

  it('يرفض عقد سؤال غير صالح بوصفه scoring_contract_stale', async () => {
    const repository = repositoryReturning({ status: 'saved', result: officialResult() });
    const service = createMasteryResultsService(repository);

    await expect(
      service.submitAttempt({
        ...serviceInput(),
        questions: [question('question-a', 'lesson-1', 4, ['A', 'B'])],
        answersByQuestionId: { 'question-a': 1 },
      })
    ).resolves.toEqual({ status: 'rejected', reason: 'scoring_contract_stale' });
    expect(repository.submitAttempt).not.toHaveBeenCalled();
  });

  it('يرفض إجابة ناقصة أو إضافية قبل Repository', async () => {
    const repository = repositoryReturning({ status: 'saved', result: officialResult() });
    const service = createMasteryResultsService(repository);

    await expect(
      service.submitAttempt({
        ...serviceInput(),
        answersByQuestionId: { 'question-a': 1, extra: 0 },
      })
    ).resolves.toEqual({ status: 'rejected', reason: 'invalid_response_set' });
    expect(repository.submitAttempt).not.toHaveBeenCalled();
  });

  it('يحافظ على unavailable من Repository كما هو', async () => {
    const repository = repositoryReturning({ status: 'unavailable', reason: 'network_error' });
    const service = createMasteryResultsService(repository, {
      digestSha256Hex: async () => 'a'.repeat(64),
    });

    await expect(service.submitAttempt(serviceInput())).resolves.toEqual({
      status: 'unavailable',
      reason: 'network_error',
    });
  });

  it('يحوّل فشل حساب البصمة إلى unavailable بدل إرسال طلب ناقص', async () => {
    const repository = repositoryReturning({ status: 'saved', result: officialResult() });
    const service = createMasteryResultsService(repository, {
      digestSha256Hex: async () => {
        throw new Error('crypto unavailable');
      },
    });

    await expect(service.submitAttempt(serviceInput())).resolves.toEqual({
      status: 'unavailable',
      reason: 'unknown',
    });
    expect(repository.submitAttempt).not.toHaveBeenCalled();
  });

  it('يفحص AbortSignal قبل أي عمل', async () => {
    const repository = repositoryReturning({ status: 'saved', result: officialResult() });
    const controller = new AbortController();
    controller.abort();
    const service = createMasteryResultsService(repository);

    await expect(
      service.submitAttempt(serviceInput(), { signal: controller.signal })
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(repository.submitAttempt).not.toHaveBeenCalled();
  });
});
