import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  psqlAdmin,
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
  type AuthIdentity,
  type LocalSupabaseEnvironment,
} from './helpers/supabase-auth-fixtures';

const integrationEnabled = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = integrationEnabled ? describe : describe.skip;

type QuotaRow = {
  allowed: boolean;
  remaining_burst: number | null;
  remaining_daily: number | null;
  retry_after_seconds: number | null;
  limit_reason: 'burst' | 'daily' | 'burst_and_daily' | 'unauthorized' | null;
};

type StoredQuotaState = {
  burst_count: number;
  daily_count: number;
  burst_window_started_at: string;
  daily_window_started_at: string;
};

function uuidLiteral(id: string): string {
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw new Error(`Unexpected fixture UUID: ${id}`);
  }
  return `'${id}'::uuid`;
}

function resetQuotaState(userId: string): void {
  psqlAdmin(`DELETE FROM private.ai_authoring_quota_state WHERE user_id = ${uuidLiteral(userId)};`);
}

function readQuotaState(userId: string): StoredQuotaState | null {
  const output = psqlAdmin(`
    SELECT COALESCE(
      (
        SELECT json_build_object(
          'burst_count', burst_count,
          'daily_count', daily_count,
          'burst_window_started_at', burst_window_started_at,
          'daily_window_started_at', daily_window_started_at
        )::text
        FROM private.ai_authoring_quota_state
        WHERE user_id = ${uuidLiteral(userId)}
      ),
      'null'
    );
  `);

  return JSON.parse(output) as StoredQuotaState | null;
}

function setQuotaState(
  userId: string,
  values: {
    burstStartedSql: string;
    burstCount: number;
    dailyStartedSql: string;
    dailyCount: number;
  }
): void {
  psqlAdmin(`
    INSERT INTO private.ai_authoring_quota_state (
      user_id,
      burst_window_started_at,
      burst_count,
      daily_window_started_at,
      daily_count,
      updated_at
    )
    VALUES (
      ${uuidLiteral(userId)},
      ${values.burstStartedSql},
      ${values.burstCount},
      ${values.dailyStartedSql},
      ${values.dailyCount},
      clock_timestamp()
    )
    ON CONFLICT (user_id) DO UPDATE
    SET
      burst_window_started_at = EXCLUDED.burst_window_started_at,
      burst_count = EXCLUDED.burst_count,
      daily_window_started_at = EXCLUDED.daily_window_started_at,
      daily_count = EXCLUDED.daily_count,
      updated_at = EXCLUDED.updated_at;
  `);
}

