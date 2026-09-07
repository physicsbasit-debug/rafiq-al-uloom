#!/usr/bin/env node

const REQUIRED_PROVIDER = 'supabase';
const REQUIRED_PUBLISHABLE_PREFIX = 'sb_publishable_';

const FORBIDDEN_BROWSER_ENV_NAMES = [
  'VITE_GEMINI_API_KEY',
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_SECRET_KEY',
  'VITE_DATABASE_URL',
  'VITE_DATABASE_PASSWORD',
  'VITE_DB_PASSWORD',
  'VITE_SMTP_PASSWORD',
  'VITE_OPENAI_API_KEY',
  'VITE_PRIVATE_KEY',
];

function fail(message) {
  console.error(`FAIL: ${message}`);
  process.exitCode = 1;
}

function required(env, name) {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`missing ${name}`);
  }
  return value;
}

function validateProductionUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error('VITE_SUPABASE_URL must be an absolute URL');
  }

  if (url.protocol !== 'https:') {
    throw new Error('VITE_SUPABASE_URL must use https');
  }

  const hostname = url.hostname.toLowerCase();
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '::1' ||
    hostname.endsWith('.localhost')
  ) {
    throw new Error('VITE_SUPABASE_URL must not point to a local host');
  }

  if (url.username || url.password) {
    throw new Error('VITE_SUPABASE_URL must not contain credentials');
  }

  return url;
}

function validatePublishableKey(value) {
  if (value.startsWith('sb_secret_')) {
    throw new Error('VITE_SUPABASE_ANON_KEY must never contain a Supabase secret key');
  }

  if (!value.startsWith(REQUIRED_PUBLISHABLE_PREFIX)) {
    throw new Error(
      'VITE_SUPABASE_ANON_KEY must contain a current Supabase publishable key (sb_publishable_...)'
    );
  }

  if (value === 'sb_publishable_REPLACE_ME') {
    throw new Error('VITE_SUPABASE_ANON_KEY still contains the example placeholder');
  }
}

function validateForbiddenBrowserSecrets(env) {
  const present = FORBIDDEN_BROWSER_ENV_NAMES.filter((name) => env[name]?.trim());
  if (present.length > 0) {
    throw new Error(`forbidden browser secret variable(s): ${present.join(', ')}`);
  }

  const suspicious = Object.keys(env).filter(
    (name) =>
      name.startsWith('VITE_') &&
      /(SERVICE_ROLE|SECRET_KEY|PASSWORD|PRIVATE_KEY|GEMINI_API_KEY)/i.test(name)
  );

  if (suspicious.length > 0) {
    throw new Error(`suspicious VITE_* secret variable(s): ${suspicious.sort().join(', ')}`);
  }
}

export function validateProductionEnvironment(env) {
  validateForbiddenBrowserSecrets(env);

  const provider = required(env, 'VITE_CONTENT_PROVIDER');
  if (provider !== REQUIRED_PROVIDER) {
    throw new Error('VITE_CONTENT_PROVIDER must equal supabase in production');
  }

  const supabaseUrl = required(env, 'VITE_SUPABASE_URL');
  validateProductionUrl(supabaseUrl);

  const publishableKey = required(env, 'VITE_SUPABASE_ANON_KEY');
  validatePublishableKey(publishableKey);

  return {
    provider,
    supabaseUrlConfigured: true,
    publishableKeyConfigured: true,
  };
}

try {
  validateProductionEnvironment(process.env);
  console.log('PASS: production browser environment contract');
  console.log('PASS: VITE_CONTENT_PROVIDER=supabase');
  console.log('PASS: HTTPS non-local Supabase URL configured');
  console.log('PASS: Supabase publishable browser key configured');
  console.log('PASS: no forbidden VITE_* server secret variables detected');
} catch (error) {
  fail(error instanceof Error ? error.message : 'unknown production environment validation error');
}
