-- Phase 3-1: Teacher Authoring Schema + RLS + Trusted Transitions
-- Scope: lesson revision storage, append-only review audit, trusted RPC transitions,
--        canonical lesson version publishing, and direct-write denial.
-- Explicitly excluded: React UI, client repositories/services, authorization.policy.ts activation,
--                      AI authoring, admin roles, and changes to v0.5 mastery-result contracts.

-- Canonical lesson history must remain referentially stable because mastery attempts retain
-- foreign keys to historical lesson/question rows. Publishing a revision therefore creates
-- a new canonical lesson row and retires the previous canonical row instead of rewriting it.
ALTER TABLE public.lessons
  ADD COLUMN archived_at timestamptz;

ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_archived_status_check
  CHECK (archived_at IS NULL OR status <> 'approved');

ALTER TABLE public.lessons
  DROP CONSTRAINT lessons_unit_order_key;

CREATE UNIQUE INDEX lessons_approved_unit_order_key
  ON public.lessons (unit_id, display_order)
  WHERE status = 'approved';

CREATE TABLE public.content_revisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL DEFAULT 'lesson',
  entity_id text,
  published_entity_id text,
  supersedes_revision_id uuid,
  author_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  payload jsonb NOT NULL,
  base_fingerprint text,
  revision_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  CONSTRAINT content_revisions_entity_type_check
    CHECK (entity_type = 'lesson'),
  CONSTRAINT content_revisions_status_check
    CHECK (status IN ('draft', 'pending_review', 'rejected', 'approved')),
  CONSTRAINT content_revisions_payload_object_check
    CHECK (jsonb_typeof(payload) = 'object'),
  CONSTRAINT content_revisions_base_fingerprint_check
    CHECK (base_fingerprint IS NULL OR base_fingerprint ~ '^[0-9a-f]{64}$'),
  CONSTRAINT content_revisions_revision_number_check
    CHECK (revision_number > 0),
  CONSTRAINT content_revisions_submission_state_check
    CHECK (
      (status = 'draft' AND submitted_at IS NULL)
      OR (status IN ('pending_review', 'rejected', 'approved') AND submitted_at IS NOT NULL)
    ),
  CONSTRAINT content_revisions_published_state_check
    CHECK (
      (status = 'approved' AND published_entity_id IS NOT NULL)
      OR (status <> 'approved' AND published_entity_id IS NULL)
    ),
  CONSTRAINT content_revisions_author_id_fkey
    FOREIGN KEY (author_id)
    REFERENCES public.profiles(id)
    ON DELETE RESTRICT,
  CONSTRAINT content_revisions_entity_id_fkey
    FOREIGN KEY (entity_id)
    REFERENCES public.lessons(id)
    ON DELETE RESTRICT,
  CONSTRAINT content_revisions_published_entity_id_fkey
    FOREIGN KEY (published_entity_id)
    REFERENCES public.lessons(id)
    ON DELETE RESTRICT,
  CONSTRAINT content_revisions_supersedes_revision_id_fkey
    FOREIGN KEY (supersedes_revision_id)
    REFERENCES public.content_revisions(id)
    ON DELETE RESTRICT
);

CREATE TABLE public.content_review_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  revision_id uuid NOT NULL,
  reviewer_id uuid NOT NULL,
  decision text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_review_events_decision_check
    CHECK (decision IN ('approve', 'reject')),
  CONSTRAINT content_review_events_reject_note_check
    CHECK (
      decision <> 'reject'
      OR (note IS NOT NULL AND btrim(note) <> '')
    ),
  CONSTRAINT content_review_events_revision_id_fkey
    FOREIGN KEY (revision_id)
    REFERENCES public.content_revisions(id)
    ON DELETE RESTRICT,
  CONSTRAINT content_review_events_reviewer_id_fkey
    FOREIGN KEY (reviewer_id)
    REFERENCES public.profiles(id)
    ON DELETE RESTRICT
);

CREATE INDEX content_revisions_author_status_idx
  ON public.content_revisions (author_id, status, updated_at DESC);

CREATE INDEX content_revisions_review_queue_idx
  ON public.content_revisions (status, submitted_at, id)
  WHERE status = 'pending_review';

CREATE INDEX content_revisions_entity_idx
  ON public.content_revisions (entity_type, entity_id, revision_number DESC);

