import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  psqlAdmin,
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
} from './helpers/supabase-auth-fixtures';

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

function expectPermissionDenied(error: { code?: string; message?: string } | null): void {
  expect(error).not.toBeNull();
  expect(error?.code).toBe('42501');
  expect(error?.message?.toLowerCase()).toContain('permission denied');
}

describeIntegration('Phase 2-C2-A profiles and authorization RLS', () => {
  let fixtures: SupabaseAuthFixtures;
  let pendingStudent: AuthIdentity;
  let activeStudent: AuthIdentity;
  let activeTeacher: AuthIdentity;
  let activeReviewer: AuthIdentity;
  let suspendedStudent: AuthIdentity;

  beforeAll(async () => {
    fixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());
    pendingStudent = await fixtures.createIdentity('pending-student');
    activeStudent = await fixtures.createIdentity('active-student', 'student', 'active');
    activeTeacher = await fixtures.createIdentity('active-teacher', 'teacher', 'active');
    activeReviewer = await fixtures.createIdentity('active-reviewer', 'reviewer', 'active');
    suspendedStudent = await fixtures.createIdentity('suspended-student', 'student', 'suspended');
  });

  afterAll(async () => {
    await fixtures.cleanup();
  });

  it('creates exactly one pending student profile for a new auth user', async () => {
    const profile = await fixtures.readProfile(pendingStudent.user.id);

    expect(profile).toMatchObject({
      id: pendingStudent.user.id,
      display_name: null,
      role: 'student',
      status: 'pending',
    });
    expect(
      Number(
        psqlAdmin(
          `SELECT count(*) FROM public.profiles WHERE id = '${pendingStudent.user.id}'::uuid;`
        )
      )
    ).toBe(1);
  });

  it('allows an authenticated user to read only their own profile', async () => {
    const ownResult = await pendingStudent.client
      .from('profiles')
      .select('id, role, status')
      .eq('id', pendingStudent.user.id);
    const otherResult = await pendingStudent.client
      .from('profiles')
      .select('id, role, status')
      .eq('id', activeStudent.user.id);

    expect(ownResult.error).toBeNull();
    expect(ownResult.data).toEqual([
      { id: pendingStudent.user.id, role: 'student', status: 'pending' },
    ]);
    expect(otherResult.error).toBeNull();
    expect(otherResult.data).toEqual([]);
  });

  it('denies anon access to profiles at the table privilege layer', async () => {
    const { error } = await fixtures.anonymousClient.from('profiles').select('id');
    expectPermissionDenied(error);
  });

  it('denies authenticated profile inserts with SQLSTATE 42501', async () => {
    const { error } = await pendingStudent.client.from('profiles').insert({
      id: pendingStudent.user.id,
      role: 'student',
      status: 'pending',
    });
    expectPermissionDenied(error);
  });

  it('denies authenticated display_name updates with SQLSTATE 42501', async () => {
    const before = await fixtures.readProfile(pendingStudent.user.id);
    const { error } = await pendingStudent.client
      .from('profiles')
      .update({ display_name: 'غير مسموح' })
      .eq('id', pendingStudent.user.id);

    expectPermissionDenied(error);
    expect(await fixtures.readProfile(pendingStudent.user.id)).toEqual(before);
  });

  it('denies authenticated role updates with SQLSTATE 42501', async () => {
    const before = await fixtures.readProfile(pendingStudent.user.id);
    const { error } = await pendingStudent.client
      .from('profiles')
      .update({ role: 'reviewer' })
      .eq('id', pendingStudent.user.id);

    expectPermissionDenied(error);
    expect(await fixtures.readProfile(pendingStudent.user.id)).toEqual(before);
  });

  it('denies authenticated status updates with SQLSTATE 42501', async () => {
    const before = await fixtures.readProfile(pendingStudent.user.id);
    const { error } = await pendingStudent.client
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', pendingStudent.user.id);

    expectPermissionDenied(error);
    expect(await fixtures.readProfile(pendingStudent.user.id)).toEqual(before);
  });

  it('denies authenticated profile deletes with SQLSTATE 42501', async () => {
    const { error } = await pendingStudent.client
      .from('profiles')
      .delete()
      .eq('id', pendingStudent.user.id);

    expectPermissionDenied(error);
    expect((await fixtures.readProfile(pendingStudent.user.id)).id).toBe(pendingStudent.user.id);
  });

  it('allows service_role to update role and status and restores the fixture in finally', async () => {
    const original = await fixtures.readProfile(pendingStudent.user.id);

    try {
      const changed = await fixtures.updateProfile(pendingStudent.user.id, {
        role: 'teacher',
        status: 'active',
      });
      expect(changed).toMatchObject({ role: 'teacher', status: 'active' });
    } finally {
      await fixtures.updateProfile(pendingStudent.user.id, {
        display_name: original.display_name,
        role: original.role,
        status: original.status,
      });
    }

    expect(await fixtures.readProfile(pendingStudent.user.id)).toMatchObject({
      display_name: original.display_name,
      role: original.role,
      status: original.status,
    });
  });

  it('denies service_role INSERT and DELETE on profiles at the table privilege layer', async () => {
    const insertResult = await fixtures.adminClient.from('profiles').insert({
      id: '00000000-0000-0000-0000-000000000001',
      role: 'student',
      status: 'pending',
    });
    const deleteResult = await fixtures.adminClient
      .from('profiles')
      .delete()
      .eq('id', pendingStudent.user.id);

    expectPermissionDenied(insertResult.error);
    expectPermissionDenied(deleteResult.error);
    expect((await fixtures.readProfile(pendingStudent.user.id)).id).toBe(pendingStudent.user.id);
  });

  it('rejects invalid role and status values through named CHECK constraints', async () => {
    const invalidRole = await fixtures.adminClient
      .from('profiles')
      .update({ role: 'admin' })
      .eq('id', pendingStudent.user.id);
    const invalidStatus = await fixtures.adminClient
      .from('profiles')
      .update({ status: 'enabled' })
      .eq('id', pendingStudent.user.id);

    expect(invalidRole.error?.code).toBe('23514');
    expect(invalidRole.error?.message).toContain('profiles_role_check');
    expect(invalidStatus.error?.code).toBe('23514');
    expect(invalidStatus.error?.message).toContain('profiles_status_check');
  });

  it('cascades profile deletion when the auth user is deleted', async () => {
    const temporary = await fixtures.createIdentity('cascade-user');
    expect((await fixtures.readProfile(temporary.user.id)).id).toBe(temporary.user.id);

    await fixtures.deleteUser(temporary.user.id);

    const { data, error } = await fixtures.adminClient
      .from('profiles')
      .select('id')
      .eq('id', temporary.user.id);
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('rolls back auth.users when profile creation fails and leaves zero orphans', async () => {
    const sentinelEmail = 'c2-atomicity-sentinel@example.com';
    const functionName = 'public.fail_profile_insert_for_c2_atomicity_test';
    const triggerName = 'fail_profile_insert_for_c2_atomicity_test';
    let unexpectedUserId: string | null = null;

    psqlAdmin(`
      DROP TRIGGER IF EXISTS ${triggerName} ON public.profiles;
      DROP FUNCTION IF EXISTS ${functionName}();
      DELETE FROM auth.users WHERE email = '${sentinelEmail}';

      CREATE OR REPLACE FUNCTION ${functionName}()
      RETURNS trigger
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = ''
      AS $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM auth.users
          WHERE id = NEW.id
            AND email = '${sentinelEmail}'
        ) THEN
          RAISE EXCEPTION 'Phase 2-C2-A atomicity sentinel';
        END IF;
        RETURN NEW;
      END;
      $$;

      CREATE TRIGGER ${triggerName}
      BEFORE INSERT ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION ${functionName}();
    `);

    try {
      const { data, error } = await fixtures.adminClient.auth.admin.createUser({
        email: sentinelEmail,
        password: 'Rafiq-C2-Atomicity-A9!',
        email_confirm: true,
      });

      unexpectedUserId = data.user?.id ?? null;
      expect(error).not.toBeNull();
      expect(data.user).toBeNull();
      expect(
        Number(psqlAdmin(`SELECT count(*) FROM auth.users WHERE email = '${sentinelEmail}';`))
      ).toBe(0);
      expect(
        Number(
          psqlAdmin(`
            SELECT count(*)
            FROM public.profiles p
            JOIN auth.users au ON au.id = p.id
            WHERE au.email = '${sentinelEmail}';
          `)
        )
      ).toBe(0);
    } finally {
      psqlAdmin(`
        DROP TRIGGER IF EXISTS ${triggerName} ON public.profiles;
        DROP FUNCTION IF EXISTS ${functionName}();
      `);
      if (unexpectedUserId) {
        await fixtures.deleteUser(unexpectedUserId);
      }
    }

    expect(
      Number(
        psqlAdmin(`
          SELECT count(*)
          FROM auth.users au
          LEFT JOIN public.profiles p ON p.id = au.id
          WHERE p.id IS NULL;
        `)
      )
    ).toBe(0);
  });

  it('denies cloud content to anon, pending, and suspended identities', async () => {
    const anon = await fixtures.anonymousClient.from('grades').select('id');
    const pending = await pendingStudent.client.from('grades').select('id');
    const suspended = await suspendedStudent.client.from('grades').select('id');

    expectPermissionDenied(anon.error);
    expect(pending.error).toBeNull();
    expect(pending.data).toEqual([]);
    expect(suspended.error).toBeNull();
    expect(suspended.data).toEqual([]);
  });

  it('allows active roles to read catalog rows but not draft lessons', async () => {
    for (const identity of [activeStudent, activeTeacher, activeReviewer]) {
      const grades = await identity.client.from('grades').select('id');
      const lessons = await identity.client.from('lessons').select('id');

      expect(grades.error).toBeNull();
      expect(grades.data?.length).toBeGreaterThan(0);
      expect(lessons.error).toBeNull();
      expect(lessons.data).toEqual([]);
    }
  });

  it('allows every active role to read approved lesson content and restores seed state', async () => {
    const lessonId = 'g10-phy-waves-l1';

    psqlAdmin(`
      UPDATE public.lessons SET status = 'approved' WHERE id = '${lessonId}';
      UPDATE public.questions SET status = 'approved' WHERE lesson_id = '${lessonId}';
      UPDATE public.games SET status = 'approved' WHERE lesson_id = '${lessonId}';
      UPDATE public.experiments SET status = 'approved' WHERE lesson_id = '${lessonId}';
    `);

    try {
      for (const identity of [activeStudent, activeTeacher, activeReviewer]) {
        const lesson = await identity.client.from('lessons').select('id').eq('id', lessonId);
        const objectives = await identity.client
          .from('objectives')
          .select('id')
          .eq('lesson_id', lessonId);
        const questions = await identity.client
          .from('questions')
          .select('id')
          .eq('lesson_id', lessonId);
        const games = await identity.client
          .from('games')
          .select('id')
          .eq('lesson_id', lessonId);
        const experiments = await identity.client
          .from('experiments')
          .select('id')
          .eq('lesson_id', lessonId);
        const gameObjectives = await identity.client
          .from('game_objectives')
          .select('game_id, objective_id')
          .eq('game_id', 'l1-game');

        for (const result of [lesson, objectives, questions, games, experiments, gameObjectives]) {
          expect(result.error).toBeNull();
          expect(result.data?.length).toBeGreaterThan(0);
        }
      }

      for (const identity of [pendingStudent, suspendedStudent]) {
        const lesson = await identity.client.from('lessons').select('id').eq('id', lessonId);
        expect(lesson.error).toBeNull();
        expect(lesson.data).toEqual([]);
      }
    } finally {
      psqlAdmin(`
        UPDATE public.lessons SET status = 'draft' WHERE id = '${lessonId}';
        UPDATE public.questions SET status = 'draft' WHERE lesson_id = '${lessonId}';
        UPDATE public.games SET status = 'draft' WHERE lesson_id = '${lessonId}';
        UPDATE public.experiments SET status = 'draft' WHERE lesson_id = '${lessonId}';
      `);
    }
  });

  it('preserves service_role content reads for the existing B3c parity contract', async () => {
    const grades = await fixtures.adminClient.from('grades').select('id');
    const lessons = await fixtures.adminClient.from('lessons').select('id');

    expect(grades.error).toBeNull();
    expect(grades.data).toHaveLength(1);
    expect(lessons.error).toBeNull();
    expect(lessons.data).toHaveLength(4);
  });
});
