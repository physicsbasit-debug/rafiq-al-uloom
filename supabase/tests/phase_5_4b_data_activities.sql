BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(53);

CREATE OR REPLACE FUNCTION pg_temp.expect_sqlstate(statement text, expected_state text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE statement;
  RETURN false;
EXCEPTION
  WHEN OTHERS THEN
    RETURN SQLSTATE = expected_state;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.statement_succeeds(statement text)
RETURNS boolean
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE statement;
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

SELECT has_table('public', 'data_activities', 'data_activities table exists');
SELECT has_table(
  'public',
  'data_activity_objectives',
  'data_activity_objectives table exists'
);

SELECT col_type_is('public', 'data_activities', 'id', 'text', 'data_activities.id is text');
SELECT col_type_is(
  'public',
  'data_activities',
  'lesson_id',
  'text',
  'data_activities.lesson_id is text'
);
SELECT col_type_is(
  'public',
  'data_activities',
  'engine_kind',
  'text',
  'data_activities.engine_kind is text'
);
SELECT col_type_is(
  'public',
  'data_activities',
  'config',
  'jsonb',
  'data_activities.config is jsonb'
);
SELECT col_type_is(
  'public',
  'data_activity_objectives',
  'lesson_id',
  'text',
  'linkage lesson_id is text'
);
SELECT col_type_is(
  'public',
  'data_activity_objectives',
  'position',
  'integer',
  'linkage position is integer'
);

SELECT has_pk('public', 'data_activities', 'data_activities has primary key');
SELECT has_pk(
  'public',
  'data_activity_objectives',
  'data_activity_objectives has primary key'
);

SELECT ok(
  (
    SELECT c.relrowsecurity
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'data_activities'
  ),
  'RLS is enabled on data_activities'
);
SELECT ok(
  (
    SELECT c.relrowsecurity
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'data_activity_objectives'
  ),
  'RLS is enabled on data_activity_objectives'
);

SELECT ok(
  NOT has_table_privilege('anon', 'public.data_activities', 'SELECT'),
  'anon cannot SELECT data_activities'
);
SELECT ok(
  NOT has_table_privilege('anon', 'public.data_activity_objectives', 'SELECT'),
  'anon cannot SELECT data_activity_objectives'
);
SELECT ok(
  has_table_privilege('authenticated', 'public.data_activities', 'SELECT'),
  'authenticated has SELECT on data_activities'
);
SELECT ok(
  has_table_privilege('authenticated', 'public.data_activity_objectives', 'SELECT'),
  'authenticated has SELECT on linkage'
);
SELECT ok(
  has_table_privilege('service_role', 'public.data_activities', 'SELECT'),
  'service_role has SELECT on data_activities'
);
SELECT ok(
  has_table_privilege('service_role', 'public.data_activity_objectives', 'SELECT'),
  'service_role has SELECT on linkage'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.data_activities', 'INSERT'),
  'authenticated cannot INSERT data_activities'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.data_activities', 'UPDATE'),
  'authenticated cannot UPDATE data_activities'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.data_activities', 'DELETE'),
  'authenticated cannot DELETE data_activities'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.data_activity_objectives', 'INSERT'),
  'authenticated cannot INSERT linkage'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.data_activity_objectives', 'UPDATE'),
  'authenticated cannot UPDATE linkage'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.data_activity_objectives', 'DELETE'),
  'authenticated cannot DELETE linkage'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'data_activities'
      AND policyname = 'active users read approved data activities'
      AND cmd = 'SELECT'
      AND roles = ARRAY['authenticated']::name[]
  ),
  1::bigint,
  'data_activities has the authenticated active-user SELECT policy'
);
SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'data_activity_objectives'
      AND policyname = 'active users read objectives of approved data activities and lessons'
      AND cmd = 'SELECT'
      AND roles = ARRAY['authenticated']::name[]
  ),
  1::bigint,
  'data_activity_objectives has the authenticated active-user SELECT policy'
);
SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'data_activities'
      AND cmd = 'SELECT'
      AND roles @> ARRAY['anon']::name[]
  ),
  0::bigint,
  'data_activities has no anon SELECT policy'
);
SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'data_activity_objectives'
      AND cmd = 'SELECT'
      AND roles @> ARRAY['anon']::name[]
  ),
  0::bigint,
  'data_activity_objectives has no anon SELECT policy'
);

SELECT is(
  (
    SELECT confdeltype::text
    FROM pg_constraint
    WHERE conname = 'data_activities_lesson_id_fkey'
  ),
  'r',
  'data_activities lesson FK uses ON DELETE RESTRICT'
);
SELECT is(
  (
    SELECT confdeltype::text
    FROM pg_constraint
    WHERE conname = 'data_activity_objectives_activity_lesson_fkey'
  ),
  'r',
  'data activity linkage FK uses ON DELETE RESTRICT'
);
SELECT is(
  (
    SELECT confdeltype::text
    FROM pg_constraint
    WHERE conname = 'data_activity_objectives_objective_lesson_fkey'
  ),
  'r',
  'objective linkage FK uses ON DELETE RESTRICT'
);

SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.data_activities
      (id, lesson_id, title, instructions, engine_kind, config, status, source)
      VALUES (
        'phase54b-invalid-engine',
        'g10-phy-waves-l2',
        'محاولة غير صالحة',
        'اختبار',
        'arbitrary_engine',
        '{"engineKind":"arbitrary_engine"}'::jsonb,
        'draft',
        'curriculum_seed'
      )$$,
    '23514'
  ),
  'rejects unsupported engine_kind at the database boundary'
);
SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.data_activities
      (id, lesson_id, title, instructions, engine_kind, config, status, source)
      VALUES (
        'phase54b-nonobject-config',
        'g10-phy-waves-l2',
        'محاولة غير صالحة',
        'اختبار',
        'data_graph_v1',
        '[]'::jsonb,
        'draft',
        'curriculum_seed'
      )$$,
    '23514'
  ),
  'rejects non-object config at the database boundary'
);
SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.data_activities
      (id, lesson_id, title, instructions, engine_kind, config, status, source)
      VALUES (
        'phase54b-engine-config-mismatch',
        'g10-phy-waves-l2',
        'محاولة غير صالحة',
        'اختبار',
        'data_graph_v1',
        '{"engineKind":"other_engine"}'::jsonb,
        'draft',
        'curriculum_seed'
      )$$,
    '23514'
  ),
  'rejects config.engineKind that does not match engine_kind'
);

SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.data_activities
      (id, lesson_id, title, instructions, engine_kind, config, status, source)
      VALUES (
        'phase54b-missing-config-engine',
        'g10-phy-waves-l2',
        'محاولة غير صالحة',
        'اختبار',
        'data_graph_v1',
        '{}'::jsonb,
        'draft',
        'curriculum_seed'
      )$$,
    '23514'
  ),
  'rejects config that omits engineKind'
);

DELETE FROM public.data_activity_objectives
WHERE data_activity_id = 'g10-phy-waves-l2-data-frequency-wavelength';

SELECT ok(
  pg_temp.statement_succeeds(
    $$INSERT INTO public.data_activity_objectives
      (data_activity_id, objective_id, lesson_id, position)
      VALUES (
        'g10-phy-waves-l2-data-frequency-wavelength',
        'l2-o2',
        'g10-phy-waves-l2',
        0
      )$$
  ),
  'accepts one valid objective from the same lesson'
);
SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.data_activity_objectives
      (data_activity_id, objective_id, lesson_id, position)
      VALUES (
        'g10-phy-waves-l2-data-frequency-wavelength',
        'l2-o2',
        'g10-phy-waves-l2',
        1
      )$$,
    '23505'
  ),
  'rejects duplicate data_activity/objective pair'
);
SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.data_activity_objectives
      (data_activity_id, objective_id, lesson_id, position)
      VALUES (
        'g10-phy-waves-l2-data-frequency-wavelength',
        'l2-o1',
        'g10-phy-waves-l2',
        0
      )$$,
    '23505'
  ),
  'rejects duplicate position for the same data activity'
);
SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.data_activity_objectives
      (data_activity_id, objective_id, lesson_id, position)
      VALUES (
        'g10-phy-waves-l2-data-frequency-wavelength',
        'l2-o1',
        'g10-phy-waves-l2',
        -1
      )$$,
    '23514'
  ),
  'rejects negative position'
);
SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.data_activity_objectives
      (data_activity_id, objective_id, lesson_id, position)
      VALUES (
        'missing-data-activity',
        'l2-o1',
        'g10-phy-waves-l2',
        4
      )$$,
    '23503'
  ),
  'rejects missing data activity'
);
SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.data_activity_objectives
      (data_activity_id, objective_id, lesson_id, position)
      VALUES (
        'g10-phy-waves-l2-data-frequency-wavelength',
        'missing-objective',
        'g10-phy-waves-l2',
        4
      )$$,
    '23503'
  ),
  'rejects missing objective'
);
SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.data_activity_objectives
      (data_activity_id, objective_id, lesson_id, position)
      VALUES (
        'g10-phy-waves-l2-data-frequency-wavelength',
        'l3-o1',
        'g10-phy-waves-l2',
        4
      )$$,
    '23503'
  ),
  'rejects objective from another lesson'
);
SELECT ok(
  pg_temp.statement_succeeds(
    $$INSERT INTO public.data_activity_objectives
      (data_activity_id, objective_id, lesson_id, position)
      VALUES (
        'g10-phy-waves-l2-data-frequency-wavelength',
        'l2-o1',
        'g10-phy-waves-l2',
        1
      )$$
  ),
  'accepts multiple objectives from the same lesson'
);
SELECT is(
  (
    SELECT array_agg(objective_id ORDER BY position)
    FROM public.data_activity_objectives
    WHERE data_activity_id = 'g10-phy-waves-l2-data-frequency-wavelength'
  ),
  ARRAY['l2-o2', 'l2-o1']::text[],
  'objective positions preserve deterministic order'
);

