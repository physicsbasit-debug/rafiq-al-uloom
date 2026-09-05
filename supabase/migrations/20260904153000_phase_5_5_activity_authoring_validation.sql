-- Rafiq Al-Uloom | Phase 5-5C1
-- Activity authoring payload validation.
-- Forward-only migration. Historical authoring migrations remain unchanged.

BEGIN;

CREATE OR REPLACE FUNCTION public.lesson_revision_has_only_keys(
  p_value jsonb,
  p_allowed text[]
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF p_value IS NULL OR jsonb_typeof(p_value) IS DISTINCT FROM 'object' THEN
    RETURN false;
  END IF;

  RETURN NOT EXISTS (
    SELECT 1
    FROM jsonb_object_keys(p_value) AS key(name)
    WHERE NOT (key.name = ANY (p_allowed))
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lesson_revision_has_only_keys(jsonb, text[])
FROM PUBLIC, anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.lesson_revision_json_number_is_finite(
  p_value jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_number numeric;
BEGIN
  IF p_value IS NULL OR jsonb_typeof(p_value) IS DISTINCT FROM 'number' THEN
    RETURN false;
  END IF;

  v_number := (p_value #>> '{}')::numeric;

  RETURN abs(v_number) <= '1.7976931348623157e308'::numeric;
END;
$$;

REVOKE ALL ON FUNCTION public.lesson_revision_json_number_is_finite(jsonb)
FROM PUBLIC, anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.lesson_revision_nonnegative_integer_is_valid(
  p_value jsonb,
  p_upper_exclusive integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_number numeric;
BEGIN
  IF NOT public.lesson_revision_json_number_is_finite(p_value) THEN
    RETURN false;
  END IF;

  v_number := (p_value #>> '{}')::numeric;

  IF v_number < 0 OR trunc(v_number) <> v_number THEN
    RETURN false;
  END IF;

  IF p_upper_exclusive IS NOT NULL
    AND v_number >= p_upper_exclusive
  THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.lesson_revision_nonnegative_integer_is_valid(jsonb, integer)
FROM PUBLIC, anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.lesson_revision_objective_keys_are_valid(
  p_keys jsonb,
  p_objectives jsonb,
  p_require_complete boolean
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  IF NOT public.jsonb_is_text_array(
    p_keys,
    NOT p_require_complete
  ) THEN
    RETURN false;
  END IF;

  IF (
    SELECT count(DISTINCT objective_key.value)
    FROM jsonb_array_elements_text(p_keys) AS objective_key(value)
  ) <> jsonb_array_length(p_keys) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements_text(p_keys) AS objective_key(value)
    WHERE NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_objectives) AS objective(value)
      WHERE objective.value ->> 'key' = objective_key.value
    )
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.lesson_revision_objective_keys_are_valid(
  jsonb,
  jsonb,
  boolean
)
FROM PUBLIC, anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.lesson_revision_simulation_config_is_valid(
  p_config jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_field text;
  v_range jsonb;
  v_min numeric;
  v_max numeric;
  v_step numeric;
  v_initial numeric;
BEGIN
  IF NOT public.lesson_revision_has_only_keys(
    p_config,
    ARRAY[
      'engineKind',
      'mediumSpeedMps',
      'frequencyHz',
      'amplitudeM'
    ]::text[]
  ) THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(p_config -> 'engineKind') IS DISTINCT FROM 'string'
    OR (p_config ->> 'engineKind') IS DISTINCT FROM 'transverse_wave_v1'
    OR NOT public.lesson_revision_json_number_is_finite(
      p_config -> 'mediumSpeedMps'
    )
  THEN
    RETURN false;
  END IF;

  IF (p_config ->> 'mediumSpeedMps')::numeric <= 0 THEN
    RETURN false;
  END IF;

  FOREACH v_field IN ARRAY ARRAY['frequencyHz', 'amplitudeM']
  LOOP
    v_range := p_config -> v_field;

    IF NOT public.lesson_revision_has_only_keys(
      v_range,
      ARRAY['min', 'max', 'step', 'initial']::text[]
    ) THEN
      RETURN false;
    END IF;

    IF NOT public.lesson_revision_json_number_is_finite(v_range -> 'min')
      OR NOT public.lesson_revision_json_number_is_finite(v_range -> 'max')
      OR NOT public.lesson_revision_json_number_is_finite(v_range -> 'step')
      OR NOT public.lesson_revision_json_number_is_finite(v_range -> 'initial')
    THEN
      RETURN false;
    END IF;

    v_min := (v_range ->> 'min')::numeric;
    v_max := (v_range ->> 'max')::numeric;
    v_step := (v_range ->> 'step')::numeric;
    v_initial := (v_range ->> 'initial')::numeric;

    IF v_min >= v_max
      OR v_step <= 0
      OR v_initial < v_min
      OR v_initial > v_max
    THEN
      RETURN false;
    END IF;

    IF v_field = 'frequencyHz' AND v_min <= 0 THEN
      RETURN false;
    END IF;

    IF v_field = 'amplitudeM' AND v_min < 0 THEN
      RETURN false;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.lesson_revision_simulation_config_is_valid(jsonb)
FROM PUBLIC, anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.lesson_revision_data_config_is_valid(
  p_config jsonb
)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_presentation jsonb;
  v_dataset jsonb;
  v_x jsonb;
  v_x_values jsonb;
  v_series jsonb;
  v_series_item jsonb;
  v_tasks jsonb;
  v_task jsonb;
  v_rule jsonb;
  v_rule_kind text;
  v_series_id text;
  v_x_count integer;
  v_point jsonb;
BEGIN
  IF NOT public.lesson_revision_has_only_keys(
    p_config,
    ARRAY[
      'engineKind',
      'context',
      'presentation',
      'dataset',
      'tasks'
    ]::text[]
  ) THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(p_config -> 'engineKind') IS DISTINCT FROM 'string'
    OR (p_config ->> 'engineKind') IS DISTINCT FROM 'data_graph_v1'
    OR jsonb_typeof(p_config -> 'context') IS DISTINCT FROM 'string'
    OR btrim(p_config ->> 'context') = ''
  THEN
    RETURN false;
  END IF;

  v_presentation := p_config -> 'presentation';

  IF NOT public.lesson_revision_has_only_keys(
    v_presentation,
    ARRAY['mode', 'xAxisLabel', 'yAxisLabel']::text[]
  ) THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(v_presentation -> 'mode') IS DISTINCT FROM 'string'
    OR (v_presentation ->> 'mode') NOT IN (
      'table',
      'line_graph',
      'table_and_line_graph'
    )
    OR jsonb_typeof(v_presentation -> 'xAxisLabel') IS DISTINCT FROM 'string'
    OR btrim(v_presentation ->> 'xAxisLabel') = ''
    OR jsonb_typeof(v_presentation -> 'yAxisLabel') IS DISTINCT FROM 'string'
    OR btrim(v_presentation ->> 'yAxisLabel') = ''
  THEN
    RETURN false;
  END IF;

  v_dataset := p_config -> 'dataset';

  IF NOT public.lesson_revision_has_only_keys(
    v_dataset,
    ARRAY['x', 'series']::text[]
  ) THEN
    RETURN false;
  END IF;

  v_x := v_dataset -> 'x';

  IF NOT public.lesson_revision_has_only_keys(
    v_x,
    ARRAY['label', 'unit', 'values']::text[]
  ) THEN
    RETURN false;
  END IF;

  IF jsonb_typeof(v_x -> 'label') IS DISTINCT FROM 'string'
    OR btrim(v_x ->> 'label') = ''
    OR jsonb_typeof(v_x -> 'unit') IS DISTINCT FROM 'string'
    OR jsonb_typeof(v_x -> 'values') IS DISTINCT FROM 'array'
    OR jsonb_array_length(
      CASE
        WHEN jsonb_typeof(v_x -> 'values') = 'array'
        THEN v_x -> 'values'
        ELSE '[]'::jsonb
      END
    ) = 0
  THEN
    RETURN false;
  END IF;

  v_x_values := v_x -> 'values';
  v_x_count := jsonb_array_length(v_x_values);

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_x_values) AS item(value)
    WHERE NOT public.lesson_revision_json_number_is_finite(item.value)
  ) THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM (
      SELECT
        (item.value #>> '{}')::numeric AS current_value,
        lag((item.value #>> '{}')::numeric)
          OVER (ORDER BY item.ordinality) AS previous_value
      FROM jsonb_array_elements(v_x_values)
        WITH ORDINALITY AS item(value, ordinality)
    ) AS ordered_values
    WHERE ordered_values.previous_value IS NOT NULL
      AND ordered_values.current_value <= ordered_values.previous_value
  ) THEN
    RETURN false;
  END IF;

  v_series := v_dataset -> 'series';

  IF jsonb_typeof(v_series) IS DISTINCT FROM 'array'
    OR jsonb_array_length(
      CASE
        WHEN jsonb_typeof(v_series) = 'array'
        THEN v_series
        ELSE '[]'::jsonb
      END
    ) = 0
  THEN
    RETURN false;
  END IF;

  FOR v_series_item IN
    SELECT item.value
    FROM jsonb_array_elements(v_series) AS item(value)
  LOOP
    IF NOT public.lesson_revision_has_only_keys(
      v_series_item,
      ARRAY['id', 'label', 'unit', 'values']::text[]
    ) THEN
      RETURN false;
    END IF;

    IF jsonb_typeof(v_series_item -> 'id') IS DISTINCT FROM 'string'
      OR btrim(v_series_item ->> 'id') = ''
      OR jsonb_typeof(v_series_item -> 'label') IS DISTINCT FROM 'string'
      OR btrim(v_series_item ->> 'label') = ''
      OR jsonb_typeof(v_series_item -> 'unit') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v_series_item -> 'values') IS DISTINCT FROM 'array'
    THEN
      RETURN false;
    END IF;

    IF jsonb_array_length(v_series_item -> 'values') <> v_x_count THEN
      RETURN false;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_series_item -> 'values') AS item(value)
      WHERE NOT public.lesson_revision_json_number_is_finite(item.value)
    ) THEN
      RETURN false;
    END IF;
  END LOOP;

  IF (
    SELECT count(DISTINCT btrim(item.value ->> 'id'))
    FROM jsonb_array_elements(v_series) AS item(value)
  ) <> jsonb_array_length(v_series) THEN
    RETURN false;
  END IF;

  v_tasks := p_config -> 'tasks';

  IF jsonb_typeof(v_tasks) IS DISTINCT FROM 'array'
    OR jsonb_array_length(
      CASE
        WHEN jsonb_typeof(v_tasks) = 'array'
        THEN v_tasks
        ELSE '[]'::jsonb
      END
    ) = 0
  THEN
    RETURN false;
  END IF;

  FOR v_task IN
    SELECT item.value
    FROM jsonb_array_elements(v_tasks) AS item(value)
  LOOP
    IF NOT public.lesson_revision_has_only_keys(
      v_task,
      ARRAY['id', 'prompt', 'unit', 'tolerance', 'rule']::text[]
    ) THEN
      RETURN false;
    END IF;

    IF jsonb_typeof(v_task -> 'id') IS DISTINCT FROM 'string'
      OR btrim(v_task ->> 'id') = ''
      OR jsonb_typeof(v_task -> 'prompt') IS DISTINCT FROM 'string'
      OR btrim(v_task ->> 'prompt') = ''
      OR jsonb_typeof(v_task -> 'unit') IS DISTINCT FROM 'string'
      OR jsonb_typeof(v_task -> 'rule') IS DISTINCT FROM 'object'
    THEN
      RETURN false;
    END IF;

    IF v_task ? 'tolerance' THEN
      IF NOT public.lesson_revision_json_number_is_finite(
        v_task -> 'tolerance'
      ) THEN
        RETURN false;
      END IF;

      IF (v_task ->> 'tolerance')::numeric < 0 THEN
        RETURN false;
      END IF;
    END IF;

    v_rule := v_task -> 'rule';

    IF jsonb_typeof(v_rule -> 'kind') IS DISTINCT FROM 'string' THEN
      RETURN false;
    END IF;

    v_rule_kind := v_rule ->> 'kind';

    IF v_rule_kind = 'read_value' THEN
      IF NOT public.lesson_revision_has_only_keys(
        v_rule,
        ARRAY['kind', 'seriesId', 'pointIndex']::text[]
      ) THEN
        RETURN false;
      END IF;

      IF jsonb_typeof(v_rule -> 'seriesId') IS DISTINCT FROM 'string'
        OR btrim(v_rule ->> 'seriesId') = ''
        OR NOT public.lesson_revision_nonnegative_integer_is_valid(
          v_rule -> 'pointIndex',
          v_x_count
        )
      THEN
        RETURN false;
      END IF;

      v_series_id := v_rule ->> 'seriesId';

      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_series) AS series_item(value)
        WHERE series_item.value ->> 'id' = v_series_id
      ) THEN
        RETURN false;
      END IF;

    ELSIF v_rule_kind = 'difference' THEN
      IF NOT public.lesson_revision_has_only_keys(
        v_rule,
        ARRAY[
          'kind',
          'seriesId',
          'leftIndex',
          'rightIndex',
          'absolute'
        ]::text[]
      ) THEN
        RETURN false;
      END IF;

      IF jsonb_typeof(v_rule -> 'seriesId') IS DISTINCT FROM 'string'
        OR btrim(v_rule ->> 'seriesId') = ''
        OR NOT public.lesson_revision_nonnegative_integer_is_valid(
          v_rule -> 'leftIndex',
          v_x_count
        )
        OR NOT public.lesson_revision_nonnegative_integer_is_valid(
          v_rule -> 'rightIndex',
          v_x_count
        )
        OR jsonb_typeof(v_rule -> 'absolute') IS DISTINCT FROM 'boolean'
      THEN
        RETURN false;
      END IF;

      v_series_id := v_rule ->> 'seriesId';

      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_series) AS series_item(value)
        WHERE series_item.value ->> 'id' = v_series_id
      ) THEN
        RETURN false;
      END IF;

    ELSIF v_rule_kind = 'mean' THEN
      IF NOT public.lesson_revision_has_only_keys(
        v_rule,
        ARRAY['kind', 'seriesId', 'pointIndices']::text[]
      ) THEN
        RETURN false;
      END IF;

      IF jsonb_typeof(v_rule -> 'seriesId') IS DISTINCT FROM 'string'
        OR btrim(v_rule ->> 'seriesId') = ''
        OR jsonb_typeof(v_rule -> 'pointIndices') IS DISTINCT FROM 'array'
        OR jsonb_array_length(
          CASE
            WHEN jsonb_typeof(v_rule -> 'pointIndices') = 'array'
            THEN v_rule -> 'pointIndices'
            ELSE '[]'::jsonb
          END
        ) = 0
      THEN
        RETURN false;
      END IF;

      v_series_id := v_rule ->> 'seriesId';

      IF NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_series) AS series_item(value)
        WHERE series_item.value ->> 'id' = v_series_id
      ) THEN
        RETURN false;
      END IF;

      FOR v_point IN
        SELECT item.value
        FROM jsonb_array_elements(v_rule -> 'pointIndices') AS item(value)
      LOOP
        IF NOT public.lesson_revision_nonnegative_integer_is_valid(
          v_point,
          v_x_count
        ) THEN
          RETURN false;
        END IF;
      END LOOP;

    ELSE
      RETURN false;
    END IF;
  END LOOP;

  IF (
    SELECT count(DISTINCT btrim(item.value ->> 'id'))
    FROM jsonb_array_elements(v_tasks) AS item(value)
  ) <> jsonb_array_length(v_tasks) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.lesson_revision_data_config_is_valid(jsonb)
