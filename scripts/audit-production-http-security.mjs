#!/usr/bin/env node

import { writeFileSync } from 'node:fs';

const STATUS = Object.freeze({
  PASS: 'PASS',
  WARN: 'WARN',
  PENDING: 'PENDING',
  FAIL: 'FAIL',
});

const REPORT_PATH =
  process.env.PHASE_6_4E_HTTP_REPORT_PATH?.trim() ||
  '/tmp/rafiq-phase-6-4e-http-security-report.json';

const SAFE_REFERRER_POLICIES = new Set([
  'no-referrer',
  'same-origin',
  'strict-origin',
  'strict-origin-when-cross-origin',
]);

function isLocalHostname(hostname) {
  const normalized = hostname.toLowerCase();

  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized.endsWith('.localhost')
  );
}

function parseHttpsNonLocalUrl(value, label) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be an absolute URL`);
  }

  if (url.protocol !== 'https:') {
    throw new Error(`${label} must use HTTPS`);
  }
  if (isLocalHostname(url.hostname)) {
    throw new Error(`${label} must not point to a local host`);
  }
  if (url.username || url.password) {
    throw new Error(`${label} must not contain credentials`);
  }

  return url;
}

function parseExpectedOrigin(value) {
  if (!value?.trim()) return null;

  const url = parseHttpsNonLocalUrl(value.trim(), 'EXPECTED_SUPABASE_ORIGIN');
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error('EXPECTED_SUPABASE_ORIGIN must be an origin-only URL');
  }

  return url.origin;
}

function parseCsp(value) {
  const directives = new Map();

  for (const segment of value.split(';')) {
    const trimmed = segment.trim();
    if (!trimmed) continue;

    const [name, ...tokens] = trimmed.split(/\s+/);
    directives.set(name.toLowerCase(), tokens);
  }

  return directives;
}

function headerValue(headers, name) {
  return headers.get(name)?.trim() ?? '';
}

function hasEmptyPermission(policy, feature) {
  const pattern = new RegExp(`(?:^|,)\\s*${feature}\\s*=\\s*\\(\\s*\\)\\s*(?:,|$)`, 'i');
  return pattern.test(policy);
}

function hstsMaxAge(value) {
  const match = /(?:^|;)\s*max-age\s*=\s*(\d+)\s*(?:;|$)/i.exec(value);
  return match ? Number(match[1]) : null;
}

export function validateProductionHttpSecurity({
  requestedUrl,
  responseUrl,
  status,
  headers,
  expectedSupabaseOrigin = null,
}) {
  const checks = [];

  const add = (id, checkStatus, message) => {
    checks.push({ id, status: checkStatus, message });
  };

  let requested;
  let finalUrl;
  try {
    requested = parseHttpsNonLocalUrl(requestedUrl, 'PRODUCTION_APP_URL');
    finalUrl = parseHttpsNonLocalUrl(responseUrl, 'final response URL');
    add(
      'transport.https',
      STATUS.PASS,
      'production request and final response use HTTPS on non-local hosts'
    );
  } catch (error) {
    add(
      'transport.https',
      STATUS.FAIL,
      error instanceof Error ? error.message : 'invalid production URL'
    );
    return checks;
  }

  if (requested.origin === finalUrl.origin) {
    add(
      'transport.origin',
      STATUS.PASS,
      'final response remains on the requested production origin'
    );
  } else {
    add('transport.origin', STATUS.FAIL, 'production request redirected to a different origin');
  }

  if (Number.isInteger(status) && status >= 200 && status < 300) {
    add('http.status', STATUS.PASS, `production root returned HTTP ${status}`);
  } else {
    add('http.status', STATUS.FAIL, `production root returned unexpected HTTP ${status}`);
  }

  const cspValue = headerValue(headers, 'content-security-policy');
  if (!cspValue) {
    add('headers.csp', STATUS.FAIL, 'Content-Security-Policy header is missing');
  } else {
    const csp = parseCsp(cspValue);
    const defaultSrc = csp.get('default-src') ?? [];
    const objectSrc = csp.get('object-src') ?? [];
    const frameAncestors = csp.get('frame-ancestors') ?? [];
    const scriptSrc = csp.get('script-src') ?? defaultSrc;
    const connectSrc = csp.get('connect-src') ?? defaultSrc;

    const cspProblems = [];
    if (!defaultSrc.includes("'self'")) cspProblems.push("default-src must include 'self'");
    if (!(objectSrc.length === 1 && objectSrc[0] === "'none'")) {
      cspProblems.push("object-src must equal 'none'");
    }
    if (!(frameAncestors.length === 1 && frameAncestors[0] === "'none'")) {
      cspProblems.push("frame-ancestors must equal 'none'");
    }
    if (scriptSrc.includes("'unsafe-eval'"))
      cspProblems.push("script-src must not allow 'unsafe-eval'");
    if (scriptSrc.includes("'unsafe-inline'")) {
      cspProblems.push("script-src must not allow 'unsafe-inline'");
    }

    if (cspProblems.length === 0) {
      add(
        'headers.csp',
        STATUS.PASS,
        'CSP contains the required production execution and framing restrictions'
      );
    } else {
      add('headers.csp', STATUS.FAIL, cspProblems.join('; '));
    }

    if (!expectedSupabaseOrigin) {
      add(
        'headers.csp_connect',
        STATUS.PENDING,
        'EXPECTED_SUPABASE_ORIGIN not supplied; exact Supabase connect-src verification remains for Phase 6-7'
      );
    } else if (connectSrc.includes(expectedSupabaseOrigin)) {
      add(
        'headers.csp_connect',
        STATUS.PASS,
        'CSP connect-src includes the exact production Supabase origin'
      );
    } else {
      add(
        'headers.csp_connect',
        STATUS.FAIL,
        'CSP connect-src does not include the exact EXPECTED_SUPABASE_ORIGIN'
      );
    }
  }

  const xContentType = headerValue(headers, 'x-content-type-options').toLowerCase();
  add(
    'headers.nosniff',
    xContentType === 'nosniff' ? STATUS.PASS : STATUS.FAIL,
    xContentType === 'nosniff'
      ? 'X-Content-Type-Options is nosniff'
      : 'X-Content-Type-Options must equal nosniff'
  );

  const xFrame = headerValue(headers, 'x-frame-options').toUpperCase();
  add(
    'headers.frame',
    xFrame === 'DENY' ? STATUS.PASS : STATUS.FAIL,
    xFrame === 'DENY' ? 'X-Frame-Options is DENY' : 'X-Frame-Options must equal DENY'
  );

  const referrerPolicy = headerValue(headers, 'referrer-policy').toLowerCase();
  add(
    'headers.referrer',
    SAFE_REFERRER_POLICIES.has(referrerPolicy) ? STATUS.PASS : STATUS.FAIL,
    SAFE_REFERRER_POLICIES.has(referrerPolicy)
      ? `Referrer-Policy is ${referrerPolicy}`
      : 'Referrer-Policy must use an approved privacy-preserving value'
  );

  const permissionsPolicy = headerValue(headers, 'permissions-policy');
  const permissionsOk =
    hasEmptyPermission(permissionsPolicy, 'camera') &&
    hasEmptyPermission(permissionsPolicy, 'microphone') &&
    hasEmptyPermission(permissionsPolicy, 'geolocation');

  add(
    'headers.permissions',
    permissionsOk ? STATUS.PASS : STATUS.FAIL,
    permissionsOk
      ? 'Permissions-Policy disables camera, microphone, and geolocation'
      : 'Permissions-Policy must disable camera=(), microphone=(), and geolocation=()'
  );

  const hsts = headerValue(headers, 'strict-transport-security');
  const maxAge = hstsMaxAge(hsts);
  add(
    'headers.hsts',
    maxAge !== null && maxAge >= 31_536_000 ? STATUS.PASS : STATUS.FAIL,
    maxAge !== null && maxAge >= 31_536_000
      ? 'Strict-Transport-Security max-age is at least one year'
      : 'Strict-Transport-Security must set max-age to at least 31536000'
  );

  return checks;
}

function summarize(checks) {
  const counts = Object.fromEntries(Object.values(STATUS).map((status) => [status, 0]));
  for (const check of checks) counts[check.status] += 1;
  return counts;
}

function syntheticHeaders() {
  return new Headers({
    'content-security-policy':
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://school-project.supabase.co; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'strict-transport-security': 'max-age=63072000; includeSubDomains',
  });
}

function runSelfTest() {
  const good = validateProductionHttpSecurity({
    requestedUrl: 'https://rafiq.example.com/app',
    responseUrl: 'https://rafiq.example.com/app',
    status: 200,
    headers: syntheticHeaders(),
    expectedSupabaseOrigin: 'https://school-project.supabase.co',
  });

  if (good.some((check) => check.status !== STATUS.PASS)) {
    throw new Error('synthetic secure-header fixture did not pass');
  }

  const unsafeHeaders = syntheticHeaders();
  unsafeHeaders.set(
    'content-security-policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval'; object-src 'self'; frame-ancestors 'self'"
  );
  unsafeHeaders.delete('strict-transport-security');

  const bad = validateProductionHttpSecurity({
    requestedUrl: 'https://rafiq.example.com',
    responseUrl: 'https://rafiq.example.com',
    status: 200,
    headers: unsafeHeaders,
    expectedSupabaseOrigin: 'https://school-project.supabase.co',
  });

  if (!bad.some((check) => check.status === STATUS.FAIL)) {
    throw new Error('synthetic insecure-header fixture was not rejected');
  }

  console.log('PASS: production HTTP security contract self-check');
  console.log('PASS: secure synthetic headers accepted');
  console.log('PASS: insecure synthetic headers rejected');
}

async function runLiveAudit() {
  const rawAppUrl = process.env.PRODUCTION_APP_URL?.trim();
  if (!rawAppUrl) {
    throw new Error('missing PRODUCTION_APP_URL');
  }

  const requested = parseHttpsNonLocalUrl(rawAppUrl, 'PRODUCTION_APP_URL');
  const expectedSupabaseOrigin = parseExpectedOrigin(process.env.EXPECTED_SUPABASE_ORIGIN);

  const response = await fetch(requested, {
    method: 'GET',
    redirect: 'follow',
    headers: {
      accept: 'text/html,application/xhtml+xml',
    },
  });

  const checks = validateProductionHttpSecurity({
    requestedUrl: requested.toString(),
    responseUrl: response.url,
    status: response.status,
    headers: response.headers,
    expectedSupabaseOrigin,
  });

  for (const check of checks) {
    console.log(`${check.status.padEnd(7)} ${check.id}: ${check.message}`);
  }

  const counts = summarize(checks);
  const report = {
    phase: '6-4E2',
    generatedAt: new Date().toISOString(),
    requestedOrigin: requested.origin,
    finalOrigin: new URL(response.url).origin,
    status: response.status,
    summary: counts,
    checks,
  };

  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });

  console.log('');
  console.log(
    `SUMMARY PASS=${counts.PASS} WARN=${counts.WARN} PENDING=${counts.PENDING} FAIL=${counts.FAIL}`
  );
  console.log(`Redacted report: ${REPORT_PATH}`);

  if (counts.FAIL > 0) {
    console.error('PRODUCTION HTTP SECURITY BASELINE FAILED');
    process.exitCode = 1;
    return;
  }

  if (counts.PENDING > 0) {
    console.log('PRODUCTION HTTP SECURITY BASELINE PASSED WITH DEPLOYMENT PENDING ITEMS');
    return;
  }

  console.log('PRODUCTION HTTP SECURITY BASELINE PASSED');
}

const selfTest = process.argv.includes('--self-test');

try {
  if (selfTest) {
    runSelfTest();
  } else {
    await runLiveAudit();
  }
} catch (error) {
  console.error(
    `FAIL: ${error instanceof Error ? error.message : 'unknown HTTP security audit error'}`
  );
  process.exitCode = 1;
}
