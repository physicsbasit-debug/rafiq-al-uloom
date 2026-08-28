#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PHASE3_TAG="v0.6-teacher-dashboard-complete"
PHASE3_COMMIT="3f2eb668d1c08ea6699f1a60cb56c58617ad98d7"

EDGE_PID=""
EDGE_ENV=""
EDGE_LOG=""

run_step() {
  local title="$1"
  shift

  printf '\n==> %s\n' "$title"
  "$@"
}

verify_phase3_frozen_baseline() {
  local actual

  if ! git rev-parse "$PHASE3_TAG^{}" >/dev/null 2>&1; then
    echo "Missing required Phase 3 frozen tag: $PHASE3_TAG" >&2
    return 1
  fi

  actual="$(git rev-parse "$PHASE3_TAG^{}")"

  if [[ "$actual" != "$PHASE3_COMMIT" ]]; then
    echo "Phase 3 frozen tag moved unexpectedly." >&2
    echo "Expected: $PHASE3_COMMIT" >&2
    echo "Actual:   $actual" >&2
    return 1
  fi

  echo "PASS: Phase 3 frozen baseline preserved"
}

verify_ephemeral_provenance_invariant() {
  if ! grep -Fq \
    'NO DURABLE AI PROVENANCE PERSISTENCE IN v0.7' \
    docs/PHASE_4_5_PROVENANCE_PERSISTENCE_DECISION.md
  then
    echo "Phase 4-5 provenance decision is missing." >&2
    return 1
  fi

  if grep -RInE \
    'ai_provenance|generation_id|provider_family|model_label' \
    supabase/migrations \
    src/services/authoring
  then
    echo "Durable AI provenance appeared in frozen persistence surfaces." >&2
    return 1
  fi

  echo "PASS: Phase 4 provenance remains ephemeral"
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
  local smoke_file="${TMPDIR:-/tmp}/rafiq-phase4-auth-smoke-$$.ts"

  cat > "$smoke_file" <<TS
import {
  readLocalSupabaseEnvironment,
  SupabaseAuthFixtures,
} from '${ROOT_DIR}/tests/integration/helpers/supabase-auth-fixtures.ts';

async function main() {
  const env = readLocalSupabaseEnvironment();
  const fixtures = new SupabaseAuthFixtures(env);

  try {
    const identity = await fixtures.createIdentity(
      'phase4-closure-auth-smoke',
      'teacher',
      'active'
    );

    if (identity.user?.id == null) {
      throw new Error('Auth fixture returned no user id');
    }

    if (
      identity.accessToken == null ||
      identity.accessToken.length === 0
    ) {
      throw new Error('Auth fixture returned no access token');
    }

    console.log('PASS: real Supabase Auth fixture ready');
  } finally {
    await fixtures.cleanup();
  }
}

main().catch((error) => {
  console.error('PHASE4_AUTH_SMOKE_FAIL');
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
  local recovery_log="${TMPDIR:-/tmp}/rafiq-phase4-supabase-recovery.log"

  rm -f "$recovery_log"

  if ! npx --no-install supabase stop --no-backup \
    >"$recovery_log" 2>&1
  then
    echo "Failed to stop Supabase during recovery." >&2
    cat "$recovery_log" >&2 || true
    rm -f "$recovery_log"
    return 1
  fi

  if ! npx --no-install supabase start \
    >"$recovery_log" 2>&1
  then
    echo "Failed to restart Supabase during recovery." >&2
    cat "$recovery_log" >&2 || true
    rm -f "$recovery_log"
    return 1
  fi

  rm -f "$recovery_log"

  echo "PASS: Supabase stack restarted after reset"
}

verify_supabase_after_reset() {
  if wait_for_supabase_environment 5 &&
    verify_real_auth_fixture
  then
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
  if [[ -n "$EDGE_PID" ]] &&
    kill -0 "$EDGE_PID" >/dev/null 2>&1
  then
    kill "$EDGE_PID" >/dev/null 2>&1 || true
    wait "$EDGE_PID" 2>/dev/null || true
  fi

  if [[ -n "$EDGE_ENV" ]]; then
    rm -f "$EDGE_ENV"
  fi

  if [[ -n "$EDGE_LOG" ]]; then
    rm -f "$EDGE_LOG"
  fi

  EDGE_PID=""
  EDGE_ENV=""
  EDGE_LOG=""
}

start_live_edge_runtime() {
  local attempt
  local http_code

  if [[ -z "${GEMINI_API_KEY:-}" ]]; then
    echo "GEMINI_API_KEY is required for the live Phase 4 gate." >&2
    echo "Its value must never be printed or committed." >&2
    return 1
  fi

  EDGE_ENV="${TMPDIR:-/tmp}/rafiq-phase4-edge-$$.env"
  EDGE_LOG="${TMPDIR:-/tmp}/rafiq-phase4-edge-$$.log"

  rm -f "$EDGE_ENV" "$EDGE_LOG"

  printf 'GEMINI_API_KEY=%s\n' "$GEMINI_API_KEY" >"$EDGE_ENV"
  chmod 600 "$EDGE_ENV"

  npx --no-install supabase functions serve \
    ai-authoring-gateway \
    --env-file "$EDGE_ENV" \
    >"$EDGE_LOG" 2>&1 &

  EDGE_PID=$!

  for attempt in {1..30}; do
    if ! kill -0 "$EDGE_PID" >/dev/null 2>&1; then
      echo "AI Edge process exited before readiness." >&2
      tail -80 "$EDGE_LOG" >&2 || true
      return 1
    fi

    http_code="$(
      curl \
        --silent \
        --output /dev/null \
        --write-out '%{http_code}' \
        http://127.0.0.1:54321/functions/v1/ai-authoring-gateway \
        || true
    )"

    if [[ "$http_code" == "401" ]]; then
      echo "PASS: AI Edge gateway ready with JWT protection"
      return 0
    fi

    sleep 1
  done

  echo "AI Edge gateway did not become ready." >&2
  tail -80 "$EDGE_LOG" >&2 || true
  return 1
}

verify_clean_and_synchronized_git() {
  local status_output
  local head_commit
  local origin_commit

  status_output="$(git status --porcelain)"

  if [[ -n "$status_output" ]]; then
    echo "Working tree is not clean:" >&2
    printf '%s\n' "$status_output" >&2
    return 1
  fi

  git fetch origin main --quiet

  head_commit="$(git rev-parse HEAD)"
  origin_commit="$(git rev-parse refs/remotes/origin/main)"

  if [[ "$head_commit" != "$origin_commit" ]]; then
    echo "HEAD does not match origin/main." >&2
    echo "HEAD:        $head_commit" >&2
    echo "origin/main: $origin_commit" >&2
    return 1
  fi

  echo "PASS: Git clean and synchronized"
  echo "Verified candidate: $head_commit"
}

trap cleanup_edge_runtime EXIT

run_step \
  "Frozen Phase 3 baseline" \
  verify_phase3_frozen_baseline

run_step \
  "Phase 4-5 ephemeral provenance invariant" \
  verify_ephemeral_provenance_invariant

run_step \
  "Prettier" \
  npx --no-install prettier --check .

run_step \
  "Lint" \
  npm run lint

run_step \
  "Build" \
  npm run build

run_step \
  "Basic tests" \
  npm run test

run_step \
  "Auth client boundary scan" \
  node scripts/check-auth-client-boundaries.mjs

run_step \
  "Mastery-results client boundary scan" \
  node scripts/check-mastery-results-client-boundaries.mjs

run_step \
  "Phase 4 AI architecture boundaries" \
  npx --no-install vitest run \
    tests/architecture/ai-gateway-boundary.test.ts \
    tests/architecture/browser-ai-gateway-boundary.test.ts

run_step \
  "Phase 4 targeted AI tests" \
  npx --no-install vitest run \
    tests/ai-authoring/ai-authoring-adversarial.test.ts \
    tests/ai-authoring/ai-authoring-contract.test.ts \
    tests/ai-authoring/ai-authoring-pedagogical-guardrails.test.ts \
    tests/ai-authoring/deterministic-provider.test.ts \
    tests/services/ai-authoring/gateway-ai-authoring.provider.test.ts \
    tests/services/ai-authoring/gateway-quota.test.ts \
    tests/services/ai-authoring/live-server-provider.test.ts

printf '\n==> Supabase status\n'

if ! npx --no-install supabase status >/dev/null 2>&1; then
  cat >&2 <<'MESSAGE'
Supabase local stack is not running.

Run:
  npx supabase start

Then rerun:
  npm run verify:phase-4-closure
MESSAGE

  exit 1
fi

run_step \
  "Supabase database reset" \
  npx --no-install supabase db reset

run_step \
  "Supabase environment + real Auth readiness" \
  verify_supabase_after_reset

run_step \
  "Full Supabase non-live integration suite" \
  npm run test:supabase

run_step \
  "Frozen Teacher/Reviewer real composition" \
  env RUN_SUPABASE_INTEGRATION_TESTS=true \
  npx --no-install vitest run \
    --config vitest.supabase.config.ts \
    tests/integration/supabase-teacher-reviewer-workspace-composition.integration.tsx

run_step \
  "Start fresh live Gemini Edge gateway" \
  start_live_edge_runtime

run_step \
  "Phase 4 live Browser → Edge → Gemini gate" \
  env \
    RUN_SUPABASE_INTEGRATION_TESTS=true \
    RUN_LIVE_GEMINI_TESTS=true \
  npx --no-install vitest run \
    --config vitest.supabase.config.ts \
    tests/integration/supabase-ai-authoring-browser-gateway-live.integration.ts

run_step \
  "Phase 4 live AI acceptance → publication composition" \
  env \
    RUN_SUPABASE_INTEGRATION_TESTS=true \
    RUN_LIVE_GEMINI_TESTS=true \
  npx --no-install vitest run \
    --config vitest.supabase.config.ts \
    tests/integration/supabase-ai-authoring-real-composition-live.integration.tsx

cleanup_edge_runtime
trap - EXIT

run_step \
  "Git diff check" \
  git diff --check

run_step \
  "Git closure state" \
  verify_clean_and_synchronized_git

printf '\n==================================================\n'
printf ' PHASE 4 AUTOMATED CLOSURE VERIFICATION PASSED\n'
printf '==================================================\n'

printf '%s\n' \
  'PASS: deterministic AI contracts and pedagogical guardrails'

printf '%s\n' \
  'PASS: Auth/RLS/Authoring boundaries and full Supabase suite'

printf '%s\n' \
  'PASS: Browser → Edge → live Gemini'

printf '%s\n' \
  'PASS: live Gemini → teacher acceptance → revision → reviewer → publication'

printf '%s\n' \
  'PASS: AI provenance remains ephemeral in v0.7'

printf '%s\n' \
  'PASS: clean synchronized Git candidate'

printf '%s\n' \
  'Test counts are not predeclared; executed repository output is authoritative.'

printf '%s\n' \
  'This command does not create or push v0.7-ai-assisted-authoring-complete.'
