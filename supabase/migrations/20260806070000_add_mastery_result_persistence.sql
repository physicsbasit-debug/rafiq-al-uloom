-- Phase 2-D1: Mastery result persistence database foundation.
-- Scope: immutable attempt/answer tables, atomic server-owned scoring RPC,
-- least-privilege grants, RLS, idempotency, and audit fingerprints.
-- Explicitly excluded: client repository/service, React integration, teacher dashboards,
-- offline queues, result edits/deletes, and non-multiple-choice scoring.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE public.mastery_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id text NOT NULL,
  submission_id uuid NOT NULL,
  started_at timestamptz NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  question_count integer NOT NULL,
  correct_count integer NOT NULL,
  percentage double precision NOT NULL,
  scoring_policy_version text NOT NULL,
  scoring_fingerprint text NOT NULL,
  request_fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mastery_attempts_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE,
  CONSTRAINT mastery_attempts_lesson_id_fkey
    FOREIGN KEY (lesson_id)
    REFERENCES public.lessons(id)
    ON DELETE RESTRICT,
  CONSTRAINT mastery_attempts_question_count_check
    CHECK (question_count > 0),
  CONSTRAINT mastery_attempts_correct_count_check
    CHECK (correct_count >= 0 AND correct_count <= question_count),
  CONSTRAINT mastery_attempts_percentage_check
    CHECK (percentage >= 0 AND percentage <= 100),
  CONSTRAINT mastery_attempts_scoring_policy_version_check
    CHECK (scoring_policy_version = 'mastery-equal-weight-v1'),
  CONSTRAINT mastery_attempts_scoring_fingerprint_check
    CHECK (scoring_fingerprint ~ '^[0-9a-f]{64}$'),
  CONSTRAINT mastery_attempts_request_fingerprint_check
    CHECK (request_fingerprint ~ '^[0-9a-f]{64}$'),
  CONSTRAINT mastery_attempts_user_submission_key
    UNIQUE (user_id, submission_id)
);

CREATE TABLE public.mastery_attempt_answers (
  attempt_id uuid NOT NULL,
  question_id text NOT NULL,
  question_order integer NOT NULL,
  selected_choice_index integer NOT NULL,
  is_correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mastery_attempt_answers_pkey
    PRIMARY KEY (attempt_id, question_id),
  CONSTRAINT mastery_attempt_answers_attempt_order_key
    UNIQUE (attempt_id, question_order),
  CONSTRAINT mastery_attempt_answers_attempt_id_fkey
    FOREIGN KEY (attempt_id)
    REFERENCES public.mastery_attempts(id)
    ON DELETE CASCADE,
  CONSTRAINT mastery_attempt_answers_question_id_fkey
    FOREIGN KEY (question_id)
    REFERENCES public.questions(id)
    ON DELETE RESTRICT,
  CONSTRAINT mastery_attempt_answers_question_order_check
    CHECK (question_order >= 0),
  CONSTRAINT mastery_attempt_answers_selected_choice_index_check
    CHECK (selected_choice_index >= 0)
);

CREATE INDEX mastery_attempts_user_completed_at_idx
  ON public.mastery_attempts (user_id, completed_at DESC);

CREATE INDEX mastery_attempts_lesson_id_idx
  ON public.mastery_attempts (lesson_id);

CREATE INDEX mastery_attempt_answers_question_id_idx
  ON public.mastery_attempt_answers (question_id);

COMMENT ON TABLE public.mastery_attempts IS
  'Immutable, server-scored completed mastery attempts owned by one authenticated user.';

COMMENT ON COLUMN public.mastery_attempts.submission_id IS
  'Client-generated UUID used only as an idempotency key within one user account.';

COMMENT ON COLUMN public.mastery_attempts.scoring_fingerprint IS
  'SHA-256 fingerprint of the authoritative ordered question set and scoring policy.';

COMMENT ON COLUMN public.mastery_attempts.request_fingerprint IS
  'SHA-256 fingerprint of the normalized submitted lesson, expected scoring fingerprint, and answers.';

COMMENT ON TABLE public.mastery_attempt_answers IS
  'Immutable per-question answer rows created only by submit_mastery_attempt.';

ALTER TABLE public.mastery_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastery_attempt_answers ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public.mastery_attempts,
  public.mastery_attempt_answers
FROM anon, authenticated, service_role;

GRANT SELECT ON TABLE
  public.mastery_attempts,
  public.mastery_attempt_answers
TO authenticated;

GRANT SELECT ON TABLE
  public.mastery_attempts,
  public.mastery_attempt_answers
TO service_role;

CREATE POLICY "active users read own mastery attempts"
ON public.mastery_attempts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.status = 'active'
      AND profiles.role IN ('student', 'teacher', 'reviewer')
  )
);

CREATE POLICY "active users read own mastery attempt answers"
ON public.mastery_attempt_answers
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.mastery_attempts
    JOIN public.profiles
      ON profiles.id = mastery_attempts.user_id
    WHERE mastery_attempts.id = mastery_attempt_answers.attempt_id
      AND mastery_attempts.user_id = auth.uid()
      AND profiles.id = auth.uid()
      AND profiles.status = 'active'
      AND profiles.role IN ('student', 'teacher', 'reviewer')
  )
);

CREATE FUNCTION public.submit_mastery_attempt(
  p_submission_id uuid,
  p_lesson_id text,
  p_started_at timestamptz,
  p_expected_scoring_fingerprint text,
  p_answers jsonb
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
      request_fingerprint
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
      v_request_fingerprint
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

REVOKE ALL ON FUNCTION public.submit_mastery_attempt(uuid, text, timestamptz, text, jsonb)
FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.submit_mastery_attempt(uuid, text, timestamptz, text, jsonb)
TO authenticated;
