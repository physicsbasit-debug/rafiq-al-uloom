#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const API_BASE = 'https://api.supabase.com';
const REPORT_PATH =
  process.env.PHASE_6_4D_REPORT_PATH?.trim() || '/tmp/rafiq-phase-6-4d-remote-security-report.json';

const STATUS = Object.freeze({
  PASS: 'PASS',
  WARN: 'WARN',
  PENDING: 'PENDING',
  FAIL: 'FAIL',
});

function requiredSecret(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `Missing ${name}. Keep it in the Codespace environment only; never commit or paste it into reports.`
    );
  }
  return value;
}

function projectRefFromEnvironment() {
  const explicit = process.env.SUPABASE_PROJECT_REF?.trim();
  if (explicit) return explicit;

  const urlValue = process.env.VITE_SUPABASE_URL?.trim();
  if (!urlValue) return '';

  try {
    const hostname = new URL(urlValue).hostname.toLowerCase();
    const suffix = '.supabase.co';
    if (!hostname.endsWith(suffix)) return '';
    return hostname.slice(0, -suffix.length);
  } catch {
    return '';
  }
}

function normalizeUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    const normalizedPath = url.pathname.replace(/\/+$/, '') || '/';
    return `${url.protocol}//${url.host}${normalizedPath === '/' ? '' : normalizedPath}`;
  } catch {
    return null;
  }
}

function isHttpsNonLocal(value) {
  if (typeof value !== 'string' || !value.trim()) return false;

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    const local =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.localhost');

    return url.protocol === 'https:' && !local && !url.username && !url.password;
  } catch {
    return false;
  }
}

function parseRedirectAllowList(value) {
  if (typeof value !== 'string' || !value.trim()) return [];

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function projectFingerprint(projectRef) {
  return createHash('sha256').update(projectRef).digest('hex').slice(0, 12);
}

async function managementGet(path, token) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
    redirect: 'error',
  });

  if (!response.ok) {
    throw new Error(`Management API GET ${path} failed with HTTP ${response.status}.`);
  }

  return response.json();
}

function createRecorder() {
  const checks = [];

  function add(id, status, message) {
    checks.push({ id, status, message });
    const prefix = status.padEnd(7);
    console.log(`${prefix} ${id}: ${message}`);
  }

  return { checks, add };
}

