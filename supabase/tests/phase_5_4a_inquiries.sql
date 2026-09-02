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

SELECT has_table('public', 'inquiries', 'inquiries table exists');
SELECT has_table('public', 'inquiry_objectives', 'inquiry_objectives table exists');

SELECT col_type_is('public', 'inquiries', 'id', 'text', 'inquiries.id is text');
SELECT col_type_is('public', 'inquiries', 'lesson_id', 'text', 'inquiries.lesson_id is text');
SELECT col_type_is('public', 'inquiries', 'driving_question', 'text', 'driving_question is text');
SELECT col_type_is('public', 'inquiries', 'conclusion_prompt', 'text', 'conclusion_prompt is text');
SELECT col_type_is('public', 'inquiry_objectives', 'lesson_id', 'text', 'linkage lesson_id is text');
SELECT col_type_is('public', 'inquiry_objectives', 'position', 'integer', 'position is integer');

SELECT has_pk('public', 'inquiries', 'inquiries has primary key');
SELECT has_pk('public', 'inquiry_objectives', 'inquiry_objectives has primary key');

SELECT ok(
  (
    SELECT c.relrowsecurity
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'inquiries'
  ),
  'RLS is enabled on inquiries'
);
SELECT ok(
  (
    SELECT c.relrowsecurity
    FROM pg_class AS c
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'inquiry_objectives'
  ),
  'RLS is enabled on inquiry_objectives'
);

SELECT ok(NOT has_table_privilege('anon', 'public.inquiries', 'SELECT'), 'anon cannot SELECT inquiries');
SELECT ok(
  NOT has_table_privilege('anon', 'public.inquiry_objectives', 'SELECT'),
  'anon cannot SELECT inquiry_objectives'
);
SELECT ok(has_table_privilege('authenticated', 'public.inquiries', 'SELECT'), 'authenticated has SELECT');
SELECT ok(
  has_table_privilege('authenticated', 'public.inquiry_objectives', 'SELECT'),
  'authenticated linkage SELECT'
);
SELECT ok(has_table_privilege('service_role', 'public.inquiries', 'SELECT'), 'service_role has SELECT');
SELECT ok(
  has_table_privilege('service_role', 'public.inquiry_objectives', 'SELECT'),
  'service_role linkage SELECT'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.inquiries', 'INSERT'),
  'authenticated cannot INSERT inquiries'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.inquiries', 'UPDATE'),
  'authenticated cannot UPDATE inquiries'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.inquiries', 'DELETE'),
  'authenticated cannot DELETE inquiries'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.inquiry_objectives', 'INSERT'),
  'authenticated cannot INSERT linkage'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.inquiry_objectives', 'UPDATE'),
  'authenticated cannot UPDATE linkage'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.inquiry_objectives', 'DELETE'),
  'authenticated cannot DELETE linkage'
);

SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inquiries'
      AND policyname = 'active users read approved inquiries'
      AND cmd = 'SELECT'
      AND roles = ARRAY['authenticated']::name[]
  ),
  1::bigint,
  'inquiries has the authenticated active-user SELECT policy'
);
SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inquiry_objectives'
      AND policyname = 'active users read approved inquiry objectives'
      AND cmd = 'SELECT'
      AND roles = ARRAY['authenticated']::name[]
  ),
  1::bigint,
  'inquiry_objectives has the authenticated active-user SELECT policy'
);
SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inquiries'
      AND cmd = 'SELECT'
      AND roles @> ARRAY['anon']::name[]
  ),
  0::bigint,
  'inquiries has no anon SELECT policy'
);
SELECT is(
  (
    SELECT count(*)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'inquiry_objectives'
      AND cmd = 'SELECT'
      AND roles @> ARRAY['anon']::name[]
  ),
  0::bigint,
  'inquiry_objectives has no anon SELECT policy'
);

SELECT is(
  (
    SELECT confdeltype::text
    FROM pg_constraint
    WHERE conname = 'inquiries_lesson_id_fkey'
  ),
  'r',
  'inquiries lesson FK uses ON DELETE RESTRICT'
);
SELECT is(
  (
    SELECT confdeltype::text
    FROM pg_constraint
    WHERE conname = 'inquiry_objectives_inquiry_lesson_fkey'
  ),
  'r',
  'inquiry linkage FK uses ON DELETE RESTRICT'
);
SELECT is(
  (
    SELECT confdeltype::text
    FROM pg_constraint
    WHERE conname = 'inquiry_objectives_objective_lesson_fkey'
  ),
  'r',
  'objective linkage FK uses ON DELETE RESTRICT'
);

DELETE FROM public.inquiry_objectives
WHERE inquiry_id = 'g10-phy-waves-l3-inquiry-sound-medium';

