import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  ClientAsyncAbortError,
  runWithClientDeadline,
} from '@services/runtime/client-async-boundary';

afterEach(() => {
  vi.useRealTimers();
});

describe('runWithClientDeadline', () => {
  it('يعيد النتيجة الطبيعية قبل انتهاء المهلة', async () => {
    await expect(
      runWithClientDeadline(
        async (signal) => {
          expect(signal.aborted).toBe(false);
          return 'ok';
        },
        { timeoutMs: 1_000 }
      )
    ).resolves.toBe('ok');
  });

  it('يميّز إلغاء caller ويوقف الإشارة المركبة', async () => {
    const caller = new AbortController();
    let markStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      markStarted = resolve;
    });

    const pending = runWithClientDeadline(
      (signal) =>
        new Promise<string>((_resolve, reject) => {
          markStarted();
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true }
          );
        }),
      { signal: caller.signal, timeoutMs: 1_000 }
    );

    await started;
    const expectation = expect(pending).rejects.toMatchObject({
      name: 'ClientAsyncAbortError',
      source: 'caller',
    });

    caller.abort();
    await expectation;
  });

  it('يحسم timeout حتى لو تجاهلت العملية AbortSignal', async () => {
    vi.useFakeTimers();

    const pending = runWithClientDeadline(() => new Promise<string>(() => undefined), {
      timeoutMs: 25,
    });
    const expectation = expect(pending).rejects.toMatchObject({
      name: 'ClientAsyncAbortError',
      source: 'timeout',
    });

    await vi.advanceTimersByTimeAsync(25);
    await expectation;
  });

  it('يرفض deadline غير الصالح بدل إنشاء مؤقت غير منضبط', async () => {
    await expect(
      runWithClientDeadline(async () => 'never', { timeoutMs: 0 })
    ).rejects.toBeInstanceOf(RangeError);

    await expect(
      runWithClientDeadline(async () => 'never', { timeoutMs: Number.POSITIVE_INFINITY })
    ).rejects.toBeInstanceOf(RangeError);
  });

  it('يصدر خطأ تصنيفيًا لا يحمل بيانات العملية', () => {
    const error = new ClientAsyncAbortError('timeout');

    expect(error.source).toBe('timeout');
    expect(error.message).toBe('Client operation timed out.');
    expect(JSON.stringify(error)).not.toContain('token');
  });
});
