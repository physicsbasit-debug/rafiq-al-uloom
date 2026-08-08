// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ReviewerWorkspace } from '@features/reviewer/workspace/ReviewerWorkspace';
import type { LessonRevision, LessonRevisionPayload, ReviewService } from '@services/authoring';

const payload: LessonRevisionPayload = {
  lesson: {
    unitId: 'unit-waves',
    title: 'خصائص الموجات',
    displayOrder: 1,
    summary: 'ملخص',
    keyConcepts: [],
    examples: [],
    misconceptions: [],
  },
  objectives: [],
  questions: [],
  games: [],
  experiments: [],
};

function revision(id: string, title: string, revisionNumber: number): LessonRevision {
  return {
    id,
    entityType: 'lesson',
    entityId: null,
    publishedEntityId: null,
    supersedesRevisionId: null,
    authorId: 'server-owned-author',
    status: 'pending_review',
    payload: { ...payload, lesson: { ...payload.lesson, title } },
    baseFingerprint: null,
    revisionNumber,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: `2026-08-0${revisionNumber}T08:00:00.000Z`,
    submittedAt: `2026-08-0${revisionNumber}T09:00:00.000Z`,
  };
}

function serviceWithList(
  listPendingRevisions: ReviewService['listPendingRevisions']
): ReviewService {
  return {
    listPendingRevisions,
    reviewLessonRevision: vi.fn(),
  };
}

const revisions = [
  revision('00000000-0000-4000-8000-000000000101', 'الموجات المستعرضة', 3),
  revision('00000000-0000-4000-8000-000000000102', 'الموجات الطولية', 2),
];

describe('ReviewerWorkspace', () => {
  it('يعرض حالة التحميل ثم قائمة pending_review الناجحة', async () => {
    let resolveList!: (value: Awaited<ReturnType<ReviewService['listPendingRevisions']>>) => void;
    const pending = new Promise<Awaited<ReturnType<ReviewService['listPendingRevisions']>>>(
      (resolve) => {
        resolveList = resolve;
      }
    );
    const service = serviceWithList(vi.fn(() => pending));

    render(<ReviewerWorkspace service={service} />);
    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل قائمة المراجعة...');

    resolveList({ status: 'success', revisions });

    expect(await screen.findByText('الموجات المستعرضة')).toBeInTheDocument();
    expect(screen.getByText('الموجات الطولية')).toBeInTheDocument();
  });

  it('يمرر AbortSignal إلى ReviewService.listPendingRevisions فقط', async () => {
    const listPendingRevisions = vi.fn(async () => ({ status: 'success' as const, revisions: [] }));
    const service = serviceWithList(listPendingRevisions);

    render(<ReviewerWorkspace service={service} />);
    await screen.findByText('لا توجد دروس بانتظار المراجعة حاليًا.');

    expect(listPendingRevisions).toHaveBeenCalledTimes(1);
    expect(listPendingRevisions).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
    expect(service.reviewLessonRevision).not.toHaveBeenCalled();
  });

  it('يحافظ على ترتيب القائمة القادم من ReviewService دون إعادة ترتيب محلية', async () => {
    const service = serviceWithList(vi.fn(async () => ({ status: 'success' as const, revisions })));

    render(<ReviewerWorkspace service={service} />);
    await screen.findByText('الموجات المستعرضة');

    const cards = screen
      .getAllByRole('button')
      .filter((button) =>
        ['الموجات المستعرضة', 'الموجات الطولية'].some((title) =>
          button.textContent?.includes(title)
        )
      );

    expect(cards.map((card) => card.textContent)).toEqual([
      expect.stringContaining('الموجات المستعرضة'),
      expect.stringContaining('الموجات الطولية'),
    ]);
    expect(cards[0]).toHaveTextContent('قيد المراجعة');
    expect(cards[1]).toHaveTextContent('قيد المراجعة');
  });

  it('يمرر Revision المحددة نفسها عند فتح بطاقة المراجعة', async () => {
    const onOpenRevision = vi.fn();
    const service = serviceWithList(vi.fn(async () => ({ status: 'success' as const, revisions })));

    render(<ReviewerWorkspace service={service} onOpenRevision={onOpenRevision} />);
    const card = await screen.findByRole('button', { name: /الموجات الطولية/ });
    fireEvent.click(card);

    expect(onOpenRevision).toHaveBeenCalledTimes(1);
    expect(onOpenRevision).toHaveBeenCalledWith(revisions[1]);
    expect(service.reviewLessonRevision).not.toHaveBeenCalled();
  });

  it('يعرض الحالة الفارغة دون أي mutation', async () => {
    const service = serviceWithList(
      vi.fn(async () => ({ status: 'success' as const, revisions: [] }))
    );

    render(<ReviewerWorkspace service={service} />);

    expect(await screen.findByText('لا توجد دروس بانتظار المراجعة حاليًا.')).toBeInTheDocument();
    expect(service.reviewLessonRevision).not.toHaveBeenCalled();
  });

  it('يعرض unavailable بالعربية ويعيد المحاولة بطلب قائمة جديد فقط', async () => {
    const listPendingRevisions = vi
      .fn<ReviewService['listPendingRevisions']>()
      .mockResolvedValueOnce({ status: 'unavailable', reason: 'network_error' })
      .mockResolvedValueOnce({ status: 'success', revisions: [] });
    const service = serviceWithList(listPendingRevisions);

    render(<ReviewerWorkspace service={service} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر الاتصال بخدمة المراجعة');

    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    await waitFor(() => expect(listPendingRevisions).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('لا توجد دروس بانتظار المراجعة حاليًا.')).toBeInTheDocument();
    expect(service.reviewLessonRevision).not.toHaveBeenCalled();
  });

  it('يحوّل الاستثناء غير المتوقع إلى رسالة عربية دون كشف خطأ البنية', async () => {
    const service = serviceWithList(
      vi.fn(async () => {
        throw new Error('raw infrastructure failure');
      })
    );

    render(<ReviewerWorkspace service={service} />);

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('تعذر تحميل قائمة المراجعة بسبب خطأ غير متوقع');
    expect(alert).not.toHaveTextContent('raw infrastructure failure');
  });

  it('يلغي طلب القائمة الجاري عند unmount', async () => {
    let capturedSignal: AbortSignal | undefined;
    const service = serviceWithList(
      vi.fn(({ signal } = {}) => {
        capturedSignal = signal;
        return new Promise(() => undefined);
      })
    );

    const view = render(<ReviewerWorkspace service={service} />);
    await waitFor(() => expect(capturedSignal).toBeDefined());
    expect(capturedSignal?.aborted).toBe(false);

    view.unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });
});
