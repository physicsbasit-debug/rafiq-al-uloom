-- Phase 4-3B: Server-side Atomic AI Authoring Rate Limiting
-- Baseline: 83d3fd7dacc2f8b147d0a7df5ca290bb10f66f87
-- Scope: private quota state + narrow parameterless RPC only.
-- Explicitly excluded: live AI provider, provider keys, provenance persistence,
-- canonical/revision/review/publication writes, and service-role Gateway access.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL PRIVILEGES ON SCHEMA private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE private.ai_authoring_quota_state (
  user_id uuid PRIMARY KEY,
  burst_window_started_at timestamptz NOT NULL,
  burst_count integer NOT NULL DEFAULT 0,
  daily_window_started_at timestamptz NOT NULL,
  daily_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_authoring_quota_state_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE,
  CONSTRAINT ai_authoring_quota_state_burst_count_check
    CHECK (burst_count >= 0),
  CONSTRAINT ai_authoring_quota_state_daily_count_check
    CHECK (daily_count >= 0)
);

COMMENT ON TABLE private.ai_authoring_quota_state IS
  'Internal Phase 4-3B AI authoring quota counters. No prompt, lesson, revision, or provider content is stored.';
COMMENT ON COLUMN private.ai_authoring_quota_state.burst_window_started_at IS
  'Start of the current fixed 60-second burst window.';
COMMENT ON COLUMN private.ai_authoring_quota_state.daily_window_started_at IS
  'Start of the current UTC calendar day for lazy daily reset.';