SELECT ok(
  pg_temp.statement_succeeds(
    $$INSERT INTO public.inquiry_objectives
      (inquiry_id, objective_id, lesson_id, position)
      VALUES (
        'g10-phy-waves-l3-inquiry-sound-medium',
        'l3-o1',
        'g10-phy-waves-l3',
        0
      )$$
  ),
  'accepts one valid objective from the same lesson'
);
SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.inquiry_objectives
      (inquiry_id, objective_id, lesson_id, position)
      VALUES (
        'g10-phy-waves-l3-inquiry-sound-medium',
        'l3-o1',
        'g10-phy-waves-l3',
        1
      )$$,
    '23505'
  ),
  'rejects duplicate inquiry/objective pair'
);
SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.inquiry_objectives
      (inquiry_id, objective_id, lesson_id, position)
      VALUES (
        'g10-phy-waves-l3-inquiry-sound-medium',
        'l3-o2',
        'g10-phy-waves-l3',
        0
      )$$,
    '23505'
  ),
  'rejects duplicate position for the same inquiry'
);
SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.inquiry_objectives
      (inquiry_id, objective_id, lesson_id, position)
      VALUES (
        'g10-phy-waves-l3-inquiry-sound-medium',
        'l3-o2',
        'g10-phy-waves-l3',
        -1
      )$$,
    '23514'
  ),
  'rejects negative position'
);
SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.inquiry_objectives
      (inquiry_id, objective_id, lesson_id, position)
      VALUES (
        'missing-inquiry',
        'l3-o2',
        'g10-phy-waves-l3',
        4
      )$$,
    '23503'
  ),
  'rejects missing inquiry'
);
SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.inquiry_objectives
      (inquiry_id, objective_id, lesson_id, position)
      VALUES (
        'g10-phy-waves-l3-inquiry-sound-medium',
        'missing-objective',
        'g10-phy-waves-l3',
        4
      )$$,
    '23503'
  ),
  'rejects missing objective'
);
SELECT ok(
  pg_temp.expect_sqlstate(
    $$INSERT INTO public.inquiry_objectives
      (inquiry_id, objective_id, lesson_id, position)
      VALUES (
        'g10-phy-waves-l3-inquiry-sound-medium',
        'l2-o1',
        'g10-phy-waves-l3',
        4
      )$$,
    '23503'
  ),
  'rejects objective from another lesson'
);
SELECT ok(
  pg_temp.statement_succeeds(
    $$INSERT INTO public.inquiry_objectives
      (inquiry_id, objective_id, lesson_id, position)
      VALUES (
        'g10-phy-waves-l3-inquiry-sound-medium',
        'l3-o2',
        'g10-phy-waves-l3',
        1
      )$$
  ),
  'accepts multiple objectives from the same lesson'
);
SELECT is(
  (
    SELECT array_agg(objective_id ORDER BY position)
    FROM public.inquiry_objectives
    WHERE inquiry_id = 'g10-phy-waves-l3-inquiry-sound-medium'
  ),
  ARRAY['l3-o1', 'l3-o2']::text[],
  'objective positions preserve deterministic order'
);

DELETE FROM public.inquiry_objectives
WHERE inquiry_id IN (
  'phase54a-draft-inquiry',
  'phase54a-approved-inquiry-draft-lesson'
);
DELETE FROM public.inquiries
WHERE id IN (
  'phase54a-draft-inquiry',
  'phase54a-approved-inquiry-draft-lesson'
);

INSERT INTO public.inquiries (
  id,
  lesson_id,
  title,
  instructions,
  context,
  driving_question,
  hypothesis_prompt,
  observation_prompt,
  conclusion_prompt,
  status,
  source
)
VALUES
  (
    'phase54a-draft-inquiry',
    'g10-phy-waves-l3',
    'مسودة استقصاء للاختبار',
    'اكتب استدلالك.',
    'سياق اختبار.',
    'ما تفسيرك؟',
    'اكتب فرضيتك.',
    'اكتب ملاحظتك.',
    'اكتب استنتاجك.',
    'draft',
    'curriculum_seed'
  ),
  (
    'phase54a-approved-inquiry-draft-lesson',
    'g10-phy-waves-l4',
    'استقصاء معتمد في درس غير معتمد',
    'اكتب استدلالك.',
    'سياق اختبار.',
    'ما تفسيرك؟',
    'اكتب فرضيتك.',
    'اكتب ملاحظتك.',
    'اكتب استنتاجك.',
    'approved',
    'curriculum_seed'
  );

INSERT INTO public.inquiry_objectives (
  inquiry_id,
  objective_id,
  lesson_id,
  position
)
VALUES
  ('phase54a-draft-inquiry', 'l3-o1', 'g10-phy-waves-l3', 0),
  (
    'phase54a-approved-inquiry-draft-lesson',
    'l4-o1',
    'g10-phy-waves-l4',
    0
  );