FROM PUBLIC, anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.lesson_revision_payload_error(
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
  v_simulations jsonb;
  v_inquiries jsonb;
  v_data_activities jsonb;
  v_objective_count integer;
  v_question_count integer;
  v_mastery_count integer;
BEGIN
  IF p_payload IS NULL
    OR jsonb_typeof(p_payload) IS DISTINCT FROM 'object'
  THEN
    RETURN 'invalid_payload';
  END IF;

  IF NOT public.lesson_revision_has_only_keys(
    p_payload,
    ARRAY[
      'lesson',
      'objectives',
      'questions',
      'games',
      'experiments',
      'simulations',
      'inquiries',
      'dataActivities'
    ]::text[]
  ) THEN
    RETURN 'invalid_payload';
  END IF;

  v_lesson := p_payload -> 'lesson';
  v_objectives := p_payload -> 'objectives';
  v_questions := p_payload -> 'questions';
  v_games := p_payload -> 'games';
  v_experiments := p_payload -> 'experiments';
  v_simulations := p_payload -> 'simulations';
  v_inquiries := p_payload -> 'inquiries';
  v_data_activities := p_payload -> 'dataActivities';

  IF jsonb_typeof(v_lesson) IS DISTINCT FROM 'object'
    OR jsonb_typeof(v_objectives) IS DISTINCT FROM 'array'
    OR jsonb_typeof(v_questions) IS DISTINCT FROM 'array'
    OR jsonb_typeof(v_games) IS DISTINCT FROM 'array'
    OR jsonb_typeof(v_experiments) IS DISTINCT FROM 'array'
    OR jsonb_typeof(v_simulations) IS DISTINCT FROM 'array'
    OR jsonb_typeof(v_inquiries) IS DISTINCT FROM 'array'
    OR jsonb_typeof(v_data_activities) IS DISTINCT FROM 'array'
  THEN
    RETURN 'invalid_payload';
  END IF;

  IF NOT public.lesson_revision_has_only_keys(
    v_lesson,
    ARRAY[
      'unitId',
      'title',
      'displayOrder',
      'summary',
      'keyConcepts',
      'examples',
      'misconceptions'
    ]::text[]
  ) THEN
    RETURN 'invalid_payload';
  END IF;

  IF jsonb_typeof(v_lesson -> 'unitId') IS DISTINCT FROM 'string'
    OR btrim(v_lesson ->> 'unitId') = ''
    OR jsonb_typeof(v_lesson -> 'title') IS DISTINCT FROM 'string'
    OR btrim(v_lesson ->> 'title') = ''
    OR jsonb_typeof(v_lesson -> 'displayOrder') IS DISTINCT FROM 'number'
    OR (v_lesson ->> 'displayOrder') !~ '^[0-9]+$'
    OR jsonb_typeof(v_lesson -> 'summary') IS DISTINCT FROM 'string'
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
    WHERE jsonb_typeof(objective.value) IS DISTINCT FROM 'object'
      OR NOT public.lesson_revision_has_only_keys(
        objective.value,
        ARRAY['key', 'text']::text[]
      )
      OR jsonb_typeof(objective.value -> 'key') IS DISTINCT FROM 'string'
      OR btrim(objective.value ->> 'key') = ''
      OR jsonb_typeof(objective.value -> 'text') IS DISTINCT FROM 'string'
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
    count(*) FILTER (
      WHERE question.value ->> 'purpose' = 'mastery'
    )::integer
  INTO v_question_count, v_mastery_count
  FROM jsonb_array_elements(v_questions) AS question(value);

  IF p_require_complete
    AND (v_question_count = 0 OR v_mastery_count = 0)
  THEN
    RETURN 'invalid_payload';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_questions) AS question(value)
    WHERE jsonb_typeof(question.value) IS DISTINCT FROM 'object'
      OR NOT public.lesson_revision_has_only_keys(
        question.value,
        ARRAY[
          'key',
          'purpose',
          'type',
          'prompt',
          'choices',
          'correctAnswerIndex',
          'explanation',
          'objectiveKey',
          'difficulty'
        ]::text[]
      )
      OR jsonb_typeof(question.value -> 'key') IS DISTINCT FROM 'string'
      OR btrim(question.value ->> 'key') = ''
      OR jsonb_typeof(question.value -> 'purpose') IS DISTINCT FROM 'string'
      OR question.value ->> 'purpose' NOT IN ('review', 'mastery')
      OR jsonb_typeof(question.value -> 'type') IS DISTINCT FROM 'string'
      OR question.value ->> 'type' <> 'multiple_choice'
      OR jsonb_typeof(question.value -> 'prompt') IS DISTINCT FROM 'string'
      OR btrim(question.value ->> 'prompt') = ''
      OR NOT public.jsonb_is_text_array(
        question.value -> 'choices',
        false
      )
      OR jsonb_array_length(
        CASE
          WHEN jsonb_typeof(question.value -> 'choices') = 'array'
          THEN question.value -> 'choices'
          ELSE '[]'::jsonb
        END
      ) < 2
      OR NOT public.lesson_revision_nonnegative_integer_is_valid(
        question.value -> 'correctAnswerIndex',
        CASE
          WHEN jsonb_typeof(question.value -> 'choices') = 'array'
          THEN jsonb_array_length(question.value -> 'choices')
          ELSE 0
        END
      )
      OR jsonb_typeof(question.value -> 'explanation') IS DISTINCT FROM 'string'
      OR btrim(question.value ->> 'explanation') = ''
      OR jsonb_typeof(question.value -> 'objectiveKey') IS DISTINCT FROM 'string'
      OR btrim(question.value ->> 'objectiveKey') = ''
      OR jsonb_typeof(question.value -> 'difficulty') IS DISTINCT FROM 'string'
      OR btrim(question.value ->> 'difficulty') = ''
      OR NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_objectives) AS objective(value)
        WHERE objective.value ->> 'key' =
          question.value ->> 'objectiveKey'
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
    WHERE jsonb_typeof(game.value) IS DISTINCT FROM 'object'
      OR NOT public.lesson_revision_has_only_keys(
        game.value,
        ARRAY[
          'key',
          'type',
          'title',
          'instructions',
          'items',
          'objectiveKeys'
        ]::text[]
      )
      OR jsonb_typeof(game.value -> 'key') IS DISTINCT FROM 'string'
      OR btrim(game.value ->> 'key') = ''
      OR jsonb_typeof(game.value -> 'type') IS DISTINCT FROM 'string'
      OR game.value ->> 'type' <> 'matching'
      OR jsonb_typeof(game.value -> 'title') IS DISTINCT FROM 'string'
      OR btrim(game.value ->> 'title') = ''
      OR jsonb_typeof(game.value -> 'instructions') IS DISTINCT FROM 'string'
      OR btrim(game.value ->> 'instructions') = ''
      OR jsonb_typeof(game.value -> 'items') IS DISTINCT FROM 'array'
      OR NOT public.lesson_revision_objective_keys_are_valid(
        game.value -> 'objectiveKeys',
        v_objectives,
        p_require_complete
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
    WHERE jsonb_typeof(experiment.value) IS DISTINCT FROM 'object'
      OR NOT public.lesson_revision_has_only_keys(
        experiment.value,
        ARRAY[
          'key',
          'title',
          'objective',
          'objectiveKeys',
          'tools',
          'steps',
          'safetyNotes',
          'safetyLevel',
          'observationPrompt',
          'conclusionPrompt',
          'homeAlternative'
        ]::text[]
      )
      OR jsonb_typeof(experiment.value -> 'key') IS DISTINCT FROM 'string'
      OR btrim(experiment.value ->> 'key') = ''
      OR jsonb_typeof(experiment.value -> 'title') IS DISTINCT FROM 'string'
      OR btrim(experiment.value ->> 'title') = ''
      OR jsonb_typeof(experiment.value -> 'objective') IS DISTINCT FROM 'string'
      OR btrim(experiment.value ->> 'objective') = ''
      OR NOT public.lesson_revision_objective_keys_are_valid(
        experiment.value -> 'objectiveKeys',
        v_objectives,
        p_require_complete
      )
      OR NOT public.jsonb_is_text_array(experiment.value -> 'tools')
      OR NOT public.jsonb_is_text_array(
        experiment.value -> 'steps',
        false
      )
      OR NOT public.jsonb_is_text_array(
        experiment.value -> 'safetyNotes'
      )
      OR jsonb_typeof(experiment.value -> 'safetyLevel') IS DISTINCT FROM 'string'
      OR experiment.value ->> 'safetyLevel' NOT IN (
        'safe_home',
        'teacher_supervised',
        'lab_only',
        'not_allowed'
      )
      OR jsonb_typeof(
        experiment.value -> 'observationPrompt'
      ) IS DISTINCT FROM 'string'
      OR btrim(experiment.value ->> 'observationPrompt') = ''
      OR jsonb_typeof(
        experiment.value -> 'conclusionPrompt'
      ) IS DISTINCT FROM 'string'
      OR btrim(experiment.value ->> 'conclusionPrompt') = ''
      OR (
        experiment.value ? 'homeAlternative'
        AND jsonb_typeof(
          experiment.value -> 'homeAlternative'
        ) NOT IN ('string', 'null')
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

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_simulations) AS simulation(value)
    WHERE jsonb_typeof(simulation.value) IS DISTINCT FROM 'object'
      OR NOT public.lesson_revision_has_only_keys(
        simulation.value,
        ARRAY[
          'key',
          'title',
          'instructions',
          'objectiveKeys',
          'config'
        ]::text[]
      )
      OR jsonb_typeof(simulation.value -> 'key') IS DISTINCT FROM 'string'
      OR btrim(simulation.value ->> 'key') = ''
      OR jsonb_typeof(simulation.value -> 'title') IS DISTINCT FROM 'string'
      OR btrim(simulation.value ->> 'title') = ''
      OR jsonb_typeof(
        simulation.value -> 'instructions'
      ) IS DISTINCT FROM 'string'
      OR btrim(simulation.value ->> 'instructions') = ''
      OR NOT public.lesson_revision_objective_keys_are_valid(
        simulation.value -> 'objectiveKeys',
        v_objectives,
        p_require_complete
      )
      OR NOT public.lesson_revision_simulation_config_is_valid(
        simulation.value -> 'config'
      )
  ) THEN
    RETURN 'invalid_payload';
  END IF;

  IF (
    SELECT count(DISTINCT simulation.value ->> 'key')
    FROM jsonb_array_elements(v_simulations) AS simulation(value)
  ) <> jsonb_array_length(v_simulations) THEN
    RETURN 'invalid_payload';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_inquiries) AS inquiry(value)
    WHERE jsonb_typeof(inquiry.value) IS DISTINCT FROM 'object'
      OR NOT public.lesson_revision_has_only_keys(
        inquiry.value,
        ARRAY[
          'key',
          'title',
          'instructions',
          'objectiveKeys',
          'context',
          'drivingQuestion',
          'hypothesisPrompt',
          'observationPrompt',
          'conclusionPrompt'
        ]::text[]
      )
      OR jsonb_typeof(inquiry.value -> 'key') IS DISTINCT FROM 'string'
      OR btrim(inquiry.value ->> 'key') = ''
      OR jsonb_typeof(inquiry.value -> 'title') IS DISTINCT FROM 'string'
      OR btrim(inquiry.value ->> 'title') = ''
      OR jsonb_typeof(
        inquiry.value -> 'instructions'
      ) IS DISTINCT FROM 'string'
      OR btrim(inquiry.value ->> 'instructions') = ''
      OR NOT public.lesson_revision_objective_keys_are_valid(
        inquiry.value -> 'objectiveKeys',
        v_objectives,
        p_require_complete
      )
      OR jsonb_typeof(inquiry.value -> 'context') IS DISTINCT FROM 'string'
      OR btrim(inquiry.value ->> 'context') = ''
      OR jsonb_typeof(
        inquiry.value -> 'drivingQuestion'
      ) IS DISTINCT FROM 'string'
      OR btrim(inquiry.value ->> 'drivingQuestion') = ''
      OR jsonb_typeof(
        inquiry.value -> 'hypothesisPrompt'
      ) IS DISTINCT FROM 'string'
      OR btrim(inquiry.value ->> 'hypothesisPrompt') = ''
      OR jsonb_typeof(
        inquiry.value -> 'observationPrompt'
      ) IS DISTINCT FROM 'string'
      OR btrim(inquiry.value ->> 'observationPrompt') = ''
      OR jsonb_typeof(
        inquiry.value -> 'conclusionPrompt'
      ) IS DISTINCT FROM 'string'
      OR btrim(inquiry.value ->> 'conclusionPrompt') = ''
  ) THEN
    RETURN 'invalid_payload';
  END IF;

  IF (
    SELECT count(DISTINCT inquiry.value ->> 'key')
    FROM jsonb_array_elements(v_inquiries) AS inquiry(value)
  ) <> jsonb_array_length(v_inquiries) THEN
    RETURN 'invalid_payload';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_data_activities) AS activity(value)
    WHERE jsonb_typeof(activity.value) IS DISTINCT FROM 'object'
      OR NOT public.lesson_revision_has_only_keys(
        activity.value,
        ARRAY[
          'key',
          'title',
          'instructions',
          'objectiveKeys',
          'config'
        ]::text[]
      )
      OR jsonb_typeof(activity.value -> 'key') IS DISTINCT FROM 'string'
      OR btrim(activity.value ->> 'key') = ''
      OR jsonb_typeof(activity.value -> 'title') IS DISTINCT FROM 'string'
      OR btrim(activity.value ->> 'title') = ''
      OR jsonb_typeof(
        activity.value -> 'instructions'
      ) IS DISTINCT FROM 'string'
      OR btrim(activity.value ->> 'instructions') = ''
      OR NOT public.lesson_revision_objective_keys_are_valid(
        activity.value -> 'objectiveKeys',
        v_objectives,
        p_require_complete
      )
      OR NOT public.lesson_revision_data_config_is_valid(
        activity.value -> 'config'
      )
  ) THEN
    RETURN 'invalid_payload';
  END IF;

  IF (
    SELECT count(DISTINCT activity.value ->> 'key')
    FROM jsonb_array_elements(v_data_activities) AS activity(value)
  ) <> jsonb_array_length(v_data_activities) THEN
    RETURN 'invalid_payload';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.lesson_revision_payload_error(jsonb, boolean)
FROM PUBLIC, anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION public.lesson_revision_payload_error(
  p_payload jsonb
)
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

COMMIT;
