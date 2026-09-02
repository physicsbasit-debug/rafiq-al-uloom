BEGIN;

SELECT plan(16);

SELECT has_table('public', 'simulations', 'simulations table exists');
SELECT has_table('public', 'simulation_objectives', 'simulation_objectives table exists');

SELECT col_type_is('public', 'simulations', 'id', 'text', 'simulations.id is text');
SELECT col_type_is('public', 'simulations', 'lesson_id', 'text', 'simulations.lesson_id is text');
SELECT col_type_is('public', 'simulations', 'config', 'jsonb', 'simulations.config is jsonb');
SELECT col_type_is('public', 'simulation_objectives', 'lesson_id', 'text', 'linkage lesson_id is text');

SELECT has_pk('public', 'simulations', 'simulations has primary key');
SELECT has_pk('public', 'simulation_objectives', 'simulation_objectives has primary key');

SELECT ok(NOT has_table_privilege('anon', 'public.simulations', 'SELECT'), 'anon cannot SELECT simulations');
SELECT ok(
  NOT has_table_privilege('anon', 'public.simulation_objectives', 'SELECT'),
  'anon cannot SELECT simulation_objectives'
);
SELECT ok(has_table_privilege('authenticated', 'public.simulations', 'SELECT'), 'authenticated has SELECT');
SELECT ok(
  has_table_privilege('authenticated', 'public.simulation_objectives', 'SELECT'),
  'authenticated linkage SELECT'
);
SELECT ok(has_table_privilege('service_role', 'public.simulations', 'SELECT'), 'service role has SELECT');
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.simulations', 'INSERT'),
  'authenticated cannot INSERT'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.simulations', 'UPDATE'),
  'authenticated cannot UPDATE'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.simulations', 'DELETE'),
  'authenticated cannot DELETE'
);

SELECT * FROM finish();
ROLLBACK;
