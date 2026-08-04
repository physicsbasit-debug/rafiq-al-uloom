#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

required_commands=(git node npm npx)
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
run_step "Supabase integration tests" npm run test:supabase
run_step "Git diff check" git diff --check

printf '\nAuth closure verification passed.\n'
printf 'Expected evidence: 447 basic tests + 61 Supabase integration tests = 508 total tests.\n'
