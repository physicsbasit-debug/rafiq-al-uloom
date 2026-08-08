// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TeacherWorkspace } from '@features/teacher/workspace/TeacherWorkspace';
import type { AuthoringService, LessonRevision, LessonRevisionPayload } from '@services/authoring';

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

function revision(
  id: string,
  status: LessonRevision['status'],
  title: string,
  revisionNumber: number
): LessonRevision {
  return {
    id,
    entityType: 'lesson',
    entityId: null,
    publishedEntityId: null,
    supersedesRevisionId: null,
    authorId: 'server-owned-author',
    status,
    payload: { ...payload, lesson: { ...payload.lesson, title } },
    baseFingerprint: null,
    revisionNumber,
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: `2026-08-0${revisionNumber}T08:00:00.000Z`,
    submittedAt: status === 'draft' ? null : '2026-08-02T08:00:00.000Z',
  };
}

function serviceWithList(
  listOwnRevisions: AuthoringService['listOwnRevisions']
): AuthoringService {
  return {
    listOwnRevisions,
    listReviewEvents: vi.fn(),
    createLessonRevision: vi.fn(),
    saveLessonRevision: vi.fn(),
    submitLessonRevision: vi.fn(),
  };
}

const revisions = [
  revision('00000000-0000-4000-8000-000000000001', 'approved', 'الدرس المعتمد', 4),
  revision('00000000-0000-4000-8000-000000000002', 'rejected', 'الدرس المرفوض', 3),
  revision('00000000-0000-4000-8000-000000000003', 'pending_review', 'درس بانتظار المراجعة', 2),
  revision('00000000-0000-4000-8000-000000000004', 'draft', 'المسودة الحالية', 1),
];

describe('TeacherWorkspace', () => {
  it('يعرض حالة التحميل ثم القائمة الناجحة', async () => {
    let resolveList!: (value: Awaited<ReturnType<AuthoringService['listOwnRevisions']>>) => void;
    const pending = new Promise<Awaited<ReturnType<AuthoringService['listOwnRevisions']>>>((resolve) => {
      resolveList = resolve;
    });
    const service = serviceWithList(vi.fn(() => pending));

    render(<TeacherWorkspace service={service} />);
    expect(screen.getByRole('status')).toHaveTextContent('جارٍ تحميل مسوداتك...');

    resolveList({ status: 'success', revisions });

    expect(await screen.findByText('الدرس المعتمد')).toBeInTheDocument();
    expect(screen.getByText('المسودة الحالية')).toBeInTheDocument();
  });

  it('يمرر AbortSignal إلى AuthoringService فقط', async () => {
    const listOwnRevisions = vi.fn(async () => ({ status: 'success' as const, revisions: [] }));
    const service = serviceWithList(listOwnRevisions);

    render(<TeacherWorkspace service={service} />);
    await screen.findByText('لا توجد لديك مسودات بعد. ابدأ بإنشاء درس جديد.');

    expect(listOwnRevisions).toHaveBeenCalledTimes(1);
    expect(listOwnRevisions).toHaveBeenCalledWith({ signal: expect.any(AbortSignal) });
  });

  it('يعرض الحالات الأربع بالتسميات العربية ويحافظ على ترتيب الخدمة', async () => {
    const service = serviceWithList(
      vi.fn(async () => ({ status: 'success' as const, revisions }))
    );

    render(<TeacherWorkspace service={service} />);
    await screen.findByText('الدرس المعتمد');

    const cards = screen.getAllByRole('button').filter((button) =>
      ['الدرس المعتمد', 'الدرس المرفوض', 'درس بانتظار المراجعة', 'المسودة الحالية'].some((title) =>
        button.textContent?.includes(title)
      )
    );
    expect(cards.map((card) => card.textContent)).toEqual([
      expect.stringContaining('الدرس المعتمد'),
      expect.stringContaining('الدرس المرفوض'),
      expect.stringContaining('درس بانتظار المراجعة'),
      expect.stringContaining('المسودة الحالية'),
    ]);
    expect(screen.getByRole('button', { name: /الدرس المعتمد/ })).toHaveTextContent('معتمد');
    expect(screen.getByRole('button', { name: /الدرس المرفوض/ })).toHaveTextContent('يحتاج إلى تعديل');
    expect(screen.getByRole('button', { name: /درس بانتظار المراجعة/ })).toHaveTextContent('قيد المراجعة');
    expect(screen.getByRole('button', { name: /المسودة الحالية/ })).toHaveTextContent('مسودة');
  });

  it('يفلتر الحالات محليًا دون طلب خدمة جديد', async () => {
    const listOwnRevisions = vi.fn(async () => ({ status: 'success' as const, revisions }));
    const service = serviceWithList(listOwnRevisions);

    render(<TeacherWorkspace service={service} />);
    await screen.findByText('المسودة الحالية');

    fireEvent.click(screen.getByRole('button', { name: 'يحتاج إلى تعديل' }));

    expect(screen.getByText('الدرس المرفوض')).toBeInTheDocument();
    expect(screen.queryByText('المسودة الحالية')).not.toBeInTheDocument();
    expect(listOwnRevisions).toHaveBeenCalledTimes(1);
  });

  it('يمرر Revision المحددة نفسها عند فتح البطاقة', async () => {
    const onOpenRevision = vi.fn();
    const service = serviceWithList(
      vi.fn(async () => ({ status: 'success' as const, revisions }))
    );

    render(<TeacherWorkspace service={service} onOpenRevision={onOpenRevision} />);
    const card = await screen.findByRole('button', { name: /الدرس المرفوض/ });
    fireEvent.click(card);

    expect(onOpenRevision).toHaveBeenCalledTimes(1);
    expect(onOpenRevision).toHaveBeenCalledWith(revisions[1]);
  });

  it('يفصل زر إنشاء درس عن أي mutation في 3-3B', async () => {
    const onCreateLesson = vi.fn();
    const createLessonRevision = vi.fn();
    const service = {
      ...serviceWithList(vi.fn(async () => ({ status: 'success' as const, revisions: [] }))),
      createLessonRevision,
    };

    render(<TeacherWorkspace service={service} onCreateLesson={onCreateLesson} />);
    await screen.findByText('لا توجد لديك مسودات بعد. ابدأ بإنشاء درس جديد.');
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء درس جديد' }));

    expect(onCreateLesson).toHaveBeenCalledTimes(1);
    expect(createLessonRevision).not.toHaveBeenCalled();
  });

  it('يعرض unavailable بالعربية ويعيد المحاولة بطلب جديد', async () => {
    const listOwnRevisions = vi
      .fn<AuthoringService['listOwnRevisions']>()
      .mockResolvedValueOnce({ status: 'unavailable', reason: 'network_error' })
      .mockResolvedValueOnce({ status: 'success', revisions: [] });
    const service = serviceWithList(listOwnRevisions);

    render(<TeacherWorkspace service={service} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذر الاتصال بالخدمة');

    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    await waitFor(() => expect(listOwnRevisions).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('لا توجد لديك مسودات بعد. ابدأ بإنشاء درس جديد.')).toBeInTheDocument();
  });

  it('يلغي الطلب الجاري عند unmount', async () => {
    let capturedSignal: AbortSignal | undefined;
    const service = serviceWithList(
      vi.fn(({ signal } = {}) => {
        capturedSignal = signal;
        return new Promise(() => undefined);
      })
    );

    const view = render(<TeacherWorkspace service={service} />);
    await waitFor(() => expect(capturedSignal).toBeDefined());
    expect(capturedSignal?.aborted).toBe(false);

    view.unmount();
    expect(capturedSignal?.aborted).toBe(true);
  });
});
