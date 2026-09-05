import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { authorizeOperation } from '@services/auth/authorization.policy';
import type { AuthState } from '@services/auth/auth.types';
import type { AuthorizationState, UserRole } from '@services/auth/authorization.types';
import { createAuthoringService } from '@services/authoring/authoring.service';
import { createReviewService } from '@services/authoring/review.service';
import { createSupabaseAuthoringRepositories } from '@services/authoring/supabase-authoring.repositories';

import { buildLessonRevisionPayload, nextDisplayOrder } from './helpers/authoring-fixtures';
import {
  psqlAdmin,
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
} from './helpers/supabase-auth-fixtures';

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

function authenticated(identity: AuthIdentity): AuthState {
  return {
    status: 'authenticated',
    user: {
      id: identity.user.id,
      email: identity.user.email ?? null,
      emailConfirmedAt: identity.user.email_confirmed_at ?? null,
    },
    session: {
      expiresAt: null,
      user: {
        id: identity.user.id,
        email: identity.user.email ?? null,
        emailConfirmedAt: identity.user.email_confirmed_at ?? null,
      },
    },
  };
}

function authorized(identity: AuthIdentity, role: UserRole): AuthorizationState {
  return {
    status: 'authorized',
    profile: {
      id: identity.user.id,
      displayName: null,
      role,
      status: 'active',
      createdAt: '2026-08-07T00:00:00.000Z',
      updatedAt: '2026-08-07T00:00:00.000Z',
    },
  };
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

describeIntegration('Phase 3-2 authoring client layer composition', () => {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const payload = buildLessonRevisionPayload(runId, nextDisplayOrder(60));

  let fixtures: SupabaseAuthFixtures;
  let teacher: AuthIdentity;
  let reviewer: AuthIdentity;
  let student: AuthIdentity;
  let revisionId = '';
  let publishedEntityId = '';

  beforeAll(async () => {
    fixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());
    teacher = await fixtures.createIdentity('p32-client-teacher', 'teacher', 'active');
    reviewer = await fixtures.createIdentity('p32-client-reviewer', 'reviewer', 'active');
    student = await fixtures.createIdentity('p32-client-student', 'student', 'active');
  });

  afterAll(async () => {
    if (!fixtures) return;

    if (publishedEntityId) {
      psqlAdmin(`
        DELETE FROM public.experiment_objectives
      WHERE lesson_id = ${sqlLiteral(publishedEntityId)};
      DELETE FROM public.simulation_objectives
      WHERE lesson_id = ${sqlLiteral(publishedEntityId)};
      DELETE FROM public.inquiry_objectives
      WHERE lesson_id = ${sqlLiteral(publishedEntityId)};
      DELETE FROM public.data_activity_objectives
      WHERE lesson_id = ${sqlLiteral(publishedEntityId)};

      DELETE FROM public.game_objectives
        WHERE game_id IN (
          SELECT id FROM public.games WHERE lesson_id = ${sqlLiteral(publishedEntityId)}
        );
        DELETE FROM public.questions WHERE lesson_id = ${sqlLiteral(publishedEntityId)};
        DELETE FROM public.games WHERE lesson_id = ${sqlLiteral(publishedEntityId)};
        DELETE FROM public.experiments WHERE lesson_id = ${sqlLiteral(publishedEntityId)};
        DELETE FROM public.simulations
      WHERE lesson_id = ${sqlLiteral(publishedEntityId)};
      DELETE FROM public.inquiries
      WHERE lesson_id = ${sqlLiteral(publishedEntityId)};
      DELETE FROM public.data_activities
      WHERE lesson_id = ${sqlLiteral(publishedEntityId)};

      DELETE FROM public.objectives WHERE lesson_id = ${sqlLiteral(publishedEntityId)};
      `);
    }

    if (teacher) {
      psqlAdmin(`
        DELETE FROM public.content_review_events
        WHERE revision_id IN (
          SELECT id FROM public.content_revisions
          WHERE author_id = ${sqlLiteral(teacher.user.id)}::uuid
        );
        DELETE FROM public.content_revisions
        WHERE author_id = ${sqlLiteral(teacher.user.id)}::uuid;
      `);
    }

    if (publishedEntityId) {
      psqlAdmin(`DELETE FROM public.lessons WHERE id = ${sqlLiteral(publishedEntityId)};`);
    }

    await fixtures.cleanup();
  });

  it('يفعّل author_content للمعلم وreview_content للمراجع فقط', () => {
    expect(
      authorizeOperation(authenticated(teacher), authorized(teacher, 'teacher'), 'author_content')
    ).toEqual({ allowed: true, reason: 'allowed' });
    expect(
      authorizeOperation(
        authenticated(reviewer),
        authorized(reviewer, 'reviewer'),
        'review_content'
      )
    ).toEqual({ allowed: true, reason: 'allowed' });
    expect(
      authorizeOperation(authenticated(student), authorized(student, 'student'), 'author_content')
    ).toEqual({ allowed: false, reason: 'role_not_allowed' });
    expect(
      authorizeOperation(authenticated(student), authorized(student, 'student'), 'review_content')
    ).toEqual({ allowed: false, reason: 'role_not_allowed' });
  });

  it('يمر عبر Service وRepository من إنشاء المعلم حتى اعتماد المراجع', async () => {
    const teacherRepositories = createSupabaseAuthoringRepositories(teacher.client);
    const reviewerRepositories = createSupabaseAuthoringRepositories(reviewer.client);
    const authoring = createAuthoringService(teacherRepositories.authoring);
    const review = createReviewService(reviewerRepositories.review);

    const created = await authoring.createLessonRevision({ payload });
    expect(created.status).toBe('created');
    if (created.status !== 'created') throw new Error('Expected created revision');
    revisionId = created.revision.id;

    const teacherQueue = await authoring.listOwnRevisions();
    expect(teacherQueue.status).toBe('success');
    if (teacherQueue.status !== 'success') throw new Error('Expected teacher queue');
    expect(teacherQueue.revisions.some((revision) => revision.id === revisionId)).toBe(true);

    await expect(authoring.submitLessonRevision(revisionId)).resolves.toEqual({
      status: 'submitted',
      revisionId,
    });

    const pending = await review.listPendingRevisions();
    expect(pending.status).toBe('success');
    if (pending.status !== 'success') throw new Error('Expected reviewer queue');
    expect(pending.revisions.some((revision) => revision.id === revisionId)).toBe(true);

    const approved = await review.reviewLessonRevision({
      revisionId,
      decision: 'approve',
    });
    expect(approved.status).toBe('approved');
    if (approved.status !== 'approved') throw new Error('Expected approved revision');
    publishedEntityId = approved.publishedEntityId;

    const canonical = await fixtures.adminClient
      .from('lessons')
      .select('id,status,source')
      .eq('id', publishedEntityId)
      .single();

    expect(canonical.error).toBeNull();
    expect(canonical.data).toMatchObject({
      id: publishedEntityId,
      status: 'approved',
      source: 'teacher_authored',
    });
  });
});
