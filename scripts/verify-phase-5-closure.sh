#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PHASE4_TAG="v0.7.1-ai-assisted-authoring-closure-repair"
PHASE4_COMMIT="f63fdcf886911d8c884241701721cce2aaa47c61"
PHASE5_5_COMMIT="45877f039796731a624dee3b74f9288e0c4e4aba"
PHASE5_6F_COMMIT="f519a6c8c5d78ce7eed9c70785e27aa88626ded9"
EXPECTED_BRANCH="${PHASE5_CLOSURE_BRANCH:-phase-5-6-real-composition-qa}"

EDGE_PID=""
EDGE_LOG=""

run_step() {
  local title="$1"
  shift
  printf '\n==> %s\n' "$title"
  "$@"
}

verify_phase4_frozen_baseline() {
  local actual
  if ! git rev-parse "$PHASE4_TAG^{}" >/dev/null 2>&1; then
    echo "Missing required Phase 4 frozen tag: $PHASE4_TAG" >&2
    return 1
  fi
  actual="$(git rev-parse "$PHASE4_TAG^{}")"
  if [[ "$actual" != "$PHASE4_COMMIT" ]]; then
    echo "Phase 4 frozen tag moved unexpectedly." >&2
    echo "Expected: $PHASE4_COMMIT" >&2
    echo "Actual:   $actual" >&2
    return 1
  fi
  echo "PASS: Phase 4 frozen baseline preserved"
}

verify_phase5_candidate_ancestry() {
  if ! git merge-base --is-ancestor "$PHASE4_COMMIT" HEAD; then
    echo "Current candidate is not descended from frozen Phase 4." >&2
    return 1
  fi
  if ! git merge-base --is-ancestor "$PHASE5_6F_COMMIT" HEAD; then
    echo "Current candidate does not contain the accepted Phase 5-6F commit." >&2
    return 1
  fi
  echo "PASS: Phase 5 candidate ancestry preserved"
}

verify_phase5_documentation_state() {
  grep -Fq "5-Freeze IN PROGRESS" docs/PHASES.md
  grep -Fq "5-6F  Full Phase 5 Functional Acceptance" docs/PHASES.md
  grep -Fq "**دليل القبول الوظيفي لـPhase 5-6F:**" docs/PHASES.md
  grep -Fq "النطاق الوظيفي لـPhase 5: ACCEPTED" docs/PHASES.md
  echo "PASS: Phase 5 functional acceptance documentation present"
}

verify_mobile_acceptance_still_valid() {
  local changed
  changed="$(git diff --name-only "$PHASE5_6F_COMMIT"..HEAD -- src index.html public 2>/dev/null || true)"
  if [[ -n "$changed" ]]; then
    echo "Production UI changed after the human Mobile/RTL acceptance commit." >&2
    echo "Human Mobile/RTL acceptance must be repeated before closure." >&2
    printf '%s\n' "$changed" >&2
    return 1
  fi
  echo "PASS: no production UI change after human Mobile/RTL acceptance"
}

verify_forward_only_migrations() {
  local changes
  local bad=""

  changes="$(git diff --name-status "$PHASE4_COMMIT".."$PHASE5_5_COMMIT" -- supabase/migrations || true)"

  while IFS=$'\t' read -r status path rest; do
    [[ -z "$status" ]] && continue
    case "$status" in
      A) ;;
      *)
        bad+="${status}"$'\t'"${path}"
        if [[ -n "${rest:-}" ]]; then
          bad+=$'\t'"${rest}"
        fi
        bad+=$'\n'
        ;;
    esac
  done <<<"$changes"

  if [[ -n "$bad" ]]; then
    echo "Historical migration rewrite detected between Phase 4 and Phase 5-5." >&2
    printf '%s' "$bad" >&2
    return 1
  fi

  changes="$(git diff --name-status "$PHASE5_5_COMMIT"..HEAD -- supabase/migrations || true)"
  bad=""

  while IFS=$'\t' read -r status path rest; do
    [[ -z "$status" ]] && continue
    case "$status" in
      A) ;;
      *)
        bad+="${status}"$'\t'"${path}"
        if [[ -n "${rest:-}" ]]; then
          bad+=$'\t'"${rest}"
        fi
        bad+=$'\n'
        ;;
    esac
  done <<<"$changes"

  if [[ -n "$bad" ]]; then
    echo "Frozen Phase 5-5 or historical migration rewrite detected after Phase 5-5." >&2
    printf '%s' "$bad" >&2
    return 1
  fi

  echo "PASS: migrations are forward-only and frozen Phase 5-5 migrations are unchanged"
}

