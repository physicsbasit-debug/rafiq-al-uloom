// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import type { SupabaseClient } from '@supabase/supabase-js';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ReviewerWorkspace } from '@features/reviewer/workspace/ReviewerWorkspace';
import { TeacherLessonEditor } from '@features/teacher/workspace/TeacherLessonEditor';
import { TeacherWorkspace } from '@features/teacher/workspace/TeacherWorkspace';
import { DeterministicAiAuthoringProvider } from '@services/ai-authoring';
import type { ReadyAuthState } from '@services/auth/auth.types';
import type { AuthorizationState } from '@services/auth/authorization.types';
import {
  createAuthoringService,
  createReviewService,
  createSupabaseAuthoringRepositories,
  type AuthoringService,
  type LessonRevisionPayload,
  type ReviewService,
} from '@services/authoring';

import { buildLessonRevisionPayload, nextDisplayOrder } from './helpers/authoring-fixtures';
import {
  createAuthCompositionHarness,
  type AuthCompositionHarness,
} from './helpers/auth-composition-harness';
import {
  createIsolatedSupabaseClient,
  psqlAdmin,
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
} from './helpers/supabase-auth-fixtures';

const aiProvider = new DeterministicAiAuthoringProvider();

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

type RealSession = {
  readonly client: SupabaseClient;
  readonly harness: AuthCompositionHarness;
  readonly authState: ReadyAuthState;
  readonly authorizationState: AuthorizationState | null;
};

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

async function signInRealIdentity(
  fixtures: SupabaseAuthFixtures,
  identity: AuthIdentity
): Promise<RealSession> {
  const client = createIsolatedSupabaseClient(fixtures.env.apiUrl, fixtures.env.publishableKey);
  const harness = createAuthCompositionHarness(client);

  await harness.waitForAuthState((state) => state.status === 'guest', 'initial guest Auth state');
  await harness.waitForAuthorizationState(
    (state) => state === null,
    'initial empty Authorization state'
  );

  const result = await harness.auth.signInWithPassword({
    email: identity.email,
    password: identity.password,
  });
  expect(result.status).toBe('authenticated');

  const authState = await harness.waitForAuthState(
    (state) => state.status === 'authenticated' && state.user.id === identity.user.id,
    `authenticated Auth state for ${identity.user.id}`
  );
  const authorizationState = await harness.waitForAuthorizationState(
    (state) =>
      state !== null &&
      state.status !== 'loading_profile' &&
      'profile' in state &&
      state.profile.id === identity.user.id,
    `resolved Authorization state for ${identity.user.id}`
  );

  return { client, harness, authState, authorizationState };
}

async function closeRealSession(session: RealSession): Promise<void> {
  try {
    await session.harness.auth.signOut();
  } finally {
    session.harness.dispose();
  }
}

function servicesFor(client: SupabaseClient): {
  readonly authoring: AuthoringService;
  readonly review: ReviewService;
} {
  const repositories = createSupabaseAuthoringRepositories(client);
  return {
    authoring: createAuthoringService(repositories.authoring),
    review: createReviewService(repositories.review),
  };
}

function cleanupAuthoringRows(teacherId: string): void {
  psqlAdmin(`
    DELETE FROM public.content_review_events
    WHERE revision_id IN (
      SELECT id FROM public.content_revisions
      WHERE author_id = ${sqlLiteral(teacherId)}::uuid
    );
    DELETE FROM public.content_revisions
    WHERE author_id = ${sqlLiteral(teacherId)}::uuid;
  `);
}

function fillNewLessonMetadata(title: string, displayOrder: number): void {
  fireEvent.change(screen.getByRole('textbox', { name: 'معرف الوحدة' }), {
    target: { value: 'g10-phy-waves-unit' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'عنوان الدرس' }), {
    target: { value: title },
  });
  fireEvent.change(screen.getByRole('spinbutton', { name: 'ترتيب العرض' }), {
    target: { value: String(displayOrder) },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'ملخص الدرس' }), {
    target: { value: `Fix 2B-3 real UI ${title}` },
  });
}

function addObjective(text: string): void {
  fireEvent.click(screen.getByRole('button', { name: 'إضافة هدف' }));
  fireEvent.change(screen.getByRole('textbox', { name: 'نص هدف التعلم' }), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole('button', { name: 'إضافة الهدف' }));
}

