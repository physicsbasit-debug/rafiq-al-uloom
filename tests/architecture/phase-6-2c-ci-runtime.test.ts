import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

function read(path: string) {
  return readFileSync(resolve(ROOT, path), 'utf8');
}

describe('Phase 6-2C CI runtime closure contract', () => {
  it('pins the CI Node runtime to the proven patch release', () => {
    const workflow = read('.github/workflows/ci.yml');

    expect(workflow.match(/node-version: '22\.23\.2'/g)).toHaveLength(2);
    expect(workflow).not.toContain("node-version: '22.x'");
    expect(workflow).toContain('runs-on: ubuntu-24.04');
  });

  it('verifies the exact locally installed Supabase CLI before Docker startup', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      devDependencies?: Record<string, string>;
    };
    const verifier = read('scripts/verify-ci-supabase.sh');

    expect(packageJson.devDependencies?.supabase).toBe('2.110.0');
    expect(verifier).toContain('EXPECTED_SUPABASE_CLI_VERSION="2.110.0"');
    expect(verifier).toContain('npx --no-install supabase --version');
    expect(verifier.indexOf('run_step "Supabase CLI version"')).toBeLessThan(
      verifier.indexOf('run_step "Docker availability"')
    );
  });

  it('bounds initial Supabase startup recovery to one retry', () => {
    const verifier = read('scripts/verify-ci-supabase.sh');

    expect(verifier).toContain('local max_attempts=2');
    expect(verifier).toContain('start_minimal_supabase_once');
    expect(verifier).toContain(
      'Supabase minimal start attempt $attempt failed; stopping partial stack before one retry.'
    );
    expect(verifier).toContain('supabase stop --no-backup');
  });

  it('arms cleanup before the first Supabase start attempt', () => {
    const verifier = read('scripts/verify-ci-supabase.sh');

    expect(verifier).toContain('SUPABASE_CLEANUP_REQUIRED=0');
    expect(verifier).toContain('if ((SUPABASE_CLEANUP_REQUIRED == 1)); then');
    expect(verifier.indexOf('SUPABASE_CLEANUP_REQUIRED=1')).toBeLessThan(
      verifier.indexOf('run_step "Supabase minimal local start" start_minimal_supabase')
    );
  });

  it('forces integration helpers to use the pinned local CLI only', () => {
    const fixtures = read('tests/integration/helpers/supabase-auth-fixtures.ts');

    expect(fixtures).toContain(
      "execFileSync('npx', ['--no-install', 'supabase', 'status', '-o', 'env']"
    );
    expect(fixtures).not.toContain("execFileSync('npx', ['supabase', 'status'");
  });

  it('gives every integration Supabase client a unique auth storage key', () => {
    const fixtures = read('tests/integration/helpers/supabase-auth-fixtures.ts');

    expect(fixtures).toContain('let isolatedAuthClientSequence = 0;');
    expect(fixtures).toContain('function nextIsolatedAuthStorageKey(): string');
    expect(fixtures).toContain('storageKey: nextIsolatedAuthStorageKey()');
    expect(fixtures).toContain(
      'rafiq-integration-auth-${process.pid}-${isolatedAuthClientSequence}'
    );
  });

  it('gives all deterministic AI suggestion acceptance waits an explicit CI-safe timeout', () => {
    const composition = read(
      'tests/integration/supabase-ai-assisted-authoring-composition.integration.tsx'
    );

    const timedAcceptanceWait =
      "screen.findByRole('button', { name: 'استخدام الاقتراح' }, { timeout: 8_000 })";

    expect(
      composition.match(new RegExp(timedAcceptanceWait.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'))
    ).toHaveLength(3);
    expect(composition).not.toContain("screen.findByRole('button', { name: 'استخدام الاقتراح' })");
  });

  it('requires the pinned Edge runtime serve marker before accepting the JWT-protected 401 probe', () => {
    const verifier = read('scripts/verify-ci-supabase.sh');

    expect(verifier).toContain('edge_runtime_ready_marker()');
    expect(verifier).toContain(
      'grep -Fq \'Serving functions on http://127.0.0.1:54321/functions/v1/\' "$EDGE_LOG"'
    );
    expect(verifier.indexOf('if edge_runtime_ready_marker; then')).toBeLessThan(
      verifier.indexOf('if [[ "$http_code" == "401" ]]')
    );
  });

  it('prints Edge diagnostics on integration failure without retrying the test suite', () => {
    const verifier = read('scripts/verify-ci-supabase.sh');

    expect(verifier).toContain('run_supabase_integration_suite()');
    expect(verifier).toContain(
      'Supabase integration suite failed; non-live Edge diagnostics follow.'
    );
    expect(verifier).toContain('tail -120 "$EDGE_LOG"');
    expect(verifier.match(/npm run test:supabase/g)).toHaveLength(1);
  });

  it('keeps 6-2C inside CI/runtime scope without enabling live providers', () => {
    const verifier = read('scripts/verify-ci-supabase.sh');
    const workflow = read('.github/workflows/ci.yml');

    expect(verifier).not.toContain('RUN_LIVE_GEMINI_TESTS=true');
    expect(verifier).not.toContain('--no-verify-jwt');
    expect(workflow).not.toContain('${{ secrets.');
  });
});
