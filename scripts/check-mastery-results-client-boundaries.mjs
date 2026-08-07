#!/usr/bin/env node

import console from 'node:console';
import process from 'node:process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = resolve(scriptDirectory, '..');

const scanRoots = ['src', 'public'];
const approvedRpcOwner =
  'src/services/mastery-results/supabase-mastery-results.repository.ts';
const rpcName = 'submit_mastery_attempt';

const textExtensions = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.jsx',
  '.json',
  '.mjs',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.webmanifest',
]);

const violations = [];

function toPosixPath(pathValue) {
  return pathValue.split(sep).join('/');
}

function collectTextFiles(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  const files = [];
  for (const entry of readdirSync(directory)) {
    const absolutePath = join(directory, entry);
    const stats = statSync(absolutePath);

    if (stats.isDirectory()) {
      files.push(...collectTextFiles(absolutePath));
      continue;
    }

    if (stats.isFile() && textExtensions.has(extname(entry).toLowerCase())) {
      files.push(absolutePath);
    }
  }

  return files;
}

function lineNumberAt(text, index) {
  return text.slice(0, index).split('\n').length;
}

function addViolation(rule, absolutePath, text, index, detail) {
  violations.push({
    rule,
    file: toPosixPath(relative(rootDirectory, absolutePath)),
    line: lineNumberAt(text, index),
    detail,
  });
}

function findPatternMatches(pattern, text, callback) {
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    callback(match);
    if (match[0].length === 0) {
      pattern.lastIndex += 1;
    }
  }
}

function scanRpcOwnership(absolutePath, relativePath, text) {
  const rpcNamePattern = new RegExp(`\\b${rpcName}\\b`, 'g');

  if (relativePath !== approvedRpcOwner) {
    findPatternMatches(rpcNamePattern, text, (match) => {
      addViolation(
        'mastery-rpc-name-outside-repository',
        absolutePath,
        text,
        match.index,
        `${rpcName} may appear only in ${approvedRpcOwner}.`
      );
    });
  }

  if (relativePath.endsWith('.tsx')) {
    const directRpcPattern = /(?:\.|\?\.)\s*rpc\s*\(/g;
    findPatternMatches(directRpcPattern, text, (match) => {
      addViolation(
        'react-direct-rpc-call',
        absolutePath,
        text,
        match.index,
        'React components may not call Supabase RPC functions directly.'
      );
    });
  }
}

function scanDirectResultTableWrites(absolutePath, text) {
  const tableWritePattern =
    /\.from\(\s*['"](?:mastery_attempts|mastery_attempt_answers)['"]\s*\)[\s\S]{0,600}?\.(?:insert|upsert|update|delete)\s*\(/g;

  findPatternMatches(tableWritePattern, text, (match) => {
    addViolation(
      'direct-mastery-result-table-write',
      absolutePath,
      text,
      match.index,
      'Client code must persist mastery results through the approved RPC repository, not direct table writes.'
    );
  });
}

for (const scanRoot of scanRoots) {
  const absoluteRoot = join(rootDirectory, scanRoot);
  if (!existsSync(absoluteRoot)) {
    console.error(`Missing required scan directory: ${scanRoot}`);
    process.exit(1);
  }
}

const approvedOwnerPath = join(rootDirectory, approvedRpcOwner);
if (!existsSync(approvedOwnerPath)) {
  console.error(`Missing approved mastery RPC repository: ${approvedRpcOwner}`);
  process.exit(1);
}

const approvedOwnerText = readFileSync(approvedOwnerPath, 'utf8');
const approvedRpcCall =
  /\.rpc\s*\(\s*['"]submit_mastery_attempt['"]\s*,/g;
if (!approvedRpcCall.test(approvedOwnerText)) {
  console.error(
    `The approved repository does not contain the expected ${rpcName} RPC call: ${approvedRpcOwner}`
  );
  process.exit(1);
}

for (const scanRoot of scanRoots) {
  const files = collectTextFiles(join(rootDirectory, scanRoot));

  for (const absolutePath of files) {
    const relativePath = toPosixPath(relative(rootDirectory, absolutePath));
    const text = readFileSync(absolutePath, 'utf8');

    scanRpcOwnership(absolutePath, relativePath, text);
    scanDirectResultTableWrites(absolutePath, text);
  }
}

if (violations.length > 0) {
  console.error(
    `Mastery-results client boundary scan failed with ${violations.length} violation(s):`
  );

  for (const violation of violations) {
    console.error(
      `- [${violation.rule}] ${violation.file}:${violation.line} — ${violation.detail}`
    );
  }

  process.exit(1);
}

console.log('Mastery-results client boundary scan passed.');
console.log(`Approved RPC owner: ${approvedRpcOwner}`);
console.log(`Scanned roots: ${scanRoots.join(', ')}`);
