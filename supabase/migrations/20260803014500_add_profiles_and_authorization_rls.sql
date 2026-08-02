-- Phase 2-C2-A: Profiles + Authorization RLS Database Foundation
-- Scope: profiles, auth trigger, grants, RLS, and authenticated content reads.
-- Explicitly excluded: client profile services, UI, mastery_results, draft ownership, and review flows.

-- C2-A intentionally requires an empty auth.users baseline.
-- Existing accounts need a separately reviewed backfill decision; never create profiles silently.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM auth.users) THEN
    RAISE EXCEPTION
      'Phase 2-C2-A requires auth.users to be empty. Create and review an explicit profiles backfill migration first.';
  END IF;
END;
$$;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  role text NOT NULL DEFAULT 'student',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  CONSTRAINT profiles_role_check
    CHECK (role IN ('student', 'teacher', 'reviewer')),
  CONSTRAINT profiles_status_check
    CHECK (status IN ('pending', 'active', 'suspended'))
);

COMMENT ON TABLE public.profiles IS
  'Authoritative application role and account status for Supabase Auth users.';
COMMENT ON COLUMN public.profiles.role IS
  'Closed application role set: student, teacher, reviewer.';
COMMENT ON COLUMN public.profiles.status IS
  'Closed account status set: pending, active, suspended.';

CREATE FUNCTION public.set_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_profiles_updated_at();

CREATE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.profiles FROM anon, authenticated, service_role;
GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.profiles TO service_role;

CREATE POLICY "users read own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- PostgreSQL permissive SELECT policies combine with OR. The ten public B2b policies
-- must therefore be removed before the restricted C2-A policies are created.
DROP POLICY "public read grades" ON public.grades;
DROP POLICY "public read semesters" ON public.semesters;
DROP POLICY "public read subjects" ON public.subjects;
DROP POLICY "public read units" ON public.units;
DROP POLICY "public read approved lessons" ON public.lessons;
DROP POLICY "public read objectives of approved lessons" ON public.objectives;
DROP POLICY "public read approved questions of approved lessons" ON public.questions;
DROP POLICY "public read approved games of approved lessons" ON public.games;
DROP POLICY "public read approved experiments of approved lessons" ON public.experiments;
DROP POLICY "public read objectives of approved games and lessons" ON public.game_objectives;

-- Remove cloud content reads from anon. Keep authenticated read grants and preserve
-- the B3c service_role SELECT contract without revoking it at any point.
REVOKE SELECT ON TABLE
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
FROM anon;

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
TO authenticated;

-- Reassert the existing B3c contract. No REVOKE is performed on service_role here.
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

CREATE POLICY "active users read grades"
ON public.grades
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.status = 'active'
      AND profiles.role IN ('student', 'teacher', 'reviewer')
  )
);

CREATE POLICY "active users read semesters"
ON public.semesters
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.status = 'active'
      AND profiles.role IN ('student', 'teacher', 'reviewer')
  )
);

CREATE POLICY "active users read subjects"
ON public.subjects
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.status = 'active'
      AND profiles.role IN ('student', 'teacher', 'reviewer')
  )
);

CREATE POLICY "active users read units"
ON public.units
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.status = 'active'
      AND profiles.role IN ('student', 'teacher', 'reviewer')
  )
);

CREATE POLICY "active users read approved lessons"
ON public.lessons
FOR SELECT
TO authenticated
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.status = 'active'
      AND profiles.role IN ('student', 'teacher', 'reviewer')
  )
);

CREATE POLICY "active users read objectives of approved lessons"
ON public.objectives
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.status = 'active'
      AND profiles.role IN ('student', 'teacher', 'reviewer')
  )
  AND EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.id = objectives.lesson_id
      AND lessons.status = 'approved'
  )
);

CREATE POLICY "active users read approved questions of approved lessons"
ON public.questions
FOR SELECT
TO authenticated
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.status = 'active'
      AND profiles.role IN ('student', 'teacher', 'reviewer')
  )
  AND EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.id = questions.lesson_id
      AND lessons.status = 'approved'
  )
);

CREATE POLICY "active users read approved games of approved lessons"
ON public.games
FOR SELECT
TO authenticated
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.status = 'active'
      AND profiles.role IN ('student', 'teacher', 'reviewer')
  )
  AND EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.id = games.lesson_id
      AND lessons.status = 'approved'
  )
);

CREATE POLICY "active users read approved experiments of approved lessons"
ON public.experiments
FOR SELECT
TO authenticated
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.status = 'active'
      AND profiles.role IN ('student', 'teacher', 'reviewer')
  )
  AND EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.id = experiments.lesson_id
      AND lessons.status = 'approved'
  )
);

CREATE POLICY "active users read objectives of approved games and lessons"
ON public.game_objectives
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.status = 'active'
      AND profiles.role IN ('student', 'teacher', 'reviewer')
  )
  AND EXISTS (
    SELECT 1
    FROM public.games
    JOIN public.lessons
      ON lessons.id = games.lesson_id
    WHERE games.id = game_objectives.game_id
      AND games.status = 'approved'
      AND lessons.status = 'approved'
  )
);
