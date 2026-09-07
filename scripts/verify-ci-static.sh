#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

run_step() {
  local title="$1"
  shift
  printf '\n==> %s\n' "$title"
  "$@"
}

run_step "Prettier" npx --no-install prettier --check .
run_step "Lint" npm run lint
run_step "Build" npm run build
run_step "Core/unit tests" npm run test
run_step \
  "Phase 6 architecture tests" \
  npx --no-install vitest run \
  tests/architecture/phase-6-1-production-environment.test.ts \
  tests/architecture/phase-6-2-ci-supply-chain.test.ts \
  tests/architecture/phase-6-2b-supabase-ci.test.ts
run_step "Auth client boundary scan" node scripts/check-auth-client-boundaries.mjs
run_step "Mastery-results client boundary scan" node scripts/check-mastery-results-client-boundaries.mjs
run_step "Tracked secret scan" node scripts/check-tracked-secrets.mjs
run_step "Forward-only migration guard" node scripts/check-forward-only-migrations.mjs
run_step \
  "Production environment contract self-check" \
  env \
  VITE_CONTENT_PROVIDER=supabase \
  VITE_SUPABASE_URL=https://ci-contract-check.supabase.co \
  VITE_SUPABASE_ANON_KEY=sb_publishable_ci_contract_check_123456789 \
  npm run verify:production-env
run_step "Dependency vulnerability audit" npm audit --audit-level=high
run_step "Git diff check" git diff --check

printf '\nSTATIC CI GATE PASSED\n'