function fillMasteryQuestion(objectiveKey: string): void {
  fireEvent.click(screen.getByRole('button', { name: 'إضافة سؤال' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'غرض السؤال' }), {
    target: { value: 'mastery' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'نص السؤال' }), {
    target: { value: 'أي وصف يطابق انعكاس الموجة؟' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'الاختيار 1' }), {
    target: { value: 'ارتدادها عن حاجز' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'الاختيار 2' }), {
    target: { value: 'اختفاء ترددها' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'الإجابة الصحيحة' }), {
    target: { value: '0' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'شرح الإجابة' }), {
    target: { value: 'الانعكاس هو ارتداد الموجة عند مقابلة حاجز مناسب.' },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'الهدف المرتبط بالسؤال' }), {
    target: { value: objectiveKey },
  });
  fireEvent.change(screen.getByRole('combobox', { name: 'صعوبة السؤال' }), {
    target: { value: 'hard' },
  });
}

function objectiveOnlyPayload(runId: string, displayOrder: number): LessonRevisionPayload {
  const complete = buildLessonRevisionPayload(`${runId}-objective-only`, displayOrder);
  return { ...complete, questions: [], games: [], experiments: [] };
}

function reviewOnlyPayload(runId: string, displayOrder: number): LessonRevisionPayload {
  const complete = buildLessonRevisionPayload(`${runId}-review-only`, displayOrder);
  return {
    ...complete,
    questions: complete.questions.filter((question) => question.purpose === 'review'),
    games: [],
    experiments: [],
  };
}

