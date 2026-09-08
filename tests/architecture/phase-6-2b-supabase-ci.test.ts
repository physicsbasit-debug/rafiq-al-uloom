import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

function read(path: string) {
  return readFileSync(resolve(ROOT, path), 'utf8');
}

describe('Phase 6-2B local Supabase CI contract', () => {
  it('adds a Supabase job after the static gate without production secrets', () => {
    const workflow = read('.github/workflows/ci.yml');

    expect(workflow).toContain('supabase-integration:');
    expect(workflow).toContain('name: Local Supabase Integration');
    expect(workflow).toContain('needs: static-quality');
    expect(workflow).toContain('timeout-minutes: 25');
    expect(workflow).toContain('run: npm ci');
    expect(workflow).toContain('run: npm run verify:ci-supabase');

    expect(workflow).not.toContain('${{ secrets.');
    expect(workflow).not.toContain('GEMINI_API_KEY');
    expect(workflow).not.toContain('SERVICE_ROLE_KEY');
  });

  it('exposes one local command for the Supabase CI gate', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['verify:ci-supabase']).toBe('bash scripts/verify-ci-supabase.sh');
  });

  it('starts the minimal Supabase service set needed by integration tests', () => {
    const verifier = read('scripts/verify-ci-supabase.sh');

    expect(verifier).toContain(
      'SUPABASE_EXCLUDE_SERVICES="vector,logflare,storage-api,imgproxy,studio,mailpit,realtime,postgres-meta,supavisor"'
    );
    expect(verifier).toContain('npx --no-install supabase start -x "$SUPABASE_EXCLUDE_SERVICES"');
    expect(verifier).toContain('run_step "Supabase minimal local start" start_minimal_supabase');
  });

  it('resets local Supabase before the integration suite', () => {
    const verifier = read('scripts/verify-ci-supabase.sh');

    expect(verifier).toContain('supabase db reset');
    expect(verifier).toContain('supabase status -o env');
    expect(verifier).toContain('npm run test:supabase');
  });

  it('uses the same minimal stack during controlled recovery', () => {
    const verifier = read('scripts/verify-ci-supabase.sh');

    expect(verifier).toContain('start_minimal_supabase >"$recovery_log" 2>&1');
    expect(verifier).toContain('PASS: minimal Supabase stack recovered after reset');
  });

  it('checks the global auth/profile orphan invariant only after the parallel integration suite', () => {
    const verifier = read('scripts/verify-ci-supabase.sh');
    const profileIntegration = read(
      'tests/integration/supabase-profiles-authorization.integration.ts'
    );

    expect(verifier).toContain('check_zero_auth_profile_orphans');
    expect(verifier).toContain(
      'run_step "Post-suite auth/profile orphan invariant" check_zero_auth_profile_orphans'
    );
    expect(verifier.indexOf('npm run test:supabase')).toBeLessThan(
      verifier.indexOf('Post-suite auth/profile orphan invariant')
    );
    expect(profileIntegration).not.toContain('LEFT JOIN public.profiles p ON p.id = au.id');
  });

  it('serves the AI gateway without enabling live Gemini', () => {
    const verifier = read('scripts/verify-ci-supabase.sh');

    expect(verifier).toContain('npx --no-install supabase functions serve ai-authoring-gateway');
    expect(verifier).toContain('-u GEMINI_API_KEY');
    expect(verifier).toContain('-u RUN_LIVE_GEMINI_TESTS');
    expect(verifier).not.toContain('RUN_LIVE_GEMINI_TESTS=true');
    expect(verifier).not.toContain('--no-verify-jwt');
  });

  it('waits for JWT-protected Edge readiness instead of sleeping blindly', () => {
    const verifier = read('scripts/verify-ci-supabase.sh');

    expect(verifier).toContain('if [[ "$http_code" == "401" ]]');
    expect(verifier).toContain('PASS: non-live AI Edge gateway ready with JWT protection');
  });

  it('always cleans Edge and the local Supabase stack', () => {
    const verifier = read('scripts/verify-ci-supabase.sh');

    expect(verifier).toContain('trap cleanup EXIT');
    expect(verifier).toContain('supabase stop --no-backup');
    expect(verifier).toContain('cleanup_edge_runtime');
  });

  it('keeps the static job responsible for the Phase 6B architecture contract', () => {
    const verifier = read('scripts/verify-ci-static.sh');

    expect(verifier).toContain('tests/architecture/phase-6-2b-supabase-ci.test.ts');
  });
});
