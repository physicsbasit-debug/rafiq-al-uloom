const LOCAL_DEVELOPMENT_ORIGINS = [
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
] as const;

function isLocalHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase();

  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized.endsWith('.localhost')
  );
}

function normalizeProductionOrigin(value: string): string | null {
  const candidate = value.trim();
  if (!candidate || candidate.includes('*')) return null;

  try {
    const url = new URL(candidate);

    if (url.protocol !== 'https:') return null;
    if (url.username || url.password) return null;
    if (url.pathname !== '/' || url.search || url.hash) return null;
    if (isLocalHostname(url.hostname)) return null;

    return url.origin;
  } catch {
    return null;
  }
}

export function resolveAllowedOrigins(
  rawConfiguredOrigins: string | undefined
): ReadonlySet<string> {
  if (!rawConfiguredOrigins?.trim()) {
    return new Set(LOCAL_DEVELOPMENT_ORIGINS);
  }

  const entries = rawConfiguredOrigins
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

  if (entries.length === 0) return new Set();

  const origins = new Set<string>();

  for (const entry of entries) {
    const normalized = normalizeProductionOrigin(entry);
    if (!normalized) return new Set();

    origins.add(normalized);
  }

  return origins;
}
