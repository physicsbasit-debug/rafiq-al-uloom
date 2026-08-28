// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { ReviewerWorkspace } from '@features/reviewer/workspace/ReviewerWorkspace';
import { TeacherWorkspace } from '@features/teacher/workspace/TeacherWorkspace';
import { GatewayAiAuthoringProvider } from '@services/ai-authoring';
import {
  createAuthoringService,
  createReviewService,
  createSupabaseAuthoringRepositories,
} from '@services/authoring';
import { createSupabaseContentRepository } from '@services/data/supabase-content.repository';

import { buildLessonRevisionPayload, nextDisplayOrder } from './helpers/authoring-fixtures';
import {
  psqlAdmin,
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
  type LocalSupabaseEnvironment,
} from './helpers/supabase-auth-fixtures';

const liveEnabled =
  process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true' &&
  process.env.RUN_LIVE_GEMINI_TESTS === 'true';

const describeLive = liveEnabled ? describe : describe.skip;

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function uuidLiteral(id: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error(`Unexpected UUID: ${id}`);
  }

  return `'${id}'::uuid`;
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
      WHERE game_id IN (
        SELECT id FROM public.games
        WHERE lesson_id IN (${publishedList})
      );

      DELETE FROM public.questions
      WHERE lesson_id IN (${publishedList});

      DELETE FROM public.games
      WHERE lesson_id IN (${publishedList});

      DELETE FROM public.experiments
      WHERE lesson_id IN (${publishedList});

      DELETE FROM public.objectives
      WHERE lesson_id IN (${publishedList});
    `);
  }

  psqlAdmin(`
    DELETE FROM public.content_review_events
    WHERE revision_id IN (
      SELECT id
      FROM public.content_revisions
      WHERE author_id = ${sqlLiteral(teacherId)}::uuid
    );

    DELETE FROM public.content_revisions
    WHERE author_id = ${sqlLiteral(teacherId)}::uuid;
  `);

  if (publishedIds.length > 0) {
    const publishedList = publishedIds.map(sqlLiteral).join(', ');

    psqlAdmin(`
      DELETE FROM public.lessons
      WHERE id IN (${publishedList});
    `);
  }
}

describeLive(
  'Phase 4-6 real AI acceptance → authoring → reviewer → publication composition',
  () => {
    const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    let env: LocalSupabaseEnvironment;
    let fixtures: SupabaseAuthFixtures;
    let teacher: AuthIdentity;
    let reviewer: AuthIdentity;

    beforeAll(async () => {
      env = readLocalSupabaseEnvironment();
      fixtures = new SupabaseAuthFixtures(env);

      teacher = await fixtures.createIdentity('p46-live-composition-teacher', 'teacher', 'active');

      reviewer = await fixtures.createIdentity(
        'p46-live-composition-reviewer',
        'reviewer',
        'active'
      );

      psqlAdmin(`
        DELETE FROM private.ai_authoring_quota_state
        WHERE user_id = ${uuidLiteral(teacher.user.id)};
      `);
    }, 30_000);

    afterEach(() => {
      cleanup();
      vi.restoreAllMocks();
    });

    afterAll(async () => {
      if (!fixtures) return;

      if (teacher?.user.id) {
        cleanupAuthoringRows(teacher.user.id);

        psqlAdmin(`
          DELETE FROM private.ai_authoring_quota_state
          WHERE user_id = ${uuidLiteral(teacher.user.id)};
        `);
      }

      await fixtures.cleanup();
    }, 30_000);

    it('يحفظ اقتراح Gemini المقبول ثم يرسله للمراجعة وينشر الهدف نفسه دون AI write bypass', async () => {
      const teacherRepositories = createSupabaseAuthoringRepositories(teacher.client);
      const reviewerRepositories = createSupabaseAuthoringRepositories(reviewer.client);

      const authoring = createAuthoringService(teacherRepositories.authoring);
      const review = createReviewService(reviewerRepositories.review);
      const contentRepository = createSupabaseContentRepository(teacher.client);

      const title = `اختبار تركيب الذكاء ${runId}`;
      const initialPayload = buildLessonRevisionPayload(runId, nextDisplayOrder(60), title);

      const created = await authoring.createLessonRevision({
        payload: initialPayload,
      });

      expect(created.status).toBe('created');

      if (created.status !== 'created') {
        throw new Error('Expected real draft creation before AI composition.');
      }

      const revisionId = created.revision.id;

      let tokenReadCount = 0;

      const aiProvider = new GatewayAiAuthoringProvider({
        gatewayUrl: `${env.apiUrl}/functions/v1/ai-authoring-gateway`,
        publicApiKey: env.publishableKey,
        getAccessToken: async () => {
          tokenReadCount += 1;

          const { data, error } = await teacher.client.auth.getSession();

          if (error) return null;

          return data.session?.access_token ?? null;
        },
      });

      const teacherView = render(
        <TeacherWorkspace
          aiProvider={aiProvider}
          service={authoring}
          contentRepository={contentRepository}
        />
      );

      fireEvent.click(
        await screen.findByRole('button', { name: new RegExp(title) }, { timeout: 8_000 })
      );

      fireEvent.click(
        screen.getByRole('button', {
          name: 'تعديل الهدف 1',
        })
      );

      const originalObjective = (
        screen.getByRole('textbox', {
          name: 'نص هدف التعلم',
        }) as HTMLInputElement
      ).value;

      const requestButton = screen.getByRole('button', {
        name: 'اقترح هدفًا',
      });

      await waitFor(() => expect(requestButton).toBeEnabled(), {
        timeout: 8_000,
      });

      fireEvent.click(requestButton);

      await screen.findByRole('button', { name: 'استخدام الاقتراح' }, { timeout: 35_000 });

      fireEvent.click(
        screen.getByRole('button', {
          name: 'استخدام الاقتراح',
        })
      );

      const acceptedObjective = (
        screen.getByRole('textbox', {
          name: 'نص هدف التعلم',
        }) as HTMLInputElement
      ).value.trim();

      expect(acceptedObjective.length).toBeGreaterThan(0);
      expect(acceptedObjective).not.toBe(originalObjective);
      expect(/[\u0600-\u06FF]/u.test(acceptedObjective)).toBe(true);

      fireEvent.click(
        screen.getByRole('button', {
          name: 'حفظ تعديل الهدف',
        })
      );

      fireEvent.click(
        screen.getByRole('button', {
          name: 'حفظ المسودة',
        })
      );

      await waitFor(
        async () => {
          const revisions = await authoring.listOwnRevisions();

          expect(revisions.status).toBe('success');

          if (revisions.status !== 'success') {
            throw new Error('Expected real revision list after AI save.');
          }

          const saved = revisions.revisions.find((revision) => revision.id === revisionId);

          expect(saved?.payload.objectives[0]?.text).toBe(acceptedObjective);
        },
        { timeout: 10_000 }
      );

      const submitButton = screen.getByRole('button', {
        name: 'إرسال للمراجعة',
      });

      await waitFor(() => expect(submitButton).toBeEnabled(), {
        timeout: 8_000,
      });

      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

      fireEvent.click(submitButton);

      expect(
        await screen.findByText(
          'هذه النسخة قيد المراجعة ولا يمكن تعديلها في مكانها.',
          {},
          { timeout: 8_000 }
        )
      ).toBeInTheDocument();

      expect(confirm).toHaveBeenCalled();

      teacherView.unmount();

      const reviewerView = render(<ReviewerWorkspace service={review} />);

      fireEvent.click(
        await screen.findByRole('button', { name: new RegExp(title) }, { timeout: 8_000 })
      );

      fireEvent.click(
        screen.getByRole('button', {
          name: 'اعتماد النسخة',
        })
      );

      expect(
        await screen.findByText('تم اعتماد النسخة بنجاح.', {}, { timeout: 8_000 })
      ).toBeInTheDocument();

      reviewerView.unmount();

      const finalRevisions = await authoring.listOwnRevisions();

      expect(finalRevisions.status).toBe('success');

      if (finalRevisions.status !== 'success') {
        throw new Error('Expected final revision list after approval.');
      }

      const finalRevision = finalRevisions.revisions.find((revision) => revision.id === revisionId);

      expect(finalRevision?.status).toBe('approved');
      expect(finalRevision?.publishedEntityId).toBeTruthy();

      const publishedEntityId = finalRevision?.publishedEntityId;

      if (!publishedEntityId) {
        throw new Error('Expected approved revision to publish a lesson.');
      }

      const publishedObjectives = await teacher.client
        .from('objectives')
        .select('text')
        .eq('lesson_id', publishedEntityId);

      expect(publishedObjectives.error).toBeNull();

      expect(
        publishedObjectives.data?.some((objective) => objective.text === acceptedObjective)
      ).toBe(true);

      const quota = psqlAdmin(`
          SELECT burst_count::text || ',' || daily_count::text
          FROM private.ai_authoring_quota_state
          WHERE user_id = ${uuidLiteral(teacher.user.id)};
        `);

      expect(quota).toBe('1,1');
      expect(tokenReadCount).toBe(1);
    }, 60_000);
  }
);
