import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

function read(path: string) {
  return readFileSync(resolve(ROOT, path), 'utf8');
}

describe('Phase 6-2A CI and supply-chain contract', () => {
  it('uses official current GitHub Node actions with deterministic npm install', () => {
    const workflow = read('.github/workflows/ci.yml');

    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('phase-6-production-readiness');
    expect(workflow).toContain('permissions:');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('actions/checkout@v6');
    expect(workflow).toContain('fetch-depth: 0');
    expect(workflow).toContain('actions/setup-node@v7');
    expect(workflow).toContain("node-version: '22.23.2'");
    expect(workflow).not.toContain("node-version: '22.x'");
    expect(workflow).toContain('cache: npm');
    expect(workflow).toContain('run: npm ci');
    expect(workflow).toContain('run: npm run verify:ci-static');
  });

  it('does not request production secrets in static CI', () => {
    const workflow = read('.github/workflows/ci.yml');

    expect(workflow).not.toContain('${{ secrets.');
    expect(workflow).not.toContain('GEMINI_API_KEY');
    expect(workflow).not.toContain('SERVICE_ROLE');
  });

  it('exposes one local command for the static CI gate', () => {
    const packageJson = JSON.parse(read('package.json')) as {
      scripts?: Record<string, string>;
    };

    expect(packageJson.scripts?.['verify:ci-static']).toBe('bash scripts/verify-ci-static.sh');
  });

  it('keeps the frozen Phase 5 migration baseline explicit', () => {
    const guard = read('scripts/check-forward-only-migrations.mjs');

    expect(guard).toContain('5f46fca6ee4617720d0770b2139c9a844aaa08b6');
    expect(guard).toContain('--diff-filter=MDRCTU');
    expect(guard).toContain("'A\\t'");
  });

  it('uses high-confidence secret patterns without printing secret contents', () => {
    const scanner = read('scripts/check-tracked-secrets.mjs');

    expect(scanner).toContain('Supabase secret key');
    expect(scanner).toContain('Google API key');
    expect(scanner).toContain('GitHub token');
    expect(scanner).toContain('private key');
    expect(scanner).toContain('AWS access key');
    expect(scanner).toContain('unapproved tracked environment file');
    expect(scanner).not.toContain('console.error(text)');
  });

  it('makes high and critical dependency advisories blocking', () => {
    const verifier = read('scripts/verify-ci-static.sh');

    expect(verifier).toContain('npm audit --audit-level=high');
  });
});