async function consume(identity: AuthIdentity): Promise<QuotaRow> {
  const { data, error } = await identity.client.rpc('consume_ai_authoring_quota');

  if (error) {
    throw new Error(`Quota RPC failed for ${identity.role}/${identity.status}: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row || typeof row !== 'object') {
    throw new Error('Quota RPC returned no row.');
  }

  return row as QuotaRow;
}

describeIntegration('Supabase AI authoring quota 4-3B', () => {
  let env: LocalSupabaseEnvironment;
  let fixtures: SupabaseAuthFixtures;
  let teacher: AuthIdentity;
  let secondTeacher: AuthIdentity;
  let student: AuthIdentity;
  let reviewer: AuthIdentity;
  let pendingTeacher: AuthIdentity;
  let suspendedTeacher: AuthIdentity;

  beforeAll(async () => {
    env = readLocalSupabaseEnvironment();
    fixtures = new SupabaseAuthFixtures(env);

    [teacher, secondTeacher, student, reviewer, pendingTeacher, suspendedTeacher] =
      await Promise.all([
        fixtures.createIdentity('ai-quota-teacher-a', 'teacher', 'active'),
        fixtures.createIdentity('ai-quota-teacher-b', 'teacher', 'active'),
        fixtures.createIdentity('ai-quota-student', 'student', 'active'),
        fixtures.createIdentity('ai-quota-reviewer', 'reviewer', 'active'),
        fixtures.createIdentity('ai-quota-pending', 'teacher', 'pending'),
        fixtures.createIdentity('ai-quota-suspended', 'teacher', 'suspended'),
      ]);
  });

  afterAll(async () => {
    await fixtures.cleanup();
  });

  it('يسمح للمعلم النشط ويعيد العدادات الخادمية المتبقية', async () => {
    resetQuotaState(teacher.user.id);

    await expect(consume(teacher)).resolves.toEqual({
      allowed: true,
      remaining_burst: 5,
      remaining_daily: 79,
      retry_after_seconds: 0,
      limit_reason: null,
    });

    expect(readQuotaState(teacher.user.id)).toMatchObject({
      burst_count: 1,
      daily_count: 1,
    });
  });

  it('يرفض الطالب والمراجع والمعلم pending أو suspended دون إنشاء صف حصة', async () => {
    for (const identity of [student, reviewer, pendingTeacher, suspendedTeacher]) {
      resetQuotaState(identity.user.id);

      await expect(consume(identity)).resolves.toEqual({
        allowed: false,
        remaining_burst: null,
        remaining_daily: null,
        retry_after_seconds: null,
        limit_reason: 'unauthorized',
      });

      expect(readQuotaState(identity.user.id)).toBeNull();
    }
  });

  it('يمنع anon وservice_role من تنفيذ RPC مباشرة', async () => {
    const anonymousResult = await fixtures.anonymousClient.rpc('consume_ai_authoring_quota');
    expect(anonymousResult.error).not.toBeNull();

    const serviceRoleResult = await fixtures.adminClient.rpc('consume_ai_authoring_quota');
    expect(serviceRoleResult.error).not.toBeNull();
  });

  it('لا يقبل user_id أو limit أو timestamp كمعاملات RPC', async () => {
    const { error } = await teacher.client.rpc('consume_ai_authoring_quota', {
      user_id: teacher.user.id,
      limit: 999999,
      timestamp: '2099-01-01T00:00:00Z',
    });

    expect(error).not.toBeNull();
  });

  it('يثبت أقل امتياز للـschema/table/function من كتالوج PostgreSQL', () => {
    const output = psqlAdmin(`
      SELECT json_build_object(
        'authenticated_schema_usage',
          has_schema_privilege('authenticated', 'private', 'USAGE'),
        'service_role_schema_usage',
          has_schema_privilege('service_role', 'private', 'USAGE'),
        'authenticated_table_select',
          has_table_privilege(
            'authenticated',
            'private.ai_authoring_quota_state',
            'SELECT'
          ),
        'authenticated_table_update',
          has_table_privilege(
            'authenticated',
            'private.ai_authoring_quota_state',
            'UPDATE'
          ),
        'service_role_table_select',
          has_table_privilege(
            'service_role',
            'private.ai_authoring_quota_state',
            'SELECT'
          ),
        'authenticated_rpc_execute',
          has_function_privilege(
            'authenticated',
            'public.consume_ai_authoring_quota()',
            'EXECUTE'
          ),
        'anon_rpc_execute',
          has_function_privilege(
            'anon',
            'public.consume_ai_authoring_quota()',
            'EXECUTE'
          ),
        'service_role_rpc_execute',
          has_function_privilege(
            'service_role',
            'public.consume_ai_authoring_quota()',
            'EXECUTE'
          )
      )::text;
    `);

    expect(JSON.parse(output)).toEqual({
      authenticated_schema_usage: false,
      service_role_schema_usage: false,
      authenticated_table_select: false,
      authenticated_table_update: false,
      service_role_table_select: false,
      authenticated_rpc_execute: true,
      anon_rpc_execute: false,
      service_role_rpc_execute: false,
    });
  });

  it('يغلق سباق أول استخدام فعليًا: 12 طلبًا متزامنًا تسمح بستة فقط', async () => {
    resetQuotaState(teacher.user.id);

    const results = await Promise.all(Array.from({ length: 12 }, () => consume(teacher)));

    expect(results.filter((result) => result.allowed)).toHaveLength(6);
    expect(
      results.filter((result) => !result.allowed && result.limit_reason === 'burst')
    ).toHaveLength(6);

    expect(readQuotaState(teacher.user.id)).toMatchObject({
      burst_count: 6,
      daily_count: 6,
    });
  });

  it('يحافظ على الذرية لصف موجود تحت التزامن أيضًا', async () => {
    resetQuotaState(teacher.user.id);
    expect((await consume(teacher)).allowed).toBe(true);

    const results = await Promise.all(Array.from({ length: 10 }, () => consume(teacher)));

    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    expect(results.filter((result) => !result.allowed)).toHaveLength(5);

    expect(readQuotaState(teacher.user.id)).toMatchObject({
      burst_count: 6,
      daily_count: 6,
    });
  });

  it('يعزل عدادات المستخدمين عن بعضهم', async () => {
    resetQuotaState(teacher.user.id);
    resetQuotaState(secondTeacher.user.id);

    const firstTeacherResults = await Promise.all(
      Array.from({ length: 6 }, () => consume(teacher))
    );
    expect(firstTeacherResults.every((result) => result.allowed)).toBe(true);

    const secondTeacherResult = await consume(secondTeacher);
    expect(secondTeacherResult).toMatchObject({
      allowed: true,
      remaining_burst: 5,
      remaining_daily: 79,
    });

    expect(readQuotaState(secondTeacher.user.id)).toMatchObject({
      burst_count: 1,
      daily_count: 1,
    });
  });

  it('ينفذ lazy reset لنافذة burst الثابتة بعد 60 ثانية', async () => {
    setQuotaState(teacher.user.id, {
      burstStartedSql: "clock_timestamp() - interval '61 seconds'",
      burstCount: 6,
      dailyStartedSql: "date_trunc('day', clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'",
      dailyCount: 10,
    });

    const result = await consume(teacher);
    expect(result).toMatchObject({
      allowed: true,
      remaining_burst: 5,
      remaining_daily: 69,
    });

    expect(readQuotaState(teacher.user.id)).toMatchObject({
      burst_count: 1,
      daily_count: 11,
    });
  });

  it('ينفذ lazy reset لليوم التقويمي UTC دون cron', async () => {
    setQuotaState(teacher.user.id, {
      burstStartedSql: 'clock_timestamp()',
      burstCount: 0,
      dailyStartedSql:
        "(date_trunc('day', clock_timestamp() AT TIME ZONE 'UTC') - interval '1 day') " +
        "AT TIME ZONE 'UTC'",
      dailyCount: 80,
    });

    const result = await consume(teacher);
    expect(result).toMatchObject({
      allowed: true,
      remaining_burst: 5,
      remaining_daily: 79,
    });

    const state = readQuotaState(teacher.user.id);
    expect(state).toMatchObject({
      burst_count: 1,
      daily_count: 1,
    });

    const utcDate = psqlAdmin("SELECT (clock_timestamp() AT TIME ZONE 'UTC')::date::text;");
    expect(state?.daily_window_started_at.slice(0, 10)).toBe(utcDate);
  });

  it('لا يزيد أي عداد عند رفض حصة مستنفدة', async () => {
    setQuotaState(teacher.user.id, {
      burstStartedSql: 'clock_timestamp()',
      burstCount: 6,
      dailyStartedSql: "date_trunc('day', clock_timestamp() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'",
      dailyCount: 10,
    });

    const result = await consume(teacher);
    expect(result.allowed).toBe(false);
    expect(result.limit_reason).toBe('burst');
    expect(result.retry_after_seconds).toBeGreaterThanOrEqual(1);

    expect(readQuotaState(teacher.user.id)).toMatchObject({
      burst_count: 6,
      daily_count: 10,
    });
  });
});
