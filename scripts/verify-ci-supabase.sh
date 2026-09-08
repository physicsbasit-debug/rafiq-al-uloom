#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

EDGE_PID=""
EDGE_LOG=""
SUPABASE_STARTED=0
SUPABASE_EXCLUDE_SERVICES="vector,logflare,storage-api,imgproxy,studio,mailpit,realtime,postgres-meta,supavisor"

run_step() {
  local title="$1"
  shift
  printf '\n==> %s\n' "$title"
  "$@"
}

start_minimal_supabase() {
  npx --no-install supabase start -x "$SUPABASE_EXCLUDE_SERVICES"
}

supabase_environment_ready() {
  local output

  if ! output="$(npx --no-install supabase status -o env 2>/dev/null)"; then
    return 1
  fi

  grep -Eq '^API_URL="?.+"?$' <<<"$output" &&
    grep -Eq '^(PUBLISHABLE_KEY|ANON_KEY)="?.+"?$' <<<"$output" &&
    grep -Eq '^SERVICE_ROLE_KEY="?.+"?$' <<<"$output"
}

wait_for_supabase_environment() {
  local max_attempts="${1:-30}"
  local delay_seconds="${2:-2}"
  local attempt

  for ((attempt = 1; attempt <= max_attempts; attempt++)); do
    if supabase_environment_ready; then
      echo "PASS: Supabase local environment ready"
      return 0
    fi

    if ((attempt < max_attempts)); then
      sleep "$delay_seconds"
    fi
  done

  return 1
}

check_zero_auth_profile_orphans() {
  local db_container
  local orphan_count

  db_container="$(
    docker ps \
      --filter 'name=supabase_db_' \
      --format '{{.Names}}' |
      head -n 1
  )"

  if [[ -z "$db_container" ]]; then
    echo "Supabase database container is not running." >&2
    return 1
  fi

  orphan_count="$(
    docker exec -i "$db_container" \
      psql -U postgres -d postgres -At \
      -c '
        SELECT count(*)
        FROM auth.users au
        LEFT JOIN public.profiles p ON p.id = au.id
        WHERE p.id IS NULL;
      '
  )"

  if [[ "$orphan_count" != "0" ]]; then
    echo "Found auth.users rows without matching public.profiles rows: $orphan_count" >&2
    return 1
  fi

  echo "PASS: no auth users without profiles after integration suite"
}

restart_supabase_after_reset() {
  local recovery_log="${TMPDIR:-/tmp}/rafiq-ci-supabase-recovery-$$.log"
  rm -f "$recovery_log"

  if ! npx --no-install supabase stop --no-backup >"$recovery_log" 2>&1; then
    cat "$recovery_log" >&2 || true
    rm -f "$recovery_log"
    return 1
  fi

  if ! start_minimal_supabase >"$recovery_log" 2>&1; then
    cat "$recovery_log" >&2 || true
    rm -f "$recovery_log"
    return 1
  fi

  rm -f "$recovery_log"
  echo "PASS: minimal Supabase stack recovered after reset"
}

cleanup_edge_runtime() {
  if [[ -n "$EDGE_PID" ]] && kill -0 "$EDGE_PID" >/dev/null 2>&1; then
    kill "$EDGE_PID" >/dev/null 2>&1 || true
    wait "$EDGE_PID" 2>/dev/null || true
  fi

  if [[ -n "$EDGE_LOG" ]]; then
    rm -f "$EDGE_LOG"
  fi

  EDGE_PID=""
  EDGE_LOG=""
}

cleanup() {
  cleanup_edge_runtime

  if ((SUPABASE_STARTED == 1)); then
    npx --no-install supabase stop --no-backup >/dev/null 2>&1 || true
  fi
}

start_nonlive_edge_runtime() {
  local attempt
  local http_code

  cleanup_edge_runtime
  EDGE_LOG="${TMPDIR:-/tmp}/rafiq-ci-edge-nonlive-$$.log"
  rm -f "$EDGE_LOG"

  env \
    -u GEMINI_API_KEY \
    -u RUN_LIVE_GEMINI_TESTS \
    npx --no-install supabase functions serve ai-authoring-gateway \
    >"$EDGE_LOG" 2>&1 &
  EDGE_PID=$!

  for attempt in {1..30}; do
    if ! kill -0 "$EDGE_PID" >/dev/null 2>&1; then
      echo "Non-live AI Edge process exited before readiness." >&2
      tail -80 "$EDGE_LOG" >&2 || true
      return 1
    fi

    http_code="$(
      curl \
        --silent \
        --output /dev/null \
        --write-out '%{http_code}' \
        http://127.0.0.1:54321/functions/v1/ai-authoring-gateway ||
        true
    )"

    if [[ "$http_code" == "401" ]]; then
      echo "PASS: non-live AI Edge gateway ready with JWT protection"
      return 0
    fi

    sleep 1
  done

  echo "Non-live AI Edge gateway did not become ready." >&2
  tail -80 "$EDGE_LOG" >&2 || true
  return 1
}

trap cleanup EXIT

unset GEMINI_API_KEY RUN_LIVE_GEMINI_TESTS || true

run_step "Docker availability" docker version
run_step "Supabase minimal local start" start_minimal_supabase
SUPABASE_STARTED=1

run_step "Supabase database reset" npx --no-install supabase db reset

printf '\n==> Supabase environment readiness\n'
if ! wait_for_supabase_environment 5 2; then
  printf '%s\n' 'Supabase API unavailable after reset; controlled recovery starts.'
  run_step "Supabase minimal local recovery" restart_supabase_after_reset

  if ! wait_for_supabase_environment 30 2; then
    echo "Supabase local environment did not recover." >&2
    exit 1
  fi
fi

run_step "Start non-live AI Edge gateway" start_nonlive_edge_runtime

run_step \
  "Supabase non-live integration suite" \
  env \
  -u GEMINI_API_KEY \
  -u RUN_LIVE_GEMINI_TESTS \
  npm run test:supabase

run_step "Post-suite auth/profile orphan invariant" check_zero_auth_profile_orphans

run_step "Git diff check" git diff --check

printf '\nLOCAL SUPABASE CI GATE PASSED\n'
