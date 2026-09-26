import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const SCRIPT = resolve(ROOT, 'scripts/check-production-performance.mjs');
const BASELINE = resolve(ROOT, 'config/production-performance-baseline.json');
const temporaryRoots: string[] = [];

function read(path: string): string {
  return readFileSync(resolve(ROOT, path), 'utf8');
}

function deterministicBytes(size: number, salt: number): Buffer {
  const output = Buffer.alloc(size);
  let state = (salt || 1) >>> 0;
  for (let index = 0; index < size; index += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    output[index] = (state >>> 24) & 0xff;
  }
  return output;
}

function createSyntheticDist(jsBytes: Buffer): string {
  const root = mkdtempSync(join(tmpdir(), 'rafiq-phase-6-6a-'));
  temporaryRoots.push(root);
  const assets = join(root, 'assets');
  mkdirSync(assets, { recursive: true });
  writeFileSync(
    join(root, 'index.html'),
    '<!doctype html><html><body><script type="module" src="/assets/index-test.js"></script></body></html>'
  );
  writeFileSync(join(assets, 'index-test.js'), jsBytes);
  writeFileSync(join(assets, 'index-test.css'), 'body{display:block}');
  return root;
}

function runPerformance(args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

afterEach(() => {
  while (temporaryRoots.length > 0) {
    const path = temporaryRoots.pop();
    if (path) rmSync(path, { recursive: true, force: true });
  }
});

describe('Phase 6-6A performance baseline and delivery contract', () => {
  it('stores one tracked numeric baseline with the frozen temporary budget policy', () => {
    const baseline = JSON.parse(readFileSync(BASELINE, 'utf8')) as {
      schemaVersion?: number;
      phase?: string;
      sourceCommit?: string;
      policy?: Record<string, number>;
      metrics?: { initialJs?: { gzipBytes?: number }; totalJs?: { fileCount?: number } };
    };

    expect(baseline.schemaVersion).toBe(1);
    expect(baseline.phase).toBe('6-6A');
    expect(baseline.sourceCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(baseline.policy).toMatchObject({
      temporaryInitialJsGzipGrowthPercent: 5,
      codeSplitCandidateThresholdPercent: 10,
      codeSplitAcceptanceReductionPercent: 10,
    });
    expect(baseline.metrics?.initialJs?.gzipBytes).toBeGreaterThan(0);
    expect(baseline.metrics?.totalJs?.fileCount).toBeGreaterThan(0);
  });

  it('creates a baseline from a build and then passes the unchanged build', () => {
    const dist = createSyntheticDist(deterministicBytes(40_000, 17));
    const baseline = join(dist, 'baseline.json');
    const report = join(dist, 'report.json');

    const create = runPerformance([
      '--write-baseline',
      '--dist',
      dist,
      '--baseline',
      baseline,
      '--report',
      report,
    ]);
    expect(create.status).toBe(0);
    expect(create.stdout).toContain('PERFORMANCE_BASELINE=CREATED');

    const verify = runPerformance(['--dist', dist, '--baseline', baseline, '--report', report]);
    expect(verify.status).toBe(0);
    expect(verify.stdout).toContain('PERFORMANCE_BUDGET=PASS');
  });

  it('fails red when initial JS gzip exceeds the frozen +5% budget', () => {
    const dist = createSyntheticDist(deterministicBytes(40_000, 29));
    const baseline = join(dist, 'baseline.json');
    const report = join(dist, 'report.json');

    const create = runPerformance([
      '--write-baseline',
      '--dist',
      dist,
      '--baseline',
      baseline,
      '--report',
      report,
    ]);
    expect(create.status).toBe(0);

    writeFileSync(
      join(dist, 'assets/index-test.js'),
      Buffer.concat([deterministicBytes(40_000, 29), deterministicBytes(12_000, 91)])
    );

    const verify = runPerformance(['--dist', dist, '--baseline', baseline, '--report', report]);
    expect(verify.status).not.toBe(0);
    expect(verify.stderr).toContain('PERFORMANCE_GATE_FAIL');
    expect(verify.stderr).toContain('exceeds temporary Phase 6-6A budget');
  });

  it('refuses to silently rewrite an existing baseline', () => {
    const dist = createSyntheticDist(deterministicBytes(20_000, 43));
    const baseline = join(dist, 'baseline.json');
    const report = join(dist, 'report.json');
    const args = ['--write-baseline', '--dist', dist, '--baseline', baseline, '--report', report];

    const first = runPerformance(args);
    expect(first.status).toBe(0);

    const second = runPerformance(args);
    expect(second.status).not.toBe(0);
    expect(second.stderr).toContain('Refusing silent refresh');
  });

  it('runs the real performance gate after build and before the core test suite', () => {
    const ci = read('scripts/verify-ci-static.sh');
    const buildIndex = ci.indexOf('run_step "Build" npm run build');
    const performanceIndex = ci.indexOf(
      'run_step "Production performance budget" npm run verify:performance'
    );
    const coreIndex = ci.indexOf('run_step "Core/unit tests" npm run test');

    expect(buildIndex).toBeGreaterThanOrEqual(0);
    expect(performanceIndex).toBeGreaterThan(buildIndex);
    expect(coreIndex).toBeGreaterThan(performanceIndex);
  });

  it('keeps 6-6A measurement-only and does not introduce production UI splitting', () => {
    const app = read('src/App.tsx');
    expect(app).not.toContain('lazy(() => import(');
    expect(app).not.toContain('<Suspense');
  });

  it('records Phase 5 freeze evidence and labels 724/184 only as pre-6-6 observation', () => {
    const doc = read('docs/PHASE_6_6_PERFORMANCE_DELIVERY.md');
    expect(doc).toContain('v0.8-advanced-science-activities-complete');
    expect(doc).toContain('5f46fca6ee4617720d0770b2139c9a844aaa08b6');
    expect(doc).toContain('5-6E  Mobile / RTL Visual Acceptance');
    expect(doc).toContain('Pre-6-6 observed value');
    expect(doc).toContain('724.05 kB');
    expect(doc).toContain('183.94 kB');
    expect(doc).toContain('ليس baseline الرسمي');
  });

  it('keeps the Phase 6 architecture gate permanently aware of the performance contract', () => {
    const ci = read('scripts/verify-ci-static.sh');
    expect(ci).toContain('tests/architecture/phase-6-6-performance-delivery.test.ts');
  });
});
