-- Rafiq Al-Uloom | Phase 3-5A Fix 2A
-- Separate draft structural validity from submission readiness.
-- Forward-only evolution: the Phase 3-1 migration remains unchanged.

BEGIN;

CREATE FUNCTION public.lesson_revision_payload_error(
  p_payload jsonb,
  p_require_complete boolean
)
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

  IF p_require_complete AND v_objective_count = 0 THEN
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

  IF p_require_complete AND (v_question_count = 0 OR v_mastery_count = 0) THEN
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

REVOKE ALL ON FUNCTION public.lesson_revision_payload_error(jsonb, boolean)
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.lesson_revision_payload_error(p_payload jsonb)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RETURN public.lesson_revision_payload_error(p_payload, true);
END;
$$;

REVOKE ALL ON FUNCTION public.lesson_revision_payload_error(jsonb)
FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.create_lesson_revision(
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

  v_payload_error := public.lesson_revision_payload_error(p_payload, false);
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

CREATE OR REPLACE FUNCTION public.save_lesson_revision(
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

  v_payload_error := public.lesson_revision_payload_error(p_payload, false);
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

CREATE OR REPLACE FUNCTION public.submit_lesson_revision(p_revision_id uuid)
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

  v_payload_error := public.lesson_revision_payload_error(v_revision.payload, true);
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

CREATE OR REPLACE FUNCTION public.review_lesson_revision(
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

  v_payload_error := public.lesson_revision_payload_error(v_revision.payload, true);
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

COMMIT;

