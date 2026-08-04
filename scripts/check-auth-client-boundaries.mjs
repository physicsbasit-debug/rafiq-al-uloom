#!/usr/bin/env node

import console from 'node:console';
import process from 'node:process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const rootDirectory = resolve(scriptDirectory, '..');
const scanRoots = ['src', 'public', 'dist'];
const sourceRoot = 'src';
const allowedSupabaseAuthFile = 'src/services/auth/auth.service.ts';
const authFacadeFile = 'src/features/auth/AuthSessionProvider.tsx';
const allowedFacadeMethods = new Set([
  'getCurrentSession',
  'onAuthStateChange',
  'signInWithPassword',
  'signOut',
  'signUp',
]);

const textExtensions = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.jsx',
  '.json',
  '.map',
  '.mjs',
  '.svg',
  '.ts',
  '.tsx',
  '.txt',
  '.webmanifest',
]);

const forbiddenIdentifierPatterns = [
  /\bSUPABASE_SERVICE_ROLE_KEY\b/g,
  /\bSERVICE_ROLE_KEY\b/g,
  /\bPOSTGRES_PASSWORD\b/g,
  /\bSUPABASE_DB_PASSWORD\b/g,
  /\bJWT_SECRET\b/g,
  /\bGOTRUE_JWT_SECRET\b/g,
  /\bPGRST_JWT_SECRET\b/g,
  /\bVITE_[A-Z0-9_]*SERVICE[_-]?ROLE[A-Z0-9_]*\b/gi,
];

const secretEnvironmentNames = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'SERVICE_ROLE_KEY',
  'POSTGRES_PASSWORD',
  'SUPABASE_DB_PASSWORD',
  'JWT_SECRET',
  'GOTRUE_JWT_SECRET',
  'PGRST_JWT_SECRET',
];

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

function maskApprovedAuthFacadeCalls(text) {
  return text.replace(
    /\bservices\s*\.\s*auth\s*\.\s*([A-Za-z_$][\w$]*)\s*\(/g,
    (fullMatch, methodName) => {
      if (!allowedFacadeMethods.has(methodName)) {
        return fullMatch;
      }
      return fullMatch.replace(/auth/, 'approvedAuthFacade');
    }
  );
}

function scanSupabaseAuthBoundary(absolutePath, relativePath, text) {
  if (relativePath === allowedSupabaseAuthFile) {
    return;
  }

  const scanText = relativePath === authFacadeFile ? maskApprovedAuthFacadeCalls(text) : text;

  // Receiver names are deliberately irrelevant. This catches client.auth,
  // sdk.auth, getClient().auth, optional chaining and bracket notation.
  const directAuthNamespace = /(?:\.|\?\.)\s*auth\b|\[\s*['"]auth['"]\s*\]/g;
  findPatternMatches(directAuthNamespace, scanText, (match) => {
    addViolation(
      'supabase-auth-outside-service',
      absolutePath,
      scanText,
      match.index,
      'Auth namespace access is allowed only in src/services/auth/auth.service.ts. AuthSessionProvider may call the approved services.auth facade methods only.'
    );
  });

  const destructuredAuth = /\b(?:const|let|var)\s*\{[^}\n]*\bauth\b[^}\n]*\}\s*=|\b(?:const|let|var)\s+[A-Za-z_$][\w$]*\s*=\s*[^;\n]+(?:\.|\?\.)\s*auth\b/g;
  findPatternMatches(destructuredAuth, scanText, (match) => {
    addViolation(
      'supabase-auth-namespace-alias',
      absolutePath,
      scanText,
      match.index,
      'Do not extract or alias an Auth namespace outside auth.service.ts.'
    );
  });
}

function scanMetadataAuthorization(absolutePath, text) {
  const metadataPatterns = [
    /\buser_metadata\b/g,
    /\bapp_metadata\b/g,
    /\[['"]user_metadata['"]\]/g,
    /\[['"]app_metadata['"]\]/g,
  ];

  for (const pattern of metadataPatterns) {
    findPatternMatches(pattern, text, (match) => {
      addViolation(
        'authorization-from-auth-metadata',
        absolutePath,
        text,
        match.index,
        'Application authorization must come from public.profiles, not Supabase Auth metadata.'
      );
    });
  }
}

function scanProfileWrites(absolutePath, text) {
  const profileWritePattern = /\.from\(\s*['"]profiles['"]\s*\)[\s\S]{0,500}?\.(?:insert|update|delete|upsert)\s*\(/g;
  findPatternMatches(profileWritePattern, text, (match) => {
    addViolation(
      'client-profile-write',
      absolutePath,
      text,
      match.index,
      'Client code may read profiles through profile.service.ts but may not write profiles.'
    );
  });
}

function scanForbiddenIdentifiers(absolutePath, text, scanRoot) {
  for (const pattern of forbiddenIdentifierPatterns) {
    findPatternMatches(pattern, text, (match) => {
      addViolation(
        'forbidden-secret-identifier',
        absolutePath,
        text,
        match.index,
        `Forbidden client identifier: ${match[0]}`
      );
    });
  }

  // A dependency bundle may contain the generic phrase service_role in its
  // implementation text. Source and public files are stricter; dist relies on
  // exact forbidden identifiers plus actual secret-value matching.
  if (scanRoot !== 'dist') {
    const serviceRolePattern = /\bservice[_-]?role\b/gi;
    findPatternMatches(serviceRolePattern, text, (match) => {
      addViolation(
        'service-role-client-boundary',
        absolutePath,
        text,
        match.index,
        'Service-role material must never appear in client source or public files.'
      );
    });
  }
}

function scanSecretValuesInDist(distFiles) {
  for (const environmentName of secretEnvironmentNames) {
    const secretValue = process.env[environmentName];
    if (!secretValue || secretValue.length < 12) {
      continue;
    }

    for (const absolutePath of distFiles) {
      const text = readFileSync(absolutePath, 'utf8');
      const index = text.indexOf(secretValue);
      if (index !== -1) {
        addViolation(
          'secret-value-in-dist',
          absolutePath,
          text,
          index,
          `The value of ${environmentName} was found in dist. The value itself is intentionally not printed.`
        );
      }
    }
  }
}

for (const scanRoot of scanRoots) {
  const absoluteRoot = join(rootDirectory, scanRoot);
  if (!existsSync(absoluteRoot)) {
    console.error(`Missing required scan directory: ${scanRoot}`);
    process.exit(1);
  }
}

const filesByRoot = new Map(
  scanRoots.map((scanRoot) => [scanRoot, collectTextFiles(join(rootDirectory, scanRoot))])
);

for (const [scanRoot, files] of filesByRoot) {
  for (const absolutePath of files) {
    const relativePath = toPosixPath(relative(rootDirectory, absolutePath));
    const text = readFileSync(absolutePath, 'utf8');

    scanForbiddenIdentifiers(absolutePath, text, scanRoot);

    if (scanRoot === sourceRoot) {
      scanSupabaseAuthBoundary(absolutePath, relativePath, text);
      scanMetadataAuthorization(absolutePath, text);
      scanProfileWrites(absolutePath, text);
    }
  }
}

scanSecretValuesInDist(filesByRoot.get('dist'));

if (violations.length > 0) {
  console.error(`Auth client boundary scan failed with ${violations.length} violation(s):`);
  for (const violation of violations) {
    console.error(
      `- [${violation.rule}] ${violation.file}:${violation.line} — ${violation.detail}`
    );
  }
  process.exit(1);
}

console.log('Auth client boundary scan passed.');
console.log(`Scanned roots: ${scanRoots.join(', ')}`);
