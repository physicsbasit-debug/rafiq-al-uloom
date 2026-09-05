// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TeacherLessonEditor } from '@features/teacher/workspace/TeacherLessonEditor';
import type { AuthoringService, LessonRevision, LessonRevisionPayload } from '@services/authoring';

const DRAFT_ID = '00000000-0000-4000-8000-000000002b30';
const objective = { key: 'obj-1', text: 'يفسر انعكاس الموجات' } as const;
const masteryQuestion: LessonRevisionPayload['questions'][number] = {
  key: 'q-mastery',
  purpose: 'mastery',
  type: 'multiple_choice',
  prompt: 'ماذا يحدث للموجة عند الحاجز؟',
  choices: ['تنعكس', 'تختفي'],
  correctAnswerIndex: 0,
  explanation: 'تنعكس الموجة عن الحاجز.',
  objectiveKey: objective.key,
  difficulty: 'medium',
};

function makePayload(overrides: Partial<LessonRevisionPayload> = {}): LessonRevisionPayload {
  return {
    lesson: {
      unitId: 'g10-phy-waves-unit',
      title: 'انعكاس الموجات',
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
    simulations: [],
    inquiries: [],
    dataActivities: [],
    ...overrides,
  };
}

function revision(
  payload: LessonRevisionPayload,
  status: LessonRevision['status'] = 'draft'
): LessonRevision {
  return {
    id: DRAFT_ID,
    entityType: 'lesson',
    entityId: null,
    publishedEntityId: null,
    supersedesRevisionId: null,
    authorId: 'server-owned-author',
    status,
    payload,
    baseFingerprint: null,
    revisionNumber: 1,
    createdAt: '2026-08-10T12:00:00.000Z',
    updatedAt: '2026-08-10T12:00:00.000Z',
    submittedAt: status === 'draft' ? null : '2026-08-10T12:05:00.000Z',
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

function saveButton() {
  return screen.getByRole('button', { name: /حفظ المسودة|جارٍ الحفظ/ });
}

function submitButton() {
  return screen.getByRole('button', { name: /إرسال للمراجعة|جارٍ الإرسال/ });
}

function dirtyTitle(): void {
  fireEvent.change(screen.getByRole('textbox', { name: 'عنوان الدرس' }), {
    target: { value: 'انعكاس الموجات - تعديل محلي' },
  });
}

describe('TeacherLessonEditor submission readiness', () => {
  it('لا يسرّب Content Readiness إلى Save في المسودة الفارغة', () => {
    render(<TeacherLessonEditor service={service()} onBack={vi.fn()} />);

    expect(submitButton()).toBeDisabled();
    expect(screen.getByText('أضف هدفًا تعليميًا واحدًا على الأقل.')).toBeInTheDocument();
    expect(screen.getByText('أضف سؤالًا واحدًا على الأقل.')).toBeInTheDocument();
    expect(screen.getByText('يجب أن يتضمن الدرس سؤال إتقان واحدًا على الأقل.')).toBeInTheDocument();

    dirtyTitle();
    expect(saveButton()).toBeEnabled();
    expect(submitButton()).toBeDisabled();
  });

  it('يبقي objective-only قابلة للحفظ وغير قابلة للإرسال', () => {
    render(
      <TeacherLessonEditor
        service={service()}
        revision={revision(makePayload({ objectives: [objective] }))}
        onBack={vi.fn()}
      />
    );

    expect(submitButton()).toBeDisabled();
    expect(screen.getByText('أضف سؤالًا واحدًا على الأقل.')).toBeInTheDocument();
    expect(screen.getByText('يجب أن يتضمن الدرس سؤال إتقان واحدًا على الأقل.')).toBeInTheDocument();
    dirtyTitle();
    expect(saveButton()).toBeEnabled();
  });

  it('يبقي review-only قابلة للحفظ ويطلب mastery فقط للإرسال', () => {
    const reviewQuestion = { ...masteryQuestion, key: 'q-review', purpose: 'review' as const };
    render(
      <TeacherLessonEditor
        service={service()}
        revision={revision(makePayload({ objectives: [objective], questions: [reviewQuestion] }))}
        onBack={vi.fn()}
      />
    );

    expect(submitButton()).toBeDisabled();
    expect(screen.queryByText('أضف سؤالًا واحدًا على الأقل.')).not.toBeInTheDocument();
    expect(screen.getByText('يجب أن يتضمن الدرس سؤال إتقان واحدًا على الأقل.')).toBeInTheDocument();
    dirtyTitle();
    expect(saveButton()).toBeEnabled();
  });

  it('يفصل complete content عن Submit Action: dirty يمنع الإرسال حتى الحفظ الناجح', async () => {
    const saveLessonRevision = vi.fn<AuthoringService['saveLessonRevision']>().mockResolvedValue({
      status: 'saved',
      revisionId: DRAFT_ID,
    });
    const authoring = service({ saveLessonRevision });
    render(
      <TeacherLessonEditor
        service={authoring}
        revision={revision(makePayload({ objectives: [objective], questions: [masteryQuestion] }))}
        onBack={vi.fn()}
      />
    );

    expect(screen.getByText('المحتوى مكتمل للإرسال.')).toBeInTheDocument();
    expect(submitButton()).toBeEnabled();

    dirtyTitle();
    expect(screen.getByText('احفظ التغييرات قبل الإرسال للمراجعة.')).toBeInTheDocument();
    expect(submitButton()).toBeDisabled();
    expect(saveButton()).toBeEnabled();

    fireEvent.click(saveButton());
    await waitFor(() => expect(saveLessonRevision).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(submitButton()).toBeEnabled());
  });

  it.each(['pending_review', 'approved'] as const)(
    'يبقي %s readonly بلا أزرار mutation',
    (status) => {
      render(
        <TeacherLessonEditor
          service={service()}
          revision={revision(
            makePayload({ objectives: [objective], questions: [masteryQuestion] }),
            status
          )}
          onBack={vi.fn()}
        />
      );

      expect(screen.queryByRole('button', { name: 'حفظ المسودة' })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'إرسال للمراجعة' })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'جاهزية الإرسال' })).not.toBeInTheDocument();
    }
  );
});
