-- Phase 5-4B: Scientific Data / Graph Activities
-- Specialized canonical persistence only. No generic activities table.
-- Student answers/results remain session-only and are not stored here.

CREATE TABLE public.data_activities (
  id text PRIMARY KEY,
  lesson_id text NOT NULL,
  title text NOT NULL,
  instructions text NOT NULL,
  engine_kind text NOT NULL,
  config jsonb NOT NULL,
  status public.content_status NOT NULL,
  source public.content_source NOT NULL,
  CONSTRAINT data_activities_lesson_id_fkey
    FOREIGN KEY (lesson_id)
    REFERENCES public.lessons(id)
    ON DELETE RESTRICT,
  CONSTRAINT data_activities_engine_kind_check
    CHECK (engine_kind IN ('data_graph_v1')),
  CONSTRAINT data_activities_config_object_check
    CHECK (jsonb_typeof(config) = 'object'),
  CONSTRAINT data_activities_config_engine_kind_check
    CHECK (config ? 'engineKind' AND config ->> 'engineKind' = engine_kind),
  CONSTRAINT data_activities_id_lesson_id_key
    UNIQUE (id, lesson_id)
);

CREATE INDEX data_activities_lesson_id_idx
  ON public.data_activities (lesson_id);

CREATE TABLE public.data_activity_objectives (
  data_activity_id text NOT NULL,
  objective_id text NOT NULL,
  lesson_id text NOT NULL,
  position integer NOT NULL,
  CONSTRAINT data_activity_objectives_pkey
    PRIMARY KEY (data_activity_id, objective_id),
  CONSTRAINT data_activity_objectives_activity_position_key
    UNIQUE (data_activity_id, position),
  CONSTRAINT data_activity_objectives_position_check
    CHECK (position >= 0),
  CONSTRAINT data_activity_objectives_activity_lesson_fkey
    FOREIGN KEY (data_activity_id, lesson_id)
    REFERENCES public.data_activities(id, lesson_id)
    ON DELETE RESTRICT,
  CONSTRAINT data_activity_objectives_objective_lesson_fkey
    FOREIGN KEY (objective_id, lesson_id)
    REFERENCES public.objectives(id, lesson_id)
    ON DELETE RESTRICT
);

CREATE INDEX data_activity_objectives_objective_id_idx
  ON public.data_activity_objectives (objective_id);

REVOKE ALL PRIVILEGES ON TABLE public.data_activities, public.data_activity_objectives
FROM anon, authenticated, service_role;

GRANT SELECT ON TABLE public.data_activities, public.data_activity_objectives
TO authenticated, service_role;

ALTER TABLE public.data_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_activity_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active users read approved data activities"
ON public.data_activities
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
    WHERE lessons.id = data_activities.lesson_id
      AND lessons.status = 'approved'
  )
);

CREATE POLICY "active users read objectives of approved data activities and lessons"
ON public.data_activity_objectives
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
    FROM public.data_activities
    JOIN public.lessons
      ON lessons.id = data_activities.lesson_id
    WHERE data_activities.id = data_activity_objectives.data_activity_id
      AND data_activities.lesson_id = data_activity_objectives.lesson_id
      AND data_activities.status = 'approved'
      AND lessons.status = 'approved'
  )
);
