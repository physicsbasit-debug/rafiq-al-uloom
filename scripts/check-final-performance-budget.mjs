#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const DEFAULT_DIST = 'dist';
const DEFAULT_BUDGET = 'config/production-performance-final-budget.json';
const DEFAULT_REPORT = '/tmp/rafiq-phase-6-6c-performance-report.json';
const PERFORMANCE_SCRIPT = resolve(ROOT, 'scripts/check-production-performance.mjs');

function fail(message) {
  console.error(`FINAL_PERFORMANCE_GATE_FAIL: ${message}`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const args = { dist: DEFAULT_DIST, budget: DEFAULT_BUDGET, report: DEFAULT_REPORT };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--dist') args.dist = argv[++index];
    else if (value === '--budget') args.budget = argv[++index];
    else if (value === '--report') args.report = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }

  return args;
}

function readJson(path) {
  return JSON.parse(readFileSync(resolve(ROOT, path), 'utf8'));
}

function validateBudget(budget) {
  if (!budget || typeof budget !== 'object') {
    throw new Error('Final performance budget must be a JSON object.');
  }

  if (budget.schemaVersion !== 1 || budget.phase !== '6-6C') {
    throw new Error('Unsupported final performance budget schema or phase.');
  }

  const acceptedInitial = budget.acceptedMetrics?.initialJsGzipBytes;
  const acceptedTotal = budget.acceptedMetrics?.totalJsGzipBytes;
  const headroom = budget.policy?.growthHeadroomPercent;
  const maximumInitial = budget.policy?.maximumInitialJsGzipBytes;
  const maximumTotal = budget.policy?.maximumTotalJsGzipBytes;

  for (const [name, value] of Object.entries({
    acceptedInitial,
    acceptedTotal,
    headroom,
    maximumInitial,
    maximumTotal,
  })) {
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`Invalid numeric final performance budget field: ${name}`);
    }
  }

  const expectedMaximumInitial = Math.ceil(acceptedInitial * (1 + headroom / 100));
  const expectedMaximumTotal = Math.ceil(acceptedTotal * (1 + headroom / 100));

  if (maximumInitial !== expectedMaximumInitial || maximumTotal !== expectedMaximumTotal) {
    throw new Error(
      'Final performance maxima do not match accepted metrics + configured headroom.'
    );
  }

  return budget;
}

function runOfficialMeasurement(dist, report) {
  try {
    return execFileSync(
      process.execPath,
      [PERFORMANCE_SCRIPT, '--dist', dist, '--report', report],
      {
        cwd: ROOT,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );
  } catch (error) {
    if (error?.stdout) process.stdout.write(error.stdout);
    if (error?.stderr) process.stderr.write(error.stderr);
    throw new Error('Official performance measurement failed before final budget evaluation.', {
      cause: error,
    });
  }
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const budgetPath = resolve(ROOT, args.budget);

    if (!existsSync(budgetPath)) {
      throw new Error(`Missing tracked final performance budget: ${args.budget}`);
    }

    const budget = validateBudget(readJson(args.budget));
    runOfficialMeasurement(args.dist, args.report);
    const report = readJson(args.report);

    const currentInitial = report.metrics?.initialJs?.gzipBytes;
    const currentTotal = report.metrics?.totalJs?.gzipBytes;

    if (!Number.isInteger(currentInitial) || !Number.isInteger(currentTotal)) {
      throw new Error('Official performance report is missing current JS gzip metrics.');
    }

    const maximumInitial = budget.policy.maximumInitialJsGzipBytes;
    const maximumTotal = budget.policy.maximumTotalJsGzipBytes;

    console.log(
      `FINAL_BUDGET_ACCEPTED_INITIAL_JS_GZIP=${budget.acceptedMetrics.initialJsGzipBytes}`
    );
    console.log(`FINAL_BUDGET_CURRENT_INITIAL_JS_GZIP=${currentInitial}`);
    console.log(`FINAL_BUDGET_MAXIMUM_INITIAL_JS_GZIP=${maximumInitial}`);
    console.log(`FINAL_BUDGET_ACCEPTED_TOTAL_JS_GZIP=${budget.acceptedMetrics.totalJsGzipBytes}`);
    console.log(`FINAL_BUDGET_CURRENT_TOTAL_JS_GZIP=${currentTotal}`);
    console.log(`FINAL_BUDGET_MAXIMUM_TOTAL_JS_GZIP=${maximumTotal}`);
    console.log(`FINAL_BUDGET_HEADROOM_PERCENT=${budget.policy.growthHeadroomPercent}`);

    if (currentInitial > maximumInitial) {
      fail(`initial JS gzip ${currentInitial} bytes exceeds final budget ${maximumInitial} bytes`);
      return;
    }

    if (currentTotal > maximumTotal) {
      fail(`total JS gzip ${currentTotal} bytes exceeds final budget ${maximumTotal} bytes`);
      return;
    }

    console.log('FINAL_PERFORMANCE_BUDGET=PASS');
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

main();