DELETE FROM public.data_activity_objectives
WHERE data_activity_id IN (
  'phase54b-draft-data',
  'phase54b-approved-data-draft-lesson'
);
DELETE FROM public.data_activities
WHERE id IN (
  'phase54b-draft-data',
  'phase54b-approved-data-draft-lesson'
);

INSERT INTO public.data_activities (
  id,
  lesson_id,
  title,
  instructions,
  engine_kind,
  config,
  status,
  source
)
VALUES
  (
    'phase54b-draft-data',
    'g10-phy-waves-l2',
    'مسودة نشاط بيانات',
    'اقرأ البيانات.',
    'data_graph_v1',
    '{"engineKind":"data_graph_v1"}'::jsonb,
    'draft',
    'curriculum_seed'
  ),
  (
    'phase54b-approved-data-draft-lesson',
    'g10-phy-waves-l4',
    'نشاط بيانات معتمد في درس غير معتمد',
    'اقرأ البيانات.',
    'data_graph_v1',
    '{"engineKind":"data_graph_v1"}'::jsonb,
    'approved',
    'curriculum_seed'
  );

INSERT INTO public.data_activity_objectives (
  data_activity_id,
  objective_id,
  lesson_id,
  position
)
VALUES
  ('phase54b-draft-data', 'l2-o2', 'g10-phy-waves-l2', 0),
  (
    'phase54b-approved-data-draft-lesson',
    'l4-o1',
    'g10-phy-waves-l4',
    0
  );

UPDATE public.lessons
SET status = 'approved'
WHERE id = 'g10-phy-waves-l2';

UPDATE public.lessons
SET status = 'draft'
WHERE id = 'g10-phy-waves-l4';

UPDATE public.data_activities
SET status = 'approved'
WHERE id = 'g10-phy-waves-l2-data-frequency-wavelength';

DELETE FROM auth.users
WHERE id IN (
  '54b00000-0000-0000-0000-000000000001'::uuid,
  '54b00000-0000-0000-0000-000000000002'::uuid,
  '54b00000-0000-0000-0000-000000000003'::uuid
);

INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
VALUES
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '54b00000-0000-0000-0000-000000000001'::uuid,
    'authenticated',
    'authenticated',
    'phase54b-active@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '54b00000-0000-0000-0000-000000000002'::uuid,
    'authenticated',
    'authenticated',
    'phase54b-pending@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '54b00000-0000-0000-0000-000000000003'::uuid,
    'authenticated',
    'authenticated',
    'phase54b-suspended@example.invalid',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

UPDATE public.profiles
SET status = 'active', role = 'student'
WHERE id = '54b00000-0000-0000-0000-000000000001'::uuid;

UPDATE public.profiles
SET status = 'pending', role = 'student'
WHERE id = '54b00000-0000-0000-0000-000000000002'::uuid;

UPDATE public.profiles
SET status = 'suspended', role = 'student'
WHERE id = '54b00000-0000-0000-0000-000000000003'::uuid;

SELECT set_config(
  'request.jwt.claim.sub',
  '54b00000-0000-0000-0000-000000000001',
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (
    SELECT count(*)
    FROM public.data_activities
    WHERE id = 'g10-phy-waves-l2-data-frequency-wavelength'
  ),
  1::bigint,
  'active authenticated user can read approved data activity in approved lesson'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.data_activities
    WHERE id = 'phase54b-draft-data'
  ),
  0::bigint,
  'active authenticated user cannot read draft data activity'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.data_activities
    WHERE id = 'phase54b-approved-data-draft-lesson'
  ),
  0::bigint,
  'active authenticated user cannot read approved data activity in draft lesson'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.data_activity_objectives
    WHERE data_activity_id = 'g10-phy-waves-l2-data-frequency-wavelength'
  ),
  2::bigint,
  'active authenticated user can read linkage for visible approved data activity'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.data_activity_objectives
    WHERE data_activity_id = 'phase54b-draft-data'
  ),
  0::bigint,
  'active authenticated user cannot read linkage for draft data activity'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '54b00000-0000-0000-0000-000000000002',
  true
);

SELECT is(
  (
    SELECT count(*)
    FROM public.data_activities
    WHERE id = 'g10-phy-waves-l2-data-frequency-wavelength'
  ),
  0::bigint,
  'pending authenticated user cannot read approved data activity'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.data_activity_objectives
    WHERE data_activity_id = 'g10-phy-waves-l2-data-frequency-wavelength'
  ),
  0::bigint,
  'pending authenticated user cannot read approved data linkage'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '54b00000-0000-0000-0000-000000000003',
  true
);

SELECT is(
  (
    SELECT count(*)
    FROM public.data_activities
    WHERE id = 'g10-phy-waves-l2-data-frequency-wavelength'
  ),
  0::bigint,
  'suspended authenticated user cannot read approved data activity'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.data_activity_objectives
    WHERE data_activity_id = 'g10-phy-waves-l2-data-frequency-wavelength'
  ),
  0::bigint,
  'suspended authenticated user cannot read approved data linkage'
);

RESET ROLE;

SELECT * FROM finish();
ROLLBACK;
