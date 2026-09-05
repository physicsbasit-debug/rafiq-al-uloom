// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ReviewerWorkspace } from '@features/reviewer/workspace/ReviewerWorkspace';
import type { LessonRevision, LessonRevisionPayload, ReviewService } from '@services/authoring';

const REVISION_ID = '00000000-0000-4000-8000-000000000301';

const payload: LessonRevisionPayload = {
  lesson: {
    unitId: 'unit-energy',
    title: 'تحولات الطاقة',
    displayOrder: 2,
    summary: 'ملخص',
    keyConcepts: [],
    examples: [],
    misconceptions: [],
  },
  objectives: [],
  questions: [],
  games: [],
  experiments: [],
  simulations: [],
  inquiries: [],
  dataActivities: [],
};

const revision: LessonRevision = {
  id: REVISION_ID,
  entityType: 'lesson',
  entityId: null,
  publishedEntityId: null,
  supersedesRevisionId: null,
  authorId: 'server-author',
  status: 'pending_review',
  payload,
  baseFingerprint: null,
  revisionNumber: 2,
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-02T08:00:00.000Z',
  submittedAt: '2026-08-02T09:00:00.000Z',
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ReviewerWorkspace decision refresh', () => {
  it('يغلق التفاصيل بعد نجاح القرار ثم يعيد listPendingRevisions فتختفي النسخة طبيعيًا', async () => {
    const listPendingRevisions = vi
      .fn<ReviewService['listPendingRevisions']>()
      .mockResolvedValueOnce({ status: 'success', revisions: [revision] })
      .mockResolvedValueOnce({ status: 'success', revisions: [] });
    const reviewLessonRevision = vi.fn(async () => ({
      status: 'approved' as const,
      revisionId: REVISION_ID,
      publishedEntityId: 'published-lesson-2',
    }));
    const service: ReviewService = { listPendingRevisions, reviewLessonRevision };
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ReviewerWorkspace service={service} />);
    fireEvent.click(await screen.findByRole('button', { name: /تحولات الطاقة/ }));
    expect(await screen.findByText(`مراجعة: ${payload.lesson.title}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'اعتماد النسخة' }));

    await waitFor(() => expect(listPendingRevisions).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('لا توجد دروس بانتظار المراجعة حاليًا.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('تم اعتماد النسخة بنجاح');
    expect(reviewLessonRevision).toHaveBeenCalledTimes(1);
  });

  it('يفصل نجاح القرار عن فشل refresh ويعيد محاولة القائمة فقط دون تكرار mutation', async () => {
    const listPendingRevisions = vi
      .fn<ReviewService['listPendingRevisions']>()
      .mockResolvedValueOnce({ status: 'success', revisions: [revision] })
      .mockResolvedValueOnce({ status: 'unavailable', reason: 'network_error' })
      .mockResolvedValueOnce({ status: 'success', revisions: [] });
    const reviewLessonRevision = vi.fn(async () => ({
      status: 'rejected_by_reviewer' as const,
      revisionId: REVISION_ID,
    }));
    const service: ReviewService = { listPendingRevisions, reviewLessonRevision };
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ReviewerWorkspace service={service} />);
    fireEvent.click(await screen.findByRole('button', { name: /تحولات الطاقة/ }));
    fireEvent.change(screen.getByLabelText('ملاحظة الرفض'), {
      target: { value: 'يحتاج توضيح المثال.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'رفض وإعادة للتعديل' }));

    await waitFor(() => expect(listPendingRevisions).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر الاتصال بخدمة المراجعة');
    expect(screen.getByRole('status')).toHaveTextContent('تم رفض النسخة وإعادتها للتعديل بنجاح');
    expect(reviewLessonRevision).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    await waitFor(() => expect(listPendingRevisions).toHaveBeenCalledTimes(3));
    expect(await screen.findByText('لا توجد دروس بانتظار المراجعة حاليًا.')).toBeInTheDocument();
    expect(reviewLessonRevision).toHaveBeenCalledTimes(1);
  });
});