CREATE INDEX content_review_events_revision_created_idx
  ON public.content_review_events (revision_id, created_at, id);

COMMENT ON TABLE public.content_revisions IS
  'Phase 3 authoring-plane lesson revisions. Canonical published content remains in the existing content tables.';
COMMENT ON TABLE public.content_review_events IS
  'Append-only reviewer decisions for content revisions. Application roles receive no direct write privilege.';
COMMENT ON COLUMN public.content_revisions.base_fingerprint IS
  'Server-derived SHA-256 fingerprint of the approved canonical lesson graph at revision creation time; NULL for new content.';
COMMENT ON COLUMN public.content_revisions.published_entity_id IS
  'Server-generated canonical lesson id created atomically when a pending revision is approved.';
COMMENT ON COLUMN public.lessons.archived_at IS
  'Non-null only for a superseded canonical lesson version retained for historical referential integrity.';

CREATE FUNCTION public.set_content_revision_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_content_revision_updated_at
BEFORE UPDATE ON public.content_revisions
FOR EACH ROW
EXECUTE FUNCTION public.set_content_revision_updated_at();

CREATE FUNCTION public.jsonb_is_text_array(p_value jsonb, p_allow_empty boolean DEFAULT true)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF p_value IS NULL OR jsonb_typeof(p_value) <> 'array' THEN
    RETURN false;
  END IF;

  IF NOT p_allow_empty AND jsonb_array_length(p_value) = 0 THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_value) AS item(value)
    WHERE jsonb_typeof(item.value) <> 'string'
      OR btrim(item.value #>> '{}') = ''
  );
END;
$$;

