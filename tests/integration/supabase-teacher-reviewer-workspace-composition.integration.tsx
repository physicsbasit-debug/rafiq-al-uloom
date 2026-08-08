// @vitest-environment jsdom

import type { SupabaseClient } from '@supabase/supabase-js';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ReviewerWorkspace } from '@features/reviewer/workspace/ReviewerWorkspace';
import { TeacherWorkspace } from '@features/teacher/workspace/TeacherWorkspace';
import type { ReadyAuthState } from '@services/auth/auth.types';
import { authorizeOperation } from '@services/auth/authorization.policy';
import type { AuthorizationState } from '@services/auth/authorization.types';
import {
  createAuthoringService,
  createReviewService,
  createSupabaseAuthoringRepositories,
  type AuthoringService,
  type ReviewService,
} from '@services/authoring';

import {
  buildLessonRevisionPayload,
  nextDisplayOrder,
} from './helpers/authoring-fixtures';
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
    target: { value: `Real first-save summary ${title}` },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'المفاهيم الأساسية' }), {
    target: { value: 'الموجة\nالسعة' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'الأمثلة' }), {
    target: { value: 'موجات الماء' },
  });
  fireEvent.change(screen.getByRole('textbox', { name: 'التصورات البديلة' }), {
    target: { value: 'كل الموجات مادية' },
  });
}

async function waitForFirstSaveOutcome(): Promise<void> {
  await waitFor(
    () => {
      const hasAlert = screen.queryByRole('alert') !== null;
      const hasNoWorkingRevision = screen.queryByText('لم تُنشأ بعد') !== null;
      expect(hasAlert || !hasNoWorkingRevision).toBe(true);
    },
    { timeout: 8_000 }
  );

  const alert = screen.queryByRole('alert');
  if (alert) {
    throw new Error(
      `PHASE_3_5A_FIRST_SAVE_BLOCKER: real TeacherWorkspace first save was rejected: ${alert.textContent ?? ''}`
    );
  }

  expect(screen.queryByText('لم تُنشأ بعد')).not.toBeInTheDocument();
}

function cleanupAuthoringRows(teacherId: string): void {
  const publishedRows = psqlAdmin(`
    SELECT COALESCE(string_agg(published_entity_id, E'\\n'), '')
    FROM public.content_revisions
    WHERE author_id = ${sqlLiteral(teacherId)}::uuid
      AND published_entity_id IS NOT NULL;
  `);

  const publishedIds = publishedRows
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);

  if (publishedIds.length > 0) {
    const publishedList = publishedIds.map(sqlLiteral).join(', ');
    psqlAdmin(`
      DELETE FROM public.game_objectives
      WHERE game_id IN (SELECT id FROM public.games WHERE lesson_id IN (${publishedList}));
      DELETE FROM public.questions WHERE lesson_id IN (${publishedList});
      DELETE FROM public.games WHERE lesson_id IN (${publishedList});
      DELETE FROM public.experiments WHERE lesson_id IN (${publishedList});
      DELETE FROM public.objectives WHERE lesson_id IN (${publishedList});
    `);
  }

  psqlAdmin(`
    DELETE FROM public.content_review_events
    WHERE revision_id IN (
      SELECT id FROM public.content_revisions
      WHERE author_id = ${sqlLiteral(teacherId)}::uuid
    );
    DELETE FROM public.content_revisions
    WHERE author_id = ${sqlLiteral(teacherId)}::uuid;
  `);

  if (publishedIds.length > 0) {
    const publishedList = publishedIds.map(sqlLiteral).join(', ');
    psqlAdmin(`DELETE FROM public.lessons WHERE id IN (${publishedList});`);
  }
}

