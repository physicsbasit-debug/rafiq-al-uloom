#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = process.cwd();
const DEFAULT_POLICY = 'config/production-cache-policy.json';

function fail(message) {
  console.error(`CACHE_POLICY_GATE_FAIL: ${message}`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const args = { policy: DEFAULT_POLICY };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--policy') args.policy = argv[++index];
    else throw new Error(`Unknown argument: ${value}`);
  }

  return args;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const policy = JSON.parse(readFileSync(resolve(ROOT, args.policy), 'utf8'));

    if (policy.schemaVersion !== 1 || policy.phase !== '6-6C') {
      throw new Error('Unsupported cache policy schema or phase.');
    }

    if (policy.implementationPhase !== '6-7') {
      throw new Error('Hosting cache-header implementation must remain assigned to Phase 6-7.');
    }

    const expected = {
      indexHtml: 'public, max-age=0, must-revalidate',
      hashedAssets: 'public, max-age=31536000, immutable',
      sensitiveDynamicResponses: 'no-store',
    };

    for (const [key, cacheControl] of Object.entries(expected)) {
      if (policy.policy?.[key]?.cacheControl !== cacheControl) {
        throw new Error(
          `${key} cache policy mismatch: expected "${cacheControl}", got "${policy.policy?.[key]?.cacheControl ?? 'missing'}"`
        );
      }
    }

    console.log(`CACHE_INDEX_HTML=${expected.indexHtml}`);
    console.log(`CACHE_HASHED_ASSETS=${expected.hashedAssets}`);
    console.log(`CACHE_SENSITIVE_DYNAMIC=${expected.sensitiveDynamicResponses}`);
    console.log('CACHE_HEADER_IMPLEMENTATION_PHASE=6-7');
    console.log('CACHE_POLICY_CONTRACT=PASS');
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

main();