CREATE FUNCTION public.lesson_revision_payload_error(p_payload jsonb)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_lesson jsonb;
  v_objectives jsonb;
  v_questions jsonb;
  v_games jsonb;
  v_experiments jsonb;
  v_objective_count integer;
  v_question_count integer;
  v_mastery_count integer;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RETURN 'invalid_payload';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(p_payload) AS key(name)
    WHERE key.name NOT IN ('lesson', 'objectives', 'questions', 'games', 'experiments')
  ) THEN
    RETURN 'invalid_payload';
  END IF;

  v_lesson := p_payload -> 'lesson';
  v_objectives := p_payload -> 'objectives';
  v_questions := p_payload -> 'questions';
  v_games := p_payload -> 'games';
  v_experiments := p_payload -> 'experiments';

  IF jsonb_typeof(v_lesson) <> 'object'
    OR jsonb_typeof(v_objectives) <> 'array'
    OR jsonb_typeof(v_questions) <> 'array'
    OR jsonb_typeof(v_games) <> 'array'
    OR jsonb_typeof(v_experiments) <> 'array'
  THEN
    RETURN 'invalid_payload';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_object_keys(v_lesson) AS key(name)
    WHERE key.name NOT IN (
      'unitId', 'title', 'displayOrder', 'summary',
      'keyConcepts', 'examples', 'misconceptions'
    )
  ) THEN
    RETURN 'invalid_payload';
  END IF;

  IF jsonb_typeof(v_lesson -> 'unitId') <> 'string'
    OR btrim(v_lesson ->> 'unitId') = ''
    OR jsonb_typeof(v_lesson -> 'title') <> 'string'
    OR btrim(v_lesson ->> 'title') = ''
    OR jsonb_typeof(v_lesson -> 'displayOrder') <> 'number'
    OR (v_lesson ->> 'displayOrder') !~ '^[0-9]+$'
    OR jsonb_typeof(v_lesson -> 'summary') <> 'string'
    OR btrim(v_lesson ->> 'summary') = ''
    OR NOT public.jsonb_is_text_array(v_lesson -> 'keyConcepts')
    OR NOT public.jsonb_is_text_array(v_lesson -> 'examples')
    OR NOT public.jsonb_is_text_array(v_lesson -> 'misconceptions')
  THEN
    RETURN 'invalid_payload';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.units
    WHERE units.id = v_lesson ->> 'unitId'
  ) THEN
    RETURN 'unit_not_available';
  END IF;

  SELECT count(*)::integer
  INTO v_objective_count
  FROM jsonb_array_elements(v_objectives);

  IF v_objective_count = 0 THEN
    RETURN 'invalid_payload';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_objectives) AS objective(value)
    WHERE jsonb_typeof(objective.value) <> 'object'
      OR EXISTS (
        SELECT 1
        FROM jsonb_object_keys(
          CASE
            WHEN jsonb_typeof(objective.value) = 'object' THEN objective.value
            ELSE '{}'::jsonb
          END
        ) AS key(name)
        WHERE key.name NOT IN ('key', 'text')
      )
      OR jsonb_typeof(objective.value -> 'key') <> 'string'
      OR btrim(objective.value ->> 'key') = ''
      OR jsonb_typeof(objective.value -> 'text') <> 'string'
      OR btrim(objective.value ->> 'text') = ''
  ) THEN
    RETURN 'invalid_payload';
  END IF;

  IF (
    SELECT count(DISTINCT objective.value ->> 'key')
    FROM jsonb_array_elements(v_objectives) AS objective(value)
  ) <> v_objective_count THEN
    RETURN 'invalid_payload';
  END IF;

  SELECT
    count(*)::integer,
    count(*) FILTER (WHERE question.value ->> 'purpose' = 'mastery')::integer
  INTO v_question_count, v_mastery_count
  FROM jsonb_array_elements(v_questions) AS question(value);

  IF v_question_count = 0 OR v_mastery_count = 0 THEN
    RETURN 'invalid_payload';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_questions) AS question(value)
    WHERE jsonb_typeof(question.value) <> 'object'
      OR EXISTS (
        SELECT 1
        FROM jsonb_object_keys(
          CASE
            WHEN jsonb_typeof(question.value) = 'object' THEN question.value
            ELSE '{}'::jsonb
          END
        ) AS key(name)
        WHERE key.name NOT IN (
          'key', 'purpose', 'type', 'prompt', 'choices', 'correctAnswerIndex',
          'explanation', 'objectiveKey', 'difficulty'
        )
      )
      OR jsonb_typeof(question.value -> 'key') <> 'string'
      OR btrim(question.value ->> 'key') = ''
      OR jsonb_typeof(question.value -> 'purpose') <> 'string'
      OR question.value ->> 'purpose' NOT IN ('review', 'mastery')
      OR jsonb_typeof(question.value -> 'type') <> 'string'
      OR question.value ->> 'type' <> 'multiple_choice'
      OR jsonb_typeof(question.value -> 'prompt') <> 'string'
      OR btrim(question.value ->> 'prompt') = ''
      OR NOT public.jsonb_is_text_array(question.value -> 'choices', false)
      OR jsonb_array_length(
        CASE
          WHEN jsonb_typeof(question.value -> 'choices') = 'array'
          THEN question.value -> 'choices'
          ELSE '[]'::jsonb
        END
      ) < 2
      OR jsonb_typeof(question.value -> 'correctAnswerIndex') <> 'number'
      OR (question.value ->> 'correctAnswerIndex') !~ '^[0-9]+$'
      OR CASE
        WHEN jsonb_typeof(question.value -> 'correctAnswerIndex') = 'number'
          AND (question.value ->> 'correctAnswerIndex') ~ '^[0-9]+$'
          AND jsonb_typeof(question.value -> 'choices') = 'array'
        THEN (question.value ->> 'correctAnswerIndex')::integer
          >= jsonb_array_length(question.value -> 'choices')
        ELSE true
      END
      OR jsonb_typeof(question.value -> 'explanation') <> 'string'
      OR btrim(question.value ->> 'explanation') = ''
      OR jsonb_typeof(question.value -> 'objectiveKey') <> 'string'
      OR btrim(question.value ->> 'objectiveKey') = ''
      OR jsonb_typeof(question.value -> 'difficulty') <> 'string'
      OR btrim(question.value ->> 'difficulty') = ''
      OR NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_objectives) AS objective(value)
        WHERE objective.value ->> 'key' = question.value ->> 'objectiveKey'
      )
  ) THEN
    RETURN 'invalid_payload';
  END IF;

  IF (
    SELECT count(DISTINCT question.value ->> 'key')
    FROM jsonb_array_elements(v_questions) AS question(value)
  ) <> v_question_count THEN
    RETURN 'invalid_payload';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_games) AS game(value)
    WHERE jsonb_typeof(game.value) <> 'object'
      OR EXISTS (
        SELECT 1
        FROM jsonb_object_keys(
          CASE
            WHEN jsonb_typeof(game.value) = 'object' THEN game.value
            ELSE '{}'::jsonb
          END
        ) AS key(name)
        WHERE key.name NOT IN ('key', 'type', 'title', 'instructions', 'items', 'objectiveKeys')
      )
      OR jsonb_typeof(game.value -> 'key') <> 'string'
      OR btrim(game.value ->> 'key') = ''
      OR jsonb_typeof(game.value -> 'type') <> 'string'
      OR game.value ->> 'type' <> 'matching'
      OR jsonb_typeof(game.value -> 'title') <> 'string'
      OR btrim(game.value ->> 'title') = ''
      OR jsonb_typeof(game.value -> 'instructions') <> 'string'
      OR btrim(game.value ->> 'instructions') = ''
      OR jsonb_typeof(game.value -> 'items') <> 'array'
      OR NOT public.jsonb_is_text_array(game.value -> 'objectiveKeys', false)
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(game.value -> 'objectiveKeys') = 'array'
            THEN game.value -> 'objectiveKeys'
            ELSE '[]'::jsonb
          END
        ) AS objective_key(value)
        WHERE NOT EXISTS (
          SELECT 1
          FROM jsonb_array_elements(v_objectives) AS objective(value)
          WHERE objective.value ->> 'key' = objective_key.value
        )
      )
  ) THEN
    RETURN 'invalid_payload';
  END IF;

  IF (
    SELECT count(DISTINCT game.value ->> 'key')
    FROM jsonb_array_elements(v_games) AS game(value)
  ) <> jsonb_array_length(v_games) THEN
    RETURN 'invalid_payload';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_experiments) AS experiment(value)
    WHERE jsonb_typeof(experiment.value) <> 'object'
      OR EXISTS (
        SELECT 1
        FROM jsonb_object_keys(
          CASE
            WHEN jsonb_typeof(experiment.value) = 'object' THEN experiment.value
            ELSE '{}'::jsonb
          END
        ) AS key(name)
        WHERE key.name NOT IN (
          'key', 'title', 'objective', 'tools', 'steps', 'safetyNotes', 'safetyLevel',
          'observationPrompt', 'conclusionPrompt', 'homeAlternative'
        )
      )
      OR jsonb_typeof(experiment.value -> 'key') <> 'string'
      OR btrim(experiment.value ->> 'key') = ''
      OR jsonb_typeof(experiment.value -> 'title') <> 'string'
      OR btrim(experiment.value ->> 'title') = ''
      OR jsonb_typeof(experiment.value -> 'objective') <> 'string'
      OR btrim(experiment.value ->> 'objective') = ''
      OR NOT public.jsonb_is_text_array(experiment.value -> 'tools')
      OR NOT public.jsonb_is_text_array(experiment.value -> 'steps', false)
      OR NOT public.jsonb_is_text_array(experiment.value -> 'safetyNotes')
      OR jsonb_typeof(experiment.value -> 'safetyLevel') <> 'string'
      OR experiment.value ->> 'safetyLevel' NOT IN (
        'safe_home', 'teacher_supervised', 'lab_only', 'not_allowed'
      )
      OR jsonb_typeof(experiment.value -> 'observationPrompt') <> 'string'
      OR btrim(experiment.value ->> 'observationPrompt') = ''
      OR jsonb_typeof(experiment.value -> 'conclusionPrompt') <> 'string'
      OR btrim(experiment.value ->> 'conclusionPrompt') = ''
      OR (
        experiment.value ? 'homeAlternative'
        AND jsonb_typeof(experiment.value -> 'homeAlternative') NOT IN ('string', 'null')
      )
  ) THEN
    RETURN 'invalid_payload';
  END IF;

  IF (
    SELECT count(DISTINCT experiment.value ->> 'key')
    FROM jsonb_array_elements(v_experiments) AS experiment(value)
  ) <> jsonb_array_length(v_experiments) THEN
    RETURN 'invalid_payload';
  END IF;

  RETURN NULL;
