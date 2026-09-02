-- Phase 5-3: Interactive Science Simulations
-- Specialized canonical persistence only. No generic activities table.
-- Student interaction state remains session-only.

CREATE TABLE public.simulations (
  id text PRIMARY KEY,
  lesson_id text NOT NULL,
  title text NOT NULL,
  instructions text NOT NULL,
  engine_kind text NOT NULL,
  config jsonb NOT NULL,
  status public.content_status NOT NULL,
  source public.content_source NOT NULL,
  CONSTRAINT simulations_lesson_id_fkey
    FOREIGN KEY (lesson_id)
    REFERENCES public.lessons(id)
    ON DELETE RESTRICT,
  CONSTRAINT simulations_engine_kind_check
    CHECK (engine_kind IN ('transverse_wave_v1')),
  CONSTRAINT simulations_config_object_check
    CHECK (jsonb_typeof(config) = 'object'),
  CONSTRAINT simulations_id_lesson_id_key
    UNIQUE (id, lesson_id)
);

CREATE INDEX simulations_lesson_id_idx
  ON public.simulations (lesson_id);

CREATE TABLE public.simulation_objectives (
  simulation_id text NOT NULL,
  objective_id text NOT NULL,
  lesson_id text NOT NULL,
  position integer NOT NULL,
  CONSTRAINT simulation_objectives_pkey
    PRIMARY KEY (simulation_id, objective_id),
  CONSTRAINT simulation_objectives_simulation_position_key
    UNIQUE (simulation_id, position),
  CONSTRAINT simulation_objectives_position_check
    CHECK (position >= 0),
  CONSTRAINT simulation_objectives_simulation_lesson_fkey
    FOREIGN KEY (simulation_id, lesson_id)
    REFERENCES public.simulations(id, lesson_id)
    ON DELETE RESTRICT,
  CONSTRAINT simulation_objectives_objective_lesson_fkey
    FOREIGN KEY (objective_id, lesson_id)
    REFERENCES public.objectives(id, lesson_id)
    ON DELETE RESTRICT
);

CREATE INDEX simulation_objectives_objective_id_idx
  ON public.simulation_objectives (objective_id);

REVOKE ALL PRIVILEGES ON TABLE public.simulations, public.simulation_objectives
FROM anon, authenticated, service_role;

GRANT SELECT ON TABLE public.simulations, public.simulation_objectives
TO authenticated, service_role;

ALTER TABLE public.simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active users read approved simulations"
ON public.simulations
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
    WHERE lessons.id = simulations.lesson_id
      AND lessons.status = 'approved'
  )
);

CREATE POLICY "active users read objectives of approved simulations and lessons"
ON public.simulation_objectives
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
    FROM public.simulations
    JOIN public.lessons
      ON lessons.id = simulations.lesson_id
    WHERE simulations.id = simulation_objectives.simulation_id
      AND simulations.lesson_id = simulation_objectives.lesson_id
      AND simulations.status = 'approved'
      AND lessons.status = 'approved'
  )
);
