-- Phase 6-7C2: accountless-student public content visibility
-- Forward-only migration.
--
-- Contract:
-- - anon may SELECT only explicitly visible catalog rows and approved content
--   whose complete catalog path is visible.
-- - no anon write grants are introduced.
-- - authenticated staff keep the existing approved-content read contract,
--   including rows hidden from the student experience.
-- - new catalog/content rows default to hidden until explicitly enabled.

ALTER TABLE public.grades
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT false;

ALTER TABLE public.semesters
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT false;

ALTER TABLE public.units
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT false;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS is_visible boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.grades.is_visible IS
  'Student-facing visibility switch. False hides the grade from anonymous students.';
COMMENT ON COLUMN public.semesters.is_visible IS
  'Student-facing visibility switch. False hides the semester from anonymous students.';
COMMENT ON COLUMN public.units.is_visible IS
  'Student-facing visibility switch. False hides the unit from anonymous students.';
COMMENT ON COLUMN public.lessons.is_visible IS
  'Student-facing visibility switch. Approved content is public only when this and all parent switches are true.';

UPDATE public.grades
SET is_visible = (id = 'g10');

UPDATE public.semesters
SET is_visible = (id = 'g10-sem1');

UPDATE public.units
SET is_visible = (id = 'g10-phy-waves-unit');

UPDATE public.lessons
SET is_visible = (id = 'g10-phy-waves-l2' AND status = 'approved');

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
  public.experiments,
  public.experiment_objectives,
  public.simulations,
  public.simulation_objectives,
  public.inquiries,
  public.inquiry_objectives,
  public.data_activities,
  public.data_activity_objectives
TO anon;

CREATE POLICY "public anon read visible grades"
ON public.grades FOR SELECT TO anon
USING (is_visible);

CREATE POLICY "public anon read visible semesters"
ON public.semesters FOR SELECT TO anon
USING (
  is_visible
  AND EXISTS (
    SELECT 1
    FROM public.grades
    WHERE grades.id = semesters.grade_id
      AND grades.is_visible
  )
);

CREATE POLICY "public anon read visible subjects"
ON public.subjects FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.grades
    WHERE grades.id = subjects.grade_id
      AND grades.is_visible
  )
);

CREATE POLICY "public anon read visible units"
ON public.units FOR SELECT TO anon
USING (
  is_visible
  AND EXISTS (
    SELECT 1
    FROM public.semesters
    JOIN public.grades
      ON grades.id = semesters.grade_id
    JOIN public.subjects
      ON subjects.id = units.subject_id
    WHERE semesters.id = units.semester_id
      AND subjects.grade_id = semesters.grade_id
      AND semesters.is_visible
      AND grades.is_visible
  )
);

CREATE POLICY "public anon read visible lessons"
ON public.lessons FOR SELECT TO anon
USING (
  status = 'approved'
  AND is_visible
  AND EXISTS (
    SELECT 1
    FROM public.units
    JOIN public.semesters
      ON semesters.id = units.semester_id
    JOIN public.subjects
      ON subjects.id = units.subject_id
    JOIN public.grades
      ON grades.id = semesters.grade_id
    WHERE units.id = lessons.unit_id
      AND subjects.grade_id = semesters.grade_id
      AND units.is_visible
      AND semesters.is_visible
      AND grades.is_visible
  )
);

CREATE POLICY "public anon read visible objectives"
ON public.objectives FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.id = objectives.lesson_id
      AND lessons.status = 'approved'
      AND lessons.is_visible
  )
);

CREATE POLICY "public anon read visible questions"
ON public.questions FOR SELECT TO anon
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.id = questions.lesson_id
      AND lessons.status = 'approved'
      AND lessons.is_visible
  )
);

CREATE POLICY "public anon read visible games"
ON public.games FOR SELECT TO anon
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.id = games.lesson_id
      AND lessons.status = 'approved'
      AND lessons.is_visible
  )
);

CREATE POLICY "public anon read visible game objectives"
ON public.game_objectives FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.games
    JOIN public.lessons
      ON lessons.id = games.lesson_id
    WHERE games.id = game_objectives.game_id
      AND games.status = 'approved'
      AND lessons.status = 'approved'
      AND lessons.is_visible
  )
);

CREATE POLICY "public anon read visible experiments"
ON public.experiments FOR SELECT TO anon
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.id = experiments.lesson_id
      AND lessons.status = 'approved'
      AND lessons.is_visible
  )
);

CREATE POLICY "public anon read visible experiment objectives"
ON public.experiment_objectives FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.experiments
    JOIN public.lessons
      ON lessons.id = experiments.lesson_id
    WHERE experiments.id = experiment_objectives.experiment_id
      AND experiments.lesson_id = experiment_objectives.lesson_id
      AND experiments.status = 'approved'
      AND lessons.status = 'approved'
      AND lessons.is_visible
  )
);

CREATE POLICY "public anon read visible simulations"
ON public.simulations FOR SELECT TO anon
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.id = simulations.lesson_id
      AND lessons.status = 'approved'
      AND lessons.is_visible
  )
);

CREATE POLICY "public anon read visible simulation objectives"
ON public.simulation_objectives FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.simulations
    JOIN public.lessons
      ON lessons.id = simulations.lesson_id
    WHERE simulations.id = simulation_objectives.simulation_id
      AND simulations.lesson_id = simulation_objectives.lesson_id
      AND simulations.status = 'approved'
      AND lessons.status = 'approved'
      AND lessons.is_visible
  )
);

CREATE POLICY "public anon read visible inquiries"
ON public.inquiries FOR SELECT TO anon
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.id = inquiries.lesson_id
      AND lessons.status = 'approved'
      AND lessons.is_visible
  )
);

CREATE POLICY "public anon read visible inquiry objectives"
ON public.inquiry_objectives FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.inquiries
    JOIN public.lessons
      ON lessons.id = inquiries.lesson_id
    WHERE inquiries.id = inquiry_objectives.inquiry_id
      AND inquiries.lesson_id = inquiry_objectives.lesson_id
      AND inquiries.status = 'approved'
      AND lessons.status = 'approved'
      AND lessons.is_visible
  )
);

CREATE POLICY "public anon read visible data activities"
ON public.data_activities FOR SELECT TO anon
USING (
  status = 'approved'
  AND EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.id = data_activities.lesson_id
      AND lessons.status = 'approved'
      AND lessons.is_visible
  )
);

CREATE POLICY "public anon read visible data activity objectives"
ON public.data_activity_objectives FOR SELECT TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.data_activities
    JOIN public.lessons
      ON lessons.id = data_activities.lesson_id
    WHERE data_activities.id = data_activity_objectives.data_activity_id
      AND data_activities.lesson_id = data_activity_objectives.lesson_id
      AND data_activities.status = 'approved'
      AND lessons.status = 'approved'
      AND lessons.is_visible
  )
);
