import type { ContentRepository } from './content.repository';
import { asyncLocalContentRepository } from './async-local-content.repository';
import { supabaseContentRepository } from './supabase-content.repository';

export type ContentProvider = 'local' | 'supabase';

export interface ContentProviderEnvironment {
  readonly VITE_CONTENT_PROVIDER?: string;
}

let cachedRepository: ContentRepository | undefined;

export function readContentProvider(env: ContentProviderEnvironment): ContentProvider {
  const value = env.VITE_CONTENT_PROVIDER?.trim();

  if (!value) {
    return 'local';
  }

  if (value === 'local' || value === 'supabase') {
    return value;
  }

  throw new Error(
    `Unsupported VITE_CONTENT_PROVIDER: "${value}". Expected "local" or "supabase".`
  );
}

export function createContentRepositoryFromEnv(
  env: ContentProviderEnvironment
): ContentRepository {
  return readContentProvider(env) === 'supabase'
    ? supabaseContentRepository
    : asyncLocalContentRepository;
}

export function getContentRepository(): ContentRepository {
  cachedRepository ??= createContentRepositoryFromEnv(import.meta.env);
  return cachedRepository;
}