UPDATE public.lessons
SET status = 'approved'
WHERE id = 'g10-phy-waves-l3';

UPDATE public.lessons
SET status = 'draft'
WHERE id = 'g10-phy-waves-l4';

UPDATE public.inquiries
SET status = 'approved'
WHERE id = 'g10-phy-waves-l3-inquiry-sound-medium';

DELETE FROM auth.users
WHERE id IN (
  '54000000-0000-0000-0000-000000000001'::uuid,
  '54000000-0000-0000-0000-000000000002'::uuid,
  '54000000-0000-0000-0000-000000000003'::uuid
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
    '54000000-0000-0000-0000-000000000001'::uuid,
    'authenticated',
    'authenticated',
    'phase54a-active@example.invalid',
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
    '54000000-0000-0000-0000-000000000002'::uuid,
    'authenticated',
    'authenticated',
    'phase54a-pending@example.invalid',
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
    '54000000-0000-0000-0000-000000000003'::uuid,
    'authenticated',
    'authenticated',
    'phase54a-suspended@example.invalid',
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
WHERE id = '54000000-0000-0000-0000-000000000001'::uuid;

UPDATE public.profiles
SET status = 'pending', role = 'student'
WHERE id = '54000000-0000-0000-0000-000000000002'::uuid;

UPDATE public.profiles
SET status = 'suspended', role = 'student'
WHERE id = '54000000-0000-0000-0000-000000000003'::uuid;

SELECT set_config(
  'request.jwt.claim.sub',
  '54000000-0000-0000-0000-000000000001',
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (
    SELECT count(*)
    FROM public.inquiries
    WHERE id = 'g10-phy-waves-l3-inquiry-sound-medium'
  ),
  1::bigint,
  'active authenticated user can read approved inquiry in approved lesson'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.inquiry_objectives
    WHERE inquiry_id = 'g10-phy-waves-l3-inquiry-sound-medium'
  ),
  2::bigint,
  'active authenticated user can read approved inquiry linkage'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.inquiries
    WHERE id = 'phase54a-draft-inquiry'
  ),
  0::bigint,
  'active authenticated user cannot read draft inquiry'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.inquiry_objectives
    WHERE inquiry_id = 'phase54a-draft-inquiry'
  ),
  0::bigint,
  'active authenticated user cannot read draft inquiry linkage'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.inquiries
    WHERE id = 'phase54a-approved-inquiry-draft-lesson'
  ),
  0::bigint,
  'active authenticated user cannot read approved inquiry from draft lesson'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.inquiry_objectives
    WHERE inquiry_id = 'phase54a-approved-inquiry-draft-lesson'
  ),
  0::bigint,
  'active authenticated user cannot read linkage from draft lesson'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '54000000-0000-0000-0000-000000000002',
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (
    SELECT count(*)
    FROM public.inquiries
    WHERE id = 'g10-phy-waves-l3-inquiry-sound-medium'
  ),
  0::bigint,
  'pending authenticated user cannot read approved inquiry'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.inquiry_objectives
    WHERE inquiry_id = 'g10-phy-waves-l3-inquiry-sound-medium'
  ),
  0::bigint,
  'pending authenticated user cannot read approved inquiry linkage'
);

RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '54000000-0000-0000-0000-000000000003',
  true
);
SET LOCAL ROLE authenticated;

SELECT is(
  (
    SELECT count(*)
    FROM public.inquiries
    WHERE id = 'g10-phy-waves-l3-inquiry-sound-medium'
  ),
  0::bigint,
  'suspended authenticated user cannot read approved inquiry'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.inquiry_objectives
    WHERE inquiry_id = 'g10-phy-waves-l3-inquiry-sound-medium'
  ),
  0::bigint,
  'suspended authenticated user cannot read approved inquiry linkage'
);

RESET ROLE;
SET LOCAL ROLE service_role;

SELECT is(
  (
    SELECT count(*)
    FROM public.inquiries
    WHERE id = 'phase54a-draft-inquiry'
  ),
  1::bigint,
  'service_role can read draft inquiry'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.inquiries
    WHERE id = 'phase54a-approved-inquiry-draft-lesson'
  ),
  1::bigint,
  'service_role can read approved inquiry from draft lesson'
);
SELECT is(
  (
    SELECT count(*)
    FROM public.inquiry_objectives
    WHERE inquiry_id IN (
      'phase54a-draft-inquiry',
      'phase54a-approved-inquiry-draft-lesson'
    )
  ),
  2::bigint,
  'service_role can read required linkage rows regardless of content approval'
);

RESET ROLE;

SELECT * FROM finish();

ROLLBACK;
