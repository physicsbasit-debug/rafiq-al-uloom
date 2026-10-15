-- Phase 6 / Lesson 1-3 mastery:
-- optional experience context persisted beside the authoritative
-- server-scored mastery result.
--
-- experience_context is supplemental diagnostic/audit material.
-- It never participates in authoritative scoring or scoring_fingerprint.
-- A NULL context preserves the legacy request fingerprint byte-for-byte.

ALTER TABLE public.mastery_attempts
  ADD COLUMN experience_context jsonb NULL;

ALTER TABLE public.mastery_attempts
  ADD CONSTRAINT mastery_attempts_experience_context_check
  CHECK (
    experience_context IS NULL
    OR (
      jsonb_typeof(experience_context) = 'object'
      AND experience_context ? 'schema'
      AND jsonb_typeof(
        experience_context -> 'schema'
      ) = 'string'
      AND btrim(
        experience_context ->> 'schema'
      ) <> ''
      AND octet_length(
        experience_context::text
      ) <= 16384
    )
  );

COMMENT ON COLUMN public.mastery_attempts.experience_context IS
  'Optional JSON diagnostic/audit context supplied by a mastery experience. '
  'It is not authoritative scoring data and is limited to 16 KiB.';

COMMENT ON COLUMN public.mastery_attempts.request_fingerprint IS
  'SHA-256 fingerprint of the normalized submitted lesson, expected scoring '
  'fingerprint, answers, and optional experience context. NULL experience '
  'context preserves the legacy request fingerprint material.';

DROP FUNCTION public.submit_mastery_attempt(
  uuid,
  text,
  timestamptz,
  text,
  jsonb
);

