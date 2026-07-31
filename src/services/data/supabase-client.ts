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

function validateSupabaseUrl(value: string): string {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(value);
  } catch (error) {
    throw new Error('Invalid VITE_SUPABASE_URL', { cause: error });
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('Invalid VITE_SUPABASE_URL');
  }

  return value;
}

export function createSupabaseClientFromEnv(env: SupabaseEnvironment): SupabaseClient {
  const supabaseUrl = validateSupabaseUrl(readRequiredValue(env, 'VITE_SUPABASE_URL'));
  const supabaseAnonKey = readRequiredValue(env, 'VITE_SUPABASE_ANON_KEY');

  return createClient(supabaseUrl, supabaseAnonKey);
}

export function getSupabaseClient(): SupabaseClient {
  cachedClient ??= createSupabaseClientFromEnv(import.meta.env);
  return cachedClient;
}
