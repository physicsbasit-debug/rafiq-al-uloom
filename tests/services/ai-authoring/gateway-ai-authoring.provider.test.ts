import { describe, expect, it, vi } from 'vitest';

import { GatewayAiAuthoringProvider } from '@services/ai-authoring/gateway-ai-authoring.provider';
import { validateGatewayAiGenerationResult } from '@services/ai-authoring/gateway-ai-authoring.response';
import type { AiGenerationRequest } from '@services/ai-authoring/ai-authoring.types';

const request: AiGenerationRequest = {
  target: 'objective',
  context: {
    language: 'ar',
    gradeLabel: 'الصف العاشر',
    subjectLabel: 'الفيزياء',
    unitTitle: 'الموجات',
    lessonTitle: 'الانعكاس',
  },
};

const validSuccess = {
  status: 'success',
  target: 'objective',
  suggestion: { kind: 'objective', text: 'أن يفسر المتعلم انعكاس الموجات.' },
  meta: {
    generationId: 'generation-1',
    providerFamily: 'google_gemini',
    modelLabel: 'gemini-3.5-flash',
    generatedAt: '2026-08-26T12:00:00.000Z',
    target: 'objective',
  },
} as const;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function provider(
  overrides: {
    getAccessToken?: () => Promise<string | null>;
    fetchImpl?: typeof fetch;
    gatewayUrl?: string;
    publicApiKey?: string;
  } = {}
) {
  return new GatewayAiAuthoringProvider({
    gatewayUrl: overrides.gatewayUrl ?? 'http://127.0.0.1:54321/functions/v1/ai-authoring-gateway',
    publicApiKey: overrides.publicApiKey ?? 'public-anon-key',
    getAccessToken: overrides.getAccessToken ?? (async () => 'access-token'),
    fetchImpl:
      overrides.fetchImpl ?? (vi.fn(async () => jsonResponse(200, validSuccess)) as typeof fetch),
  });
}

