#!/usr/bin/env node

import { readFileSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024;
const APPROVED_TRACKED_ENV_FILES = new Set(['.env.development', '.env.test', '.env.example']);

const SECRET_PATTERNS = [
  {
    name: 'private key',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  },
  {
    name: 'GitHub token',
    pattern: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
  },
  {
    name: 'Google API key',
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/,
  },
  {
    name: 'Supabase secret key',
    pattern: /\bsb_secret_[A-Za-z0-9]{20,}\b/,
  },
  {
    name: 'AWS access key',
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  },
];

function trackedFiles() {
  const result = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error('unable to enumerate tracked files');
  }

  return result.stdout.split('\0').filter(Boolean);
}

function isTrackedEnvFile(path) {
  const basename = path.split('/').at(-1) ?? path;
  return basename === '.env' || basename.startsWith('.env.');
}

function isProbablyBinary(buffer) {
  return buffer.includes(0);
}

function scanText(path, text) {
  const findings = [];

  for (const { name, pattern } of SECRET_PATTERNS) {
    if (pattern.test(text)) {
      findings.push(`${path}: ${name}`);
    }
  }

  return findings;
}

try {
  const files = trackedFiles();
  const findings = [];

  for (const path of files) {
    if (isTrackedEnvFile(path) && !APPROVED_TRACKED_ENV_FILES.has(path)) {
      findings.push(`${path}: unapproved tracked environment file`);
      continue;
    }

    let size;
    try {
      size = statSync(path).size;
    } catch {
      continue;
    }

    if (size > MAX_TEXT_FILE_BYTES) continue;

    const buffer = readFileSync(path);
    if (isProbablyBinary(buffer)) continue;

    findings.push(...scanText(path, buffer.toString('utf8')));
  }

  if (findings.length > 0) {
    console.error('FAIL: tracked secret scan found high-confidence finding(s)');
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    process.exitCode = 1;
  } else {
    console.log('PASS: no high-confidence tracked secrets detected');
    console.log('PASS: tracked environment files are restricted to the approved allowlist');
  }
} catch (error) {
  console.error(
    `FAIL: ${error instanceof Error ? error.message : 'unknown tracked secret scan error'}`
  );
  process.exitCode = 1;
}