describeIntegration(
  'Phase 3-5A real Supabase teacher/reviewer workspace composition',
  { concurrent: false },
  () => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    let fixtures: SupabaseAuthFixtures;
    let activeStudent: AuthIdentity;
    let activeTeacher: AuthIdentity;
    let activeReviewer: AuthIdentity;
    let pendingTeacher: AuthIdentity;
    let suspendedReviewer: AuthIdentity;

    beforeAll(
      async () => {
        fixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());
        activeStudent = await fixtures.createIdentity('p35a-active-student', 'student', 'active');
        activeTeacher = await fixtures.createIdentity('p35a-active-teacher', 'teacher', 'active');
        activeReviewer = await fixtures.createIdentity(
          'p35a-active-reviewer',
          'reviewer',
          'active'
        );
        pendingTeacher = await fixtures.createIdentity('p35a-pending-teacher', 'teacher', 'pending');
        suspendedReviewer = await fixtures.createIdentity(
          'p35a-suspended-reviewer',
          'reviewer',
          'suspended'
        );
      },
      30_000
    );

    afterEach(() => {
      cleanup();
      vi.restoreAllMocks();
    });

    afterAll(
      async () => {
        if (!fixtures) return;
        if (activeTeacher?.user.id) cleanupAuthoringRows(activeTeacher.user.id);
        await fixtures.cleanup();
      },
      30_000
    );

    it(
      'يثبت مصفوفة الوصول الحقيقية بعد تسجيل دخول Supabase وقراءة Profile الفعلية',
      async () => {
        const cases = [
          {
            identity: activeStudent,
            teacher: { allowed: false, reason: 'role_not_allowed' },
            reviewer: { allowed: false, reason: 'role_not_allowed' },
          },
          {
            identity: activeTeacher,
            teacher: { allowed: true, reason: 'allowed' },
            reviewer: { allowed: false, reason: 'role_not_allowed' },
          },
          {
            identity: activeReviewer,
            teacher: { allowed: false, reason: 'role_not_allowed' },
            reviewer: { allowed: true, reason: 'allowed' },
          },
          {
            identity: pendingTeacher,
            teacher: { allowed: false, reason: 'account_pending' },
            reviewer: { allowed: false, reason: 'account_pending' },
          },
          {
            identity: suspendedReviewer,
            teacher: { allowed: false, reason: 'account_suspended' },
            reviewer: { allowed: false, reason: 'account_suspended' },
          },
        ] as const;

        for (const testCase of cases) {
          const session = await signInRealIdentity(fixtures, testCase.identity);
          try {
            expect(
              authorizeOperation(
                session.authState,
                session.authorizationState,
                'access_teacher_workspace'
              )
            ).toEqual(testCase.teacher);
            expect(
              authorizeOperation(
                session.authState,
                session.authorizationState,
                'access_reviewer_workspace'
              )
            ).toEqual(testCase.reviewer);
          } finally {
            await closeRealSession(session);
          }
        }
      },
      30_000
    );

    it(
      'يجب أن ينشئ أول حفظ من TeacherWorkspace الجديدة مسودة خادمية حقيقية',
      async () => {
        const session = await signInRealIdentity(fixtures, activeTeacher);
        const { authoring } = servicesFor(session.client);
        const title = `Phase 3-5A first-save ${runId}`;

        try {
          expect(
            authorizeOperation(
              session.authState,
              session.authorizationState,
              'access_teacher_workspace'
            )
          ).toEqual({ allowed: true, reason: 'allowed' });

          render(<TeacherWorkspace service={authoring} />);
          expect(
            await screen.findByText('لا توجد لديك مسودات بعد. ابدأ بإنشاء درس جديد.', {}, { timeout: 8_000 })
          ).toBeInTheDocument();

          fireEvent.click(screen.getByRole('button', { name: 'إنشاء درس جديد' }));
          fillNewLessonMetadata(title, nextDisplayOrder(30));
          fireEvent.click(screen.getByRole('button', { name: 'حفظ المسودة' }));

          await waitForFirstSaveOutcome();

          const revisions = await authoring.listOwnRevisions();
          expect(revisions.status).toBe('success');
          if (revisions.status !== 'success') throw new Error('Expected real teacher revision list.');

          const created = revisions.revisions.find((revision) => revision.payload.lesson.title === title);
          expect(created).toMatchObject({
            status: 'draft',
            authorId: activeTeacher.user.id,
          });
        } finally {
          await closeRealSession(session);
        }
      },
      30_000
    );

    it(
      'يمرر مسودة صالحة عبر واجهتي المعلم والمراجع: حفظ وإرسال ورفض ثم successor واعتماد',
      async () => {
        const teacherSession = await signInRealIdentity(fixtures, activeTeacher);
        const reviewerSession = await signInRealIdentity(fixtures, activeReviewer);
        const teacherServices = servicesFor(teacherSession.client);
        const reviewerServices = servicesFor(reviewerSession.client);
        const title = `Phase 3-5A lifecycle ${runId}`;
        const initialPayload = buildLessonRevisionPayload(runId, nextDisplayOrder(40), title);
        const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

        try {
          const created = await teacherServices.authoring.createLessonRevision({
            payload: initialPayload,
          });
          expect(created.status).toBe('created');
          if (created.status !== 'created') throw new Error('Expected valid real draft creation.');
          const revisionA = created.revision.id;

          const teacherView = render(<TeacherWorkspace service={teacherServices.authoring} />);
          fireEvent.click(
            await screen.findByRole('button', { name: new RegExp(title) }, { timeout: 8_000 })
          );
          fireEvent.change(screen.getByRole('textbox', { name: 'ملخص الدرس' }), {
            target: { value: `Saved through real TeacherWorkspace ${runId}` },
          });
          fireEvent.click(screen.getByRole('button', { name: 'حفظ المسودة' }));
          await waitFor(
            () => expect(screen.getByRole('button', { name: 'إرسال للمراجعة' })).toBeEnabled(),
            { timeout: 8_000 }
          );
          fireEvent.click(screen.getByRole('button', { name: 'إرسال للمراجعة' }));
          expect(
            await screen.findByText(
              'هذه النسخة قيد المراجعة ولا يمكن تعديلها في مكانها.',
              {},
              { timeout: 8_000 }
            )
          ).toBeInTheDocument();
          teacherView.unmount();

          const reviewerViewA = render(<ReviewerWorkspace service={reviewerServices.review} />);
          fireEvent.click(
            await screen.findByRole('button', { name: new RegExp(title) }, { timeout: 8_000 })
          );
          fireEvent.change(screen.getByLabelText('ملاحظة الرفض'), {
            target: { value: 'وضّح التفسير قبل الاعتماد.' },
          });
          fireEvent.click(screen.getByRole('button', { name: 'رفض وإعادة للتعديل' }));
          expect(
            await screen.findByText('تم رفض النسخة وإعادتها للتعديل بنجاح.', {}, { timeout: 8_000 })
          ).toBeInTheDocument();
          reviewerViewA.unmount();

          const teacherViewRejected = render(<TeacherWorkspace service={teacherServices.authoring} />);
          fireEvent.click(
            await screen.findByRole('button', { name: new RegExp(title) }, { timeout: 8_000 })
          );
          expect(await screen.findByText('تعديل نسخة مرفوضة')).toBeInTheDocument();
          expect(screen.getByText(revisionA)).toBeInTheDocument();
          expect(screen.getByText('لم تُنشأ بعد')).toBeInTheDocument();

          fireEvent.change(screen.getByRole('textbox', { name: 'ملخص الدرس' }), {
            target: { value: `Successor through real TeacherWorkspace ${runId}` },
          });
          fireEvent.click(screen.getByRole('button', { name: 'حفظ المسودة' }));
          await waitFor(
            () => expect(screen.queryByText('لم تُنشأ بعد')).not.toBeInTheDocument(),
            { timeout: 8_000 }
          );

          const afterSuccessorSave = await teacherServices.authoring.listOwnRevisions();
          expect(afterSuccessorSave.status).toBe('success');
          if (afterSuccessorSave.status !== 'success') {
            throw new Error('Expected real teacher revisions after successor save.');
          }
          const revisionB = afterSuccessorSave.revisions.find(
            (revision) => revision.supersedesRevisionId === revisionA
          );
          const originalA = afterSuccessorSave.revisions.find((revision) => revision.id === revisionA);
          expect(originalA?.status).toBe('rejected');
          expect(revisionB).toMatchObject({ status: 'draft', supersedesRevisionId: revisionA });
          if (!revisionB) throw new Error('Expected successor revision B.');
          expect(revisionB.id).not.toBe(revisionA);

          await waitFor(
            () => expect(screen.getByRole('button', { name: 'إرسال للمراجعة' })).toBeEnabled(),
            { timeout: 8_000 }
          );
          fireEvent.click(screen.getByRole('button', { name: 'إرسال للمراجعة' }));
          expect(
            await screen.findByText(
              'هذه النسخة قيد المراجعة ولا يمكن تعديلها في مكانها.',
              {},
              { timeout: 8_000 }
            )
          ).toBeInTheDocument();
          teacherViewRejected.unmount();

          const reviewerViewB = render(<ReviewerWorkspace service={reviewerServices.review} />);
          fireEvent.click(
            await screen.findByRole('button', { name: new RegExp(title) }, { timeout: 8_000 })
          );
          fireEvent.click(screen.getByRole('button', { name: 'اعتماد النسخة' }));
          expect(
            await screen.findByText('تم اعتماد النسخة بنجاح.', {}, { timeout: 8_000 })
          ).toBeInTheDocument();
          reviewerViewB.unmount();

          const finalRevisions = await teacherServices.authoring.listOwnRevisions();
          expect(finalRevisions.status).toBe('success');
          if (finalRevisions.status !== 'success') throw new Error('Expected final real revision list.');
          const finalA = finalRevisions.revisions.find((revision) => revision.id === revisionA);
          const finalB = finalRevisions.revisions.find((revision) => revision.id === revisionB.id);
          expect(finalA?.status).toBe('rejected');
          expect(finalA?.publishedEntityId).toBeNull();
          expect(finalB).toMatchObject({
            status: 'approved',
            supersedesRevisionId: revisionA,
          });
          expect(finalB?.publishedEntityId).toBeTruthy();

          const publishedEntityId = finalB?.publishedEntityId;
          if (!publishedEntityId) throw new Error('Expected approved revision B to publish a lesson.');
          const published = await activeStudent.client
            .from('lessons')
            .select('id, title, status, source')
            .eq('id', publishedEntityId)
            .single();
          expect(published.error).toBeNull();
          expect(published.data).toMatchObject({
            id: publishedEntityId,
            title,
            status: 'approved',
            source: 'teacher_authored',
          });
          expect(confirm).toHaveBeenCalled();
        } finally {
          await closeRealSession(reviewerSession);
          await closeRealSession(teacherSession);
        }
      },
      45_000
    );
  }
);