END;
$$;

CREATE FUNCTION public.lesson_content_fingerprint(p_lesson_id text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'lesson', jsonb_build_object(
            'id', lessons.id,
            'unitId', lessons.unit_id,
            'title', lessons.title,
            'displayOrder', lessons.display_order,
            'summary', lessons.summary,
            'keyConcepts', to_jsonb(lessons.key_concepts),
            'examples', to_jsonb(lessons.examples),
            'misconceptions', to_jsonb(lessons.misconceptions),
            'status', lessons.status::text,
            'source', lessons.source::text
          ),
          'objectives', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object('id', objectives.id, 'text', objectives.text)
              ORDER BY objectives.id
            )
            FROM public.objectives
            WHERE objectives.lesson_id = lessons.id
          ), '[]'::jsonb),
          'questions', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', questions.id,
                'purpose', questions.purpose,
                'type', questions.type,
                'prompt', questions.prompt,
                'choices', to_jsonb(questions.choices),
                'correctAnswerIndex', questions.correct_answer_index,
                'explanation', questions.explanation,
                'objectiveId', questions.objective_id,
                'difficulty', questions.difficulty,
                'status', questions.status::text,
                'source', questions.source::text
              )
              ORDER BY questions.id
            )
            FROM public.questions
            WHERE questions.lesson_id = lessons.id
          ), '[]'::jsonb),
          'games', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', games.id,
                'type', games.type,
                'title', games.title,
                'instructions', games.instructions,
                'items', games.items,
                'status', games.status::text,
                'source', games.source::text,
                'objectiveIds', COALESCE((
                  SELECT jsonb_agg(game_objectives.objective_id ORDER BY game_objectives.position)
                  FROM public.game_objectives
                  WHERE game_objectives.game_id = games.id
                ), '[]'::jsonb)
              )
              ORDER BY games.id
            )
            FROM public.games
            WHERE games.lesson_id = lessons.id
          ), '[]'::jsonb),
          'experiments', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', experiments.id,
                'title', experiments.title,
                'objective', experiments.objective,
                'tools', to_jsonb(experiments.tools),
                'steps', to_jsonb(experiments.steps),
                'safetyNotes', to_jsonb(experiments.safety_notes),
                'safetyLevel', experiments.safety_level::text,
                'observationPrompt', experiments.observation_prompt,
                'conclusionPrompt', experiments.conclusion_prompt,
                'homeAlternative', experiments.home_alternative,
                'status', experiments.status::text,
                'source', experiments.source::text
              )
              ORDER BY experiments.id
            )
            FROM public.experiments
            WHERE experiments.lesson_id = lessons.id
          ), '[]'::jsonb)
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  )
  FROM public.lessons
  WHERE lessons.id = p_lesson_id
    AND lessons.status = 'approved';
