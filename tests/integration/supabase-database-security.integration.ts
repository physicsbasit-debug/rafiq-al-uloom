import { describe, expect, it } from 'vitest';

import { psqlAdmin } from './helpers/supabase-auth-fixtures';

const runIntegration = process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true';
const describeIntegration = runIntegration ? describe : describe.skip;

const authenticatedExecuteAllowlist = [
  'public.consume_ai_authoring_quota()',
  'public.create_lesson_revision(jsonb, text, uuid)',
  'public.review_lesson_revision(uuid, text, text)',
  'public.save_lesson_revision(uuid, jsonb)',
  'public.submit_lesson_revision(uuid)',
  'public.submit_mastery_attempt(uuid, text, timestamp with time zone, text, jsonb)',
].sort();

function queryJson<T>(sql: string): T {
  return JSON.parse(psqlAdmin(sql)) as T;
}

describeIntegration('Phase 6-4C database / RLS privilege audit', () => {
  it('enables RLS on every application table in public and private schemas', () => {
    const withoutRls = queryJson<string[]>(`
      SELECT COALESCE(
        json_agg(format('%I.%I', n.nspname, c.relname) ORDER BY n.nspname, c.relname),
        '[]'::json
      )::text
      FROM pg_class AS c
      JOIN pg_namespace AS n ON n.oid = c.relnamespace
      WHERE n.nspname IN ('public', 'private')
        AND c.relkind IN ('r', 'p')
        AND NOT c.relrowsecurity;
    `);
    expect(withoutRls).toEqual([]);
  });

  it('does not expose application tables to anon at the table privilege layer', () => {
    const violations = queryJson<string[]>(`
      WITH app_tables AS (
        SELECT n.nspname AS schema_name, c.relname AS table_name
        FROM pg_class AS c
        JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname IN ('public', 'private')
          AND c.relkind IN ('r', 'p')
      ), privileges(privilege_name) AS (
        VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
               ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
      )
      SELECT COALESCE(
        json_agg(format('%I.%I:%s', schema_name, table_name, privilege_name)
          ORDER BY schema_name, table_name, privilege_name),
        '[]'::json
      )::text
      FROM app_tables CROSS JOIN privileges
      WHERE has_table_privilege(
        'anon', format('%I.%I', schema_name, table_name), privilege_name
      );
    `);
    expect(violations).toEqual([]);
  });

  it('prevents authenticated from direct application-table writes', () => {
    const violations = queryJson<string[]>(`
      WITH app_tables AS (
        SELECT n.nspname AS schema_name, c.relname AS table_name
        FROM pg_class AS c
        JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname IN ('public', 'private')
          AND c.relkind IN ('r', 'p')
      ), privileges(privilege_name) AS (
        VALUES ('INSERT'), ('UPDATE'), ('DELETE'),
               ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
      )
      SELECT COALESCE(
        json_agg(format('%I.%I:%s', schema_name, table_name, privilege_name)
          ORDER BY schema_name, table_name, privilege_name),
        '[]'::json
      )::text
      FROM app_tables CROSS JOIN privileges
      WHERE has_table_privilege(
        'authenticated', format('%I.%I', schema_name, table_name), privilege_name
      );
    `);
    expect(violations).toEqual([]);
  });

  it('keeps service_role direct DML limited to the reviewed profiles UPDATE exception', () => {
    const violations = queryJson<string[]>(`
      WITH app_tables AS (
        SELECT n.nspname AS schema_name, c.relname AS table_name
        FROM pg_class AS c
        JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname IN ('public', 'private')
          AND c.relkind IN ('r', 'p')
      ), privileges(privilege_name) AS (
        VALUES ('INSERT'), ('UPDATE'), ('DELETE'),
               ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
      )
      SELECT COALESCE(
        json_agg(format('%I.%I:%s', schema_name, table_name, privilege_name)
          ORDER BY schema_name, table_name, privilege_name),
        '[]'::json
      )::text
      FROM app_tables CROSS JOIN privileges
      WHERE has_table_privilege(
        'service_role', format('%I.%I', schema_name, table_name), privilege_name
      )
        AND NOT (
          schema_name = 'public'
          AND table_name = 'profiles'
          AND privilege_name = 'UPDATE'
        );
    `);
    expect(violations).toEqual([]);

    const reviewedException = queryJson<{
      profiles_update: boolean;
      profiles_insert: boolean;
      profiles_delete: boolean;
    }>(`
      SELECT json_build_object(
        'profiles_update', has_table_privilege('service_role', 'public.profiles', 'UPDATE'),
        'profiles_insert', has_table_privilege('service_role', 'public.profiles', 'INSERT'),
        'profiles_delete', has_table_privilege('service_role', 'public.profiles', 'DELETE')
      )::text;
    `);
    expect(reviewedException).toEqual({
      profiles_update: true,
      profiles_insert: false,
      profiles_delete: false,
    });
  });

  it('keeps the private schema and quota state inaccessible to application roles', () => {
    const schemaUsage = queryJson<Record<'anon' | 'authenticated' | 'service_role', boolean>>(`
      SELECT json_build_object(
        'anon', has_schema_privilege('anon', 'private', 'USAGE'),
        'authenticated', has_schema_privilege('authenticated', 'private', 'USAGE'),
        'service_role', has_schema_privilege('service_role', 'private', 'USAGE')
      )::text;
    `);
    expect(schemaUsage).toEqual({ anon: false, authenticated: false, service_role: false });

    const tablePrivileges = queryJson<string[]>(`
      WITH roles(role_name) AS (
        VALUES ('anon'), ('authenticated'), ('service_role')
      ), privileges(privilege_name) AS (
        VALUES ('SELECT'), ('INSERT'), ('UPDATE'), ('DELETE'),
               ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')
      )
      SELECT COALESCE(
        json_agg(format('%s:%s', role_name, privilege_name)
          ORDER BY role_name, privilege_name),
        '[]'::json
      )::text
      FROM roles CROSS JOIN privileges
      WHERE has_table_privilege(
        role_name, 'private.ai_authoring_quota_state', privilege_name
      );
    `);
    expect(tablePrivileges).toEqual([]);
  });

  it('keeps every SECURITY DEFINER function on an empty explicit search_path', () => {
    const violations = queryJson<string[]>(`
      SELECT COALESCE(
        json_agg(format('%I.%I(%s)', n.nspname, p.proname, oidvectortypes(p.proargtypes))
          ORDER BY n.nspname, p.proname, oidvectortypes(p.proargtypes)),
        '[]'::json
      )::text
      FROM pg_proc AS p
      JOIN pg_namespace AS n ON n.oid = p.pronamespace
      WHERE n.nspname IN ('public', 'private')
        AND p.prosecdef
        AND NOT EXISTS (
          SELECT 1
          FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS setting
          WHERE setting IN ('search_path=""', 'search_path=')
        );
    `);
    expect(violations).toEqual([]);
  });

  it('does not leave any SECURITY DEFINER function executable by PUBLIC', () => {
    const violations = queryJson<string[]>(`
      SELECT COALESCE(json_agg(signature ORDER BY signature), '[]'::json)::text
      FROM (
        SELECT DISTINCT format(
          '%I.%I(%s)', n.nspname, p.proname, oidvectortypes(p.proargtypes)
        ) AS signature
        FROM pg_proc AS p
        JOIN pg_namespace AS n ON n.oid = p.pronamespace
        CROSS JOIN LATERAL aclexplode(
          COALESCE(p.proacl, acldefault('f', p.proowner))
        ) AS acl
        WHERE n.nspname IN ('public', 'private')
          AND p.prosecdef
          AND acl.grantee = 0
          AND acl.privilege_type = 'EXECUTE'
      ) AS exposed;
    `);
    expect(violations).toEqual([]);
  });

  it('does not expose internal SECURITY DEFINER trigger functions to application roles', () => {
    const violations = queryJson<string[]>(`
      WITH roles(role_name) AS (
        VALUES ('anon'), ('authenticated'), ('service_role')
      )
      SELECT COALESCE(
        json_agg(
          format(
            '%s:%I.%I(%s)',
            role_name,
            n.nspname,
            p.proname,
            oidvectortypes(p.proargtypes)
          )
          ORDER BY role_name, n.nspname, p.proname, oidvectortypes(p.proargtypes)
        ),
        '[]'::json
      )::text
      FROM roles
      CROSS JOIN pg_proc AS p
      JOIN pg_namespace AS n ON n.oid = p.pronamespace
      WHERE n.nspname IN ('public', 'private')
        AND p.prosecdef
        AND p.prorettype IN ('trigger'::regtype, 'event_trigger'::regtype)
        AND has_function_privilege(role_name, p.oid, 'EXECUTE');
    `);

    expect(violations).toEqual([]);
  });

  it('matches the authenticated callable-function surface to the reviewed RPC allowlist', () => {
    const executable = queryJson<string[]>(`
      SELECT COALESCE(json_agg(signature ORDER BY signature), '[]'::json)::text
      FROM (
        SELECT format(
          '%I.%I(%s)', n.nspname, p.proname, oidvectortypes(p.proargtypes)
        ) AS signature
        FROM pg_proc AS p
        JOIN pg_namespace AS n ON n.oid = p.pronamespace
        WHERE n.nspname IN ('public', 'private')
          AND p.prokind = 'f'
          AND p.prorettype <> 'trigger'::regtype
          AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
      ) AS callable;
    `);
    expect(executable).toEqual(authenticatedExecuteAllowlist);
  });

  it('keeps anon and service_role away from callable application functions', () => {
    const violations = queryJson<string[]>(`
      WITH roles(role_name) AS (VALUES ('anon'), ('service_role'))
      SELECT COALESCE(
        json_agg(format(
          '%s:%I.%I(%s)', role_name, n.nspname, p.proname, oidvectortypes(p.proargtypes)
        ) ORDER BY role_name, n.nspname, p.proname, oidvectortypes(p.proargtypes)),
        '[]'::json
      )::text
      FROM roles
      CROSS JOIN pg_proc AS p
      JOIN pg_namespace AS n ON n.oid = p.pronamespace
      WHERE n.nspname IN ('public', 'private')
        AND p.prokind = 'f'
        AND p.prorettype <> 'trigger'::regtype
        AND has_function_privilege(role_name, p.oid, 'EXECUTE');
    `);
    expect(violations).toEqual([]);
  });

  it('does not target anon or PUBLIC from application RLS policies', () => {
    const violations = queryJson<string[]>(`
      SELECT COALESCE(
        json_agg(format('%I.%I:%s', schemaname, tablename, policyname)
          ORDER BY schemaname, tablename, policyname),
        '[]'::json
      )::text
      FROM pg_policies
      WHERE schemaname IN ('public', 'private')
        AND (
          roles @> ARRAY['anon']::name[]
          OR roles @> ARRAY['public']::name[]
        );
    `);
    expect(violations).toEqual([]);
  });
});
