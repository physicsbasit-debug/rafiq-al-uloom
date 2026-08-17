#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

required_commands=(env git grep node npm npx rm sleep)
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

verify_app_css_removed() {
  if [[ -e src/App.css ]]; then
    echo "src/App.css still exists. Phase 3 freeze requires the audited dead file to be removed." >&2
    exit 1
  fi

  if grep -RIn \
    --exclude-dir=node_modules \
    --exclude-dir=dist \
    -F 'App.css' \
    src index.html vite.config.ts package.json
  then
    echo "A live App.css reference remains after deletion." >&2
    exit 1
  fi

  echo "App.css removal invariant passed."
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
  local log_file="${TMPDIR:-/tmp}/rafiq-phase-3-supabase-recovery.log"
  rm -f "$log_file"

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

verify_clean_and_synchronized_git() {
  local status_output
  status_output="$(git status --porcelain)"

  if [[ -n "$status_output" ]]; then
    echo "Working tree is not clean:" >&2
    printf '%s\n' "$status_output" >&2
    exit 1
  fi

  printf '%s\n' "Refreshing origin/main before synchronization check..."
  git fetch origin main --quiet

  if ! git show-ref --verify --quiet refs/remotes/origin/main; then
    echo "Missing refs/remotes/origin/main after fetch." >&2
    exit 1
  fi

  local head_commit
  local origin_commit
  head_commit="$(git rev-parse HEAD)"
  origin_commit="$(git rev-parse refs/remotes/origin/main)"

  if [[ "$head_commit" != "$origin_commit" ]]; then
    echo "HEAD does not match freshly fetched origin/main." >&2
    echo "HEAD:        $head_commit" >&2
    echo "origin/main: $origin_commit" >&2
    exit 1
  fi

  echo "Git working tree is clean and HEAD matches freshly fetched origin/main."
  echo "Verified commit: $head_commit"
}

run_step "App.css removal invariant" verify_app_css_removed
run_step "Prettier" npx --no-install prettier --check .
run_step "Lint" npm run lint
run_step "Build" npm run build
run_step "Basic tests" npm run test
run_step "Auth client boundary scan" node scripts/check-auth-client-boundaries.mjs
run_step \
  "Mastery-results client boundary scan" \
  node scripts/check-mastery-results-client-boundaries.mjs

printf '\n==> Supabase status\n'
if ! npx --no-install supabase status >/dev/null 2>&1; then
  cat >&2 <<'MESSAGE'
Supabase local stack is not running.
Run: npx supabase start
Then rerun: npm run verify:phase-3-closure
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
Then inspect the local stack before rerunning: npm run verify:phase-3-closure
MESSAGE
    exit 1
  fi
fi

run_step "Full Supabase integration suite" npm run test:supabase
run_step \
  "Phase 3 real teacher/reviewer composition gate" \
  env RUN_SUPABASE_INTEGRATION_TESTS=true \
  npx --no-install vitest run \
  --config vitest.supabase.config.ts \
  tests/integration/supabase-teacher-reviewer-workspace-composition.integration.tsx

run_step "Git diff check" git diff --check
run_step "Git closure state" verify_clean_and_synchronized_git

printf '\nPhase 3 automated closure verification passed.\n'
printf '%s\n' \
  'Test counts are intentionally not predeclared; the executed repository output is authoritative.'
printf '%s\n' \
  'Mobile Visual Acceptance remains a separate mandatory human gate before the v0.6 tag.'
printf '%s\n' \
  'This command does not create or push v0.6-teacher-dashboard-complete.'