$$;

CREATE FUNCTION public.create_lesson_revision(
  p_payload jsonb,
  p_entity_id text DEFAULT NULL,
  p_supersedes_revision_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_payload_error text;
  v_source public.content_revisions%ROWTYPE;
  v_entity_id text := p_entity_id;
  v_base_fingerprint text;
  v_revision_number integer := 1;
  v_revision_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'not_authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = v_user_id
      AND profiles.role = 'teacher'
      AND profiles.status = 'active'
  ) THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'not_authorized');
  END IF;

  v_payload_error := public.lesson_revision_payload_error(p_payload);
  IF v_payload_error IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', v_payload_error);
  END IF;

  IF p_supersedes_revision_id IS NOT NULL THEN
    SELECT *
    INTO v_source
    FROM public.content_revisions
    WHERE id = p_supersedes_revision_id
      AND author_id = v_user_id
      AND entity_type = 'lesson'
      AND status = 'rejected';

    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 'rejected', 'reason', 'source_revision_not_available');
    END IF;

    IF p_entity_id IS NOT NULL AND p_entity_id IS DISTINCT FROM v_source.entity_id THEN
      RETURN jsonb_build_object('status', 'rejected', 'reason', 'source_revision_mismatch');
    END IF;

    v_entity_id := v_source.entity_id;
    v_revision_number := v_source.revision_number + 1;
  ELSIF v_entity_id IS NOT NULL THEN
    SELECT COALESCE(max(revision_number), 0) + 1
    INTO v_revision_number
    FROM public.content_revisions
    WHERE entity_type = 'lesson'
      AND entity_id = v_entity_id;
  END IF;

  IF v_entity_id IS NOT NULL THEN
    v_base_fingerprint := public.lesson_content_fingerprint(v_entity_id);
    IF v_base_fingerprint IS NULL THEN
      RETURN jsonb_build_object('status', 'rejected', 'reason', 'lesson_not_available');
    END IF;
  END IF;

  INSERT INTO public.content_revisions (
    entity_type,
    entity_id,
    supersedes_revision_id,
    author_id,
    status,
    payload,
    base_fingerprint,
    revision_number
  )
  VALUES (
    'lesson',
    v_entity_id,
    p_supersedes_revision_id,
    v_user_id,
    'draft',
    p_payload,
    v_base_fingerprint,
    v_revision_number
  )
  RETURNING id INTO v_revision_id;

  RETURN jsonb_build_object(
    'status', 'created',
    'revision', jsonb_build_object(
      'id', v_revision_id,
      'entityId', v_entity_id,
      'revisionNumber', v_revision_number,
      'baseFingerprint', v_base_fingerprint
    )
  );
