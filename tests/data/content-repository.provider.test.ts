import { afterEach, describe, expect, it, vi } from 'vitest';

import { asyncLocalContentRepository } from '@services/data/async-local-content.repository';
import {
  createContentRepositoryFromEnv,
  readContentProvider,
} from '@services/data/content-repository.provider';
import { supabaseContentRepository } from '@services/data/supabase-content.repository';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('content repository provider', () => {
  it('يعتمد local عند غياب المتغير', () => {
    expect(readContentProvider({})).toBe('local');
    expect(createContentRepositoryFromEnv({})).toBe(asyncLocalContentRepository);
  });

  it('يعامل القيمة الفارغة كغياب ويعيد local', () => {
    expect(createContentRepositoryFromEnv({ VITE_CONTENT_PROVIDER: '   ' })).toBe(
      asyncLocalContentRepository
    );
  });

  it('يعيد local عند اختيار local صراحة', () => {
    expect(createContentRepositoryFromEnv({ VITE_CONTENT_PROVIDER: 'local' })).toBe(
      asyncLocalContentRepository
    );
  });

  it('يعيد Supabase عند اختيار supabase صراحة', () => {
    expect(createContentRepositoryFromEnv({ VITE_CONTENT_PROVIDER: 'supabase' })).toBe(
      supabaseContentRepository
    );
  });

  it('يرفض القيمة غير المعروفة برسالة واضحة', () => {
    expect(() => createContentRepositoryFromEnv({ VITE_CONTENT_PROVIDER: 'cloud' })).toThrow(
      'Unsupported VITE_CONTENT_PROVIDER: "cloud". Expected "local" or "supabase".'
    );
  });

  it('لا يقرأ البيئة ولا يهيئ Supabase عند مجرد استيراد الملف', async () => {
    vi.stubEnv('VITE_CONTENT_PROVIDER', 'supabase');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    await expect(import('@services/data/content-repository.provider')).resolves.toBeDefined();
  });

  it('يرفض القيمة غير المعروفة عند أول استخدام فعلي فقط', async () => {
    vi.stubEnv('VITE_CONTENT_PROVIDER', 'unsupported');

    const provider = await import('@services/data/content-repository.provider');

    expect(() => provider.getContentRepository()).toThrow(
      'Unsupported VITE_CONTENT_PROVIDER: "unsupported". Expected "local" or "supabase".'
    );
  });

  it('يعيد نفس المرجع في الاستدعاءات اللاحقة', async () => {
    vi.stubEnv('VITE_CONTENT_PROVIDER', 'local');

    const provider = await import('@services/data/content-repository.provider');
    const first = provider.getContentRepository();
    const second = provider.getContentRepository();

    expect(first).toBe(asyncLocalContentRepository);
    expect(second).toBe(first);
  });
});
