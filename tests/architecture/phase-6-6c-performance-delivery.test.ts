import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

import { afterEach, describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const FINAL_SCRIPT = resolve(ROOT, 'scripts/check-final-performance-budget.mjs');
const CACHE_SCRIPT = resolve(ROOT, 'scripts/check-production-cache-policy.mjs');
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
  const root = mkdtempSync(join(tmpdir(), 'rafiq-phase-6-6c-'));
  temporaryRoots.push(root);
  const assets = join(root, 'assets');
  mkdirSync(assets, { recursive: true });

  writeFileSync(
    join(root, 'index.html'),
    '<!doctype html><html><body><script type="module" src="/assets/index-test.js"></script></body></html>'
  );
  writeFileSync(join(assets, 'index-test.js'), jsBytes);
  return root;
}

afterEach(() => {
  while (temporaryRoots.length > 0) {
    const path = temporaryRoots.pop();
    if (path) rmSync(path, { recursive: true, force: true });
  }
});

describe('Phase 6-6C final performance and delivery acceptance contract', () => {
  it('freezes the accepted 6-6B metrics with only 5% final headroom', () => {
    const budget = JSON.parse(read('config/production-performance-final-budget.json')) as {
      phase?: string;
      sourceCommit?: string;
      acceptedMetrics?: {
        initialJsGzipBytes?: number;
        totalJsGzipBytes?: number;
        jsChunks?: number;
      };
      policy?: {
        growthHeadroomPercent?: number;
        maximumInitialJsGzipBytes?: number;
        maximumTotalJsGzipBytes?: number;
      };
    };

    expect(budget.phase).toBe('6-6C');
    expect(budget.sourceCommit).toBe('04ea14edaf8e1717b65de107e04a468b6a0d7adc');
    expect(budget.acceptedMetrics).toEqual({
      initialJsGzipBytes: 154587,
      totalJsGzipBytes: 184833,
      jsChunks: 4,
    });
    expect(budget.policy).toEqual({
      growthHeadroomPercent: 5,
      maximumInitialJsGzipBytes: 162317,
      maximumTotalJsGzipBytes: 194075,
    });
  });

  it('has a real red path when the final initial-JS budget is exceeded', () => {
    const dist = createSyntheticDist(deterministicBytes(24_000, 71));
    const budgetPath = join(dist, 'final-budget.json');
    const reportPath = join(dist, 'report.json');

    writeFileSync(
      budgetPath,
      JSON.stringify({
        schemaVersion: 1,
        phase: '6-6C',
        acceptedMetrics: {
          initialJsGzipBytes: 10000,
          totalJsGzipBytes: 10000,
          jsChunks: 1,
        },
        policy: {
          growthHeadroomPercent: 5,
          maximumInitialJsGzipBytes: 10500,
          maximumTotalJsGzipBytes: 10500,
        },
      })
    );

    const result = spawnSync(
      process.execPath,
      [FINAL_SCRIPT, '--dist', dist, '--budget', budgetPath, '--report', reportPath],
      {
        cwd: ROOT,
        encoding: 'utf8',
      }
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('FINAL_PERFORMANCE_GATE_FAIL');
    expect(result.stderr).toContain('exceeds final budget');
  });

  it('locks cache semantics while deferring hosting header wiring to 6-7', () => {
    const policy = JSON.parse(read('config/production-cache-policy.json')) as {
      phase?: string;
      implementationPhase?: string;
      policy?: Record<string, { cacheControl?: string }>;
    };

    expect(policy.phase).toBe('6-6C');
    expect(policy.implementationPhase).toBe('6-7');
    expect(policy.policy?.indexHtml?.cacheControl).toBe('public, max-age=0, must-revalidate');
    expect(policy.policy?.hashedAssets?.cacheControl).toBe('public, max-age=31536000, immutable');
    expect(policy.policy?.sensitiveDynamicResponses?.cacheControl).toBe('no-store');

    const valid = spawnSync(process.execPath, [CACHE_SCRIPT], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(valid.status).toBe(0);
    expect(valid.stdout).toContain('CACHE_POLICY_CONTRACT=PASS');
  });

  it('proves slow-network loading and local chunk recovery remain covered', () => {
    const test = read('tests/features/DeferredWorkspace.test.tsx');

    expect(test).toContain('new Promise<DeferredWorkspaceModule>');
    expect(test).toContain("getByRole('status')");
    expect(test).toContain('جارٍ تحميل مساحة المعلم');
    expect(test).toContain(".mockRejectedValueOnce(new Error('chunk 404'))");
    expect(test).toContain('إعادة المحاولة');
    expect(test).toContain('expect(load).toHaveBeenCalledTimes(2)');
  });

  it('records the required Mobile/RTL re-acceptance matrix before closure', () => {
    const doc = read('docs/PHASE_6_6C_FINAL_PERFORMANCE_DELIVERY.md');

    for (const viewport of ['360×800', '390×844', '768×1024']) {
      expect(doc).toContain(viewport);
    }

    expect(doc).toContain('slow-network');
    expect(doc).toContain('RTL');
    expect(doc).toContain('إعادة المحاولة');
    expect(doc).toContain('6-7');
  });

  it('runs final budget and cache-policy gates after code splitting and before core tests', () => {
    const ci = read('scripts/verify-ci-static.sh');
    const codeSplitIndex = ci.indexOf(
      'run_step "Code-split acceptance gate" npm run verify:code-split'
    );
    const finalBudgetIndex = ci.indexOf(
      'run_step "Final performance budget" npm run verify:performance-final'
    );
    const cacheIndex = ci.indexOf(
      'run_step "Production cache policy contract" npm run verify:cache-policy'
    );
    const coreIndex = ci.indexOf('run_step "Core/unit tests" npm run test');

    expect(codeSplitIndex).toBeGreaterThanOrEqual(0);
    expect(finalBudgetIndex).toBeGreaterThan(codeSplitIndex);
    expect(cacheIndex).toBeGreaterThan(finalBudgetIndex);
    expect(coreIndex).toBeGreaterThan(cacheIndex);
    expect(ci).toContain('tests/architecture/phase-6-6c-performance-delivery.test.ts');
  });
});
