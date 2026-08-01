-- Phase 2-B2b: RLS + Policies + Data API Grants
-- Scope: SELECT grants, row-level security, and read policies only.
-- Explicitly excluded: write grants, seed data, provider code, and schema changes.
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
FROM anon, authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
REVOKE ALL PRIVILEGES ON TABLES FROM anon, authenticated;
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
TO anon, authenticated;

ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read grades"
ON public.grades
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "public read semesters"
ON public.semesters
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "public read subjects"
ON public.subjects
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "public read units"
ON public.units
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "public read approved lessons"
ON public.lessons
FOR SELECT
TO anon, authenticated
USING (status = 'approved');

CREATE POLICY "public read objectives of approved lessons"
ON public.objectives
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.id = objectives.lesson_id
      AND lessons.status = 'approved'
  )
);

CREATE POLICY "public read approved questions of approved lessons"
ON public.questions
FOR SELECT
TO anon, authenticated
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.id = questions.lesson_id
      AND lessons.status = 'approved'
  )
);

CREATE POLICY "public read approved games of approved lessons"
ON public.games
FOR SELECT
TO anon, authenticated
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.id = games.lesson_id
      AND lessons.status = 'approved'
  )
);

CREATE POLICY "public read approved experiments of approved lessons"
ON public.experiments
FOR SELECT
TO anon, authenticated
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.id = experiments.lesson_id
      AND lessons.status = 'approved'
  )
);

CREATE POLICY "public read objectives of approved games and lessons"
ON public.game_objectives
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.games
    JOIN public.lessons
      ON lessons.id = games.lesson_id
    WHERE games.id = game_objectives.game_id
      AND games.status = 'approved'
      AND lessons.status = 'approved'
  )
);
