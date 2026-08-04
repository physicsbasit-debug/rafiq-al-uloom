import type { SupabaseClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ReadyAuthState } from '@services/auth/auth.types';
import type { AuthorizationState, UserRole } from '@services/auth/authorization.types';

import {
  createIsolatedSupabaseClient,
  psqlAdmin,
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
  type ProfileRecord,
} from './helpers/supabase-auth-fixtures';
import {
  createAuthCompositionHarness,
  type AuthCompositionHarness,
} from './helpers/auth-composition-harness';

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;
const activeRoles = ['student', 'teacher', 'reviewer'] as const;
type ActiveRole = (typeof activeRoles)[number];

const cloudGradeId = 'g10';

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlNullable(value: string | null): string {
  return value === null ? 'NULL' : sqlLiteral(value);
}

function restoreProfile(profile: ProfileRecord): void {
  psqlAdmin(`
    DELETE FROM public.profiles
    WHERE id = ${sqlLiteral(profile.id)};

    INSERT INTO public.profiles (
      id,
      display_name,
      role,
      status,
      created_at,
      updated_at
    ) VALUES (
      ${sqlLiteral(profile.id)},
      ${sqlNullable(profile.display_name)},
      ${sqlLiteral(profile.role)},
      ${sqlLiteral(profile.status)},
      ${sqlLiteral(profile.created_at)},
      ${sqlLiteral(profile.updated_at)}
    );
  `);
}

function expectAuthenticatedUser(state: ReadyAuthState, userId: string): void {
  expect(state.status).toBe('authenticated');
  if (state.status === 'authenticated') {
    expect(state.user.id).toBe(userId);
  }
}

function expectAuthorizedRole(
  state: AuthorizationState | null,
  userId: string,
  role: UserRole
): void {
  expect(state?.status).toBe('authorized');
  if (state?.status === 'authorized') {
    expect(state.profile).toMatchObject({ id: userId, role, status: 'active' });
  }
}

async function waitForInitialGuest(harness: AuthCompositionHarness): Promise<void> {
  const authState = await harness.waitForAuthState(
    (state) => state.status === 'guest',
    'initial guest Auth state'
  );
  const authorizationState = await harness.waitForAuthorizationState(
    (state) => state === null,
    'initial empty Authorization state'
  );

  expect(authState).toEqual({ status: 'guest' });
  expect(authorizationState).toBeNull();
}

async function signInAndWait(
  harness: AuthCompositionHarness,
  identity: AuthIdentity
): Promise<{ auth: ReadyAuthState; authorization: AuthorizationState | null }> {
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

  return { auth: authState, authorization: authorizationState };
}

async function readCloudGrade(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client.from('grades').select('id').eq('id', cloudGradeId);

  expect(error).toBeNull();
  return (data ?? []).map((row: { id: unknown }) => String(row.id));
}

async function signOutAndDispose(harness: AuthCompositionHarness): Promise<void> {
  try {
    await harness.auth.signOut();
  } finally {
    harness.dispose();
  }
}

