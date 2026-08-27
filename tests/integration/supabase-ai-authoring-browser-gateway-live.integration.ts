import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { GatewayAiAuthoringProvider } from '@services/ai-authoring';

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

describeLive('Phase 4-3E browser adapter → Edge → live Gemini acceptance', () => {
  let env: LocalSupabaseEnvironment;
  let fixtures: SupabaseAuthFixtures;
  let teacher: AuthIdentity;

  beforeAll(async () => {
    env = readLocalSupabaseEnvironment();
    fixtures = new SupabaseAuthFixtures(env);
    teacher = await fixtures.createIdentity('ai-browser-live-teacher', 'teacher', 'active');

    psqlAdmin(
      `DELETE FROM private.ai_authoring_quota_state WHERE user_id = ${uuidLiteral(teacher.user.id)};`
    );
  });

  afterAll(async () => {
    await fixtures.cleanup();
  });

  it('يمر عبر مزود المتصفح الحقيقي إلى Edge وGemini بحصة واحدة فقط', async () => {
    let tokenReadCount = 0;

    const provider = new GatewayAiAuthoringProvider({
      gatewayUrl: `${env.apiUrl}/functions/v1/ai-authoring-gateway`,
      publicApiKey: env.publishableKey,
      getAccessToken: async () => {
        tokenReadCount += 1;

        const { data, error } = await teacher.client.auth.getSession();
        if (error) return null;

        return data.session?.access_token ?? null;
      },
    });

    const result = await provider.generate({
      target: 'objective',
      context: {
        language: 'ar',
        gradeLabel: 'الصف العاشر',
        subjectLabel: 'الفيزياء',
        unitTitle: 'الموجات',
        lessonTitle: 'الانعكاس',
      },
    });

    expect(tokenReadCount).toBe(1);
    expect(result.status).toBe('success');

    if (result.status !== 'success') {
      throw new Error(`Expected live success, received ${result.status}`);
    }

    expect(result.target).toBe('objective');
    expect(result.meta.target).toBe('objective');
    expect(result.meta.providerFamily).toBe('google_gemini');
    expect(result.meta.modelLabel).toBe('gemini-3.5-flash');
    expect(result.suggestion.kind).toBe('objective');

    if (result.suggestion.kind !== 'objective') {
      throw new Error(`Expected objective suggestion, received ${result.suggestion.kind}`);
    }

    expect(result.suggestion.text.trim().length).toBeGreaterThan(0);
    expect(/[\u0600-\u06FF]/u.test(result.suggestion.text)).toBe(true);

    const quota = psqlAdmin(
      `SELECT burst_count::text || ',' || daily_count::text
       FROM private.ai_authoring_quota_state
       WHERE user_id = ${uuidLiteral(teacher.user.id)};`
    );

    expect(quota).toBe('1,1');
  }, 35_000);
});
