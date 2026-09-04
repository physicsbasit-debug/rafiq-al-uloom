import { describe, expect, it, vi } from 'vitest';

import type { AuthoringRepository } from '@services/authoring/authoring.repository';
import { createAuthoringService } from '@services/authoring/authoring.service';
import type { ReviewRepository } from '@services/authoring/review.repository';
import { createReviewService } from '@services/authoring/review.service';
import type { LessonRevisionPayload } from '@services/authoring/authoring.types';

const REVISION_ID = '10000000-0000-4000-8000-000000000001';

function payload(): LessonRevisionPayload {
  return {
    lesson: {
      unitId: 'unit-1',
      title: 'Lesson',
      displayOrder: 1,
      summary: 'Summary',
      keyConcepts: [],
      examples: [],
      misconceptions: [],
    },
    objectives: [{ key: 'o1', text: 'Objective' }],
    questions: [
      {
        key: 'q1',
        purpose: 'review',
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

function authoringRepository(overrides: Partial<AuthoringRepository> = {}): AuthoringRepository {
  return {
    listOwnRevisions: vi.fn(async () => ({ status: 'success', revisions: [] })),
    listReviewEvents: vi.fn(async () => ({ status: 'success', events: [] })),
    createLessonRevision: vi.fn(async () => ({
      status: 'created',
      revision: {
        id: REVISION_ID,
        entityId: null,
        revisionNumber: 1,
        baseFingerprint: null,
      },
    })),
    saveLessonRevision: vi.fn(async () => ({ status: 'saved', revisionId: REVISION_ID })),
    submitLessonRevision: vi.fn(async () => ({ status: 'submitted', revisionId: REVISION_ID })),
    ...overrides,
  };
}

function reviewRepository(overrides: Partial<ReviewRepository> = {}): ReviewRepository {
  return {
    listPendingRevisions: vi.fn(async () => ({ status: 'success', revisions: [] })),
    reviewLessonRevision: vi.fn(async () => ({
      status: 'approved',
      revisionId: REVISION_ID,
      publishedEntityId: 'lesson-published',
    })),
    ...overrides,
  };
}

describe('AuthoringService', () => {
  it('يفوض إنشاء المسودة إلى Repository ولا يضيف هوية مستخدم', async () => {
    const repository = authoringRepository();
    const service = createAuthoringService(repository);
    const input = { payload: payload(), entityId: 'lesson-existing' };

    await expect(service.createLessonRevision(input)).resolves.toMatchObject({ status: 'created' });
    expect(repository.createLessonRevision).toHaveBeenCalledWith(input, {});
  });

  it('يرفض revision id غير صالح قبل أي استدعاء للشبكة', async () => {
    const repository = authoringRepository();
    const service = createAuthoringService(repository);

    await expect(service.submitLessonRevision('not-a-uuid')).resolves.toEqual({
      status: 'rejected',
      reason: 'invalid_revision_id',
    });
    expect(repository.submitLessonRevision).not.toHaveBeenCalled();
  });

  it('يرفض شكل payload غير صالح قبل Repository', async () => {
    const repository = authoringRepository();
    const service = createAuthoringService(repository);

    await expect(
      service.createLessonRevision({ payload: null as unknown as LessonRevisionPayload })
    ).resolves.toEqual({ status: 'rejected', reason: 'invalid_payload' });
    expect(repository.createLessonRevision).not.toHaveBeenCalled();
  });

  it('يرفض payload بالشكل التاريخي عند إنشاء Revision جديدة', async () => {
    const repository = authoringRepository();
    const service = createAuthoringService(repository);
    const legacy = { ...payload() } as unknown as Record<string, unknown>;

    delete legacy.simulations;
    delete legacy.inquiries;
    delete legacy.dataActivities;

    await expect(
      service.createLessonRevision({
        payload: legacy as unknown as LessonRevisionPayload,
      })
    ).resolves.toEqual({ status: 'rejected', reason: 'invalid_payload' });

    expect(repository.createLessonRevision).not.toHaveBeenCalled();
  });

  it('يرفض supersedesRevisionId غير صالح محليًا', async () => {
    const repository = authoringRepository();
    const service = createAuthoringService(repository);

    await expect(
      service.createLessonRevision({
        payload: payload(),
        supersedesRevisionId: 'bad-id',
      })
    ).resolves.toEqual({ status: 'rejected', reason: 'invalid_revision_id' });
    expect(repository.createLessonRevision).not.toHaveBeenCalled();
  });

  it('يعيد unavailable بدل تسريب خطأ Repository غير المتوقع', async () => {
    const repository = authoringRepository({
      listOwnRevisions: vi.fn(async () => {
        throw new TypeError('network secret');
      }),
    });
    const service = createAuthoringService(repository);

    await expect(service.listOwnRevisions()).resolves.toEqual({
      status: 'unavailable',
      reason: 'network_error',
    });
  });

  it('يحترم AbortSignal قبل استدعاء Repository', async () => {
    const repository = authoringRepository();
    const service = createAuthoringService(repository);
    const controller = new AbortController();
    controller.abort();

    await expect(service.listOwnRevisions({ signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
    expect(repository.listOwnRevisions).not.toHaveBeenCalled();
  });
});

describe('ReviewService', () => {
  it('يرفض رفض المسودة دون ملاحظة قبل RPC', async () => {
    const repository = reviewRepository();
    const service = createReviewService(repository);

    await expect(
      service.reviewLessonRevision({ revisionId: REVISION_ID, decision: 'reject', note: '   ' })
    ).resolves.toEqual({ status: 'rejected', reason: 'review_note_required' });
    expect(repository.reviewLessonRevision).not.toHaveBeenCalled();
  });

  it('ينظف ملاحظة المراجع قبل تمريرها إلى Repository', async () => {
    const repository = reviewRepository();
    const service = createReviewService(repository);

    await service.reviewLessonRevision({
      revisionId: REVISION_ID,
      decision: 'reject',
      note: '  يحتاج تعديل  ',
    });

    expect(repository.reviewLessonRevision).toHaveBeenCalledWith(
      { revisionId: REVISION_ID, decision: 'reject', note: 'يحتاج تعديل' },
      {}
    );
  });

  it('يحافظ على approve مع note فارغة كـnull', async () => {
    const repository = reviewRepository();
    const service = createReviewService(repository);

    await service.reviewLessonRevision({
      revisionId: REVISION_ID,
      decision: 'approve',
      note: '   ',
    });

    expect(repository.reviewLessonRevision).toHaveBeenCalledWith(
      { revisionId: REVISION_ID, decision: 'approve', note: null },
      {}
    );
  });

  it('يرفض قرارًا غير معروف وقت التشغيل', async () => {
    const repository = reviewRepository();
    const service = createReviewService(repository);

    await expect(
      service.reviewLessonRevision({
        revisionId: REVISION_ID,
        decision: 'invented' as 'approve',
      })
    ).resolves.toEqual({ status: 'rejected', reason: 'invalid_decision' });
    expect(repository.reviewLessonRevision).not.toHaveBeenCalled();
  });

  it('يعيد service_unavailable عند فشل Repository بخطأ خادم', async () => {
    const repository = reviewRepository({
      listPendingRevisions: vi.fn(async () => {
        throw { status: 503, message: 'db unavailable' };
      }),
    });
    const service = createReviewService(repository);

    await expect(service.listPendingRevisions()).resolves.toEqual({
      status: 'unavailable',
      reason: 'service_unavailable',
    });
  });
});
