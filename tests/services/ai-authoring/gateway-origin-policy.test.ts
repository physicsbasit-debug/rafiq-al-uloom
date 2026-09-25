import { describe, expect, it } from 'vitest';

import { resolveAllowedOrigins } from '../../../supabase/functions/ai-authoring-gateway/gateway-origin-policy.ts';

describe('Phase 6-4E production AI gateway origin policy', () => {
  it('keeps the local development origins only when production configuration is absent', () => {
    expect([...resolveAllowedOrigins(undefined)].sort()).toEqual(
      [
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
        'http://localhost:3000',
        'http://localhost:5173',
      ].sort()
    );
  });

  it('replaces local origins with exact HTTPS production origins when configured', () => {
    const origins = resolveAllowedOrigins('https://rafiq.example.com, https://school.example.org/');

    expect([...origins].sort()).toEqual(
      ['https://rafiq.example.com', 'https://school.example.org'].sort()
    );
    expect(origins.has('http://localhost:5173')).toBe(false);
  });

  it.each([
    'http://rafiq.example.com',
    'https://localhost',
    'https://127.0.0.1',
    'https://*.example.com',
    'https://user:pass@example.com',
    'https://example.com/path',
    'https://example.com?query=1',
    'not-a-url',
  ])('fails closed when a configured production origin is unsafe: %s', (value) => {
    expect(resolveAllowedOrigins(value).size).toBe(0);
  });

  it('fails the entire configured allow-list closed when any entry is invalid', () => {
    expect(resolveAllowedOrigins('https://rafiq.example.com,http://unsafe.example.com').size).toBe(
      0
    );
  });
});
