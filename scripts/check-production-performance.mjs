#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = process.cwd();
const DEFAULT_DIST = 'dist';
const DEFAULT_BASELINE = 'config/production-performance-baseline.json';
const DEFAULT_REPORT = '/tmp/rafiq-phase-6-6-performance-report.json';

const POLICY = Object.freeze({
  temporaryInitialJsGzipGrowthPercent: 5,
  codeSplitCandidateThresholdPercent: 10,
  codeSplitAcceptanceReductionPercent: 10,
});

function fail(message) {
  console.error(`PERFORMANCE_GATE_FAIL: ${message}`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const args = {
    writeBaseline: false,
    force: false,
    dist: DEFAULT_DIST,
    baseline: DEFAULT_BASELINE,
    report: DEFAULT_REPORT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--write-baseline') args.writeBaseline = true;
    else if (value === '--force') args.force = true;
    else if (value === '--dist') args.dist = argv[++index];
    else if (value === '--baseline') args.baseline = argv[++index];
    else if (value === '--report') args.report = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }

  return args;
}

function walkFiles(rootDir) {
  const files = [];
  const visit = (dir) => {
    for (const name of readdirSync(dir).sort()) {
      const fullPath = join(dir, name);
      const info = statSync(fullPath);
      if (info.isDirectory()) visit(fullPath);
      else if (info.isFile()) files.push(fullPath);
    }
  };
  visit(rootDir);
  return files;
}

function cleanAssetReference(value) {
  const withoutQuery = value.split(/[?#]/, 1)[0] ?? '';
  return withoutQuery.replace(/^\/+/, '').replace(/^\.\//, '');
}

function referencedInitialJs(indexHtml) {
  const moduleScripts = [
    ...indexHtml.matchAll(/<script\b[^>]*\btype=["']module["'][^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),
  ]
    .map((match) => cleanAssetReference(match[1]))
    .filter((value) => value.endsWith('.js'));
  const modulePreloads = [
    ...indexHtml.matchAll(
      /<link\b[^>]*\brel=["']modulepreload["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi
    ),
  ]
    .map((match) => cleanAssetReference(match[1]))
    .filter((value) => value.endsWith('.js'));
  return [...new Set([...moduleScripts, ...modulePreloads])].sort();
}

function fileMetric(distDir, fullPath) {
  const bytes = readFileSync(fullPath);
  return {
    file: relative(distDir, fullPath).replaceAll('\\', '/'),
    rawBytes: bytes.length,
    gzipBytes: gzipSync(bytes, { level: 9 }).length,
  };
}

function sumMetrics(metrics) {
  return {
    fileCount: metrics.length,
    rawBytes: metrics.reduce((sum, item) => sum + item.rawBytes, 0),
    gzipBytes: metrics.reduce((sum, item) => sum + item.gzipBytes, 0),
  };
}

function collectPerformanceMetrics(distPath) {
  const distDir = resolve(ROOT, distPath);
  const indexPath = join(distDir, 'index.html');
  if (!existsSync(indexPath))
    throw new Error(`Missing production build at ${indexPath}. Run npm run build first.`);

  const indexHtml = readFileSync(indexPath, 'utf8');
  const allFiles = walkFiles(distDir);
  const jsMetrics = allFiles
    .filter((path) => extname(path) === '.js')
    .map((path) => fileMetric(distDir, path));
  const cssMetrics = allFiles
    .filter((path) => extname(path) === '.css')
    .map((path) => fileMetric(distDir, path));
  const initialRefs = referencedInitialJs(indexHtml);
  if (initialRefs.length === 0)
    throw new Error('No initial module JavaScript entry found in dist/index.html.');

  const jsByFile = new Map(jsMetrics.map((item) => [item.file, item]));
  const missing = initialRefs.filter((file) => !jsByFile.has(file));
  if (missing.length > 0)
    throw new Error(`Initial JS reference missing from dist: ${missing.join(', ')}`);

  const initialFiles = initialRefs.map((file) => jsByFile.get(file));
  const distMetrics = allFiles.map((path) => fileMetric(distDir, path));
  const largestJs = [...jsMetrics].sort((a, b) => b.gzipBytes - a.gzipBytes)[0] ?? null;

  return {
    initialJs: { ...sumMetrics(initialFiles), files: initialFiles },
    totalJs: { ...sumMetrics(jsMetrics), files: jsMetrics },
    totalCss: { ...sumMetrics(cssMetrics), files: cssMetrics },
    dist: sumMetrics(distMetrics),
    largestJs,
  };
}

function currentCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return 'unknown';
  }
}

function baselineDocument(metrics) {
  return {
    schemaVersion: 1,
    phase: '6-6A',
    sourceCommit: currentCommit(),
    measurement: {
      method: 'node-zlib-gzip-level-9',
      scope: 'production dist after npm run build',
    },
    policy: POLICY,
    metrics,
  };
}

function validateBaseline(value) {
  if (!value || typeof value !== 'object')
    throw new Error('Performance baseline must be a JSON object.');
  if (value.schemaVersion !== 1 || value.phase !== '6-6A')
    throw new Error('Unsupported performance baseline schema or phase.');
  if (
    value.policy?.temporaryInitialJsGzipGrowthPercent !== 5 ||
    value.policy?.codeSplitCandidateThresholdPercent !== 10 ||
    value.policy?.codeSplitAcceptanceReductionPercent !== 10
  )
    throw new Error('Performance policy does not match the frozen Phase 6-6A contract.');
  if (
    !Number.isInteger(value.metrics?.initialJs?.gzipBytes) ||
    value.metrics.initialJs.gzipBytes <= 0
  ) {
    throw new Error('Performance baseline has no valid initialJs.gzipBytes value.');
  }
  return value;
}

function writeJson(path, value) {
  const fullPath = resolve(ROOT, path);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return fullPath;
}

function verifyAgainstBaseline(metrics, baseline) {
  const baselineBytes = baseline.metrics.initialJs.gzipBytes;
  const maxBytes = Math.ceil(baselineBytes * 1.05);
  return {
    passed: metrics.initialJs.gzipBytes <= maxBytes,
    baselineInitialJsGzipBytes: baselineBytes,
    currentInitialJsGzipBytes: metrics.initialJs.gzipBytes,
    maximumInitialJsGzipBytes: maxBytes,
    temporaryGrowthPercent: 5,
    codeSplitCandidateThresholdBytes: Math.ceil(baselineBytes * 0.1),
    codeSplitAcceptanceReductionBytes: Math.ceil(baselineBytes * 0.1),
  };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const metrics = collectPerformanceMetrics(args.dist);

    if (args.writeBaseline) {
      if (existsSync(resolve(ROOT, args.baseline)) && !args.force) {
        throw new Error(
          `Baseline already exists at ${args.baseline}. Refusing silent refresh; use --force only after an approved budget change.`
        );
      }
      const baseline = baselineDocument(metrics);
      const baselinePath = writeJson(args.baseline, baseline);
      const verification = verifyAgainstBaseline(metrics, baseline);
      writeJson(args.report, {
        phase: '6-6A',
        mode: 'baseline-created',
        baselinePath,
        metrics,
        verification,
      });
      console.log('PERFORMANCE_BASELINE=CREATED');
      console.log(`BASELINE=${baselinePath}`);
      console.log(`INITIAL_JS_RAW=${metrics.initialJs.rawBytes}`);
      console.log(`INITIAL_JS_GZIP=${metrics.initialJs.gzipBytes}`);
      console.log(`TOTAL_JS_GZIP=${metrics.totalJs.gzipBytes}`);
      console.log(`JS_CHUNKS=${metrics.totalJs.fileCount}`);
      console.log(
        `CODE_SPLIT_CANDIDATE_THRESHOLD_BYTES=${verification.codeSplitCandidateThresholdBytes}`
      );
      console.log(
        `CODE_SPLIT_ACCEPTANCE_REDUCTION_BYTES=${verification.codeSplitAcceptanceReductionBytes}`
      );
      console.log(`REPORT=${resolve(ROOT, args.report)}`);
      return;
    }

    if (!existsSync(resolve(ROOT, args.baseline))) {
      throw new Error(
        `Missing tracked performance baseline: ${args.baseline}. Create it once with npm run performance:baseline after npm run build.`
      );
    }

    const baseline = validateBaseline(
      JSON.parse(readFileSync(resolve(ROOT, args.baseline), 'utf8'))
    );
    const verification = verifyAgainstBaseline(metrics, baseline);
    writeJson(args.report, {
      phase: '6-6A',
      mode: 'verify',
      baselinePath: resolve(ROOT, args.baseline),
      metrics,
      verification,
    });

    console.log(`BASELINE_INITIAL_JS_GZIP=${verification.baselineInitialJsGzipBytes}`);
    console.log(`CURRENT_INITIAL_JS_GZIP=${verification.currentInitialJsGzipBytes}`);
    console.log(`MAXIMUM_INITIAL_JS_GZIP=${verification.maximumInitialJsGzipBytes}`);
    console.log(`TEMPORARY_GROWTH_BUDGET_PERCENT=${verification.temporaryGrowthPercent}`);
    console.log(`TOTAL_JS_GZIP=${metrics.totalJs.gzipBytes}`);
    console.log(`JS_CHUNKS=${metrics.totalJs.fileCount}`);
    console.log(`REPORT=${resolve(ROOT, args.report)}`);

    if (!verification.passed) {
      fail(
        `initial JS gzip ${verification.currentInitialJsGzipBytes} bytes exceeds temporary Phase 6-6A budget ${verification.maximumInitialJsGzipBytes} bytes`
      );
      return;
    }
    console.log('PERFORMANCE_BUDGET=PASS');
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

main();