supabase_environment_ready() {
  local output
  if ! output="$(npx --no-install supabase status -o env 2>/dev/null)"; then
    return 1
  fi
  grep -Eq '^API_URL="?[^"]+"?$' <<<"$output" &&
    grep -Eq '^(PUBLISHABLE_KEY|ANON_KEY)="?[^"]+"?$' <<<"$output" &&
    grep -Eq '^SERVICE_ROLE_KEY="?[^"]+"?$' <<<"$output"
}

wait_for_supabase_environment() {
  local max_attempts="${1:-30}"
  local attempt
  for ((attempt = 1; attempt <= max_attempts; attempt++)); do
    if supabase_environment_ready; then
      echo "PASS: Supabase environment visible"
      return 0
    fi
    sleep 2
  done
  return 1
}

verify_real_auth_fixture() {
  local smoke_file="${TMPDIR:-/tmp}/rafiq-phase5-auth-smoke-$$.ts"
  cat >"$smoke_file" <<TS
import {
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
} from '${ROOT_DIR}/tests/integration/helpers/supabase-auth-fixtures.ts';

async function main() {
  const env = readLocalSupabaseEnvironment();
  const fixtures = new SupabaseAuthFixtures(env);

  try {
    const identity = await fixtures.createIdentity(
      'phase5-closure-auth-smoke',
      'teacher',
      'active'
    );

    if (identity.user?.id == null) {
      throw new Error('Auth fixture returned no user id');
    }

    if (identity.accessToken == null || identity.accessToken.length === 0) {
      throw new Error('Auth fixture returned no access token');
    }

    console.log('PASS: real Supabase Auth fixture ready');
  } finally {
    await fixtures.cleanup();
  }
}

main().catch((error) => {
  console.error('PHASE5_AUTH_SMOKE_FAIL');
  console.error(error);
  process.exit(1);
});
TS
  if ! npx --no-install tsx "$smoke_file"; then
    rm -f "$smoke_file"
    return 1
  fi
  rm -f "$smoke_file"
}

restart_supabase_after_reset() {
  local recovery_log="${TMPDIR:-/tmp}/rafiq-phase5-supabase-recovery.log"
  rm -f "$recovery_log"
  if ! npx --no-install supabase stop --no-backup >"$recovery_log" 2>&1; then
    echo "Failed to stop Supabase during recovery." >&2
    cat "$recovery_log" >&2 || true
    rm -f "$recovery_log"
    return 1
  fi
  if ! npx --no-install supabase start >"$recovery_log" 2>&1; then
    echo "Failed to restart Supabase during recovery." >&2
    cat "$recovery_log" >&2 || true
    rm -f "$recovery_log"
    return 1
  fi
  rm -f "$recovery_log"
  echo "PASS: Supabase stack restarted after reset"
}

