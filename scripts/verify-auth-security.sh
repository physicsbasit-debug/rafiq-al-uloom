#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

required_commands=(git grep node npm npx sleep)
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
  local required_key

  if ! status_output="$(npx --no-install supabase status -o env 2>/dev/null)"; then
    return 1
  fi

  for required_key in API_URL REST_URL PUBLISHABLE_KEY SERVICE_ROLE_KEY; do
    if ! grep -Eq "^${required_key}=\"?.+\"?$" <<<"$status_output"; then
      return 1
    fi
  done

  return 0
}

wait_for_supabase_test_environment() {
  local max_attempts=30
  local delay_seconds=2
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

  cat >&2 <<'MESSAGE'
Supabase local stack did not expose the required test environment after database reset.
Required keys: API_URL, REST_URL, PUBLISHABLE_KEY, SERVICE_ROLE_KEY.
Run: npx supabase status -o env
Then inspect the local stack before rerunning: npm run verify:auth-closure
MESSAGE
  return 1
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
run_step "Supabase test environment readiness" wait_for_supabase_test_environment
run_step "Supabase integration tests" npm run test:supabase
run_step "Git diff check" git diff --check

printf '\nAuth closure verification passed.\n'
printf 'Expected evidence: 447 basic tests + 61 Supabase integration tests = 508 total tests.\n'
