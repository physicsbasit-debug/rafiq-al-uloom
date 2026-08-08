// @vitest-environment jsdom

import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReviewerRevisionReview } from '@features/reviewer/workspace/ReviewerRevisionReview';
import { useReviewerRevisionReview } from '@features/reviewer/workspace/useReviewerRevisionReview';
import type {
  LessonRevision,
  LessonRevisionPayload,
  ReviewDecision,
  ReviewLessonRevisionResult,
  ReviewService,
} from '@services/authoring';

const REVISION_ID = '00000000-0000-4000-8000-000000000201';
const OTHER_REVISION_ID = '00000000-0000-4000-8000-000000000299';

const payload: LessonRevisionPayload = {
  lesson: {
    unitId: 'unit-waves',
    title: 'خصائص الموجات',
    displayOrder: 1,
    summary: 'ملخص الدرس',
    keyConcepts: ['السعة', 'الطول الموجي'],
    examples: ['موجات الماء'],
    misconceptions: ['السرعة تساوي التردد'],
  },
  objectives: [],
  questions: [],
  games: [],
  experiments: [],
};

const pendingRevision: LessonRevision = {
  id: REVISION_ID,
  entityType: 'lesson',
  entityId: null,
  publishedEntityId: null,
  supersedesRevisionId: null,
  authorId: 'server-owned-author',
  status: 'pending_review',
  payload,
  baseFingerprint: null,
  revisionNumber: 4,
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-02T08:00:00.000Z',
  submittedAt: '2026-08-02T09:00:00.000Z',
};

function reviewServiceWith(
  reviewLessonRevision: ReviewService['reviewLessonRevision']
): ReviewService {
  return {
    listPendingRevisions: vi.fn(async () => ({ status: 'success', revisions: [] })),
    reviewLessonRevision,
  };
}

function renderReview(service: ReviewService, onDecisionCommitted = vi.fn(), onBack = vi.fn()) {
  render(
    <ReviewerRevisionReview
      service={service}
      revision={pendingRevision}
      onBack={onBack}
      onDecisionCommitted={onDecisionCommitted}
    />
  );
  return { onDecisionCommitted, onBack };
}

function buttonFor(decision: ReviewDecision): HTMLElement {
  return screen.getByRole('button', {
    name: decision === 'approve' ? 'اعتماد النسخة' : 'رفض وإعادة للتعديل',
  });
}