describeIntegration(
  'Phase 2-C5-B real Supabase Auth composition',
  { concurrent: false },
  () => {
    let fixtures: SupabaseAuthFixtures;
    let activeByRole: Record<ActiveRole, AuthIdentity>;
    let pendingStudent: AuthIdentity;
    let suspendedStudent: AuthIdentity;
    let missingProfileStudent: AuthIdentity;

    beforeAll(async () => {
      fixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());

      const activeStudent = await fixtures.createIdentity(
        'c5b-active-student',
        'student',
        'active'
      );
      const activeTeacher = await fixtures.createIdentity(
        'c5b-active-teacher',
        'teacher',
        'active'
      );
      const activeReviewer = await fixtures.createIdentity(
        'c5b-active-reviewer',
        'reviewer',
        'active'
      );
      pendingStudent = await fixtures.createIdentity('c5b-pending-student');
      suspendedStudent = await fixtures.createIdentity(
        'c5b-suspended-student',
        'student',
        'suspended'
      );
      missingProfileStudent = await fixtures.createIdentity(
        'c5b-missing-profile',
        'student',
        'active'
      );

      activeByRole = {
        student: activeStudent,
        teacher: activeTeacher,
        reviewer: activeReviewer,
      };
    });

    afterAll(async () => {
      await fixtures.cleanup();
    });

    it('composes an empty Supabase session into guest Auth and null Authorization', async () => {
      const client = createIsolatedSupabaseClient(
        fixtures.env.apiUrl,
        fixtures.env.publishableKey
      );
      const harness = createAuthCompositionHarness(client);

      try {
        await waitForInitialGuest(harness);
      } finally {
        harness.dispose();
      }
    });

    it.each(activeRoles)(
      'composes a real active %s sign-in into authorized Profile and cloud catalog access',
      async (role: ActiveRole) => {
        const identity = activeByRole[role];
        const client = createIsolatedSupabaseClient(
          fixtures.env.apiUrl,
          fixtures.env.publishableKey
        );
        const harness = createAuthCompositionHarness(client);

        try {
          await waitForInitialGuest(harness);
          const states = await signInAndWait(harness, identity);

          expectAuthenticatedUser(states.auth, identity.user.id);
          expectAuthorizedRole(states.authorization, identity.user.id, role);
          expect(await readCloudGrade(client)).toEqual([cloudGradeId]);
        } finally {
          await signOutAndDispose(harness);
        }
      }
    );

    it('composes a real pending sign-in into pending Authorization and blocked content', async () => {
      const client = createIsolatedSupabaseClient(
        fixtures.env.apiUrl,
        fixtures.env.publishableKey
      );
      const harness = createAuthCompositionHarness(client);

      try {
        await waitForInitialGuest(harness);
        const states = await signInAndWait(harness, pendingStudent);

        expectAuthenticatedUser(states.auth, pendingStudent.user.id);
        expect(states.authorization?.status).toBe('pending');
        expect(await readCloudGrade(client)).toEqual([]);
      } finally {
        await signOutAndDispose(harness);
      }
    });

    it('composes a real suspended sign-in into suspended Authorization and blocked content', async () => {
      const client = createIsolatedSupabaseClient(
        fixtures.env.apiUrl,
        fixtures.env.publishableKey
      );
      const harness = createAuthCompositionHarness(client);

      try {
        await waitForInitialGuest(harness);
        const states = await signInAndWait(harness, suspendedStudent);

        expectAuthenticatedUser(states.auth, suspendedStudent.user.id);
        expect(states.authorization?.status).toBe('suspended');
        expect(await readCloudGrade(client)).toEqual([]);
      } finally {
        await signOutAndDispose(harness);
      }
    });

    it('composes a real sign-out into guest Auth and null Authorization', async () => {
      const identity = activeByRole.student;
      const client = createIsolatedSupabaseClient(
        fixtures.env.apiUrl,
        fixtures.env.publishableKey
      );
      const harness = createAuthCompositionHarness(client);

      try {
        await waitForInitialGuest(harness);
        await signInAndWait(harness, identity);

        const result = await harness.auth.signOut();
        expect(result).toEqual({ status: 'guest' });

        const authState = await harness.waitForAuthState(
          (state) => state.status === 'guest',
          'guest Auth state after sign-out'
        );
        const authorizationState = await harness.waitForAuthorizationState(
          (state) => state === null,
          'null Authorization after sign-out'
        );

        expect(authState).toEqual({ status: 'guest' });
        expect(authorizationState).toBeNull();
      } finally {
        harness.dispose();
      }
    });

    it('reports a missing Profile, blocks content, and recovers through explicit refresh', async () => {
      const originalProfile = await fixtures.readProfile(missingProfileStudent.user.id);
      const client = createIsolatedSupabaseClient(
        fixtures.env.apiUrl,
        fixtures.env.publishableKey
      );
      const harness = createAuthCompositionHarness(client);

      psqlAdmin(`
        DELETE FROM public.profiles
        WHERE id = ${sqlLiteral(missingProfileStudent.user.id)};
      `);

      try {
        await waitForInitialGuest(harness);
        const result = await harness.auth.signInWithPassword({
          email: missingProfileStudent.email,
          password: missingProfileStudent.password,
        });
        expect(result.status).toBe('authenticated');

        const authState = await harness.waitForAuthState(
          (state) =>
            state.status === 'authenticated' &&
            state.user.id === missingProfileStudent.user.id,
          'authenticated missing-profile user'
        );
        const profileError = await harness.waitForAuthorizationState(
          (state) => state?.status === 'profile_error',
          'missing Profile authorization error'
        );

        expectAuthenticatedUser(authState, missingProfileStudent.user.id);
        expect(profileError?.status).toBe('profile_error');
        expect(await readCloudGrade(client)).toEqual([]);

        restoreProfile(originalProfile);
        await harness.authorization.refreshAuthorization();

        const recovered = await harness.waitForAuthorizationState(
          (state) => state?.status === 'authorized',
          'recovered Authorization after Profile restore'
        );
        expectAuthorizedRole(recovered, missingProfileStudent.user.id, 'student');
        expect(await readCloudGrade(client)).toEqual([cloudGradeId]);
      } finally {
        try {
          restoreProfile(originalProfile);
        } finally {
          await signOutAndDispose(harness);
        }
      }
    });

    it('blocks the database immediately after active to suspended and synchronizes explicitly', async () => {
      const identity = activeByRole.student;
      const originalProfile = await fixtures.readProfile(identity.user.id);
      const client = createIsolatedSupabaseClient(
        fixtures.env.apiUrl,
        fixtures.env.publishableKey
      );
      const harness = createAuthCompositionHarness(client);
      let signedIn = false;

      try {
        await waitForInitialGuest(harness);
        const states = await signInAndWait(harness, identity);
        signedIn = true;
        expectAuthorizedRole(states.authorization, identity.user.id, 'student');
        expect(await readCloudGrade(client)).toEqual([cloudGradeId]);

        await fixtures.updateProfile(identity.user.id, { status: 'suspended' });

        expectAuthorizedRole(harness.getAuthorizationState() ?? null, identity.user.id, 'student');
        expect(await readCloudGrade(client)).toEqual([]);

        await harness.authorization.refreshAuthorization();
        const suspended = await harness.waitForAuthorizationState(
          (state) => state?.status === 'suspended',
          'suspended Authorization after explicit refresh'
        );
        expect(suspended?.status).toBe('suspended');
      } finally {
        try {
          await fixtures.updateProfile(identity.user.id, {
            display_name: originalProfile.display_name,
            role: originalProfile.role,
            status: originalProfile.status,
          });
          if (signedIn) {
            await harness.authorization.refreshAuthorization();
            await harness.waitForAuthorizationState(
              (state) => state?.status === 'authorized',
              'restored active Authorization'
            );
          }
        } finally {
          await signOutAndDispose(harness);
        }
      }
    });

    it('keeps the old role until explicit refresh and then reads the authoritative Profile role', async () => {
      const identity = activeByRole.student;
      const originalProfile = await fixtures.readProfile(identity.user.id);
      const client = createIsolatedSupabaseClient(
        fixtures.env.apiUrl,
        fixtures.env.publishableKey
      );
      const harness = createAuthCompositionHarness(client);
      let signedIn = false;

      try {
        await waitForInitialGuest(harness);
        const states = await signInAndWait(harness, identity);
        signedIn = true;
        expectAuthorizedRole(states.authorization, identity.user.id, 'student');

        await fixtures.updateProfile(identity.user.id, { role: 'teacher' });

        expectAuthorizedRole(harness.getAuthorizationState() ?? null, identity.user.id, 'student');

        await harness.authorization.refreshAuthorization();
        const refreshed = await harness.waitForAuthorizationState(
          (state) => state?.status === 'authorized' && state.profile.role === 'teacher',
          'teacher role after explicit refresh'
        );
        expectAuthorizedRole(refreshed, identity.user.id, 'teacher');
      } finally {
        try {
          await fixtures.updateProfile(identity.user.id, {
            display_name: originalProfile.display_name,
            role: originalProfile.role,
            status: originalProfile.status,
          });
          if (signedIn) {
            await harness.authorization.refreshAuthorization();
            await harness.waitForAuthorizationState(
              (state) => state?.status === 'authorized' && state.profile.role === 'student',
              'restored student role'
            );
          }
        } finally {
          await signOutAndDispose(harness);
        }
      }
    });

    it('switches real users on one client without retaining the previous Profile role', async () => {
      const first = activeByRole.student;
      const second = activeByRole.teacher;
      const client = createIsolatedSupabaseClient(
        fixtures.env.apiUrl,
        fixtures.env.publishableKey
      );
      const harness = createAuthCompositionHarness(client);

      try {
        await waitForInitialGuest(harness);
        const firstStates = await signInAndWait(harness, first);
        expectAuthorizedRole(firstStates.authorization, first.user.id, 'student');

        const signOutResult = await harness.auth.signOut();
        expect(signOutResult).toEqual({ status: 'guest' });
        await harness.waitForAuthorizationState(
          (state) => state === null,
          'cleared Authorization before switching users'
        );

        const secondStates = await signInAndWait(harness, second);
        expectAuthenticatedUser(secondStates.auth, second.user.id);
        expectAuthorizedRole(secondStates.authorization, second.user.id, 'teacher');
        expect(harness.getAuthorizationState()).not.toMatchObject({
          status: 'authorized',
          profile: { id: first.user.id },
        });
      } finally {
        await signOutAndDispose(harness);
      }
    });
  }
);
