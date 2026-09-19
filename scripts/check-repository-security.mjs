#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const CI_WORKFLOW_PATH = resolve(ROOT, '.github/workflows/ci.yml');

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function checkoutBlocks(workflow) {
  const lines = workflow.split('\n');
  const blocks = [];

  for (let index = 0; index < lines.length; index += 1) {
    if (!/^\s+uses:\s+actions\/checkout@/.test(lines[index])) continue;

    const block = [lines[index]];
    for (let cursor = index + 1; cursor < lines.length; cursor += 1) {
      if (/^\s{6}-\s+name:/.test(lines[cursor])) break;
      block.push(lines[cursor]);
    }
    blocks.push(block.join('\n'));
  }

  return blocks;
}

function main() {
  const workflow = readFileSync(CI_WORKFLOW_PATH, 'utf8');
  const failures = [];

  if (/^\s*pull_request_target\s*:/m.test(workflow)) {
    failures.push('ordinary CI must not use pull_request_target');
  }

  if (/^\s*permissions\s*:\s*write-all\s*$/m.test(workflow)) {
    failures.push('ordinary CI must not use permissions: write-all');
  }

  if (/^\s*contents\s*:\s*write\s*$/m.test(workflow)) {
    failures.push('ordinary CI must not request contents: write');
  }

  if (/^\s*id-token\s*:\s*write\s*$/m.test(workflow)) {
    failures.push('ordinary CI must not request id-token: write');
  }

  if (workflow.includes('${{ secrets.')) {
    failures.push('ordinary CI must not consume repository or environment secrets');
  }

  const blocks = checkoutBlocks(workflow);
  if (blocks.length === 0) {
    failures.push('ordinary CI must contain at least one checkout step');
  }

  for (const [index, block] of blocks.entries()) {
    if (!/^\s+persist-credentials:\s*false\s*$/m.test(block)) {
      failures.push(`checkout step ${index + 1} must set persist-credentials: false`);
    }
  }

  if (failures.length > 0) {
    fail('repository security contract violation(s)');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    return;
  }

  console.log('PASS: ordinary CI repository security contract');
  console.log(`PASS: ${blocks.length} checkout step(s) disable persisted GitHub credentials`);
  console.log('PASS: ordinary CI has no write permissions, pull_request_target, or secrets');
}

main();