function successFor(decision: ReviewDecision): ReviewLessonRevisionResult {
  return decision === 'approve'
    ? { status: 'approved', revisionId: REVISION_ID, publishedEntityId: 'published-lesson-1' }
    : { status: 'rejected_by_reviewer', revisionId: REVISION_ID };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ReviewerRevisionReview', () => {
  it('يعتمد reviewRevisionId نفسه ويرسل note:null ثم يلتزم محليًا فقط بعد نجاح الخادم', async () => {
    let resolveReview!: (value: ReviewLessonRevisionResult) => void;
    const pending = new Promise<ReviewLessonRevisionResult>((resolve) => {
      resolveReview = resolve;
    });
    const reviewLessonRevision = vi.fn(() => pending);
    const service = reviewServiceWith(reviewLessonRevision);
    const onDecisionCommitted = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderReview(service, onDecisionCommitted);
    fireEvent.change(screen.getByLabelText('ملاحظة الرفض'), {
      target: { value: 'ملاحظة قديمة يجب ألا تُرسل مع الاعتماد' },
    });
    fireEvent.click(buttonFor('approve'));

    expect(reviewLessonRevision).toHaveBeenCalledTimes(1);
    expect(reviewLessonRevision).toHaveBeenCalledWith(
      { revisionId: REVISION_ID, decision: 'approve', note: null },
      { signal: expect.any(AbortSignal) }
    );
    expect(onDecisionCommitted).not.toHaveBeenCalled();

    resolveReview({
      status: 'approved',
      revisionId: REVISION_ID,
      publishedEntityId: 'published-lesson-1',
    });

    await waitFor(() =>
      expect(onDecisionCommitted).toHaveBeenCalledWith({
        revisionId: REVISION_ID,
        decision: 'approve',
        publishedEntityId: 'published-lesson-1',
      })
    );
  });

  it('يمنع reject فارغًا قبل confirmation وقبل أي service call', () => {
    const reviewLessonRevision = vi.fn<ReviewService['reviewLessonRevision']>();
    const service = reviewServiceWith(reviewLessonRevision);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderReview(service);
    fireEvent.change(screen.getByLabelText('ملاحظة الرفض'), { target: { value: '   ' } });
    fireEvent.click(buttonFor('reject'));

    expect(confirm).not.toHaveBeenCalled();
    expect(reviewLessonRevision).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('اكتب ملاحظة واضحة قبل رفض النسخة');
  });

  it('يقص ملاحظة الرفض ويرسلها للنسخة المفتوحة نفسها ثم يلتزم بعد نجاح الخادم', async () => {
    const reviewLessonRevision = vi.fn(async () => ({
      status: 'rejected_by_reviewer' as const,
      revisionId: REVISION_ID,
    }));
    const service = reviewServiceWith(reviewLessonRevision);
    const onDecisionCommitted = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderReview(service, onDecisionCommitted);
    fireEvent.change(screen.getByLabelText('ملاحظة الرفض'), {
      target: { value: '  وضّح العلاقة بين السعة والطاقة.  ' },
    });
    fireEvent.click(buttonFor('reject'));

    await waitFor(() => expect(onDecisionCommitted).toHaveBeenCalledTimes(1));
    expect(reviewLessonRevision).toHaveBeenCalledWith(
      {
        revisionId: REVISION_ID,
        decision: 'reject',
        note: 'وضّح العلاقة بين السعة والطاقة.',
      },
      { signal: expect.any(AbortSignal) }
    );
    expect(onDecisionCommitted).toHaveBeenCalledWith({
      revisionId: REVISION_ID,
      decision: 'reject',
      publishedEntityId: null,
    });
  });

  it.each(['approve', 'reject'] as const)(
    'إلغاء confirmation لقرار %s لا يستدعي الخدمة',
    (decision) => {
      const reviewLessonRevision = vi.fn<ReviewService['reviewLessonRevision']>();
      const service = reviewServiceWith(reviewLessonRevision);
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderReview(service);
      if (decision === 'reject') {
        fireEvent.change(screen.getByLabelText('ملاحظة الرفض'), {
          target: { value: 'ملاحظة صالحة' },
        });
      }
      fireEvent.click(buttonFor(decision));

      expect(reviewLessonRevision).not.toHaveBeenCalled();
    }
  );

  it('لا يلتزم بنتيجة نجاح إذا اختلف result.revisionId عن reviewRevisionId', async () => {
    const service = reviewServiceWith(
      vi.fn(async () => ({
        status: 'approved' as const,
        revisionId: OTHER_REVISION_ID,
        publishedEntityId: 'published-other',
      }))
    );
    const onDecisionCommitted = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderReview(service, onDecisionCommitted);
    fireEvent.click(buttonFor('approve'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('معرّف النسخة في الاستجابة لا يطابق النسخة المفتوحة');
    expect(onDecisionCommitted).not.toHaveBeenCalled();
    expect(buttonFor('approve')).toBeEnabled();
  });

  it('لا يلتزم بنوع نجاح يناقض القرار المطلوب', async () => {
    const service = reviewServiceWith(
      vi.fn(async () => ({ status: 'rejected_by_reviewer' as const, revisionId: REVISION_ID }))
    );
    const onDecisionCommitted = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderReview(service, onDecisionCommitted);
    fireEvent.click(buttonFor('approve'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('نتيجة نجاح غير متوافقة مع القرار المطلوب');
    expect(onDecisionCommitted).not.toHaveBeenCalled();
  });

  it.each([
    ['revision_not_reviewable', 'لم تعد قابلة للمراجعة'],
    ['stale_revision', 'تغيّرت حالة النسخة'],
    ['not_authorized', 'لا تملك صلاحية'],
    ['review_note_required', 'اكتب ملاحظة واضحة'],
  ] as const)('يبقي التفاصيل مفتوحة عند رفض الخدمة بسبب %s', async (reason, message) => {
    const service = reviewServiceWith(vi.fn(async () => ({ status: 'rejected' as const, reason })));
    const onDecisionCommitted = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderReview(service, onDecisionCommitted);
    if (reason === 'review_note_required') {
      fireEvent.change(screen.getByLabelText('ملاحظة الرفض'), {
        target: { value: 'ملاحظة صالحة محليًا' },
      });
      fireEvent.click(buttonFor('reject'));
    } else {
      fireEvent.click(buttonFor('approve'));
    }

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(message);
    expect(onDecisionCommitted).not.toHaveBeenCalled();
    expect(screen.getByText(REVISION_ID)).toBeInTheDocument();
  });

  it('يخفي الاستثناء الخام ويُبقي جلسة المراجعة دون نجاح وهمي', async () => {
    const service = reviewServiceWith(
      vi.fn(async () => {
        throw new Error('raw postgres failure');
      })
    );
    const onDecisionCommitted = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderReview(service, onDecisionCommitted);
    fireEvent.click(buttonFor('approve'));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('تعذر إكمال عملية المراجعة بسبب خطأ غير متوقع');
    expect(alert).not.toHaveTextContent('raw postgres failure');
    expect(onDecisionCommitted).not.toHaveBeenCalled();
  });

  it.each([
    ['approve', 'approve'],
    ['reject', 'reject'],
    ['approve', 'reject'],
    ['reject', 'approve'],
  ] as const)(
    'يمنع double-action المتزامن %s + %s على مستوى hook ويطلق mutation واحدة فقط',
    async (firstDecision, secondDecision) => {
      let resolveReview!: (value: ReviewLessonRevisionResult) => void;
      const pending = new Promise<ReviewLessonRevisionResult>((resolve) => {
        resolveReview = resolve;
      });
      const reviewLessonRevision = vi.fn(() => pending);
      const service = reviewServiceWith(reviewLessonRevision);
      const onDecisionCommitted = vi.fn();

      const { result } = renderHook(() =>
        useReviewerRevisionReview({
          service,
          revision: pendingRevision,
          onDecisionCommitted,
        })
      );

      act(() => {
        result.current.setReviewNote('سبب رفض صالح');
      });

      act(() => {
        void result.current.review(firstDecision);
        void result.current.review(secondDecision);
      });

      expect(reviewLessonRevision).toHaveBeenCalledTimes(1);
      expect(reviewLessonRevision.mock.calls[0]?.[0]).toEqual({
        revisionId: REVISION_ID,
        decision: firstDecision,
        note: firstDecision === 'approve' ? null : 'سبب رفض صالح',
      });

      resolveReview(successFor(firstDecision));
      await waitFor(() => expect(onDecisionCommitted).toHaveBeenCalledTimes(1));
    }
  );

  it('يلغي review mutation الجارية عند unmount', async () => {
    let capturedSignal: AbortSignal | undefined;
    const service = reviewServiceWith(
      vi.fn((_input, { signal } = {}) => {
        capturedSignal = signal;
        return new Promise(() => undefined);
      })
    );
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const view = render(
      <ReviewerRevisionReview
        service={service}
        revision={pendingRevision}
        onBack={vi.fn()}
        onDecisionCommitted={vi.fn()}
      />
    );
    fireEvent.click(buttonFor('approve'));
    await waitFor(() => expect(capturedSignal).toBeDefined());
    expect(capturedSignal?.aborted).toBe(false);

    view.unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });
});
