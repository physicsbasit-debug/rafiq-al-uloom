#!/usr/bin/env node

import { spawnSync } from 'node:child_process';

const PHASE5_FROZEN_COMMIT = '5f46fca6ee4617720d0770b2139c9a844aaa08b6';
const MIGRATIONS_PATH = 'supabase/migrations';

function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8' });

  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || args.join(' ');
    throw new Error(`git command failed: ${detail}`);
  }

  return result.stdout.trim();
}

function fail(message, details = '') {
  console.error(`FAIL: ${message}`);
  if (details) {
    console.error(details);
  }
  process.exitCode = 1;
}

function assertBaseline() {
  git(['cat-file', '-e', `${PHASE5_FROZEN_COMMIT}^{commit}`]);

  const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', PHASE5_FROZEN_COMMIT, 'HEAD'], {
    encoding: 'utf8',
  });

  if (ancestry.status !== 0) {
    throw new Error('current HEAD is not descended from the frozen Phase 5 baseline');
  }
}

function historicalRewrites() {
  return git([
    'log',
    '--format=',
    '--name-status',
    '--diff-filter=MDRCTU',
    `${PHASE5_FROZEN_COMMIT}..HEAD`,
    '--',
    MIGRATIONS_PATH,
  ]);
}

function workingTreeChanges() {
  return git(['diff', '--name-status', 'HEAD', '--', MIGRATIONS_PATH]);
}

function validateWorkingTreeChanges(changes) {
  if (!changes) return;

  const bad = changes
    .split('\n')
    .filter(Boolean)
    .filter((line) => !line.startsWith('A\t'));

  if (bad.length > 0) {
    throw new Error(`existing migration change detected in working tree:\n${bad.join('\n')}`);
  }
}

try {
  assertBaseline();

  const rewrites = historicalRewrites();
  if (rewrites) {
    fail('historical migration rewrite detected after frozen Phase 5 baseline', rewrites);
  } else {
    const working = workingTreeChanges();
    validateWorkingTreeChanges(working);

    console.log('PASS: frozen migrations remain immutable');
    console.log('PASS: only forward-only migration additions are allowed');
  }
} catch (error) {
  fail(error instanceof Error ? error.message : 'unknown migration guard error');
}