END;
$$;

CREATE FUNCTION public.save_lesson_revision(
  p_revision_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_payload_error text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'not_authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = v_user_id
      AND profiles.role = 'teacher'
      AND profiles.status = 'active'
  ) THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'not_authorized');
  END IF;

  v_payload_error := public.lesson_revision_payload_error(p_payload);
  IF v_payload_error IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', v_payload_error);
  END IF;

  UPDATE public.content_revisions
  SET payload = p_payload
  WHERE id = p_revision_id
    AND author_id = v_user_id
    AND entity_type = 'lesson'
    AND status = 'draft';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'revision_not_editable');
  END IF;

  RETURN jsonb_build_object('status', 'saved', 'revisionId', p_revision_id);
END;
$$;

CREATE FUNCTION public.submit_lesson_revision(p_revision_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_revision public.content_revisions%ROWTYPE;
  v_payload_error text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'not_authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = v_user_id
      AND profiles.role = 'teacher'
      AND profiles.status = 'active'
  ) THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'not_authorized');
  END IF;

  SELECT *
  INTO v_revision
  FROM public.content_revisions
  WHERE id = p_revision_id
    AND author_id = v_user_id
    AND entity_type = 'lesson'
    AND status = 'draft'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'revision_not_submittable');
  END IF;

  v_payload_error := public.lesson_revision_payload_error(v_revision.payload);
  IF v_payload_error IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', v_payload_error);
  END IF;

  UPDATE public.content_revisions
  SET status = 'pending_review',
      submitted_at = now()
  WHERE id = p_revision_id;

  RETURN jsonb_build_object('status', 'submitted', 'revisionId', p_revision_id);
END;
$$;