function validateRemoteConfig({
  authConfig,
  sslConfig,
  networkConfig,
  functions,
  expectedSiteUrl,
  recorder,
}) {
  const { add } = recorder;

  const siteUrl = authConfig.site_url;
  const hasExpectedProductionSite = Boolean(normalizeUrl(expectedSiteUrl));

  if (!hasExpectedProductionSite) {
    if (isHttpsNonLocal(siteUrl)) {
      add(
        'auth.site_url',
        STATUS.PASS,
        'hosted Site URL is already HTTPS and non-local before final deployment binding'
      );
    } else {
      add(
        'auth.site_url',
        STATUS.PENDING,
        'production frontend URL is not finalized; hosted Site URL remains non-production until Phase 6-7'
      );
    }
  } else if (isHttpsNonLocal(siteUrl)) {
    add('auth.site_url', STATUS.PASS, 'hosted Site URL is HTTPS and non-local');
  } else {
    add(
      'auth.site_url',
      STATUS.FAIL,
      'configured hosted Site URL is local, credentialed, missing, or non-HTTPS'
    );
  }

  const normalizedExpectedSite = normalizeUrl(expectedSiteUrl);
  const normalizedHostedSite = normalizeUrl(siteUrl);
  if (!normalizedExpectedSite) {
    add(
      'auth.site_url_exact',
      STATUS.PENDING,
      'EXPECTED_PRODUCTION_SITE_URL not supplied; exact production-site match remains for deployment closure'
    );
  } else if (normalizedHostedSite === normalizedExpectedSite) {
    add('auth.site_url_exact', STATUS.PASS, 'hosted Site URL matches the expected production URL');
  } else {
    add(
      'auth.site_url_exact',
      STATUS.FAIL,
      'hosted Site URL does not match EXPECTED_PRODUCTION_SITE_URL'
    );
  }

  const redirects = parseRedirectAllowList(authConfig.uri_allow_list);
  const unsafeRedirects = redirects.filter((value) => !isHttpsNonLocal(value.replace(/\*/g, 'x')));
  const wildcardRedirects = redirects.filter((value) => value.includes('*'));

  if (unsafeRedirects.length > 0) {
    add(
      'auth.redirects',
      STATUS.FAIL,
      `${unsafeRedirects.length} redirect allow-list entr${unsafeRedirects.length === 1 ? 'y is' : 'ies are'} local or non-HTTPS`
    );
  } else if (wildcardRedirects.length > 0) {
    add(
      'auth.redirects',
      STATUS.WARN,
      `${wildcardRedirects.length} HTTPS wildcard redirect entr${wildcardRedirects.length === 1 ? 'y requires' : 'ies require'} manual review`
    );
  } else {
    add(
      'auth.redirects',
      STATUS.PASS,
      'redirect allow-list has no local, non-HTTPS, or wildcard entries'
    );
  }

  if (authConfig.external_anonymous_users_enabled === false) {
    add('auth.anonymous', STATUS.PASS, 'anonymous Auth users are disabled');
  } else {
    add('auth.anonymous', STATUS.FAIL, 'anonymous Auth users are enabled');
  }

  if (authConfig.security_manual_linking_enabled === false) {
    add('auth.manual_linking', STATUS.PASS, 'manual identity linking is disabled');
  } else {
    add('auth.manual_linking', STATUS.FAIL, 'manual identity linking is enabled');
  }

  if (authConfig.mailer_autoconfirm === false) {
    add('auth.email_confirmation', STATUS.PASS, 'email confirmation is required');
  } else {
    add('auth.email_confirmation', STATUS.FAIL, 'email addresses are auto-confirmed');
  }

  if (authConfig.mailer_secure_email_change_enabled === true) {
    add('auth.secure_email_change', STATUS.PASS, 'secure email-change confirmation is enabled');
  } else {
    add('auth.secure_email_change', STATUS.FAIL, 'secure email-change confirmation is disabled');
  }

  if (authConfig.security_update_password_require_reauthentication === true) {
    add('auth.password_reauth', STATUS.PASS, 'password changes require reauthentication');
  } else {
    add('auth.password_reauth', STATUS.FAIL, 'password changes do not require reauthentication');
  }

  if (authConfig.security_update_password_require_current_password === true) {
    add('auth.password_current', STATUS.PASS, 'password changes require the current password');
  } else {
    add('auth.password_current', STATUS.WARN, 'current-password verification is not required');
  }

  if (Number(authConfig.password_min_length) >= 8) {
    add(
      'auth.password_length',
      STATUS.PASS,
      `minimum password length is ${Number(authConfig.password_min_length)} or greater`
    );
  } else {
    add(
      'auth.password_length',
      STATUS.FAIL,
      `minimum password length is ${Number(authConfig.password_min_length) || 0}; production baseline requires at least 8`
    );
  }

  if (
    typeof authConfig.password_required_characters === 'string' &&
    authConfig.password_required_characters.trim()
  ) {
    add('auth.password_characters', STATUS.PASS, 'password character requirements are configured');
  } else {
    add('auth.password_characters', STATUS.WARN, 'no password character requirement is configured');
  }

  if (authConfig.password_hibp_enabled === true) {
    add('auth.leaked_passwords', STATUS.PASS, 'leaked-password protection is enabled');
  } else {
    add(
      'auth.leaked_passwords',
      STATUS.WARN,
      'leaked-password protection is not enabled or not available on the current plan'
    );
  }

  if (authConfig.refresh_token_rotation_enabled === true) {
    add('auth.refresh_rotation', STATUS.PASS, 'refresh-token rotation is enabled');
  } else {
    add('auth.refresh_rotation', STATUS.FAIL, 'refresh-token rotation is disabled');
  }

  if (
    authConfig.external_email_enabled === true &&
    typeof authConfig.smtp_host === 'string' &&
    authConfig.smtp_host.trim()
  ) {
    add('auth.smtp', STATUS.PASS, 'custom SMTP is configured for email Auth');
  } else if (authConfig.external_email_enabled === true) {
    add(
      'auth.smtp',
      STATUS.WARN,
      'email Auth is enabled without a detected custom SMTP host; production email delivery needs review'
    );
  } else {
    add(
      'auth.smtp',
      STATUS.PENDING,
      'email Auth is disabled; confirm this matches the production sign-in policy'
    );
  }

  const sslEnabled =
    sslConfig?.currentConfig?.database === true && sslConfig?.appliedSuccessfully === true;
  if (sslEnabled) {
    add('database.ssl', STATUS.PASS, 'Postgres SSL enforcement is enabled and applied');
  } else {
    add('database.ssl', STATUS.FAIL, 'Postgres SSL enforcement is not enabled and applied');
  }

  const networkEntitlement = networkConfig?.entitlement;
  const networkStatus = networkConfig?.status;
  const v4Cidrs = Array.isArray(networkConfig?.config?.dbAllowedCidrs)
    ? networkConfig.config.dbAllowedCidrs
    : [];
  const v6Cidrs = Array.isArray(networkConfig?.config?.dbAllowedCidrsV6)
    ? networkConfig.config.dbAllowedCidrsV6
    : [];
  const wideOpen = [...v4Cidrs, ...v6Cidrs].some((cidr) => cidr === '0.0.0.0/0' || cidr === '::/0');

  if (networkEntitlement === 'disallowed') {
    add(
      'database.network_restrictions',
      STATUS.WARN,
      'network restrictions are not entitled on the current remote project; database credentials remain the access boundary'
    );
  } else if (networkStatus === 'stored' && !wideOpen && v4Cidrs.length + v6Cidrs.length > 0) {
    add(
      'database.network_restrictions',
      STATUS.PASS,
      `network restrictions are configured with ${v4Cidrs.length + v6Cidrs.length} restricted CIDR entr${v4Cidrs.length + v6Cidrs.length === 1 ? 'y' : 'ies'}`
    );
  } else {
    add(
      'database.network_restrictions',
      STATUS.WARN,
      'network restrictions are available but are not currently narrowing database access'
    );
  }

  const gateway = Array.isArray(functions)
    ? functions.find((item) => item?.slug === 'ai-authoring-gateway')
    : undefined;

  if (!gateway) {
    add(
      'edge.ai_gateway',
      STATUS.PENDING,
      'ai-authoring-gateway is not deployed on this remote project yet; deployment verification remains for Phase 6-7'
    );
  } else if (gateway.verify_jwt !== true) {
    add(
      'edge.ai_gateway',
      STATUS.FAIL,
      'deployed ai-authoring-gateway does not enforce JWT verification'
    );
  } else if (gateway.status !== 'ACTIVE') {
    add('edge.ai_gateway', STATUS.FAIL, 'deployed ai-authoring-gateway is not ACTIVE');
  } else {
    add(
      'edge.ai_gateway',
      STATUS.PASS,
      'deployed ai-authoring-gateway is ACTIVE with JWT verification'
    );
  }

  add(
    'edge.gemini_secret',
    STATUS.PENDING,
    'Edge Function secret-read permission is intentionally not granted; verify GEMINI_API_KEY during Phase 6-7 deployment'
  );
}

