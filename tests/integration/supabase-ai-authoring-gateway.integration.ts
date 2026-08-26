import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  psqlAdmin,
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
  type LocalSupabaseEnvironment,
} from './helpers/supabase-auth-fixtures';

const integrationEnabled = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = integrationEnabled ? describe : describe.skip;

type JsonRecord = Record<string, unknown>;

function lessonContext() {
  return {
    language: 'ar',
    gradeLabel: 'الصف العاشر',
    subjectLabel: 'الفيزياء',
    unitTitle: 'الموجات',
    lessonTitle: 'الانعكاس',
  } as const;
}

function uuidLiteral(id: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error(`Unexpected fixture UUID: ${id}`);
  }
  return `'${id}'::uuid`;
}

describeIntegration('Supabase AI authoring gateway 4-3C boundary', () => {
  let env: LocalSupabaseEnvironment;
  let fixtures: SupabaseAuthFixtures;
  let teacher: AuthIdentity;
  let student: AuthIdentity;
  let reviewer: AuthIdentity;
  let pendingTeacher: AuthIdentity;
  let suspendedTeacher: AuthIdentity;

  beforeAll(async () => {
    env = readLocalSupabaseEnvironment();
    fixtures = new SupabaseAuthFixtures(env);

    [teacher, student, reviewer, pendingTeacher, suspendedTeacher] = await Promise.all([
      fixtures.createIdentity('ai-gateway-teacher', 'teacher', 'active'),
      fixtures.createIdentity('ai-gateway-student', 'student', 'active'),
      fixtures.createIdentity('ai-gateway-reviewer', 'reviewer', 'active'),
      fixtures.createIdentity('ai-gateway-pending', 'teacher', 'pending'),
      fixtures.createIdentity('ai-gateway-suspended', 'teacher', 'suspended'),
    ]);
  });

  beforeEach(() => {
    const ids = [teacher, student, reviewer, pendingTeacher, suspendedTeacher]
      .map((identity) => uuidLiteral(identity.user.id))
      .join(', ');

    psqlAdmin(`DELETE FROM private.ai_authoring_quota_state WHERE user_id IN (${ids});`);
  });

  afterAll(async () => {
    await fixtures.cleanup();
  });

  async function invoke(
    identity: AuthIdentity | null,
    body: unknown,
    init: {
      readonly method?: string;
      readonly rawBody?: string;
      readonly contentType?: string;
    } = {}
  ): Promise<Response> {
    return fetch(`${env.apiUrl}/functions/v1/ai-authoring-gateway`, {
      method: init.method ?? 'POST',
      headers: {
        apikey: env.publishableKey,
        ...(identity ? { authorization: `Bearer ${identity.accessToken}` } : {}),
        'content-type': init.contentType ?? 'application/json',
      },
      body: (init.method ?? 'POST') === 'GET' ? undefined : (init.rawBody ?? JSON.stringify(body)),
    });
  }

  async function readJson(response: Response): Promise<JsonRecord> {
    return (await response.json()) as JsonRecord;
  }

  it('يرفض الطالب والمراجع والمعلم pending أو suspended قبل أي provider', async () => {
    const request = { target: 'objective', context: lessonContext() };

    for (const identity of [student, reviewer, pendingTeacher, suspendedTeacher]) {
      const response = await invoke(identity, request);
      expect(response.status).toBe(403);
      expect(await readJson(response)).toEqual({ error: 'forbidden' });
    }
  });

  it('يرفض الطلب بلا جلسة عند platform verify_jwt', async () => {
    const response = await invoke(null, { target: 'objective', context: lessonContext() });
    expect(response.status).toBe(401);
  });

  it('يرفض الحقول الزائدة عبر validator المشترك نفسه', async () => {
    const response = await invoke(teacher, {
      target: 'objective',
      context: lessonContext(),
      rawPrompt: 'لا ينبغي قبول هذا الحقل',
    });

    expect(response.status).toBe(400);
    const body = await readJson(response);
    expect(body.status).toBe('rejected');
    expect(body.reason).toBe('invalid_request');
    expect(body.requestReason).toBe('unexpected_request_fields');
  });

  it('لا تستهلك الطلبات غير الصالحة quota ولا تصل للمزوّد', async () => {
    for (let index = 0; index < 8; index += 1) {
      const invalid = await invoke(teacher, {
        target: 'objective',
        context: lessonContext(),
        rawPrompt: `invalid-${index}`,
      });
      expect(invalid.status).toBe(400);
    }

    const count = psqlAdmin(
      `SELECT count(*) FROM private.ai_authoring_quota_state WHERE user_id = ${uuidLiteral(teacher.user.id)};`
    );
    expect(count).toBe('0');
  });

  it('يعيد 429 وRetry-After قبل provider عندما تكون quota مستنفدة', async () => {
    const userId = uuidLiteral(teacher.user.id);
    psqlAdmin(`
      INSERT INTO private.ai_authoring_quota_state (
        user_id, burst_window_started_at, burst_count,
        daily_window_started_at, daily_count, updated_at
      ) VALUES (
        ${userId}, clock_timestamp(), 6,
        date_trunc('day', clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC', 6,
        clock_timestamp()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        burst_window_started_at = EXCLUDED.burst_window_started_at,
        burst_count = 6,
        daily_window_started_at = EXCLUDED.daily_window_started_at,
        daily_count = 6,
        updated_at = EXCLUDED.updated_at;
    `);

    const response = await invoke(teacher, {
      target: 'objective',
      context: lessonContext(),
    });
    expect(response.status).toBe(429);

    const body = await readJson(response);
    expect(body.error).toBe('rate_limited');
    expect(body.limitReason).toBe('burst');
    expect(body.remainingBurst).toBe(0);
    expect(body.remainingDaily).toBe(74);

    const retryAfter = Number(response.headers.get('retry-after'));
    expect(Number.isInteger(retryAfter)).toBe(true);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it('يرفض target غير صالح عند حد HTTP دون اختراع target مزيف', async () => {
    const response = await invoke(teacher, {
      target: 'generate_full_lesson',
      context: lessonContext(),
    });

    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({ error: 'invalid_request' });
  });

  it('يرفض method وcontent-type غير الصحيحين', async () => {
    const getResponse = await invoke(teacher, null, { method: 'GET' });
    expect(getResponse.status).toBe(405);

    const contentTypeResponse = await invoke(
      teacher,
      { target: 'objective', context: lessonContext() },
      { contentType: 'text/plain' }
    );
    expect(contentTypeResponse.status).toBe(415);
  });

  it('يرفض JSON غير صالح بعد المصادقة دون إسقاط الخادم', async () => {
    const response = await invoke(teacher, null, { rawBody: '{bad-json' });
    expect(response.status).toBe(400);
    expect(await readJson(response)).toEqual({ error: 'invalid_json' });
  });
});
