import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const WORKFLOWS_DIR = resolve(ROOT, '.github/workflows');

const CHECKOUT_SHA = 'd23441a48e516b6c34aea4fa41551a30e30af803';
const SETUP_NODE_SHA = '820762786026740c76f36085b0efc47a31fe5020';

function read(path: string): string {
  return readFileSync(resolve(ROOT, path), 'utf8');
}

function workflowFiles(): readonly string[] {
  return readdirSync(WORKFLOWS_DIR)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .sort();
}

function externalUses(text: string): readonly string[] {
  return [...text.matchAll(/^\s*-\s+uses:\s+([^\s#]+)/gm)]
    .map((match) => match[1])
    .filter((value) => !value.startsWith('./') && !value.startsWith('docker://'));
}

describe('Phase 6-4A production security: GitHub Actions pinning', () => {
  it('pins every external workflow action to a full immutable 40-character commit SHA', () => {
    const violations = workflowFiles().flatMap((name) => {
      const text = read(`.github/workflows/${name}`);
      return externalUses(text)
        .filter((value) => !/@[0-9a-f]{40}$/i.test(value))
        .map((value) => `${name}: ${value}`);
    });

    expect(violations).toEqual([]);
  });

  it('pins checkout v6.1.0 and setup-node v7.0.0 to the reviewed official commits', () => {
    const workflow = read('.github/workflows/ci.yml');

    expect(workflow.match(new RegExp(`actions/checkout@${CHECKOUT_SHA}`, 'g'))).toHaveLength(2);
    expect(workflow.match(new RegExp(`actions/setup-node@${SETUP_NODE_SHA}`, 'g'))).toHaveLength(2);
    expect(workflow.match(/# v6\.1\.0/g)).toHaveLength(2);
    expect(workflow.match(/# v7\.0\.0/g)).toHaveLength(2);
  });

  it('does not reintroduce moving major, minor, branch, or latest refs for external actions', () => {
    const workflowText = workflowFiles()
      .map((name) => read(`.github/workflows/${name}`))
      .join('\n');

    expect(workflowText).not.toMatch(
      /\buses:\s+[^#\s]+@(v\d+(?:\.\d+){0,2}|main|master|latest)\b/i
    );
  });

  it('keeps the CI token least-privilege contract unchanged', () => {
    const workflow = read('.github/workflows/ci.yml');

    expect(workflow).toContain('permissions:');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('id-token: write');
    expect(workflow).not.toContain('${{ secrets.');
  });

  it('disables persisted checkout credentials in every ordinary CI job', () => {
    const workflow = read('.github/workflows/ci.yml');

    expect(workflow.match(/persist-credentials: false/g)).toHaveLength(2);
    expect(workflow.match(/fetch-depth: 0/g)).toHaveLength(2);
  });

  it('keeps ordinary CI away from privileged trigger and permission patterns', () => {
    const workflow = read('.github/workflows/ci.yml');

    expect(workflow).not.toMatch(/^\s*pull_request_target\s*:/m);
    expect(workflow).not.toMatch(/^\s*permissions\s*:\s*write-all\s*$/m);
    expect(workflow).not.toMatch(/^\s*contents\s*:\s*write\s*$/m);
    expect(workflow).not.toMatch(/^\s*id-token\s*:\s*write\s*$/m);
  });

  it('runs the dedicated repository security guard inside the static CI gate', () => {
    const verifier = read('scripts/verify-ci-static.sh');
    const guard = read('scripts/check-repository-security.mjs');

    expect(verifier).toContain(
      'run_step "Repository security contract" node scripts/check-repository-security.mjs'
    );
    expect(guard).toContain('pull_request_target');
    expect(guard).toContain('permissions: write-all');
    expect(guard).toContain('persist-credentials: false');
    expect(guard).toContain('${{ secrets.');
  });
});

describe('Phase 6-4D remote production security audit contract', () => {
  it('keeps the remote production audit read-only and outside ordinary CI', () => {
    const audit = read('scripts/audit-remote-production-security.mjs');
    const workflow = read('.github/workflows/ci.yml');
    const staticVerifier = read('scripts/verify-ci-static.sh');

    expect(audit).toContain("method: 'GET'");
    expect(audit).not.toContain("'secrets', 'list'");
    expect(audit).not.toContain("'secrets', 'set'");
    expect(audit).not.toContain("'secrets', 'unset'");
    expect(audit).not.toMatch(/method:\s*['"](POST|PUT|PATCH|DELETE)['"]/);
    expect(audit).not.toContain('network-restrictions update');
    expect(audit).not.toContain('ssl-enforcement update');
    expect(workflow).not.toContain('SUPABASE_ACCESS_TOKEN');
    expect(staticVerifier).not.toContain('SUPABASE_ACCESS_TOKEN');
    expect(staticVerifier).not.toContain('audit-remote-production-security.mjs');
  });

  it('reads the real hosted Auth, SSL, network, Edge, and secret-name surfaces', () => {
    const audit = read('scripts/audit-remote-production-security.mjs');

    expect(audit).toContain('/config/auth');
    expect(audit).toContain('/ssl-enforcement');
    expect(audit).toContain('/network-restrictions');
    expect(audit).toContain('/functions');
    expect(audit).toContain('GEMINI_API_KEY');
    expect(audit).toContain('intentionally not granted');
    expect(audit).toContain('EXPECTED_PRODUCTION_SITE_URL');
    expect(audit).toContain('production frontend URL is not finalized');
    expect(audit).toContain('hasExpectedProductionSite');
    expect(audit).toContain(
      'configured hosted Site URL is local, credentialed, missing, or non-HTTPS'
    );
  });

  it('writes only a bounded redacted report outside the repository by default', () => {
    const audit = read('scripts/audit-remote-production-security.mjs');

    expect(audit).toContain('/tmp/rafiq-phase-6-4d-remote-security-report.json');
    expect(audit).toContain('projectFingerprint');
    expect(audit).toContain('readOnly: true');
    const reportStart = audit.indexOf('const report = {');
    const reportEnd = audit.indexOf('\n\n  writeFileSync(', reportStart);

    expect(reportStart).toBeGreaterThanOrEqual(0);
    expect(reportEnd).toBeGreaterThan(reportStart);

    const reportBody = audit.slice(reportStart, reportEnd);
    expect(reportBody).not.toContain('authConfig');
    expect(reportBody).not.toContain('sslConfig');
    expect(reportBody).not.toContain('networkConfig');
    expect(reportBody).not.toContain('functions');
    expect(reportBody).not.toContain('secretNames');
  });
});

describe('Phase 6-4C database security audit contract', () => {
  it('keeps the database privilege audit inside the automatically discovered Supabase integration suite', () => {
    const config = read('vitest.supabase.config.ts');
    const audit = read('tests/integration/supabase-database-security.integration.ts');

    expect(config).toContain('tests/integration/**/*.integration.ts');
    expect(config).toContain('tests/integration/**/*.integration.tsx');
    expect(audit).toContain("describeIntegration('Phase 6-4C database / RLS privilege audit'");
  });

  it('audits final PostgreSQL catalog state rather than historical migration text', () => {
    const audit = read('tests/integration/supabase-database-security.integration.ts');

    expect(audit).toContain('pg_class');
    expect(audit).toContain('pg_proc');
    expect(audit).toContain('pg_policies');
    expect(audit).toContain('has_table_privilege');
    expect(audit).toContain('has_function_privilege');
    expect(audit).toContain('aclexplode');
    expect(audit).toContain('search_path=""');
  });

  it('freezes the reviewed authenticated RPC surface and private-schema boundary', () => {
    const audit = read('tests/integration/supabase-database-security.integration.ts');

    expect(audit).toContain('authenticatedExecuteAllowlist');
    expect(audit).toContain('submit_mastery_attempt');
    expect(audit).toContain('create_lesson_revision');
    expect(audit).toContain('review_lesson_revision');
    expect(audit).toContain('consume_ai_authoring_quota');
    expect(audit).toContain('private.ai_authoring_quota_state');
    expect(audit).toContain("has_schema_privilege('service_role', 'private', 'USAGE')");
  });
});
