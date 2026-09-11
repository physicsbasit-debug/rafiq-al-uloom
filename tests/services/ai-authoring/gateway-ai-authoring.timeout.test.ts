import { afterEach, describe, expect, it, vi } from 'vitest';

import { GatewayAiAuthoringProvider } from '@services/ai-authoring/gateway-ai-authoring.provider';
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

afterEach(() => {
  vi.useRealTimers();
});

describe('GatewayAiAuthoringProvider browser transport timeout', () => {
  it('يلغي النقل العالق بعد المهلة ويعيد unavailable دون retry', async () => {
    vi.useFakeTimers();
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

    const provider = new GatewayAiAuthoringProvider({
      gatewayUrl: 'http://127.0.0.1:54321/functions/v1/ai-authoring-gateway',
      publicApiKey: 'public-anon-key',
      getAccessToken: async () => 'access-token',
      fetchImpl: fetchImpl as typeof fetch,
      transportTimeoutMs: 25,
    });

    const pending = provider.generate(request);
    await fetchStarted;

    const expectation = expect(pending).resolves.toEqual({
      status: 'unavailable',
      target: 'objective',
      reason: 'provider_unavailable',
    });

    await vi.advanceTimersByTimeAsync(25);
    await expectation;

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(init.signal?.aborted).toBe(true);
  });
});
