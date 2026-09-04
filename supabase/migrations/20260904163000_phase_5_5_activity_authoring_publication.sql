-- Phase 5-5C2: Atomic canonical activity publication
-- Part A: expand canonical lesson fingerprint to the complete authorable graph.
-- Part B: review_lesson_revision publication is appended below before this migration is applied.

BEGIN;

-- Preserve exactly the active revisions that are not stale according to
-- the historical V1 fingerprint before replacing that fingerprint.
CREATE TEMP TABLE phase_5_5_fingerprint_rebase_candidates
ON COMMIT DROP
AS
SELECT content_revisions.id
FROM public.content_revisions
WHERE content_revisions.status IN ('draft', 'pending_review')
  AND content_revisions.entity_id IS NOT NULL
  AND content_revisions.base_fingerprint IS NOT NULL
  AND content_revisions.base_fingerprint =
      public.lesson_content_fingerprint(content_revisions.entity_id);

CREATE OR REPLACE FUNCTION public.lesson_content_fingerprint(p_lesson_id text)
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
              jsonb_build_object(
                'id', objectives.id,
                'text', objectives.text
              )
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
                  SELECT jsonb_agg(
                    game_objectives.objective_id
                    ORDER BY game_objectives.position
                  )
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
                'source', experiments.source::text,
                'objectiveIds', COALESCE((
                  SELECT jsonb_agg(
                    experiment_objectives.objective_id
                    ORDER BY experiment_objectives.position
                  )
                  FROM public.experiment_objectives
                  WHERE experiment_objectives.experiment_id = experiments.id
                ), '[]'::jsonb)
              )
              ORDER BY experiments.id
            )
            FROM public.experiments
            WHERE experiments.lesson_id = lessons.id
          ), '[]'::jsonb),

          'simulations', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', simulations.id,
                'title', simulations.title,
                'instructions', simulations.instructions,
                'engineKind', simulations.engine_kind,
                'config', simulations.config,
                'status', simulations.status::text,
                'source', simulations.source::text,
                'objectiveIds', COALESCE((
                  SELECT jsonb_agg(
                    simulation_objectives.objective_id
                    ORDER BY simulation_objectives.position
                  )
                  FROM public.simulation_objectives
                  WHERE simulation_objectives.simulation_id = simulations.id
                ), '[]'::jsonb)
              )
              ORDER BY simulations.id
            )
            FROM public.simulations
            WHERE simulations.lesson_id = lessons.id
          ), '[]'::jsonb),

          'inquiries', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', inquiries.id,
                'title', inquiries.title,
                'instructions', inquiries.instructions,
                'context', inquiries.context,
                'drivingQuestion', inquiries.driving_question,
                'hypothesisPrompt', inquiries.hypothesis_prompt,
                'observationPrompt', inquiries.observation_prompt,
                'conclusionPrompt', inquiries.conclusion_prompt,
                'status', inquiries.status::text,
                'source', inquiries.source::text,
                'objectiveIds', COALESCE((
                  SELECT jsonb_agg(
                    inquiry_objectives.objective_id
                    ORDER BY inquiry_objectives.position
                  )
                  FROM public.inquiry_objectives
                  WHERE inquiry_objectives.inquiry_id = inquiries.id
                ), '[]'::jsonb)
              )
              ORDER BY inquiries.id
            )
            FROM public.inquiries
            WHERE inquiries.lesson_id = lessons.id
          ), '[]'::jsonb),

          'dataActivities', COALESCE((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', data_activities.id,
                'title', data_activities.title,
                'instructions', data_activities.instructions,
                'engineKind', data_activities.engine_kind,
                'config', data_activities.config,
                'status', data_activities.status::text,
                'source', data_activities.source::text,
                'objectiveIds', COALESCE((
                  SELECT jsonb_agg(
                    data_activity_objectives.objective_id
                    ORDER BY data_activity_objectives.position
                  )
                  FROM public.data_activity_objectives
                  WHERE data_activity_objectives.data_activity_id =
                        data_activities.id
                ), '[]'::jsonb)
              )
              ORDER BY data_activities.id
            )
            FROM public.data_activities
            WHERE data_activities.lesson_id = lessons.id
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

REVOKE ALL ON FUNCTION public.lesson_content_fingerprint(text)
FROM PUBLIC, anon, authenticated, service_role;

-- Rebase only revisions that were demonstrably current under V1 immediately
-- before the fingerprint definition changed.
UPDATE public.content_revisions
SET base_fingerprint =
      public.lesson_content_fingerprint(content_revisions.entity_id)
FROM phase_5_5_fingerprint_rebase_candidates AS candidate
WHERE content_revisions.id = candidate.id
  AND content_revisions.status IN ('draft', 'pending_review')
  AND content_revisions.entity_id IS NOT NULL;