describe('GatewayAiAuthoringProvider', () => {
  it('يعيد aborted فورًا للإشارة الملغاة مسبقًا دون توكن أو شبكة', async () => {
    const getAccessToken = vi.fn(async () => 'access-token');
    const fetchImpl = vi.fn(async () => jsonResponse(200, validSuccess));
    const controller = new AbortController();
    controller.abort();

    const result = await provider({
      getAccessToken,
      fetchImpl: fetchImpl as typeof fetch,
    }).generate(request, { signal: controller.signal });

    expect(result).toEqual({ status: 'aborted', target: 'objective' });
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('يرفض الطلب غير الصالح محليًا دون توكن أو شبكة', async () => {
    const getAccessToken = vi.fn(async () => 'access-token');
    const fetchImpl = vi.fn(async () => jsonResponse(200, validSuccess));
    const invalidRequest = {
      ...request,
      extra: 'forbidden',
    } as unknown as AiGenerationRequest;

    const result = await provider({
      getAccessToken,
      fetchImpl: fetchImpl as typeof fetch,
    }).generate(invalidRequest);

    expect(result.status).toBe('rejected');
    expect(getAccessToken).not.toHaveBeenCalled();
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('يطلب التوكن مرة واحدة فقط لكل generate صالح', async () => {
    const getAccessToken = vi.fn(async () => 'access-token');
    await provider({ getAccessToken }).generate(request);
    expect(getAccessToken).toHaveBeenCalledTimes(1);
  });

  it('يطوي غياب التوكن إلى unavailable دون fetch', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, validSuccess));
    const result = await provider({
      getAccessToken: async () => null,
      fetchImpl: fetchImpl as typeof fetch,
    }).generate(request);

    expect(result).toEqual({
      status: 'unavailable',
      target: 'objective',
      reason: 'provider_unavailable',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('يطوي فشل قراءة التوكن إلى unavailable', async () => {
    const result = await provider({
      getAccessToken: async () => {
        throw new Error('session unavailable');
      },
    }).generate(request);

    expect(result.status).toBe('unavailable');
  });

  it('يفشل مغلقًا عند غياب إعداد Gateway العام', async () => {
    const getAccessToken = vi.fn(async () => 'access-token');
    const result = await provider({ gatewayUrl: '', getAccessToken }).generate(request);
    expect(result.status).toBe('unavailable');
    expect(getAccessToken).not.toHaveBeenCalled();
  });

  it('يعيد فحص الإلغاء بعد قراءة التوكن وقبل نقطة fetch', async () => {
    let resolveToken!: (value: string) => void;
    const token = new Promise<string>((resolve) => {
      resolveToken = resolve;
    });
    const fetchImpl = vi.fn(async () => jsonResponse(200, validSuccess));
    const controller = new AbortController();

    const pending = provider({
      getAccessToken: () => token,
      fetchImpl: fetchImpl as typeof fetch,
    }).generate(request, { signal: controller.signal });

    controller.abort();
    resolveToken('access-token');

    expect(await pending).toEqual({ status: 'aborted', target: 'objective' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('ينفذ طلب Gateway واحدًا فقط ويرسل request نفسها بلا حقول إضافية', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, validSuccess));
    const result = await provider({ fetchImpl: fetchImpl as typeof fetch }).generate(request);

    expect(result.status).toBe('success');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://127.0.0.1:54321/functions/v1/ai-authoring-gateway');
    expect(JSON.parse(String(init.body))).toEqual(request);
    expect(Object.keys(JSON.parse(String(init.body)) as object).sort()).toEqual([
      'context',
      'target',
    ]);
  });

  it('يرسل Authorization وapikey وJSON فقط كعقد نقل مطلوب', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, validSuccess));
    await provider({ fetchImpl: fetchImpl as typeof fetch }).generate(request);

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      authorization: 'Bearer access-token',
      apikey: 'public-anon-key',
      'content-type': 'application/json',
    });
    expect(init.credentials).toBe('omit');
    expect(init.cache).toBe('no-store');
    expect(init.redirect).toBe('error');
  });

  it('يمرر AbortSignal نفسها حرفيًا إلى fetch', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, validSuccess));
    const controller = new AbortController();
    await provider({ fetchImpl: fetchImpl as typeof fetch }).generate(request, {
      signal: controller.signal,
    });

    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(init.signal).toBe(controller.signal);
  });

  it('يطوي فشل الشبكة إلى unavailable', async () => {
    const result = await provider({
      fetchImpl: vi.fn(async () => {
        throw new TypeError('network failed');
      }) as typeof fetch,
    }).generate(request);

    expect(result.status).toBe('unavailable');
  });

  it('يطوي إلغاء caller أثناء fetch إلى aborted', async () => {
    const controller = new AbortController();
    let markFetchStarted!: () => void;
    const fetchStarted = new Promise<void>((resolve) => {
      markFetchStarted = resolve;
    });
    const fetchImpl = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          markFetchStarted();
          init?.signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true }
          );
        })
    );

    const pending = provider({ fetchImpl: fetchImpl as typeof fetch }).generate(request, {
      signal: controller.signal,
    });

    // Synchronize on the transport boundary so this test really cancels during fetch,
    // rather than racing the earlier await getAccessToken() step.
    await fetchStarted;
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    controller.abort();

    expect(await pending).toEqual({ status: 'aborted', target: 'objective' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it.each([400, 401, 403, 413, 415, 429, 502, 503, 504, 599])(
    'يطوي HTTP %s إلى unavailable',
    async (status) => {
      const fetchImpl = vi.fn(async () => jsonResponse(status, { error: 'server_error' }));
      const result = await provider({ fetchImpl: fetchImpl as typeof fetch }).generate(request);
      expect(result).toEqual({
        status: 'unavailable',
        target: 'objective',
        reason: 'provider_unavailable',
      });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
    }
  );

  it.each([401, 429])('لا يعيد التوكن أو fetch تلقائيًا بعد HTTP %s', async (status) => {
    const getAccessToken = vi.fn(async () => 'access-token');
    const fetchImpl = vi.fn(async () => jsonResponse(status, { error: 'server_error' }));

    await provider({ getAccessToken, fetchImpl: fetchImpl as typeof fetch }).generate(request);

    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('يعيد success صالحًا من HTTP 200', async () => {
    const result = await provider().generate(request);
    expect(result).toEqual(validSuccess);
  });

  it('يحافظ على invalid_output الصالح كحالة دومين لا كفشل نقل', async () => {
    const body = { status: 'invalid_output', target: 'objective', reason: 'invalid_text' } as const;
    const result = await provider({
      fetchImpl: vi.fn(async () => jsonResponse(200, body)) as typeof fetch,
    }).generate(request);
    expect(result).toEqual(body);
  });

  it('يحافظ على aborted الصالح من HTTP 200', async () => {
    const body = { status: 'aborted', target: 'objective' } as const;
    const result = await provider({
      fetchImpl: vi.fn(async () => jsonResponse(200, body)) as typeof fetch,
    }).generate(request);
    expect(result).toEqual(body);
  });

  it('يطوي JSON المشوه إلى unavailable', async () => {
    const fetchImpl = vi.fn(
      async () =>
        new Response('{not-json', { status: 200, headers: { 'content-type': 'application/json' } })
    );
    const result = await provider({ fetchImpl: fetchImpl as typeof fetch }).generate(request);
    expect(result.status).toBe('unavailable');
  });

  it('يطوي نتيجة HTTP 200 ذات target خاطئ إلى unavailable', async () => {
    const result = await provider({
      fetchImpl: vi.fn(async () =>
        jsonResponse(200, { ...validSuccess, target: 'lesson_summary' })
      ) as typeof fetch,
    }).generate(request);
    expect(result.status).toBe('unavailable');
  });
});

describe('validateGatewayAiGenerationResult', () => {
  it('يقبل الفروع الخمسة المجمدة فقط عند صحة شكلها', () => {
    const validResults = [
      validSuccess,
      { status: 'invalid_output', target: 'objective', reason: 'invalid_text' },
      {
        status: 'rejected',
        target: 'objective',
        reason: 'invalid_request',
        requestReason: 'invalid_context',
      },
      { status: 'unavailable', target: 'objective', reason: 'provider_unavailable' },
      { status: 'aborted', target: 'objective' },
    ] as const;

    for (const result of validResults) {
      expect(validateGatewayAiGenerationResult(request, result).valid).toBe(true);
    }
  });

  it.each([
    ['حالة سادسة', { status: 'rate_limited', target: 'objective' }],
    ['target خاطئ', { ...validSuccess, target: 'lesson_summary' }],
    [
      'meta target خاطئ',
      { ...validSuccess, meta: { ...validSuccess.meta, target: 'lesson_summary' } },
    ],
    [
      'kind خاطئ',
      {
        ...validSuccess,
        suggestion: { kind: 'lesson_summary', text: validSuccess.suggestion.text },
      },
    ],
    ['حقل زائد', { ...validSuccess, extra: true }],
    ['reason غير معروف', { status: 'unavailable', target: 'objective', reason: 'timeout' }],
    ['metadata ناقصة', { ...validSuccess, meta: { generationId: 'x' } }],
  ])('يرفض %s', (_label, value) => {
    expect(validateGatewayAiGenerationResult(request, value).valid).toBe(false);
  });
});
