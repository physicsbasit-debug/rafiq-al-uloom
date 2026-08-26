import { afterAll, beforeAll, describe, expect, it } from 'vitest';

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

function uuidLiteral(id: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error(`Unexpected UUID: ${id}`);
  return `'${id}'::uuid`;
}

describeLive('Phase 4-3C live Gemini acceptance smoke', () => {
  let env: LocalSupabaseEnvironment;
  let fixtures: SupabaseAuthFixtures;
  let teacher: AuthIdentity;

  beforeAll(async () => {
    env = readLocalSupabaseEnvironment();
    fixtures = new SupabaseAuthFixtures(env);
    teacher = await fixtures.createIdentity('ai-live-gemini-teacher', 'teacher', 'active');
    psqlAdmin(
      `DELETE FROM private.ai_authoring_quota_state WHERE user_id = ${uuidLiteral(teacher.user.id)};`
    );
  });

  afterAll(async () => {
    await fixtures.cleanup();
  });

  it('يولّد هدفًا عربيًا فعليًا عبر Gemini من الخادم فقط', async () => {
    const response = await fetch(`${env.apiUrl}/functions/v1/ai-authoring-gateway`, {
      method: 'POST',
      headers: {
        apikey: env.publishableKey,
        authorization: `Bearer ${teacher.accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        target: 'objective',
        context: {
          language: 'ar',
          gradeLabel: 'الصف العاشر',
          subjectLabel: 'الفيزياء',
          unitTitle: 'الموجات',
          lessonTitle: 'الانعكاس',
        },
      }),
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.status).toBe('success');
    expect(body.target).toBe('objective');

    const suggestion = body.suggestion as Record<string, unknown>;
    expect(suggestion.kind).toBe('objective');
    expect(typeof suggestion.text).toBe('string');
    expect(String(suggestion.text).trim().length).toBeGreaterThan(0);

    const meta = body.meta as Record<string, unknown>;
    expect(meta.providerFamily).toBe('google_gemini');
    expect(meta.modelLabel).toBe('gemini-3.5-flash');
  }, 35_000);
});