CREATE FUNCTION public.review_lesson_revision(
  p_revision_id uuid,
  p_decision text,
  p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_revision public.content_revisions%ROWTYPE;
  v_payload_error text;
  v_current_fingerprint text;
  v_new_lesson_id text;
  v_lesson jsonb;
  v_objectives jsonb;
  v_questions jsonb;
  v_games jsonb;
  v_experiments jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'not_authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = v_user_id
      AND profiles.role = 'reviewer'
      AND profiles.status = 'active'
  ) THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'not_authorized');
  END IF;

  IF p_decision NOT IN ('approve', 'reject') THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_decision');
  END IF;

  IF p_decision = 'reject' AND (p_note IS NULL OR btrim(p_note) = '') THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'review_note_required');
  END IF;

  SELECT *
  INTO v_revision
  FROM public.content_revisions
  WHERE id = p_revision_id
    AND entity_type = 'lesson'
    AND status = 'pending_review'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'revision_not_reviewable');
  END IF;

  IF p_decision = 'reject' THEN
    INSERT INTO public.content_review_events (revision_id, reviewer_id, decision, note)
    VALUES (p_revision_id, v_user_id, 'reject', btrim(p_note));

    UPDATE public.content_revisions
    SET status = 'rejected'
    WHERE id = p_revision_id;

    RETURN jsonb_build_object('status', 'rejected_by_reviewer', 'revisionId', p_revision_id);
  END IF;

  v_payload_error := public.lesson_revision_payload_error(v_revision.payload);
  IF v_payload_error IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', v_payload_error);
  END IF;

  IF v_revision.entity_id IS NOT NULL THEN
    v_current_fingerprint := public.lesson_content_fingerprint(v_revision.entity_id);
    IF v_current_fingerprint IS NULL
      OR v_current_fingerprint IS DISTINCT FROM v_revision.base_fingerprint
    THEN
      RETURN jsonb_build_object('status', 'rejected', 'reason', 'stale_revision');
    END IF;
  END IF;

  v_lesson := v_revision.payload -> 'lesson';
  v_objectives := v_revision.payload -> 'objectives';
  v_questions := v_revision.payload -> 'questions';
  v_games := v_revision.payload -> 'games';
  v_experiments := v_revision.payload -> 'experiments';

  IF EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.unit_id = v_lesson ->> 'unitId'
      AND lessons.display_order = (v_lesson ->> 'displayOrder')::integer
      AND lessons.status = 'approved'
      AND (v_revision.entity_id IS NULL OR lessons.id <> v_revision.entity_id)
  ) THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'canonical_position_conflict');
  END IF;

  v_new_lesson_id := 'lesson-' || replace(v_revision.id::text, '-', '');

  IF v_revision.entity_id IS NOT NULL THEN
    UPDATE public.lessons
    SET status = 'draft',
        archived_at = now()
    WHERE id = v_revision.entity_id
      AND status = 'approved';

    IF NOT FOUND THEN
      RETURN jsonb_build_object('status', 'rejected', 'reason', 'stale_revision');
    END IF;
  END IF;

  INSERT INTO public.lessons (
    id,
    unit_id,
    title,
    display_order,
    summary,
    key_concepts,
    examples,
    misconceptions,
    status,
    source,
    archived_at
  )
  VALUES (
    v_new_lesson_id,
    v_lesson ->> 'unitId',
    v_lesson ->> 'title',
    (v_lesson ->> 'displayOrder')::integer,
    v_lesson ->> 'summary',
    ARRAY(SELECT jsonb_array_elements_text(v_lesson -> 'keyConcepts')),
    ARRAY(SELECT jsonb_array_elements_text(v_lesson -> 'examples')),
    ARRAY(SELECT jsonb_array_elements_text(v_lesson -> 'misconceptions')),
    'approved',
    'teacher_authored',
    NULL
  );

  INSERT INTO public.objectives (id, lesson_id, text)
  SELECT
    v_new_lesson_id || '-objective-' || lpad(objective.ordinality::text, 3, '0'),
    v_new_lesson_id,
    objective.value ->> 'text'
  FROM jsonb_array_elements(v_objectives) WITH ORDINALITY AS objective(value, ordinality);

  INSERT INTO public.questions (
    id,
    lesson_id,
    purpose,
    type,
    prompt,
    choices,
    correct_answer_index,
    explanation,
    objective_id,
    difficulty,
    status,
    source
  )
  SELECT
    v_new_lesson_id || '-question-' || lpad(question.ordinality::text, 3, '0'),
    v_new_lesson_id,
    question.value ->> 'purpose',
    'multiple_choice',
    question.value ->> 'prompt',
    ARRAY(SELECT jsonb_array_elements_text(question.value -> 'choices')),
    (question.value ->> 'correctAnswerIndex')::integer,
    question.value ->> 'explanation',
    v_new_lesson_id || '-objective-' || lpad(objective.ordinality::text, 3, '0'),
    question.value ->> 'difficulty',
    'approved',
    'teacher_authored'
  FROM jsonb_array_elements(v_questions) WITH ORDINALITY AS question(value, ordinality)
  JOIN jsonb_array_elements(v_objectives) WITH ORDINALITY AS objective(value, ordinality)
    ON objective.value ->> 'key' = question.value ->> 'objectiveKey';

  INSERT INTO public.games (
    id,
    lesson_id,
    type,
    title,
    instructions,
    items,
    status,
    source
  )
  SELECT
    v_new_lesson_id || '-game-' || lpad(game.ordinality::text, 3, '0'),
    v_new_lesson_id,
    'matching',
    game.value ->> 'title',
    game.value ->> 'instructions',
    game.value -> 'items',
    'approved',
    'teacher_authored'
  FROM jsonb_array_elements(v_games) WITH ORDINALITY AS game(value, ordinality);

  INSERT INTO public.game_objectives (game_id, objective_id, position)
  SELECT
    v_new_lesson_id || '-game-' || lpad(game.ordinality::text, 3, '0'),
    v_new_lesson_id || '-objective-' || lpad(objective.ordinality::text, 3, '0'),
    objective_key.position::integer - 1
  FROM jsonb_array_elements(v_games) WITH ORDINALITY AS game(value, ordinality)
  CROSS JOIN LATERAL jsonb_array_elements_text(game.value -> 'objectiveKeys')
    WITH ORDINALITY AS objective_key(value, position)
  JOIN jsonb_array_elements(v_objectives) WITH ORDINALITY AS objective(value, ordinality)
    ON objective.value ->> 'key' = objective_key.value;

  INSERT INTO public.experiments (
    id,
    lesson_id,
    title,
    objective,
    tools,
    steps,
    safety_notes,
    safety_level,
    observation_prompt,
    conclusion_prompt,
    home_alternative,
    status,
    source
  )
  SELECT
    v_new_lesson_id || '-experiment-' || lpad(experiment.ordinality::text, 3, '0'),
    v_new_lesson_id,
    experiment.value ->> 'title',
    experiment.value ->> 'objective',
    ARRAY(SELECT jsonb_array_elements_text(experiment.value -> 'tools')),
    ARRAY(SELECT jsonb_array_elements_text(experiment.value -> 'steps')),
    ARRAY(SELECT jsonb_array_elements_text(experiment.value -> 'safetyNotes')),
    (experiment.value ->> 'safetyLevel')::public.safety_level,
    experiment.value ->> 'observationPrompt',
    experiment.value ->> 'conclusionPrompt',
    CASE
      WHEN experiment.value ? 'homeAlternative'
        AND jsonb_typeof(experiment.value -> 'homeAlternative') = 'string'
      THEN experiment.value ->> 'homeAlternative'
      ELSE NULL
    END,
    'approved',
    'teacher_authored'
  FROM jsonb_array_elements(v_experiments) WITH ORDINALITY AS experiment(value, ordinality);

  INSERT INTO public.content_review_events (revision_id, reviewer_id, decision, note)
  VALUES (
    p_revision_id,
    v_user_id,
    'approve',
    NULLIF(btrim(COALESCE(p_note, '')), '')
  );

  UPDATE public.content_revisions
  SET status = 'approved',
      published_entity_id = v_new_lesson_id
  WHERE id = p_revision_id;

  RETURN jsonb_build_object(
    'status', 'approved',
    'revisionId', p_revision_id,
    'publishedEntityId', v_new_lesson_id
  );
