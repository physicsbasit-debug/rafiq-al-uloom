import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export interface SupabaseEnvironment {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

let cachedClient: SupabaseClient | undefined;

function readRequiredValue(env: SupabaseEnvironment, key: keyof SupabaseEnvironment): string {
  const value = env[key]?.trim();

  if (!value) {
    throw new Error(`Missing ${key}`);
  }

  return value;
}

function validateAbsoluteHttpUrl(value: string, errorMessage: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch (error) {
    throw new Error(errorMessage, { cause: error });
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error(errorMessage);
  }

  return value;
}

function resolveSupabaseUrl(value: string, runtimeOrigin?: string): string {
  if (value === '/supabase') {
    if (!runtimeOrigin) {
      throw new Error('Relative VITE_SUPABASE_URL requires runtime origin');
    }

    const validOrigin = validateAbsoluteHttpUrl(runtimeOrigin, 'Invalid Supabase runtime origin');
    return new URL(value, validOrigin).toString();
  }

  if (value.startsWith('/')) {
    throw new Error('Invalid VITE_SUPABASE_URL');
  }

  return validateAbsoluteHttpUrl(value, 'Invalid VITE_SUPABASE_URL');
}

export function createSupabaseClientFromEnv(
  env: SupabaseEnvironment,
  runtimeOrigin?: string
): SupabaseClient {
  const supabaseUrl = resolveSupabaseUrl(
    readRequiredValue(env, 'VITE_SUPABASE_URL'),
    runtimeOrigin
  );
  const supabaseAnonKey = readRequiredValue(env, 'VITE_SUPABASE_ANON_KEY');

  return createClient(supabaseUrl, supabaseAnonKey);
}

export function getSupabaseClient(): SupabaseClient {
  const runtimeOrigin = typeof window === 'undefined' ? undefined : window.location.origin;
  cachedClient ??= createSupabaseClientFromEnv(import.meta.env, runtimeOrigin);
  return cachedClient;
}
