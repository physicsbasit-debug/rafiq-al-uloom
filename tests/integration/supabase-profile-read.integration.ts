import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createProfileService } from '@services/auth/profile.service';

import {
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
} from './helpers/supabase-auth-fixtures';

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration('Phase 2-C2-B profile client read layer', () => {
  let fixtures: SupabaseAuthFixtures;
  let activeStudent: AuthIdentity;
  let activeTeacher: AuthIdentity;

  beforeAll(async () => {
    fixtures = new SupabaseAuthFixtures(readLocalSupabaseEnvironment());
    activeStudent = await fixtures.createIdentity(
      'profile-read-student',
      'student',
      'active'
    );
    activeTeacher = await fixtures.createIdentity(
      'profile-read-teacher',
      'teacher',
      'active'
    );
  });

  afterAll(async () => {
    await fixtures.cleanup();
  });

  it('reads the signed-in user profile through the production ProfileService', async () => {
    const service = createProfileService(activeStudent.client);

    await expect(service.getUserProfile(activeStudent.user.id)).resolves.toEqual({
      status: 'success',
      profile: expect.objectContaining({
        id: activeStudent.user.id,
        role: 'student',
        status: 'active',
      }),
    });
  });

  it('returns missing_profile when RLS hides another user profile', async () => {
    const service = createProfileService(activeStudent.client);

    await expect(service.getUserProfile(activeTeacher.user.id)).resolves.toEqual({
      status: 'error',
      error: {
        code: 'missing_profile',
        message: 'تعذر العثور على ملف المستخدم.',
      },
    });
  });
});
