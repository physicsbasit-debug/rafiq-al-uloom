-- Phase 2-B3c fix:
-- service_role bypasses RLS but still requires explicit table-level privileges.
-- Keep only the minimum permission required for read-only parity tests.

REVOKE ALL PRIVILEGES ON TABLE
  public.grades,
  public.semesters,
  public.subjects,
  public.units,
  public.lessons,
  public.objectives,
  public.questions,
  public.games,
  public.game_objectives,
  public.experiments
FROM service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL PRIVILEGES ON TABLES FROM service_role;

GRANT SELECT ON TABLE
  public.grades,
  public.semesters,
  public.subjects,
  public.units,
  public.lessons,
  public.objectives,
  public.questions,
  public.games,
  public.game_objectives,
  public.experiments
TO service_role;