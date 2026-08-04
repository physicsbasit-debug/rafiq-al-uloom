#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

required_commands=(git grep node npm npx rm sleep)
for command_name in "${required_commands[@]}"; do
  if ! command -v "$command_name" >/dev/null 2>&1; then
    echo "Missing required command: $command_name" >&2
    exit 1
  fi
done

run_step() {
  local title="$1"
  shift
  printf '\n==> %s\n' "$title"
  "$@"
}

supabase_test_environment_ready() {
  local status_output

  if ! status_output="$(npx --no-install supabase status -o env 2>/dev/null)"; then
    return 1
  fi

  if ! grep -Eq '^API_URL="?.+"?$' <<<"$status_output"; then
    return 1
  fi

  if ! grep -Eq '^(PUBLISHABLE_KEY|ANON_KEY)="?.+"?$' <<<"$status_output"; then
    return 1
  fi

  if ! grep -Eq '^SERVICE_ROLE_KEY="?.+"?$' <<<"$status_output"; then
    return 1
  fi

  return 0
}

wait_for_supabase_test_environment() {
  local max_attempts="${1:-30}"
  local delay_seconds="${2:-2}"
  local attempt

  for ((attempt = 1; attempt <= max_attempts; attempt++)); do
    if supabase_test_environment_ready; then
      echo "Supabase test environment is ready."
      return 0
    fi

    if ((attempt < max_attempts)); then
      printf \
        'Supabase test environment is not ready yet (%d/%d); retrying in %ss...\n' \
        "$attempt" \
        "$max_attempts" \
        "$delay_seconds"
      sleep "$delay_seconds"
    fi
  done

  return 1
}

restart_supabase_local_stack_after_reset() {
  local log_file="${TMPDIR:-/tmp}/rafiq-supabase-recovery.log"
  rm -f "$log_file"

  # db reset can leave the database healthy while Kong/PostgREST remain stopped.
  # Restart the already-running local test stack without printing local keys.
  if ! npx --no-install supabase stop --no-backup >"$log_file" 2>&1; then
    rm -f "$log_file"
    echo "Failed to stop the partial Supabase local stack after database reset." >&2
    echo "Run manually: npx supabase stop --no-backup" >&2
    return 1
  fi

  if ! npx --no-install supabase start >"$log_file" 2>&1; then
    rm -f "$log_file"
    echo "Failed to restart the Supabase local stack after database reset." >&2
    echo "Run manually: npx supabase start" >&2
    return 1
  fi

  rm -f "$log_file"
  echo "Supabase local stack restarted after database reset."
}

run_step "Build" npm run build
run_step "Lint" npm run lint
run_step "Basic tests" npm run test
run_step "Prettier" npx --no-install prettier --check .
run_step "Auth client boundary scan" node scripts/check-auth-client-boundaries.mjs

printf '\n==> Supabase status\n'
if ! npx --no-install supabase status >/dev/null 2>&1; then
  cat >&2 <<'MESSAGE'
Supabase local stack is not running.
Run: npx supabase start
Then rerun: npm run verify:auth-closure
MESSAGE
  exit 1
fi

run_step "Supabase database reset" npx --no-install supabase db reset

printf '\n==> Supabase test environment readiness\n'
if ! wait_for_supabase_test_environment 5 2; then
  printf '%s\n' \
    'Supabase API was unavailable after database reset; restarting the local test stack.'
  run_step "Supabase local stack recovery" restart_supabase_local_stack_after_reset

  printf '\n==> Supabase test environment readiness after recovery\n'
  if ! wait_for_supabase_test_environment 30 2; then
    cat >&2 <<'MESSAGE'
Supabase local stack did not expose the required test environment after recovery.
Required keys: API_URL, SERVICE_ROLE_KEY, and either PUBLISHABLE_KEY or ANON_KEY.
Run: npx supabase status -o env
Then inspect the local stack before rerunning: npm run verify:auth-closure
MESSAGE
    exit 1
  fi
fi

run_step "Supabase integration tests" npm run test:supabase
run_step "Git diff check" git diff --check

printf '\nAuth closure verification passed.\n'
printf 'Expected evidence: 447 basic tests + 61 Supabase integration tests = 508 total tests.\n'