CREATE FUNCTION public.submit_mastery_attempt(
  p_submission_id uuid,
  p_lesson_id text,
  p_started_at timestamptz,
  p_expected_scoring_fingerprint text,
  p_answers jsonb,
  p_experience_context jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_policy_version CONSTANT text := 'mastery-equal-weight-v1';
  v_expected_scoring_fingerprint text;
  v_scoring_material text;
  v_scoring_fingerprint text;
  v_request_material text;
  v_request_fingerprint text;
  v_question_count integer;
  v_answer_count integer;
  v_distinct_answer_count integer;
  v_correct_count integer;
  v_percentage double precision;
  v_attempt_id uuid;
  v_completed_at timestamptz;
  v_existing public.mastery_attempts%ROWTYPE;
  v_constraint_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'not_authenticated');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = v_user_id
      AND profiles.status = 'active'
      AND profiles.role IN ('student', 'teacher', 'reviewer')
  ) THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'not_authorized');
  END IF;

  IF p_submission_id IS NULL
    OR p_lesson_id IS NULL
    OR btrim(p_lesson_id) = ''
    OR p_started_at IS NULL
    OR p_expected_scoring_fingerprint IS NULL
    OR jsonb_typeof(p_answers) IS DISTINCT FROM 'array'
  THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_response_set');
  END IF;

  IF p_experience_context IS NOT NULL
    AND (
      jsonb_typeof(p_experience_context) IS DISTINCT FROM 'object'
      OR NOT (p_experience_context ? 'schema')
      OR jsonb_typeof(p_experience_context -> 'schema') IS DISTINCT FROM 'string'
      OR btrim(p_experience_context ->> 'schema') = ''
      OR octet_length(p_experience_context::text) > 16384
    )
  THEN
    RETURN jsonb_build_object(
      'status', 'rejected',
      'reason', 'invalid_response_set'
    );
  END IF;

  IF jsonb_array_length(p_answers) = 0 THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_response_set');
  END IF;

  v_expected_scoring_fingerprint := lower(btrim(p_expected_scoring_fingerprint));

  IF v_expected_scoring_fingerprint !~ '^[0-9a-f]{64}$' THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_response_set');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_answers) AS answer(value)
    WHERE jsonb_typeof(answer.value) IS DISTINCT FROM 'object'
      OR NOT (answer.value ? 'questionId')
      OR jsonb_typeof(answer.value -> 'questionId') IS DISTINCT FROM 'string'
      OR btrim(answer.value ->> 'questionId') = ''
      OR NOT (answer.value ? 'selectedChoiceIndex')
      OR jsonb_typeof(answer.value -> 'selectedChoiceIndex') IS DISTINCT FROM 'number'
      OR (answer.value ->> 'selectedChoiceIndex') !~ '^[0-9]{1,9}$'
  ) THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_response_set');
  END IF;

  SELECT
    count(*)::integer,
    count(DISTINCT answer.value ->> 'questionId')::integer,
    v_policy_version || E'\n'
      || octet_length(p_lesson_id)::text || ':' || p_lesson_id || E'\n'
      || v_expected_scoring_fingerprint || E'\n'
      || string_agg(
        octet_length(answer.value ->> 'questionId')::text
          || ':' || (answer.value ->> 'questionId')
          || ':' || (answer.value ->> 'selectedChoiceIndex'),
        E'\n'
        ORDER BY answer.value ->> 'questionId', answer.ordinality
      )
  INTO
    v_answer_count,
    v_distinct_answer_count,
    v_request_material
  FROM jsonb_array_elements(p_answers) WITH ORDINALITY AS answer(value, ordinality);

  IF p_experience_context IS NOT NULL THEN
    v_request_material :=
      v_request_material
      || E'\nexperience-context-v1\n'
      || octet_length(
        p_experience_context::text
      )::text
      || ':'
      || p_experience_context::text;
  END IF;

  v_request_fingerprint := encode(
    extensions.digest(convert_to(v_request_material, 'UTF8'), 'sha256'),
    'hex'
  );

  SELECT *
  INTO v_existing
  FROM public.mastery_attempts
  WHERE user_id = v_user_id
    AND submission_id = p_submission_id;

  IF FOUND THEN
    IF v_existing.lesson_id <> p_lesson_id
      OR v_existing.request_fingerprint <> v_request_fingerprint
    THEN
      RETURN jsonb_build_object('status', 'rejected', 'reason', 'submission_conflict');
    END IF;

    RETURN jsonb_build_object(
      'status', 'already_saved',
      'result', jsonb_build_object(
        'attemptId', v_existing.id,
        'submissionId', v_existing.submission_id,
        'lessonId', v_existing.lesson_id,
        'questionCount', v_existing.question_count,
        'correctCount', v_existing.correct_count,
        'percentage', v_existing.percentage,
        'scoringPolicyVersion', v_existing.scoring_policy_version,
        'scoringFingerprint', v_existing.scoring_fingerprint,
        'completedAt', v_existing.completed_at
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.lessons
    WHERE lessons.id = p_lesson_id
      AND lessons.status = 'approved'
  ) THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'lesson_not_available');
  END IF;

  SELECT
    count(*)::integer,
    v_policy_version || E'\n'
      || octet_length(p_lesson_id)::text || ':' || p_lesson_id || E'\n'
      || coalesce(
        string_agg(
          octet_length(questions.id)::text
            || ':' || questions.id
            || ':' || questions.correct_answer_index::text
            || ':' || cardinality(questions.choices)::text,
          E'\n'
          ORDER BY questions.id
        ),
        ''
      )
  INTO
    v_question_count,
    v_scoring_material
  FROM public.questions
  WHERE questions.lesson_id = p_lesson_id
    AND questions.purpose = 'mastery'
    AND questions.status = 'approved';

  IF v_question_count = 0 THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'lesson_not_available');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.questions
    WHERE questions.lesson_id = p_lesson_id
      AND questions.purpose = 'mastery'
      AND questions.status = 'approved'
      AND (
        questions.type <> 'multiple_choice'
        OR cardinality(questions.choices) = 0
        OR questions.correct_answer_index >= cardinality(questions.choices)
      )
  ) THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'scoring_contract_stale');
  END IF;

  v_scoring_fingerprint := encode(
    extensions.digest(convert_to(v_scoring_material, 'UTF8'), 'sha256'),
    'hex'
  );

  IF v_expected_scoring_fingerprint <> v_scoring_fingerprint THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'scoring_contract_stale');
  END IF;

  IF v_answer_count <> v_question_count
    OR v_distinct_answer_count <> v_question_count
    OR EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_answers) AS answer(value)
      LEFT JOIN public.questions
        ON questions.id = answer.value ->> 'questionId'
        AND questions.lesson_id = p_lesson_id
        AND questions.purpose = 'mastery'
        AND questions.status = 'approved'
      WHERE questions.id IS NULL
    )
  THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'question_set_mismatch');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_answers) AS answer(value)
    JOIN public.questions
      ON questions.id = answer.value ->> 'questionId'
      AND questions.lesson_id = p_lesson_id
      AND questions.purpose = 'mastery'
      AND questions.status = 'approved'
    WHERE (answer.value ->> 'selectedChoiceIndex')::integer >= cardinality(questions.choices)
  ) THEN
    RETURN jsonb_build_object('status', 'rejected', 'reason', 'invalid_response_set');
  END IF;

  SELECT (
    count(*) FILTER (
      WHERE (answer.value ->> 'selectedChoiceIndex')::integer = questions.correct_answer_index
    )
  )::integer
  INTO v_correct_count
  FROM public.questions
  JOIN jsonb_array_elements(p_answers) AS answer(value)
    ON answer.value ->> 'questionId' = questions.id
  WHERE questions.lesson_id = p_lesson_id
    AND questions.purpose = 'mastery'
    AND questions.status = 'approved';

  v_percentage := (v_correct_count::double precision * 100.0) / v_question_count;

  BEGIN
    INSERT INTO public.mastery_attempts (
      user_id,
      lesson_id,
      submission_id,
      started_at,
      question_count,
      correct_count,
      percentage,
      scoring_policy_version,
      scoring_fingerprint,
      request_fingerprint,
      experience_context
    )
    VALUES (
      v_user_id,
      p_lesson_id,
      p_submission_id,
      p_started_at,
      v_question_count,
      v_correct_count,
      v_percentage,
      v_policy_version,
      v_scoring_fingerprint,
      v_request_fingerprint,
      p_experience_context
    )
    RETURNING id, completed_at
    INTO v_attempt_id, v_completed_at;
  EXCEPTION
    WHEN unique_violation THEN
      GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;

      IF v_constraint_name <> 'mastery_attempts_user_submission_key' THEN
        RAISE;
      END IF;

      SELECT *
      INTO v_existing
      FROM public.mastery_attempts
      WHERE user_id = v_user_id
        AND submission_id = p_submission_id;

      IF NOT FOUND THEN
        RAISE;
      END IF;

      IF v_existing.lesson_id <> p_lesson_id
        OR v_existing.request_fingerprint <> v_request_fingerprint
      THEN
        RETURN jsonb_build_object('status', 'rejected', 'reason', 'submission_conflict');
      END IF;

      RETURN jsonb_build_object(
        'status', 'already_saved',
        'result', jsonb_build_object(
          'attemptId', v_existing.id,
          'submissionId', v_existing.submission_id,
          'lessonId', v_existing.lesson_id,
          'questionCount', v_existing.question_count,
          'correctCount', v_existing.correct_count,
          'percentage', v_existing.percentage,
          'scoringPolicyVersion', v_existing.scoring_policy_version,
          'scoringFingerprint', v_existing.scoring_fingerprint,
          'completedAt', v_existing.completed_at
        )
      );
  END;

  INSERT INTO public.mastery_attempt_answers (
    attempt_id,
    question_id,
    question_order,
    selected_choice_index,
    is_correct
  )
  SELECT
    v_attempt_id,
    questions.id,
    (row_number() OVER (ORDER BY questions.id) - 1)::integer,
    (answer.value ->> 'selectedChoiceIndex')::integer,
    (answer.value ->> 'selectedChoiceIndex')::integer = questions.correct_answer_index
  FROM public.questions
  JOIN jsonb_array_elements(p_answers) AS answer(value)
    ON answer.value ->> 'questionId' = questions.id
  WHERE questions.lesson_id = p_lesson_id
    AND questions.purpose = 'mastery'
    AND questions.status = 'approved'
  ORDER BY questions.id;

  RETURN jsonb_build_object(
    'status', 'saved',
    'result', jsonb_build_object(
      'attemptId', v_attempt_id,
      'submissionId', p_submission_id,
      'lessonId', p_lesson_id,
      'questionCount', v_question_count,
      'correctCount', v_correct_count,
      'percentage', v_percentage,
      'scoringPolicyVersion', v_policy_version,
      'scoringFingerprint', v_scoring_fingerprint,
      'completedAt', v_completed_at
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_mastery_attempt(
  uuid,
  text,
  timestamptz,
  text,
  jsonb,
  jsonb
)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.submit_mastery_attempt(
  uuid,
  text,
  timestamptz,
  text,
  jsonb,
  jsonb
)
TO authenticated;

NOTIFY pgrst, 'reload schema';
