-- Phase 5-1: Experiment Objective Linkage
-- Adds structural objective linkage for experiments while preserving
-- public.experiments.objective as backward-compatible human-facing text.
-- Aligns linkage reads with the Phase 2-C2-A authenticated-active content boundary.
-- No canonical write privileges are granted to client roles.

ALTER TABLE public.experiments
  ADD CONSTRAINT experiments_id_lesson_id_key
  UNIQUE (id, lesson_id);

ALTER TABLE public.objectives
  ADD CONSTRAINT objectives_id_lesson_id_key
  UNIQUE (id, lesson_id);

CREATE TABLE public.experiment_objectives (
  experiment_id text NOT NULL,
  objective_id text NOT NULL,
  lesson_id text NOT NULL,
  position integer NOT NULL,
  CONSTRAINT experiment_objectives_pkey
    PRIMARY KEY (experiment_id, objective_id),
  CONSTRAINT experiment_objectives_experiment_position_key
    UNIQUE (experiment_id, position),
  CONSTRAINT experiment_objectives_position_check
    CHECK (position >= 0),
  CONSTRAINT experiment_objectives_experiment_lesson_fkey
    FOREIGN KEY (experiment_id, lesson_id)
    REFERENCES public.experiments(id, lesson_id)
    ON DELETE RESTRICT,
  CONSTRAINT experiment_objectives_objective_lesson_fkey
    FOREIGN KEY (objective_id, lesson_id)
    REFERENCES public.objectives(id, lesson_id)
    ON DELETE RESTRICT
);

CREATE INDEX experiment_objectives_objective_id_idx
  ON public.experiment_objectives (objective_id);

REVOKE ALL PRIVILEGES ON TABLE public.experiment_objectives
FROM anon, authenticated, service_role;

GRANT SELECT ON TABLE public.experiment_objectives
TO authenticated, service_role;

ALTER TABLE public.experiment_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active users read objectives of approved experiments and lessons"
ON public.experiment_objectives
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
    FROM public.experiments
    JOIN public.lessons
      ON lessons.id = experiments.lesson_id
    WHERE experiments.id = experiment_objectives.experiment_id
      AND experiments.lesson_id = experiment_objectives.lesson_id
      AND experiments.status = 'approved'
      AND lessons.status = 'approved'
  )
);