ALTER TABLE private.ai_authoring_quota_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
ON TABLE private.ai_authoring_quota_state
FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.consume_ai_authoring_quota()
RETURNS TABLE (
  allowed boolean,
  remaining_burst integer,
  remaining_daily integer,
  retry_after_seconds integer,
  limit_reason text
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id uuid;
  v_profile_role text;
  v_profile_status text;

  v_now timestamptz;
  v_today_utc_start timestamptz;
  v_next_utc_midnight timestamptz;

  v_burst_window_started_at timestamptz;
  v_burst_count integer;
  v_daily_window_started_at timestamptz;
  v_daily_count integer;

  v_burst_reset boolean := false;
  v_daily_reset boolean := false;
  v_burst_exhausted boolean;
  v_daily_exhausted boolean;

  v_retry_burst integer := 0;
  v_retry_daily integer := 0;
  v_retry_after integer := 0;

  -- Phase 4-3B local policy values. Re-review before connecting a live provider.
  v_burst_limit CONSTANT integer := 6;
  v_daily_limit CONSTANT integer := 80;
  v_burst_window CONSTANT interval := interval '60 seconds';
BEGIN
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RETURN QUERY
    SELECT
      false,
      NULL::integer,
      NULL::integer,
      NULL::integer,
      'unauthorized'::text;
    RETURN;
  END IF;

  -- Re-check the live authoritative profile inside the trusted function.
  -- FOR SHARE keeps the role/status stable until this short quota transaction finishes.
  SELECT profiles.role, profiles.status
  INTO v_profile_role, v_profile_status
  FROM public.profiles
  WHERE profiles.id = v_user_id
  FOR SHARE;

  IF NOT FOUND
    OR v_profile_role <> 'teacher'
    OR v_profile_status <> 'active'
  THEN
    RETURN QUERY
    SELECT
      false,
      NULL::integer,
      NULL::integer,
      NULL::integer,
      'unauthorized'::text;
    RETURN;
  END IF;

  v_now := clock_timestamp();
  v_today_utc_start :=
    date_trunc('day', v_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';

  -- Mandatory first-use race closure:
  -- never SELECT-to-check-then-INSERT.
  INSERT INTO private.ai_authoring_quota_state (
    user_id,
    burst_window_started_at,
    burst_count,
    daily_window_started_at,
    daily_count,
    updated_at
  )
  VALUES (
    v_user_id,
    v_now,
    0,
    v_today_utc_start,
    0,
    v_now
  )
  ON CONFLICT (user_id) DO NOTHING;

  -- Serialize quota decisions per user. Under READ COMMITTED, a concurrent
  -- first INSERT that won the unique-key race is visible to this next command.
  SELECT
    quota.burst_window_started_at,
    quota.burst_count,
    quota.daily_window_started_at,
    quota.daily_count
  INTO
    v_burst_window_started_at,
    v_burst_count,
    v_daily_window_started_at,
    v_daily_count
  FROM private.ai_authoring_quota_state AS quota
  WHERE quota.user_id = v_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ai_authoring_quota_state_unavailable'
      USING ERRCODE = '55000';
  END IF;

  -- Re-read server time after waiting for the row lock.
  v_now := clock_timestamp();
  v_today_utc_start :=
    date_trunc('day', v_now AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_next_utc_midnight :=
    (date_trunc('day', v_now AT TIME ZONE 'UTC') + interval '1 day')
      AT TIME ZONE 'UTC';

  -- Fixed 60-second burst window, lazily reset.
  IF v_now >= v_burst_window_started_at + v_burst_window THEN
    v_burst_window_started_at := v_now;
    v_burst_count := 0;
    v_burst_reset := true;
  END IF;

  -- UTC calendar-day quota, lazily reset in this same locked transaction.
  IF (v_daily_window_started_at AT TIME ZONE 'UTC')::date
      <> (v_now AT TIME ZONE 'UTC')::date
  THEN
    v_daily_window_started_at := v_today_utc_start;
    v_daily_count := 0;
    v_daily_reset := true;
  END IF;

  v_burst_exhausted := v_burst_count >= v_burst_limit;
  v_daily_exhausted := v_daily_count >= v_daily_limit;

  IF v_burst_exhausted OR v_daily_exhausted THEN
    IF v_burst_exhausted THEN
      v_retry_burst :=
        GREATEST(
          1,
          CEIL(
            EXTRACT(
              EPOCH FROM (
                (v_burst_window_started_at + v_burst_window) - v_now
              )
            )
          )::integer
        );
    END IF;

    IF v_daily_exhausted THEN
      v_retry_daily :=
        GREATEST(
          1,
          CEIL(EXTRACT(EPOCH FROM (v_next_utc_midnight - v_now)))::integer
        );
    END IF;

    v_retry_after := GREATEST(v_retry_burst, v_retry_daily);

    -- Persist a lazy reset even when the other quota still denies the request.
    -- An exhausted request never increments either counter.
    IF v_burst_reset OR v_daily_reset THEN
      UPDATE private.ai_authoring_quota_state
      SET
        burst_window_started_at = v_burst_window_started_at,
        burst_count = v_burst_count,
        daily_window_started_at = v_daily_window_started_at,
        daily_count = v_daily_count,
        updated_at = v_now
      WHERE user_id = v_user_id;
    END IF;

    RETURN QUERY
    SELECT
      false,
      GREATEST(v_burst_limit - v_burst_count, 0),
      GREATEST(v_daily_limit - v_daily_count, 0),
      v_retry_after,
      CASE
        WHEN v_burst_exhausted AND v_daily_exhausted THEN 'burst_and_daily'
        WHEN v_daily_exhausted THEN 'daily'
        ELSE 'burst'
      END::text;
    RETURN;
  END IF;

  v_burst_count := v_burst_count + 1;
  v_daily_count := v_daily_count + 1;

  UPDATE private.ai_authoring_quota_state
  SET
    burst_window_started_at = v_burst_window_started_at,
    burst_count = v_burst_count,
    daily_window_started_at = v_daily_window_started_at,
    daily_count = v_daily_count,
    updated_at = v_now
  WHERE user_id = v_user_id;

  RETURN QUERY
  SELECT
    true,
    v_burst_limit - v_burst_count,
    v_daily_limit - v_daily_count,
    0,
    NULL::text;
END;
$$;

COMMENT ON FUNCTION public.consume_ai_authoring_quota() IS
  'Atomically consumes one Phase 4-3B AI authoring quota reservation for auth.uid(). Active teachers only; no client policy parameters.';

REVOKE ALL PRIVILEGES
ON FUNCTION public.consume_ai_authoring_quota()
FROM PUBLIC, anon, service_role;

GRANT EXECUTE
ON FUNCTION public.consume_ai_authoring_quota()
TO authenticated;