function summary(checks) {
  const counts = Object.fromEntries(Object.values(STATUS).map((status) => [status, 0]));
  for (const check of checks) counts[check.status] += 1;
  return counts;
}

async function main() {
  const token = requiredSecret('SUPABASE_ACCESS_TOKEN');
  const projectRef = projectRefFromEnvironment();

  if (!projectRef) {
    throw new Error(
      'Missing SUPABASE_PROJECT_REF and no project ref could be derived from VITE_SUPABASE_URL.'
    );
  }

  if (!/^[a-z0-9-]{6,64}$/i.test(projectRef)) {
    throw new Error('SUPABASE_PROJECT_REF has an unexpected format.');
  }

  const expectedSiteUrl = process.env.EXPECTED_PRODUCTION_SITE_URL?.trim() || '';
  const recorder = createRecorder();

  console.log(`Phase 6-4D remote project fingerprint: ${projectFingerprint(projectRef)}`);
  console.log('Read-only audit: no remote mutation commands are executed.');

  const [authConfig, sslConfig, networkConfig, functions] = await Promise.all([
    managementGet(`/v1/projects/${encodeURIComponent(projectRef)}/config/auth`, token),
    managementGet(`/v1/projects/${encodeURIComponent(projectRef)}/ssl-enforcement`, token),
    managementGet(`/v1/projects/${encodeURIComponent(projectRef)}/network-restrictions`, token),
    managementGet(`/v1/projects/${encodeURIComponent(projectRef)}/functions`, token),
  ]);

  validateRemoteConfig({
    authConfig,
    sslConfig,
    networkConfig,
    functions,
    expectedSiteUrl,
    recorder,
  });

  const counts = summary(recorder.checks);
  const report = {
    phase: '6-4D',
    generatedAt: new Date().toISOString(),
    projectFingerprint: projectFingerprint(projectRef),
    readOnly: true,
    summary: counts,
    checks: recorder.checks,
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
    console.error('REMOTE PRODUCTION SECURITY BASELINE FAILED');
    process.exitCode = 1;
    return;
  }

  if (counts.PENDING > 0) {
    console.log('REMOTE PRODUCTION SECURITY BASELINE PASSED WITH DEPLOYMENT PENDING ITEMS');
    return;
  }

  console.log('REMOTE PRODUCTION SECURITY BASELINE PASSED');
}

main().catch((error) => {
  console.error(`FAIL: ${error instanceof Error ? error.message : 'unknown remote audit error'}`);
  process.exitCode = 1;
});
