import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const VALID_ENV = {
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('supabase client environment', () => {
  it('لا يرمي خطأ عند استيراد الوحدة دون متغيرات بيئة', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    await expect(import('@services/data/supabase-client')).resolves.toBeDefined();
  });

  it('يرمي رسالة واضحة عند غياب VITE_SUPABASE_URL', async () => {
    const { createSupabaseClientFromEnv } = await import('@services/data/supabase-client');

    expect(() =>
      createSupabaseClientFromEnv({
        VITE_SUPABASE_ANON_KEY: VALID_ENV.VITE_SUPABASE_ANON_KEY,
      })
    ).toThrow('Missing VITE_SUPABASE_URL');
  });

  it('يرمي رسالة واضحة عند غياب VITE_SUPABASE_ANON_KEY', async () => {
    const { createSupabaseClientFromEnv } = await import('@services/data/supabase-client');

    expect(() =>
      createSupabaseClientFromEnv({
        VITE_SUPABASE_URL: VALID_ENV.VITE_SUPABASE_URL,
      })
    ).toThrow('Missing VITE_SUPABASE_ANON_KEY');
  });

  it('ينشئ SupabaseClient عند تمرير قيم صالحة صراحة', async () => {
    const { createSupabaseClientFromEnv } = await import('@services/data/supabase-client');

    const client = createSupabaseClientFromEnv(VALID_ENV);

    expect(client).toBeDefined();
    expect(typeof client.from).toBe('function');
  });

  it('يعيد نفس العميل المخزن مؤقتًا في الاستدعاءات المتكررة', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', VALID_ENV.VITE_SUPABASE_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', VALID_ENV.VITE_SUPABASE_ANON_KEY);

    const { getSupabaseClient } = await import('@services/data/supabase-client');

    expect(getSupabaseClient()).toBe(getSupabaseClient());
  });

  it('يوفر import.meta.env داخل بيئة Vitest', () => {
    expect(import.meta.env).toBeDefined();
  });

  it('لا يقرأ SUPABASE_SERVICE_ROLE_KEY من كود العميل الأمامي', () => {
    const sourcePath = resolve(process.cwd(), 'src/services/data/supabase-client.ts');
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(source).not.toContain('VITE_SUPABASE_SERVICE_ROLE_KEY');
  });
});