-- C2-B review_lesson_revision replacement is appended below.
-- COMMIT intentionally remains absent until Part B is added.

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
  v_simulations jsonb;
  v_inquiries jsonb;
  v_data_activities jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'reason', 'not_authenticated'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = v_user_id
      AND profiles.role = 'reviewer'
      AND profiles.status = 'active'
  ) THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'reason', 'not_authorized'
    );
  END IF;

  IF p_decision NOT IN ('approve', 'reject') THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'reason', 'invalid_decision'
    );
  END IF;

  IF p_decision = 'reject'
    AND (p_note IS NULL OR btrim(p_note) = '')
  THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'reason', 'review_note_required'
    );
  END IF;

  SELECT *
  INTO v_revision
  FROM public.content_revisions
  WHERE id = p_revision_id
    AND entity_type = 'lesson'
    AND status = 'pending_review'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'reason', 'revision_not_reviewable'
    );
  END IF;

  -- Historical pending revisions must remain rejectable even when their
  -- old payload no longer satisfies the current structural contract.
  IF p_decision = 'reject' THEN
    INSERT INTO public.content_review_events (
      revision_id,
      reviewer_id,
      decision,
      note
    )
    VALUES (
      p_revision_id,
      v_user_id,
      'reject',
      btrim(p_note)
    );

    UPDATE public.content_revisions
    SET status = 'rejected'
    WHERE id = p_revision_id;

    RETURN jsonb_build_object(
      'status', 'rejected_by_reviewer',
      'revisionId', p_revision_id
    );
  END IF;

  -- Approval always requires the complete current contract.
  v_payload_error :=
    public.lesson_revision_payload_error(
      v_revision.payload,
      true
    );

  IF v_payload_error IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'reason', v_payload_error
    );
  END IF;

  -- Existing canonical content must still match the fingerprint captured
  -- when this revision was created.
  IF v_revision.entity_id IS NOT NULL THEN
    v_current_fingerprint :=
      public.lesson_content_fingerprint(
        v_revision.entity_id
      );

    IF v_current_fingerprint IS NULL
      OR v_current_fingerprint
        IS DISTINCT FROM v_revision.base_fingerprint
    THEN
      RETURN jsonb_build_object(
        'status', 'rejected',
        'reason', 'stale_revision'
      );
    END IF;
  END IF;

  v_lesson := v_revision.payload -> 'lesson';
  v_objectives := v_revision.payload -> 'objectives';
  v_questions := v_revision.payload -> 'questions';
  v_games := v_revision.payload -> 'games';
  v_experiments := v_revision.payload -> 'experiments';
  v_simulations := v_revision.payload -> 'simulations';
  v_inquiries := v_revision.payload -> 'inquiries';
  v_data_activities := v_revision.payload -> 'dataActivities';

  IF EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.unit_id = v_lesson ->> 'unitId'
      AND lessons.display_order =
          (v_lesson ->> 'displayOrder')::integer
      AND lessons.status = 'approved'
      AND (
        v_revision.entity_id IS NULL
        OR lessons.id <> v_revision.entity_id
      )
  ) THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'reason', 'canonical_position_conflict'
    );
  END IF;

  v_new_lesson_id :=
    'lesson-' || replace(v_revision.id::text, '-', '');

  -- Preserve historical canonical rows. The previous lesson is retired,
  -- never rewritten or deleted.
  IF v_revision.entity_id IS NOT NULL THEN
    UPDATE public.lessons
    SET status = 'draft',
        archived_at = now()
    WHERE id = v_revision.entity_id
      AND status = 'approved';

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'status', 'rejected',
        'reason', 'stale_revision'
      );
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
    ARRAY(
      SELECT jsonb_array_elements_text(
        v_lesson -> 'keyConcepts'
      )
    ),
    ARRAY(
      SELECT jsonb_array_elements_text(
        v_lesson -> 'examples'
      )
    ),
    ARRAY(
      SELECT jsonb_array_elements_text(
        v_lesson -> 'misconceptions'
      )
    ),
    'approved',
    'teacher_authored',
    NULL
  );

  -- Objectives become canonical IDs based only on their payload order.
  INSERT INTO public.objectives (
    id,
    lesson_id,
    text
  )
  SELECT
    v_new_lesson_id
      || '-objective-'
      || lpad(objective.ordinality::text, 3, '0'),
    v_new_lesson_id,
    objective.value ->> 'text'
  FROM jsonb_array_elements(v_objectives)
    WITH ORDINALITY AS objective(value, ordinality);

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
    v_new_lesson_id
      || '-question-'
      || lpad(question.ordinality::text, 3, '0'),
    v_new_lesson_id,
    question.value ->> 'purpose',
    'multiple_choice',
    question.value ->> 'prompt',
    ARRAY(
      SELECT jsonb_array_elements_text(
        question.value -> 'choices'
      )
    ),
    (question.value ->> 'correctAnswerIndex')::integer,
    question.value ->> 'explanation',
    v_new_lesson_id
      || '-objective-'
      || lpad(objective.ordinality::text, 3, '0'),
    question.value ->> 'difficulty',
    'approved',
    'teacher_authored'
  FROM jsonb_array_elements(v_questions)
    WITH ORDINALITY AS question(value, ordinality)
  JOIN jsonb_array_elements(v_objectives)
    WITH ORDINALITY AS objective(value, ordinality)
    ON objective.value ->> 'key'
       = question.value ->> 'objectiveKey';

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
    v_new_lesson_id
      || '-game-'
      || lpad(game.ordinality::text, 3, '0'),
    v_new_lesson_id,
    'matching',
    game.value ->> 'title',
    game.value ->> 'instructions',
    game.value -> 'items',
    'approved',
    'teacher_authored'
  FROM jsonb_array_elements(v_games)
    WITH ORDINALITY AS game(value, ordinality);

  INSERT INTO public.game_objectives (
    game_id,
    objective_id,
    position
  )
  SELECT
    v_new_lesson_id
      || '-game-'
      || lpad(game.ordinality::text, 3, '0'),
    v_new_lesson_id
      || '-objective-'
      || lpad(objective.ordinality::text, 3, '0'),
    objective_key.position::integer - 1
  FROM jsonb_array_elements(v_games)
    WITH ORDINALITY AS game(value, ordinality)
  CROSS JOIN LATERAL
    jsonb_array_elements_text(
      game.value -> 'objectiveKeys'
    )
    WITH ORDINALITY AS objective_key(value, position)
  JOIN jsonb_array_elements(v_objectives)
    WITH ORDINALITY AS objective(value, ordinality)
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
    v_new_lesson_id
      || '-experiment-'
      || lpad(experiment.ordinality::text, 3, '0'),
    v_new_lesson_id,
    experiment.value ->> 'title',
    experiment.value ->> 'objective',
    ARRAY(
      SELECT jsonb_array_elements_text(
        experiment.value -> 'tools'
      )
    ),
    ARRAY(
      SELECT jsonb_array_elements_text(
        experiment.value -> 'steps'
      )
    ),
    ARRAY(
      SELECT jsonb_array_elements_text(
        experiment.value -> 'safetyNotes'
      )
    ),
    (experiment.value ->> 'safetyLevel')::public.safety_level,
    experiment.value ->> 'observationPrompt',
    experiment.value ->> 'conclusionPrompt',
    CASE
      WHEN experiment.value ? 'homeAlternative'
        AND jsonb_typeof(
          experiment.value -> 'homeAlternative'
        ) = 'string'
      THEN experiment.value ->> 'homeAlternative'
      ELSE NULL
    END,
    'approved',
    'teacher_authored'
  FROM jsonb_array_elements(v_experiments)
    WITH ORDINALITY AS experiment(value, ordinality);

  INSERT INTO public.experiment_objectives (
    experiment_id,
    objective_id,
    lesson_id,
    position
  )
  SELECT
    v_new_lesson_id
      || '-experiment-'
      || lpad(experiment.ordinality::text, 3, '0'),
    v_new_lesson_id
      || '-objective-'
      || lpad(objective.ordinality::text, 3, '0'),
    v_new_lesson_id,
    objective_key.position::integer - 1
  FROM jsonb_array_elements(v_experiments)
    WITH ORDINALITY AS experiment(value, ordinality)
  CROSS JOIN LATERAL
    jsonb_array_elements_text(
      experiment.value -> 'objectiveKeys'
    )
    WITH ORDINALITY AS objective_key(value, position)
  JOIN jsonb_array_elements(v_objectives)
    WITH ORDINALITY AS objective(value, ordinality)
    ON objective.value ->> 'key' = objective_key.value;

  INSERT INTO public.simulations (
    id,
    lesson_id,
    title,
    instructions,
    engine_kind,
    config,
    status,
    source
  )
  SELECT
    v_new_lesson_id
      || '-simulation-'
      || lpad(simulation.ordinality::text, 3, '0'),
    v_new_lesson_id,
    simulation.value ->> 'title',
    simulation.value ->> 'instructions',
    simulation.value -> 'config' ->> 'engineKind',
    simulation.value -> 'config',
    'approved',
    'teacher_authored'
  FROM jsonb_array_elements(v_simulations)
    WITH ORDINALITY AS simulation(value, ordinality);

  INSERT INTO public.simulation_objectives (
    simulation_id,
    objective_id,
    lesson_id,
    position
  )
  SELECT
    v_new_lesson_id
      || '-simulation-'
      || lpad(simulation.ordinality::text, 3, '0'),
    v_new_lesson_id
      || '-objective-'
      || lpad(objective.ordinality::text, 3, '0'),
    v_new_lesson_id,
    objective_key.position::integer - 1
  FROM jsonb_array_elements(v_simulations)
    WITH ORDINALITY AS simulation(value, ordinality)
  CROSS JOIN LATERAL
    jsonb_array_elements_text(
      simulation.value -> 'objectiveKeys'
    )
    WITH ORDINALITY AS objective_key(value, position)
  JOIN jsonb_array_elements(v_objectives)
    WITH ORDINALITY AS objective(value, ordinality)
    ON objective.value ->> 'key' = objective_key.value;

  INSERT INTO public.inquiries (
    id,
    lesson_id,
    title,
    instructions,
    context,
    driving_question,
    hypothesis_prompt,
    observation_prompt,
    conclusion_prompt,
    status,
    source
  )
  SELECT
    v_new_lesson_id
      || '-inquiry-'
      || lpad(inquiry.ordinality::text, 3, '0'),
    v_new_lesson_id,
    inquiry.value ->> 'title',
    inquiry.value ->> 'instructions',
    inquiry.value ->> 'context',
    inquiry.value ->> 'drivingQuestion',
    inquiry.value ->> 'hypothesisPrompt',
    inquiry.value ->> 'observationPrompt',
    inquiry.value ->> 'conclusionPrompt',
    'approved',
    'teacher_authored'
  FROM jsonb_array_elements(v_inquiries)
    WITH ORDINALITY AS inquiry(value, ordinality);

  INSERT INTO public.inquiry_objectives (
    inquiry_id,
    objective_id,
    lesson_id,
    position
  )
  SELECT
    v_new_lesson_id
      || '-inquiry-'
      || lpad(inquiry.ordinality::text, 3, '0'),
    v_new_lesson_id
      || '-objective-'
      || lpad(objective.ordinality::text, 3, '0'),
    v_new_lesson_id,
    objective_key.position::integer - 1
  FROM jsonb_array_elements(v_inquiries)
    WITH ORDINALITY AS inquiry(value, ordinality)
  CROSS JOIN LATERAL
    jsonb_array_elements_text(
      inquiry.value -> 'objectiveKeys'
    )
    WITH ORDINALITY AS objective_key(value, position)
  JOIN jsonb_array_elements(v_objectives)
    WITH ORDINALITY AS objective(value, ordinality)
    ON objective.value ->> 'key' = objective_key.value;

  INSERT INTO public.data_activities (
    id,
    lesson_id,
    title,
    instructions,
    engine_kind,
    config,
    status,
    source
  )
  SELECT
    v_new_lesson_id
      || '-data-activity-'
      || lpad(data_activity.ordinality::text, 3, '0'),
    v_new_lesson_id,
    data_activity.value ->> 'title',
    data_activity.value ->> 'instructions',
    data_activity.value -> 'config' ->> 'engineKind',
    data_activity.value -> 'config',
    'approved',
    'teacher_authored'
  FROM jsonb_array_elements(v_data_activities)
    WITH ORDINALITY AS data_activity(value, ordinality);

  INSERT INTO public.data_activity_objectives (
    data_activity_id,
    objective_id,
    lesson_id,
    position
  )
  SELECT
    v_new_lesson_id
      || '-data-activity-'
      || lpad(data_activity.ordinality::text, 3, '0'),
    v_new_lesson_id
      || '-objective-'
      || lpad(objective.ordinality::text, 3, '0'),
    v_new_lesson_id,
    objective_key.position::integer - 1
  FROM jsonb_array_elements(v_data_activities)
    WITH ORDINALITY AS data_activity(value, ordinality)
  CROSS JOIN LATERAL
    jsonb_array_elements_text(
      data_activity.value -> 'objectiveKeys'
    )
    WITH ORDINALITY AS objective_key(value, position)
  JOIN jsonb_array_elements(v_objectives)
    WITH ORDINALITY AS objective(value, ordinality)
    ON objective.value ->> 'key' = objective_key.value;

  INSERT INTO public.content_review_events (
    revision_id,
    reviewer_id,
    decision,
    note
  )
  VALUES (
    p_revision_id,
    v_user_id,
    'approve',
    NULLIF(
      btrim(COALESCE(p_note, '')),
      ''
    )
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
