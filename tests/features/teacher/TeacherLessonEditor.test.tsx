// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TeacherLessonEditor } from '@features/teacher/workspace/TeacherLessonEditor';
import type { AuthoringService, LessonRevision, LessonRevisionPayload } from '@services/authoring';

const REJECTED_ID = '00000000-0000-4000-8000-0000000000a1';
const SUCCESSOR_ID = '00000000-0000-4000-8000-0000000000b2';
const DRAFT_ID = '00000000-0000-4000-8000-0000000000c3';

const payload: LessonRevisionPayload = {
  lesson: {
    unitId: 'unit-waves',
    title: 'خصائص الموجات',
    displayOrder: 1,
    summary: 'ملخص',
    keyConcepts: ['السعة'],
    examples: ['موجات الماء'],
    misconceptions: ['كل الموجات مادية'],
  },
  objectives: [{ key: 'obj-1', text: 'يصف خصائص الموجات' }],
  questions: [],
  games: [],
  experiments: [],
};

function revision(id: string, status: LessonRevision['status']): LessonRevision {
  return {
    id,
    entityType: 'lesson',
    entityId: null,
    publishedEntityId: null,
    supersedesRevisionId: null,
    authorId: 'server-owned-author',
    status,
    payload,
    baseFingerprint: null,
    revisionNumber: 1,
    createdAt: '2026-08-08T08:00:00.000Z',
    updatedAt: '2026-08-08T08:00:00.000Z',
    submittedAt: status === 'draft' ? null : '2026-08-08T08:10:00.000Z',
  };
}

function service(overrides: Partial<AuthoringService> = {}): AuthoringService {
  return {
    listOwnRevisions: vi.fn(),
    listReviewEvents: vi.fn(),
    createLessonRevision: vi.fn(),
    saveLessonRevision: vi.fn(),
    submitLessonRevision: vi.fn(),
    ...overrides,
  };
}

function changeTitle(value: string) {
  fireEvent.change(screen.getByRole('textbox', { name: 'عنوان الدرس' }), {
    target: { value },
  });
}

function saveButton() {
  return screen.getByRole('button', { name: /حفظ المسودة|جارٍ الحفظ/ });
}

function submitButton() {
  return screen.getByRole('button', { name: /إرسال للمراجعة|جارٍ الإرسال/ });
}

