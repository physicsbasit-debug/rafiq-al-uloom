import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
  type LocalSupabaseEnvironment,
} from './helpers/supabase-auth-fixtures';

describe('Phase 4-3A isolated production-like body limit', () => {
  let env: LocalSupabaseEnvironment;
  let fixtures: SupabaseAuthFixtures;
  let teacher: AuthIdentity;

  beforeAll(async () => {
    env = readLocalSupabaseEnvironment();
    fixtures = new SupabaseAuthFixtures(env);
    teacher = await fixtures.createIdentity('ai-gateway-body-limit', 'teacher', 'active');
  });

  afterAll(async () => {
    await fixtures.cleanup();
  });

  it('يرفض 41,168 بايت عبر Kong + verify_jwt + JWT معلم صالح', async () => {
    const payload = {
      target: 'lesson_summary',
      context: {
        language: 'ar',
        gradeLabel: 'الصف العاشر',
        subjectLabel: 'الفيزياء',
        unitTitle: 'الموجات',
        lessonTitle: 'الانعكاس',
        currentSummary: 'x'.repeat(40 * 1024),
      },
    };

    const body = JSON.stringify(payload);
    expect(new TextEncoder().encode(body).byteLength).toBe(41_168);

    const response = await fetch(`${env.apiUrl}/functions/v1/ai-authoring-gateway`, {
      method: 'POST',
      headers: {
        apikey: env.publishableKey,
        authorization: `Bearer ${teacher.accessToken}`,
        'content-type': 'application/json',
      },
      body,
      signal: AbortSignal.timeout(5_000),
    });

    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: 'request_too_large' });
  }, 7_000);
});