END;
$$;

ALTER TABLE public.content_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_review_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.content_revisions,
  public.content_review_events
FROM anon, authenticated, service_role;

GRANT SELECT ON TABLE
  public.content_revisions,
  public.content_review_events
TO authenticated;

GRANT SELECT ON TABLE
  public.content_revisions,
  public.content_review_events
TO service_role;

CREATE POLICY "active teachers read own content revisions"
ON public.content_revisions
FOR SELECT
TO authenticated
USING (
  author_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
      AND profiles.status = 'active'
  )
);

CREATE POLICY "active reviewers read pending content revisions"
ON public.content_revisions
FOR SELECT
TO authenticated
USING (
  status = 'pending_review'
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'reviewer'
      AND profiles.status = 'active'
  )
);

CREATE POLICY "active teachers read review events for own revisions"
ON public.content_review_events
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.content_revisions
    JOIN public.profiles
      ON profiles.id = content_revisions.author_id
    WHERE content_revisions.id = content_review_events.revision_id
      AND content_revisions.author_id = auth.uid()
      AND profiles.id = auth.uid()
      AND profiles.role = 'teacher'
      AND profiles.status = 'active'
  )
);

CREATE POLICY "active reviewers read own review events"
ON public.content_review_events
FOR SELECT
TO authenticated
USING (
  reviewer_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'reviewer'
      AND profiles.status = 'active'
  )
);

REVOKE ALL ON FUNCTION public.set_content_revision_updated_at() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.jsonb_is_text_array(jsonb, boolean) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.lesson_revision_payload_error(jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.lesson_content_fingerprint(text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_lesson_revision(jsonb, text, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.save_lesson_revision(uuid, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.submit_lesson_revision(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.review_lesson_revision(uuid, text, text) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_lesson_revision(jsonb, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_lesson_revision(uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_lesson_revision(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_lesson_revision(uuid, text, text) TO authenticated;
