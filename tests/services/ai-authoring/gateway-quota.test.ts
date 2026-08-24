import { afterEach, describe, expect, it, vi } from 'vitest';

import { consumeAiAuthoringQuota } from '../../../supabase/functions/ai-authoring-gateway/gateway-quota.ts';

function request(): Request {
  return new Request('http://localhost/functions/v1/ai-authoring-gateway', {
    method: 'POST',
    headers: {
      authorization: 'Bearer teacher-token',
      'content-type': 'application/json',
    },
    body: '{}',
  });
}

function stubDenoEnvironment(): void {
  vi.stubGlobal('Deno', {
    env: {
      get: (key: string) => {
        if (key === 'SUPABASE_URL') return 'http://127.0.0.1:54321';
        if (key === 'SUPABASE_ANON_KEY') return 'public-key';
        return undefined;
      },
    },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('Phase 4-3B gateway quota adapter', () => {
  it('يرسل RPC بلا أي معاملات مستخدم أو حدود من العميل', async () => {
    stubDenoEnvironment();

    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      expect(String(input)).toBe('http://127.0.0.1:54321/rest/v1/rpc/consume_ai_authoring_quota');
      expect(init?.method).toBe('POST');
      expect(init?.body).toBe('{}');

      const headers = new Headers(init?.headers);
      expect(headers.get('authorization')).toBe('Bearer teacher-token');
      expect(headers.get('apikey')).toBe('public-key');

      return new Response(
        JSON.stringify([
          {
            allowed: true,
            remaining_burst: 5,
            remaining_daily: 79,
            retry_after_seconds: 0,
            limit_reason: null,
          },
        ]),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    });

    vi.stubGlobal('fetch', fetchMock);

    await expect(consumeAiAuthoringQuota(request())).resolves.toEqual({
      status: 'allowed',
      remainingBurst: 5,
      remainingDaily: 79,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('يفشل مغلقًا عند تعطل اتصال RPC', async () => {
    stubDenoEnvironment();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('network unavailable');
      })
    );

    await expect(consumeAiAuthoringQuota(request())).resolves.toEqual({
      status: 'unavailable',
    });
  });

  it('يميّز رفض الصلاحية الحي عن نفاد الحصة', async () => {
    stubDenoEnvironment();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify([
              {
                allowed: false,
                remaining_burst: null,
                remaining_daily: null,
                retry_after_seconds: null,
                limit_reason: 'unauthorized',
              },
            ]),
            { status: 200, headers: { 'content-type': 'application/json' } }
          )
      )
    );

    await expect(consumeAiAuthoringQuota(request())).resolves.toEqual({
      status: 'forbidden',
    });
  });

  it('يرفض نتيجة RPC مشوهة بدل افتراض السماح', async () => {
    stubDenoEnvironment();
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify([{ allowed: true }]), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          })
      )
    );

    await expect(consumeAiAuthoringQuota(request())).resolves.toEqual({
      status: 'unavailable',
    });
  });
});