describe('TeacherLessonEditor', () => {
  it('ينشئ new revision في أول حفظ ثم يحفظ بالمعرف الذي أكده الخادم', async () => {
    const createLessonRevision = vi
      .fn<AuthoringService['createLessonRevision']>()
      .mockResolvedValue({
        status: 'created',
        revision: {
          id: SUCCESSOR_ID,
          entityId: null,
          revisionNumber: 1,
          baseFingerprint: null,
        },
      });
    const saveLessonRevision = vi.fn<AuthoringService['saveLessonRevision']>().mockResolvedValue({
      status: 'saved',
      revisionId: SUCCESSOR_ID,
    });
    const authoring = service({ createLessonRevision, saveLessonRevision });

    render(<TeacherLessonEditor service={authoring} onBack={vi.fn()} />);
    changeTitle('درس جديد');
    fireEvent.click(saveButton());

    await waitFor(() => expect(createLessonRevision).toHaveBeenCalledTimes(1));
    expect(createLessonRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          lesson: expect.objectContaining({ title: 'درس جديد' }),
        }),
      }),
      { signal: expect.any(AbortSignal) }
    );
    expect(saveLessonRevision).not.toHaveBeenCalled();
    expect(await screen.findByText(SUCCESSOR_ID)).toBeInTheDocument();

    changeTitle('درس جديد - تعديل ثان');
    fireEvent.click(saveButton());

    await waitFor(() => expect(saveLessonRevision).toHaveBeenCalledTimes(1));
    expect(saveLessonRevision).toHaveBeenCalledWith(
      SUCCESSOR_ID,
      expect.objectContaining({
        lesson: expect.objectContaining({ title: 'درس جديد - تعديل ثان' }),
      }),
      { signal: expect.any(AbortSignal) }
    );
  });

  it('لا يحفظ rejected revision في مكانها ويُنشئ successor في أول حفظ', async () => {
    const createLessonRevision = vi
      .fn<AuthoringService['createLessonRevision']>()
      .mockResolvedValue({
        status: 'created',
        revision: {
          id: SUCCESSOR_ID,
          entityId: null,
          revisionNumber: 2,
          baseFingerprint: null,
        },
      });
    const saveLessonRevision = vi.fn<AuthoringService['saveLessonRevision']>().mockResolvedValue({
      status: 'saved',
      revisionId: SUCCESSOR_ID,
    });
    const authoring = service({ createLessonRevision, saveLessonRevision });

    render(
      <TeacherLessonEditor
        service={authoring}
        revision={revision(REJECTED_ID, 'rejected')}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText(REJECTED_ID)).toBeInTheDocument();
    expect(screen.getByText('لم تُنشأ بعد')).toBeInTheDocument();

    changeTitle('خصائص الموجات - بعد المراجعة');
    fireEvent.click(saveButton());

    await waitFor(() => expect(createLessonRevision).toHaveBeenCalledTimes(1));
    expect(createLessonRevision).toHaveBeenCalledWith(
      {
        payload: expect.objectContaining({
          lesson: expect.objectContaining({ title: 'خصائص الموجات - بعد المراجعة' }),
        }),
        supersedesRevisionId: REJECTED_ID,
      },
      { signal: expect.any(AbortSignal) }
    );
    expect(saveLessonRevision).not.toHaveBeenCalledWith(
      REJECTED_ID,
      expect.anything(),
      expect.anything()
    );
    expect(await screen.findByText(SUCCESSOR_ID)).toBeInTheDocument();

    changeTitle('خصائص الموجات - النسخة الجديدة');
    fireEvent.click(saveButton());

    await waitFor(() => expect(saveLessonRevision).toHaveBeenCalledTimes(1));
    expect(saveLessonRevision).toHaveBeenCalledWith(SUCCESSOR_ID, expect.anything(), {
      signal: expect.any(AbortSignal),
    });
    expect(saveLessonRevision).not.toHaveBeenCalledWith(
      REJECTED_ID,
      expect.anything(),
      expect.anything()
    );
  });

  it('يلتزم commit-on-success عند فشل إنشاء successor للمرفوض', async () => {
    const createLessonRevision = vi
      .fn<AuthoringService['createLessonRevision']>()
      .mockResolvedValue({
        status: 'rejected',
        reason: 'stale_revision',
      });
    const saveLessonRevision = vi.fn<AuthoringService['saveLessonRevision']>();
    const authoring = service({ createLessonRevision, saveLessonRevision });

    render(
      <TeacherLessonEditor
        service={authoring}
        revision={revision(REJECTED_ID, 'rejected')}
        onBack={vi.fn()}
      />
    );

    changeTitle('محاولة تعديل');
    fireEvent.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('توجد نسخة أحدث');
    expect(screen.getByText('لم تُنشأ بعد')).toBeInTheDocument();
    expect(saveButton()).toBeEnabled();
    expect(saveLessonRevision).not.toHaveBeenCalled();
  });

  it('يحفظ draft موجودة بالمعرف نفسه ويحافظ على المحتوى البنيوي غير المحرر', async () => {
    const saveLessonRevision = vi.fn<AuthoringService['saveLessonRevision']>().mockResolvedValue({
      status: 'saved',
      revisionId: DRAFT_ID,
    });
    const authoring = service({ saveLessonRevision });

    render(
      <TeacherLessonEditor
        service={authoring}
        revision={revision(DRAFT_ID, 'draft')}
        onBack={vi.fn()}
      />
    );

    changeTitle('خصائص الموجات - محفوظة');
    fireEvent.click(saveButton());

    await waitFor(() => expect(saveLessonRevision).toHaveBeenCalledTimes(1));
    const savedPayload = saveLessonRevision.mock.calls[0]?.[1];
    expect(savedPayload?.objectives).toEqual(payload.objectives);
    expect(savedPayload?.questions).toEqual(payload.questions);
    expect(savedPayload?.games).toEqual(payload.games);
    expect(savedPayload?.experiments).toEqual(payload.experiments);
    expect(saveLessonRevision).toHaveBeenCalledWith(DRAFT_ID, expect.anything(), {
      signal: expect.any(AbortSignal),
    });
  });

  it.each(['pending_review', 'approved'] as const)('يعرض %s للقراءة فقط دون حفظ', (status) => {
    const saveLessonRevision = vi.fn<AuthoringService['saveLessonRevision']>();
    const createLessonRevision = vi.fn<AuthoringService['createLessonRevision']>();
    const authoring = service({ saveLessonRevision, createLessonRevision });

    render(
      <TeacherLessonEditor
        service={authoring}
        revision={revision(DRAFT_ID, status)}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByRole('textbox', { name: 'عنوان الدرس' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'حفظ المسودة' })).not.toBeInTheDocument();
    expect(saveLessonRevision).not.toHaveBeenCalled();
    expect(createLessonRevision).not.toHaveBeenCalled();
  });

  it('يحمي الرجوع عند وجود تغييرات غير محفوظة', () => {
    const onBack = vi.fn();
    const confirm = vi
      .spyOn(window, 'confirm')
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    const authoring = service();

    render(<TeacherLessonEditor service={authoring} onBack={onBack} />);
    changeTitle('تعديل غير محفوظ');

    fireEvent.click(screen.getByRole('button', { name: 'العودة' }));
    expect(onBack).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'العودة' }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(confirm).toHaveBeenCalledTimes(2);
    confirm.mockRestore();
  });

  it('يمنع double-save بينما عملية الإنشاء جارية', async () => {
    let resolveCreate!: (
      value: Awaited<ReturnType<AuthoringService['createLessonRevision']>>
    ) => void;
    const pending = new Promise<Awaited<ReturnType<AuthoringService['createLessonRevision']>>>(
      (resolve) => {
        resolveCreate = resolve;
      }
    );
    const createLessonRevision = vi.fn(() => pending);
    const authoring = service({ createLessonRevision });

    render(<TeacherLessonEditor service={authoring} onBack={vi.fn()} />);
    changeTitle('درس جديد');
    fireEvent.click(saveButton());

    await waitFor(() => expect(createLessonRevision).toHaveBeenCalledTimes(1));
    expect(saveButton()).toBeDisabled();
    fireEvent.click(saveButton());
    expect(createLessonRevision).toHaveBeenCalledTimes(1);

    resolveCreate({
      status: 'created',
      revision: {
        id: SUCCESSOR_ID,
        entityId: null,
        revisionNumber: 1,
        baseFingerprint: null,
      },
    });
    await screen.findByText(SUCCESSOR_ID);
  });

  it('يرسل draft محفوظة بالمعرف العامل ثم يحول المحرر إلى قيد المراجعة فقط بعد نجاح الخادم', async () => {
    const submitLessonRevision = vi
      .fn<AuthoringService['submitLessonRevision']>()
      .mockResolvedValue({
        status: 'submitted',
        revisionId: DRAFT_ID,
      });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const authoring = service({ submitLessonRevision });

    render(
      <TeacherLessonEditor
        service={authoring}
        revision={revision(DRAFT_ID, 'draft')}
        onBack={vi.fn()}
      />
    );

    expect(submitButton()).toBeEnabled();
    fireEvent.click(submitButton());

    await waitFor(() => expect(submitLessonRevision).toHaveBeenCalledTimes(1));
    expect(submitLessonRevision).toHaveBeenCalledWith(DRAFT_ID, {
      signal: expect.any(AbortSignal),
    });
    expect(
      await screen.findByText('هذه النسخة قيد المراجعة ولا يمكن تعديلها في مكانها.')
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'عنوان الدرس' })).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'إرسال للمراجعة' })).not.toBeInTheDocument();
    confirm.mockRestore();
  });

  it('يمنع الإرسال عند وجود تغييرات غير محفوظة حتى ينجح الحفظ', async () => {
    const saveLessonRevision = vi.fn<AuthoringService['saveLessonRevision']>().mockResolvedValue({
      status: 'saved',
      revisionId: DRAFT_ID,
    });
    const submitLessonRevision = vi.fn<AuthoringService['submitLessonRevision']>();
    const authoring = service({ saveLessonRevision, submitLessonRevision });

    render(
      <TeacherLessonEditor
        service={authoring}
        revision={revision(DRAFT_ID, 'draft')}
        onBack={vi.fn()}
      />
    );

    changeTitle('تعديل يحتاج حفظًا');
    expect(submitButton()).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('احفظ التعديلات أولًا');
    fireEvent.click(submitButton());
    expect(submitLessonRevision).not.toHaveBeenCalled();

    fireEvent.click(saveButton());
    await waitFor(() => expect(saveLessonRevision).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(submitButton()).toBeEnabled());
  });

  it('لا يستدعي submit إذا ألغى المعلم نافذة التأكيد', () => {
    const submitLessonRevision = vi.fn<AuthoringService['submitLessonRevision']>();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const authoring = service({ submitLessonRevision });

    render(
      <TeacherLessonEditor
        service={authoring}
        revision={revision(DRAFT_ID, 'draft')}
        onBack={vi.fn()}
      />
    );

    fireEvent.click(submitButton());
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(submitLessonRevision).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('يمنع double-submit بينما طلب الإرسال جارٍ', async () => {
    let resolveSubmit!: (
      value: Awaited<ReturnType<AuthoringService['submitLessonRevision']>>
    ) => void;
    const pending = new Promise<Awaited<ReturnType<AuthoringService['submitLessonRevision']>>>(
      (resolve) => {
        resolveSubmit = resolve;
      }
    );
    const submitLessonRevision = vi.fn(() => pending);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const authoring = service({ submitLessonRevision });

    render(
      <TeacherLessonEditor
        service={authoring}
        revision={revision(DRAFT_ID, 'draft')}
        onBack={vi.fn()}
      />
    );

    fireEvent.click(submitButton());
    fireEvent.click(submitButton());
    await waitFor(() => expect(submitLessonRevision).toHaveBeenCalledTimes(1));
    expect(submitButton()).toBeDisabled();

    resolveSubmit({ status: 'submitted', revisionId: DRAFT_ID });
    expect(
      await screen.findByText('هذه النسخة قيد المراجعة ولا يمكن تعديلها في مكانها.')
    ).toBeInTheDocument();
    confirm.mockRestore();
  });

  it('يمد مسار rejected من A إلى successor B ثم يحفظ ويرسل B ولا يرسل A أبدًا', async () => {
    const createLessonRevision = vi
      .fn<AuthoringService['createLessonRevision']>()
      .mockResolvedValue({
        status: 'created',
        revision: {
          id: SUCCESSOR_ID,
          entityId: null,
          revisionNumber: 2,
          baseFingerprint: null,
        },
      });
    const saveLessonRevision = vi.fn<AuthoringService['saveLessonRevision']>().mockResolvedValue({
      status: 'saved',
      revisionId: SUCCESSOR_ID,
    });
    const submitLessonRevision = vi
      .fn<AuthoringService['submitLessonRevision']>()
      .mockResolvedValue({
        status: 'submitted',
        revisionId: SUCCESSOR_ID,
      });
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const authoring = service({ createLessonRevision, saveLessonRevision, submitLessonRevision });

    render(
      <TeacherLessonEditor
        service={authoring}
        revision={revision(REJECTED_ID, 'rejected')}
        onBack={vi.fn()}
      />
    );

    changeTitle('نسخة B الأولى');
    fireEvent.click(saveButton());
    await waitFor(() => expect(createLessonRevision).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(SUCCESSOR_ID)).toBeInTheDocument();

    changeTitle('نسخة B بعد الحفظ');
    fireEvent.click(saveButton());
    await waitFor(() => expect(saveLessonRevision).toHaveBeenCalledTimes(1));
    expect(saveLessonRevision).toHaveBeenCalledWith(SUCCESSOR_ID, expect.anything(), {
      signal: expect.any(AbortSignal),
    });

    fireEvent.click(submitButton());
    await waitFor(() => expect(submitLessonRevision).toHaveBeenCalledTimes(1));
    expect(submitLessonRevision).toHaveBeenCalledWith(SUCCESSOR_ID, {
      signal: expect.any(AbortSignal),
    });
    expect(submitLessonRevision).not.toHaveBeenCalledWith(REJECTED_ID, expect.anything());
    expect(saveLessonRevision).not.toHaveBeenCalledWith(
      REJECTED_ID,
      expect.anything(),
      expect.anything()
    );
    confirm.mockRestore();
  });

  it.each([
    ['revision_not_submittable', 'لا يمكن إرسال هذه النسخة للمراجعة'],
    ['stale_revision', 'توجد نسخة أحدث من هذه المسودة'],
    ['not_authorized', 'لا تملك صلاحية تنفيذ هذه العملية'],
  ] as const)(
    'يبقي draft قابلة للتحرير عند رفض submit بسبب %s',
    async (reason, expectedMessage) => {
      const submitLessonRevision = vi
        .fn<AuthoringService['submitLessonRevision']>()
        .mockResolvedValue({
          status: 'rejected',
          reason,
        });
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const authoring = service({ submitLessonRevision });

      render(
        <TeacherLessonEditor
          service={authoring}
          revision={revision(DRAFT_ID, 'draft')}
          onBack={vi.fn()}
        />
      );

      fireEvent.click(submitButton());

      expect(await screen.findByRole('alert')).toHaveTextContent(expectedMessage);
      expect(screen.getByRole('textbox', { name: 'عنوان الدرس' })).toBeEnabled();
      expect(submitButton()).toBeEnabled();
      expect(submitLessonRevision).toHaveBeenCalledWith(DRAFT_ID, {
        signal: expect.any(AbortSignal),
      });
      confirm.mockRestore();
    }
  );
});
