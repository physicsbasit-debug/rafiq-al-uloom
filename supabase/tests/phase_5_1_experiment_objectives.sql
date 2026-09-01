BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(30);

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

SELECT has_table(
  'public',
  'experiment_objectives',
  'experiment_objectives table exists'
);

SELECT ok(
  (
    SELECT c.relrowsecurity
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'experiment_objectives'
  ),
  'RLS is enabled on experiment_objectives'
);

SELECT ok(NOT has_table_privilege('anon', 'public.experiment_objectives', 'SELECT'), 'anon has no SELECT');
SELECT ok(NOT has_table_privilege('anon', 'public.experiment_objectives', 'INSERT'), 'anon has no INSERT');
SELECT ok(NOT has_table_privilege('anon', 'public.experiment_objectives', 'UPDATE'), 'anon has no UPDATE');
SELECT ok(NOT has_table_privilege('anon', 'public.experiment_objectives', 'DELETE'), 'anon has no DELETE');

SELECT ok(has_table_privilege('authenticated', 'public.experiment_objectives', 'SELECT'), 'authenticated has SELECT');
SELECT ok(NOT has_table_privilege('authenticated', 'public.experiment_objectives', 'INSERT'), 'authenticated has no INSERT');
SELECT ok(NOT has_table_privilege('authenticated', 'public.experiment_objectives', 'UPDATE'), 'authenticated has no UPDATE');
SELECT ok(NOT has_table_privilege('authenticated', 'public.experiment_objectives', 'DELETE'), 'authenticated has no DELETE');

SELECT ok(has_table_privilege('service_role', 'public.experiment_objectives', 'SELECT'), 'service_role has SELECT');
SELECT ok(NOT has_table_privilege('service_role', 'public.experiment_objectives', 'INSERT'), 'service_role has no INSERT');
SELECT ok(NOT has_table_privilege('service_role', 'public.experiment_objectives', 'UPDATE'), 'service_role has no UPDATE');
SELECT ok(NOT has_table_privilege('service_role', 'public.experiment_objectives', 'DELETE'), 'service_role has no DELETE');

SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'experiment_objectives'
      AND policyname = 'active users read objectives of approved experiments and lessons'
      AND cmd = 'SELECT'
      AND roles = ARRAY['authenticated']::name[]
  ),
  1::bigint,
  'experiment_objectives has the authenticated-only active-user SELECT policy'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'experiment_objectives'
      AND cmd = 'SELECT'
      AND roles @> ARRAY['anon']::name[]
  ),
  0::bigint,
  'experiment_objectives has no anon SELECT policy'
);

DELETE FROM public.experiment_objectives
WHERE experiment_id = 'l1-exp';

SELECT ok(
  pg_temp.statement_succeeds(
    $$INSERT INTO public.experiment_objectives
      (experiment_id, objective_id, lesson_id, position)
      VALUES ('l1-exp', 'l1-o2', 'g10-phy-waves-l1', 0)$$
  ),
  'accepts one valid objective from the same lesson'
);

SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.experiment_objectives
      (experiment_id, objective_id, lesson_id, position)
      VALUES ('l1-exp', 'l1-o2', 'g10-phy-waves-l1', 1)$$,
    '23505'
  ),
  'rejects duplicate experiment/objective pair'
);

SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.experiment_objectives
      (experiment_id, objective_id, lesson_id, position)
      VALUES ('l1-exp', 'l1-o1', 'g10-phy-waves-l1', 0)$$,
    '23505'
  ),
  'rejects duplicate position for the same experiment'
);

SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.experiment_objectives
      (experiment_id, objective_id, lesson_id, position)
      VALUES ('l1-exp', 'l1-o1', 'g10-phy-waves-l1', -1)$$,
    '23514'
  ),
  'rejects negative position'
);

SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.experiment_objectives
      (experiment_id, objective_id, lesson_id, position)
      VALUES ('missing-exp', 'l1-o1', 'g10-phy-waves-l1', 4)$$,
    '23503'
  ),
  'rejects missing experiment'
);

SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.experiment_objectives
      (experiment_id, objective_id, lesson_id, position)
      VALUES ('l1-exp', 'missing-objective', 'g10-phy-waves-l1', 4)$$,
    '23503'
  ),
  'rejects missing objective'
);

SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.experiment_objectives
      (experiment_id, objective_id, lesson_id, position)
      VALUES ('l1-exp', 'l2-o1', 'g10-phy-waves-l1', 4)$$,
    '23503'
  ),
  'rejects objective from another lesson'
);

SELECT ok(
  pg_temp.statement_succeeds(
    $$INSERT INTO public.experiment_objectives
      (experiment_id, objective_id, lesson_id, position)
      VALUES ('l1-exp', 'l1-o1', 'g10-phy-waves-l1', 1)$$
  ),
  'accepts multiple objectives from the same lesson'
);

SELECT is(
  (
    SELECT array_agg(objective_id ORDER BY position)
    FROM public.experiment_objectives
    WHERE experiment_id = 'l1-exp'
  ),
  ARRAY['l1-o2', 'l1-o1']::text[],
  'objective positions preserve deterministic order'
);

DELETE FROM auth.users
WHERE id IN (
  '51000000-0000-0000-0000-000000000001'::uuid,
  '51000000-0000-0000-0000-000000000002'::uuid,
  '51000000-0000-0000-0000-000000000003'::uuid
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
    '51000000-0000-0000-0000-000000000001'::uuid,
    'authenticated',
    'authenticated',
    'phase51-active@example.invalid',
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
    '51000000-0000-0000-0000-000000000002'::uuid,
    'authenticated',
    'authenticated',
    'phase51-pending@example.invalid',
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
    '51000000-0000-0000-0000-000000000003'::uuid,
    'authenticated',
    'authenticated',
    'phase51-suspended@example.invalid',
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
WHERE id = '51000000-0000-0000-0000-000000000001'::uuid;

UPDATE public.profiles
SET status = 'suspended', role = 'student'
WHERE id = '51000000-0000-0000-0000-000000000003'::uuid;

UPDATE public.lessons
SET status = 'approved'
WHERE id = 'g10-phy-waves-l1';

UPDATE public.experiments
SET status = 'approved'
WHERE id = 'l1-exp';

SELECT set_config(
  'request.jwt.claim.sub',
  '51000000-0000-0000-0000-000000000001',
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM public.experiment_objectives WHERE experiment_id = 'l1-exp'),
  2::bigint,
  'active authenticated user can read approved experiment linkage'
);

SELECT is(
  (SELECT count(*) FROM public.experiment_objectives WHERE experiment_id = 'l2-exp'),
  0::bigint,
  'active authenticated user cannot read draft experiment linkage'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '51000000-0000-0000-0000-000000000002',
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM public.experiment_objectives WHERE experiment_id = 'l1-exp'),
  0::bigint,
  'pending authenticated user cannot read approved experiment linkage'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '51000000-0000-0000-0000-000000000003',
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM public.experiment_objectives WHERE experiment_id = 'l1-exp'),
  0::bigint,
  'suspended authenticated user cannot read approved experiment linkage'
);

RESET ROLE;
SET LOCAL ROLE service_role;

SELECT is(
  (SELECT count(*) FROM public.experiment_objectives WHERE experiment_id = 'l2-exp'),
  1::bigint,
  'service_role can read required draft linkage rows'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