describeIntegration(
  'Phase 3-5A Fix 2B-3 real submission readiness composition',
  { concurrent: false },
  () => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    let fixtures: SupabaseAuthFixtures;
    let teacher: AuthIdentity;
    let reviewer: AuthIdentity;

    beforeAll(async () => {
      fixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());
      teacher = await fixtures.createIdentity('p35a-fix2b3-teacher', 'teacher', 'active');
      reviewer = await fixtures.createIdentity('p35a-fix2b3-reviewer', 'reviewer', 'active');
    }, 30_000);

    afterEach(() => {
      cleanup();
      vi.restoreAllMocks();
    });

    afterAll(async () => {
      if (!fixtures) return;
      if (teacher?.user.id) cleanupAuthoringRows(teacher.user.id);
      await fixtures.cleanup();
    }, 30_000);

    it('يثبت parity لحالة objective-only: الواجهة تمنع Submit والخادم الحقيقي يرفضها', async () => {
      const session = await signInRealIdentity(fixtures, teacher);
      const { authoring } = servicesFor(session.client);
      try {
        const created = await authoring.createLessonRevision({
          payload: objectiveOnlyPayload(runId, nextDisplayOrder(70)),
        });
        expect(created.status).toBe('created');
        if (created.status !== 'created')
          throw new Error('Expected objective-only draft creation.');

        const listed = await authoring.listOwnRevisions();
        expect(listed.status).toBe('success');
        if (listed.status !== 'success') throw new Error('Expected real revision list.');
        const revision = listed.revisions.find((item) => item.id === created.revision.id);
        if (!revision) throw new Error('Expected objective-only revision.');

        render(<TeacherLessonEditor service={authoring} revision={revision} onBack={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'إرسال للمراجعة' })).toBeDisabled();
        expect(screen.getByText('أضف سؤالًا واحدًا على الأقل.')).toBeInTheDocument();
        expect(
          screen.getByText('يجب أن يتضمن الدرس سؤال إتقان واحدًا على الأقل.')
        ).toBeInTheDocument();

        const submitted = await authoring.submitLessonRevision(revision.id);
        expect(submitted).toEqual({ status: 'rejected', reason: 'invalid_payload' });
      } finally {
        await closeRealSession(session);
      }
    }, 30_000);

    it('يثبت parity لحالة review-only: الواجهة والخادم يتفقان على ضرورة mastery', async () => {
      const session = await signInRealIdentity(fixtures, teacher);
      const { authoring } = servicesFor(session.client);
      try {
        const created = await authoring.createLessonRevision({
          payload: reviewOnlyPayload(runId, nextDisplayOrder(75)),
        });
        expect(created.status).toBe('created');
        if (created.status !== 'created') throw new Error('Expected review-only draft creation.');

        const listed = await authoring.listOwnRevisions();
        expect(listed.status).toBe('success');
        if (listed.status !== 'success') throw new Error('Expected real revision list.');
        const revision = listed.revisions.find((item) => item.id === created.revision.id);
        if (!revision) throw new Error('Expected review-only revision.');

        render(<TeacherLessonEditor service={authoring} revision={revision} onBack={vi.fn()} />);
        expect(screen.getByRole('button', { name: 'إرسال للمراجعة' })).toBeDisabled();
        expect(screen.queryByText('أضف سؤالًا واحدًا على الأقل.')).not.toBeInTheDocument();
        expect(
          screen.getByText('يجب أن يتضمن الدرس سؤال إتقان واحدًا على الأقل.')
        ).toBeInTheDocument();

        const submitted = await authoring.submitLessonRevision(revision.id);
        expect(submitted).toEqual({ status: 'rejected', reason: 'invalid_payload' });
      } finally {
        await closeRealSession(session);
      }
    }, 30_000);

    it('يمرر سؤال mastery أُعيد ربطه من UI إلى Supabase ثم pending_review ونفس revision في ReviewerWorkspace', async () => {
      const teacherSession = await signInRealIdentity(fixtures, teacher);
      const reviewerSession = await signInRealIdentity(fixtures, reviewer);
      const teacherServices = servicesFor(teacherSession.client);
      const reviewerServices = servicesFor(reviewerSession.client);
      const title = `Phase 3-5A Fix 2B-3 relink ${runId}`;
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

      try {
        const teacherView = render(
          <TeacherWorkspace aiProvider={aiProvider} service={teacherServices.authoring} />
        );
        await screen.findByRole('heading', { name: 'مساحة المعلم' }, { timeout: 8_000 });
        fireEvent.click(screen.getByRole('button', { name: 'إنشاء درس جديد' }));
        fillNewLessonMetadata(title, nextDisplayOrder(80));

        addObjective('Objective A سيُحذف قبل تطبيق السؤال');
        addObjective('Objective B هو الرابط النهائي');
        fillMasteryQuestion('teacher-objective-1');

        fireEvent.click(screen.getByRole('button', { name: 'حذف الهدف 1' }));
        expect(screen.getByRole('group', { name: 'إضافة سؤال' })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'الهدف المرتبط بالسؤال' })).toHaveValue('');
        expect(screen.getByRole('textbox', { name: 'نص السؤال' })).toHaveValue(
          'أي وصف يطابق انعكاس الموجة؟'
        );
        expect(screen.getByRole('button', { name: 'إضافة السؤال' })).toBeDisabled();

        fireEvent.change(screen.getByRole('combobox', { name: 'الهدف المرتبط بالسؤال' }), {
          target: { value: 'teacher-objective-2' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'إضافة السؤال' }));

        expect(screen.getByText('المحتوى مكتمل للإرسال.')).toBeInTheDocument();
        expect(screen.getByText('احفظ التغييرات قبل الإرسال للمراجعة.')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'إرسال للمراجعة' })).toBeDisabled();

        fireEvent.click(screen.getByRole('button', { name: 'حفظ المسودة' }));
        await waitFor(
          () => expect(screen.getByRole('button', { name: 'إرسال للمراجعة' })).toBeEnabled(),
          { timeout: 8_000 }
        );

        const listed = await teacherServices.authoring.listOwnRevisions();
        expect(listed.status).toBe('success');
        if (listed.status !== 'success')
          throw new Error('Expected teacher revision list after save.');
        const persisted = listed.revisions.find(
          (revision) => revision.payload.lesson.title === title
        );
        if (!persisted) throw new Error('Expected UI-built relinked revision.');

        expect(persisted.status).toBe('draft');
        expect(persisted.payload.objectives).toEqual([
          { key: 'teacher-objective-2', text: 'Objective B هو الرابط النهائي' },
        ]);
        expect(persisted.payload.questions).toEqual([
          expect.objectContaining({
            key: 'teacher-question-1',
            purpose: 'mastery',
            objectiveKey: 'teacher-objective-2',
            difficulty: 'hard',
          }),
        ]);

        fireEvent.click(screen.getByRole('button', { name: 'إرسال للمراجعة' }));
        expect(
          await screen.findByText(
            'هذه النسخة قيد المراجعة ولا يمكن تعديلها في مكانها.',
            {},
            { timeout: 8_000 }
          )
        ).toBeInTheDocument();
        teacherView.unmount();

        const pending = await reviewerServices.review.listPendingRevisions();
        expect(pending.status).toBe('success');
        if (pending.status !== 'success') throw new Error('Expected reviewer pending list.');
        expect(pending.revisions.some((revision) => revision.id === persisted.id)).toBe(true);

        const onOpenRevision = vi.fn();
        render(
          <ReviewerWorkspace service={reviewerServices.review} onOpenRevision={onOpenRevision} />
        );
        const card = await screen.findByRole(
          'button',
          { name: new RegExp(title) },
          { timeout: 8_000 }
        );
        fireEvent.click(card);
        expect(onOpenRevision).toHaveBeenCalledWith(expect.objectContaining({ id: persisted.id }));
        expect(confirm).toHaveBeenCalledTimes(1);
      } finally {
        await closeRealSession(reviewerSession);
        await closeRealSession(teacherSession);
      }
    }, 45_000);
  }
);
