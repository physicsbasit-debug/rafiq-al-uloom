-- Phase 5-4A: Guided Inquiry Activities
-- Specialized canonical persistence only. No generic activities table.
-- Student inquiry responses remain session-only and are not stored here.

CREATE TABLE public.inquiries (
  id text PRIMARY KEY,
  lesson_id text NOT NULL,
  title text NOT NULL,
  instructions text NOT NULL,
  context text NOT NULL,
  driving_question text NOT NULL,
  hypothesis_prompt text NOT NULL,
  observation_prompt text NOT NULL,
  conclusion_prompt text NOT NULL,
  status public.content_status NOT NULL,
  source public.content_source NOT NULL,
  CONSTRAINT inquiries_lesson_id_fkey
    FOREIGN KEY (lesson_id)
    REFERENCES public.lessons(id)
    ON DELETE RESTRICT,
  CONSTRAINT inquiries_id_lesson_id_key
    UNIQUE (id, lesson_id)
);

CREATE INDEX inquiries_lesson_id_idx
  ON public.inquiries (lesson_id);

CREATE TABLE public.inquiry_objectives (
  inquiry_id text NOT NULL,
  objective_id text NOT NULL,
  lesson_id text NOT NULL,
  position integer NOT NULL,
  CONSTRAINT inquiry_objectives_pkey
    PRIMARY KEY (inquiry_id, objective_id),
  CONSTRAINT inquiry_objectives_inquiry_position_key
    UNIQUE (inquiry_id, position),
  CONSTRAINT inquiry_objectives_position_check
    CHECK (position >= 0),
  CONSTRAINT inquiry_objectives_inquiry_lesson_fkey
    FOREIGN KEY (inquiry_id, lesson_id)
    REFERENCES public.inquiries(id, lesson_id)
    ON DELETE RESTRICT,
  CONSTRAINT inquiry_objectives_objective_lesson_fkey
    FOREIGN KEY (objective_id, lesson_id)
    REFERENCES public.objectives(id, lesson_id)
    ON DELETE RESTRICT
);

CREATE INDEX inquiry_objectives_objective_id_idx
  ON public.inquiry_objectives (objective_id);

REVOKE ALL PRIVILEGES ON TABLE public.inquiries, public.inquiry_objectives
FROM anon, authenticated, service_role;

GRANT SELECT ON TABLE public.inquiries, public.inquiry_objectives
TO authenticated, service_role;

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inquiry_objectives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "active users read approved inquiries"
ON public.inquiries
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
    WHERE lessons.id = inquiries.lesson_id
      AND lessons.status = 'approved'
  )
);

CREATE POLICY "active users read approved inquiry objectives"
ON public.inquiry_objectives
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
    FROM public.inquiries
    JOIN public.lessons
      ON lessons.id = inquiries.lesson_id
    WHERE inquiries.id = inquiry_objectives.inquiry_id
      AND inquiries.lesson_id = inquiry_objectives.lesson_id
      AND inquiries.status = 'approved'
      AND lessons.status = 'approved'
  )
);
