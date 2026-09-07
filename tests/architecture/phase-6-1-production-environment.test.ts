import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const SCRIPT = resolve(ROOT, 'scripts/check-production-environment.mjs');

function cleanBaseEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !name.startsWith('VITE_'))
  );
}

function run(overrides: NodeJS.ProcessEnv) {
  return spawnSync(process.execPath, [SCRIPT], {
    cwd: ROOT,
    env: {
      ...cleanBaseEnv(),
      VITE_CONTENT_PROVIDER: 'supabase',
      VITE_SUPABASE_URL: 'https://school-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_test_public_key_123456789',
      ...overrides,
    },
    encoding: 'utf8',
  });
}

describe('Phase 6-1 production environment boundary', () => {
  it('accepts the production browser contract with an HTTPS URL and publishable key', () => {
    const result = run({});

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('PASS: production browser environment contract');
  });

  it.each([
    ['/supabase', 'absolute URL'],
    ['http://school-project.supabase.co', 'must use https'],
    ['https://127.0.0.1:54321', 'must not point to a local host'],
  ])('rejects invalid production Supabase URL %s', (url, expectedMessage) => {
    const result = run({ VITE_SUPABASE_URL: url });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(expectedMessage);
  });

  it('rejects a Supabase secret key in the browser variable without printing its value', () => {
    const secretValue = 'sb_secret_do_not_print_this_value';
    const result = run({ VITE_SUPABASE_ANON_KEY: secretValue });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('must never contain a Supabase secret key');
    expect(`${result.stdout}${result.stderr}`).not.toContain(secretValue);
  });

  it('rejects legacy or unknown browser API-key formats for new production deployment', () => {
    const result = run({ VITE_SUPABASE_ANON_KEY: 'eyJlegacy-anon-key' });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('sb_publishable_');
  });

  it('rejects forbidden server secrets under VITE_* without printing values', () => {
    const secretValue = 'gemini-secret-never-print';
    const result = run({ VITE_GEMINI_API_KEY: secretValue });

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('VITE_GEMINI_API_KEY');
    expect(`${result.stdout}${result.stderr}`).not.toContain(secretValue);
  });

  it('keeps the tracked env example browser-public only', () => {
    const example = readFileSync(resolve(ROOT, '.env.example'), 'utf8');

    expect(example).toContain('VITE_CONTENT_PROVIDER=supabase');
    expect(example).toContain('VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co');
    expect(example).toContain('VITE_SUPABASE_ANON_KEY=sb_publishable_REPLACE_ME');

    for (const forbidden of [
      'GEMINI_API_KEY=',
      'SERVICE_ROLE',
      'SUPABASE_SECRET_KEY=',
      'DATABASE_PASSWORD=',
      'SMTP_PASSWORD=',
    ]) {
      expect(example).not.toContain(forbidden);
    }
  });

  it('ignores real env files while retaining only approved tracked examples', () => {
    const gitignore = readFileSync(resolve(ROOT, '.gitignore'), 'utf8');

    expect(gitignore).toContain('.env\n');
    expect(gitignore).toContain('.env.*');
    expect(gitignore).toContain('!.env.development');
    expect(gitignore).toContain('!.env.test');
    expect(gitignore).toContain('!.env.example');
  });
});