verify_supabase_after_reset() {
  if wait_for_supabase_environment 5 && verify_real_auth_fixture; then
    echo "PASS: Supabase environment and Auth ready"
    return 0
  fi
  echo "Supabase/Auth not fully ready; controlled recovery starts."
  restart_supabase_after_reset
  if ! wait_for_supabase_environment 30; then
    echo "Supabase environment did not recover." >&2
    return 1
  fi
  if ! verify_real_auth_fixture; then
    echo "Supabase Auth did not recover." >&2
    return 1
  fi
  echo "PASS: Supabase environment and Auth recovered"
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

start_nonlive_edge_runtime() {
  local attempt
  local http_code
  cleanup_edge_runtime
  EDGE_LOG="${TMPDIR:-/tmp}/rafiq-phase5-edge-nonlive-$$.log"
  rm -f "$EDGE_LOG"
  env -u GEMINI_API_KEY     npx --no-install supabase functions serve     ai-authoring-gateway     >"$EDGE_LOG" 2>&1 &
  EDGE_PID=$!
  for attempt in {1..30}; do
    if ! kill -0 "$EDGE_PID" >/dev/null 2>&1; then
      echo "Non-live AI Edge process exited before readiness." >&2
      tail -80 "$EDGE_LOG" >&2 || true
      return 1
    fi
    http_code="$(curl --silent --output /dev/null --write-out '%{http_code}' http://127.0.0.1:54321/functions/v1/ai-authoring-gateway || true)"
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

verify_clean_and_synchronized_candidate() {
  local status_output
  local branch
  local head_commit
  local origin_commit
  status_output="$(git status --porcelain)"
  if [[ -n "$status_output" ]]; then
    echo "Working tree is not clean:" >&2
    printf '%s\n' "$status_output" >&2
    return 1
  fi
  branch="$(git branch --show-current)"
  if [[ "$branch" != "$EXPECTED_BRANCH" ]]; then
    echo "Unexpected closure branch." >&2
    echo "Expected: $EXPECTED_BRANCH" >&2
    echo "Actual:   $branch" >&2
    return 1
  fi
  git fetch origin "$branch" --quiet
  head_commit="$(git rev-parse HEAD)"
  origin_commit="$(git rev-parse "refs/remotes/origin/$branch")"
  if [[ "$head_commit" != "$origin_commit" ]]; then
    echo "HEAD does not match the remote closure branch." >&2
    echo "HEAD:           $head_commit" >&2
    echo "origin/$branch: $origin_commit" >&2
    return 1
  fi
  echo "PASS: Git candidate clean and synchronized"
  echo "Verified candidate: $head_commit"
}

trap cleanup_edge_runtime EXIT

run_step "Frozen Phase 4 baseline" verify_phase4_frozen_baseline
run_step "Phase 5 candidate ancestry" verify_phase5_candidate_ancestry
run_step "Phase 5 documentation state" verify_phase5_documentation_state
run_step "Human Mobile/RTL acceptance carry-forward guard" verify_mobile_acceptance_still_valid
run_step "Forward-only migration guard" verify_forward_only_migrations
run_step "Prettier" npx --no-install prettier --check .
run_step "Lint" npm run lint
run_step "Build" npm run build
run_step "Core/unit tests" npm run test
run_step "Auth client boundary scan" node scripts/check-auth-client-boundaries.mjs
run_step "Mastery-results client boundary scan" node scripts/check-mastery-results-client-boundaries.mjs
run_step   "Phase 5 Safety + RTL targeted tests"   npx --no-install vitest run     tests/features/StudentExperimentSafetyUi.test.tsx     tests/features/student-experiment-safety.test.ts     tests/architecture/phase-5-6-arabic-rtl-root.test.ts

printf '\n==> Supabase status\n'
if ! npx --no-install supabase status >/dev/null 2>&1; then
  cat >&2 <<'MESSAGE'
Supabase local stack is not running.

Run:
  npx supabase start

Then rerun:
  npm run verify:phase-5-closure
MESSAGE
  exit 1
fi

run_step "Supabase database reset" npx --no-install supabase db reset
run_step "Supabase environment + real Auth readiness" verify_supabase_after_reset
run_step "Start non-live AI Edge gateway" start_nonlive_edge_runtime
run_step "Full Supabase non-live integration suite" npm run test:supabase
cleanup_edge_runtime

run_step   "Student real activity composition"   env RUN_SUPABASE_INTEGRATION_TESTS=true   npx --no-install vitest run     --config vitest.supabase.config.ts     tests/integration/supabase-student-activity-composition.integration.tsx

trap - EXIT

run_step "Git diff check" git diff --check
run_step "Git closure candidate state" verify_clean_and_synchronized_candidate

printf '\n==================================================\n'
printf ' PHASE 5 AUTOMATED CLOSURE VERIFICATION PASSED\n'
printf '==================================================\n'
printf '%s\n' 'PASS: frozen Phase 4 V2 baseline preserved'
printf '%s\n' 'PASS: Phase 5 functional acceptance documentation present'
printf '%s\n' 'PASS: human Mobile/RTL acceptance remains valid because production UI did not change after 5-6F'
printf '%s\n' 'PASS: migrations are forward-only and frozen Phase 5-5 migrations are unchanged'
printf '%s\n' 'PASS: lint, build, core/unit, Safety/RTL and Supabase non-live suites'
printf '%s\n' 'PASS: approved canonical lesson → student lesson → hub → registry/host → five activity families'
printf '%s\n' 'PASS: clean synchronized Phase 5 closure candidate'
printf '%s\n' 'Live Gemini tests remain intentionally outside Phase 5 closure.'
printf '%s\n' 'This command does not merge to main and does not create or push the final Phase 5 tag.'
