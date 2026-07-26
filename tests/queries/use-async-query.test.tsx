// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAsyncQuery } from '@services/queries/use-async-query';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

interface HookProps<T> {
  queryKey: string;
  initialData: T;
  queryFn: (signal: AbortSignal) => Promise<T>;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve'];
  let reject!: Deferred<T>['reject'];

  const promise = new Promise<T>((internalResolve, internalReject) => {
    resolve = internalResolve;
    reject = internalReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

function renderAsyncQuery<T>(props: HookProps<T>) {
  return renderHook(
    (currentProps: HookProps<T>) =>
      useAsyncQuery({
        queryKey: currentProps.queryKey,
        initialData: currentProps.initialData,
        queryFn: currentProps.queryFn,
      }),
    {
      initialProps: props,
    }
  );
}

const unhandledRejections: unknown[] = [];
const consoleErrors: unknown[][] = [];
const consoleWarnings: unknown[][] = [];

function handleUnhandledRejection(reason: unknown) {
  unhandledRejections.push(reason);
}

let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  process.on('unhandledRejection', handleUnhandledRejection);

  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    consoleErrors.push(args);
  });

  consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
    consoleWarnings.push(args);
  });
});

afterEach(() => {
  process.removeListener('unhandledRejection', handleUnhandledRejection);
  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();

  expect(unhandledRejections).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(consoleWarnings).toEqual([]);

  unhandledRejections.length = 0;
  consoleErrors.length = 0;
  consoleWarnings.length = 0;
});

describe('useAsyncQuery', () => {
  it('يبدأ بحالة تحميل', () => {
    const deferred = createDeferred<string>();

    const { result } = renderAsyncQuery({
      queryKey: 'lesson:1',
      initialData: '',
      queryFn: () => deferred.promise,
    });

    expect(result.current.data).toBe('');
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBe(null);
  });

  it('يحدّث البيانات عند النجاح', async () => {
    const deferred = createDeferred<string>();

    const { result } = renderAsyncQuery({
      queryKey: 'lesson:1',
      initialData: '',
      queryFn: () => deferred.promise,
    });

    await act(async () => {
      deferred.resolve('lesson one');
      await deferred.promise;
    });

    await waitFor(() => {
      expect(result.current.data).toBe('lesson one');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  it('يطبع الخطأ في عقد موحّد عند الفشل', async () => {
    const deferred = createDeferred<string>();
    const failure = new Error('network failed');

    const { result } = renderAsyncQuery({
      queryKey: 'lesson:1',
      initialData: '',
      queryFn: () => deferred.promise,
    });

    await act(async () => {
      deferred.reject(failure);
      await expect(deferred.promise).rejects.toBe(failure);
    });

    await waitFor(() => {
      expect(result.current.data).toBe('');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toEqual({
        message: 'network failed',
        cause: failure,
      });
    });
  });

  it('يعامل البيانات الفارغة كنجاح طبيعي', async () => {
    const deferred = createDeferred<string[]>();

    const { result } = renderAsyncQuery({
      queryKey: 'lessons:empty',
      initialData: [],
      queryFn: () => deferred.promise,
    });

    await act(async () => {
      deferred.resolve([]);
      await deferred.promise;
    });

    await waitFor(() => {
      expect(result.current.data).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  it('يبدأ reload طلبًا جديدًا ويمنح الطلب الجديد سلطة التحديث', async () => {
    const first = createDeferred<string>();
    const second = createDeferred<string>();
    const requests = [first, second];
    const queryFn = vi.fn(() => {
      const request = requests.shift();

      if (!request) {
        throw new Error('Unexpected request.');
      }

      return request.promise;
    });

    const { result } = renderAsyncQuery({
      queryKey: 'lesson:1',
      initialData: '',
      queryFn,
    });

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(queryFn).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      second.resolve('new data');
      await second.promise;
    });

    await waitFor(() => {
      expect(result.current.data).toBe('new data');
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      first.resolve('stale data');
      await first.promise;
    });

    expect(result.current.data).toBe('new data');
    expect(result.current.error).toBe(null);
  });

  it('لا يسمح لنجاح A القديم باستبدال نجاح B', async () => {
    const requestA = createDeferred<string>();
    const requestB = createDeferred<string>();

    const { result, rerender } = renderAsyncQuery<string>({
      queryKey: 'lesson:A',
      initialData: '',
      queryFn: () => requestA.promise,
    });

    rerender({
      queryKey: 'lesson:B',
      initialData: '',
      queryFn: () => requestB.promise,
    });

    await act(async () => {
      requestB.resolve('B');
      await requestB.promise;
    });

    await waitFor(() => {
      expect(result.current.data).toBe('B');
    });

    await act(async () => {
      requestA.resolve('A');
      await requestA.promise;
    });

    expect(result.current.data).toBe('B');
    expect(result.current.error).toBe(null);
  });

  it('يتجاهل فشل A القديم بعد نجاح B', async () => {
    const requestA = createDeferred<string>();
    const requestB = createDeferred<string>();

    const { result, rerender } = renderAsyncQuery<string>({
      queryKey: 'lesson:A',
      initialData: '',
      queryFn: () => requestA.promise,
    });

    rerender({
      queryKey: 'lesson:B',
      initialData: '',
      queryFn: () => requestB.promise,
    });

    await act(async () => {
      requestB.resolve('B');
      await requestB.promise;
    });

    await waitFor(() => {
      expect(result.current.data).toBe('B');
    });

    await act(async () => {
      requestA.reject(new Error('stale A error'));
      await expect(requestA.promise).rejects.toThrow('stale A error');
    });

    expect(result.current.data).toBe('B');
    expect(result.current.error).toBe(null);
  });

  it('يتجاهل نجاح A القديم بعد فشل B', async () => {
    const requestA = createDeferred<string>();
    const requestB = createDeferred<string>();
    const latestError = new Error('B failed');

    const { result, rerender } = renderAsyncQuery<string>({
      queryKey: 'lesson:A',
      initialData: '',
      queryFn: () => requestA.promise,
    });

    rerender({
      queryKey: 'lesson:B',
      initialData: '',
      queryFn: () => requestB.promise,
    });

    await act(async () => {
      requestB.reject(latestError);
      await expect(requestB.promise).rejects.toBe(latestError);
    });

    await waitFor(() => {
      expect(result.current.error?.message).toBe('B failed');
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      requestA.resolve('stale A data');
      await requestA.promise;
    });

    expect(result.current.data).toBe('');
    expect(result.current.error?.message).toBe('B failed');
  });

  it('يسمح للطلب C فقط بحسم نتيجة A ثم B ثم C', async () => {
    const requestA = createDeferred<string>();
    const requestB = createDeferred<string>();
    const requestC = createDeferred<string>();

    const { result, rerender } = renderAsyncQuery<string>({
      queryKey: 'lesson:A',
      initialData: '',
      queryFn: () => requestA.promise,
    });

    rerender({
      queryKey: 'lesson:B',
      initialData: '',
      queryFn: () => requestB.promise,
    });

    rerender({
      queryKey: 'lesson:C',
      initialData: '',
      queryFn: () => requestC.promise,
    });

    await act(async () => {
      requestC.resolve('C');
      await requestC.promise;
    });

    await waitFor(() => {
      expect(result.current.data).toBe('C');
      expect(result.current.error).toBe(null);
    });

    await act(async () => {
      requestB.reject(new Error('stale B error'));
      await expect(requestB.promise).rejects.toThrow('stale B error');

      requestA.resolve('stale A data');
      await requestA.promise;
    });

    expect(result.current.data).toBe('C');
    expect(result.current.error).toBe(null);
  });

  it('يمنع النتيجة القديمة حتى إن تجاهل المزوّد AbortSignal', async () => {
    const requestA = createDeferred<string>();
    const requestB = createDeferred<string>();

    const { result, rerender } = renderAsyncQuery<string>({
      queryKey: 'lesson:A',
      initialData: '',
      queryFn: () => requestA.promise,
    });

    rerender({
      queryKey: 'lesson:B',
      initialData: '',
      queryFn: () => requestB.promise,
    });

    await act(async () => {
      requestB.resolve('B');
      await requestB.promise;
    });

    await waitFor(() => {
      expect(result.current.data).toBe('B');
    });

    await act(async () => {
      requestA.resolve('A ignored abort');
      await requestA.promise;
    });

    expect(result.current.data).toBe('B');
  });

  it('يمنع تحديث الحالة بعد unmount', async () => {
    const deferred = createDeferred<string>();

    const { unmount } = renderAsyncQuery<string>({
      queryKey: 'lesson:1',
      initialData: '',
      queryFn: () => deferred.promise,
    });

    unmount();

    deferred.resolve('late value');
    await deferred.promise;
    await Promise.resolve();

    expect(unhandledRejections).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(consoleWarnings).toEqual([]);
  });

  it('يتجاهل الرفض المتأخر بعد unmount بلا رفض غير معالج', async () => {
    const deferred = createDeferred<string>();

    const { unmount } = renderAsyncQuery<string>({
      queryKey: 'lesson:1',
      initialData: '',
      queryFn: () => deferred.promise,
    });

    unmount();

    deferred.reject(new Error('late failure after unmount'));
    await expect(deferred.promise).rejects.toThrow('late failure after unmount');
    await Promise.resolve();

    expect(unhandledRejections).toEqual([]);
    expect(consoleErrors).toEqual([]);
    expect(consoleWarnings).toEqual([]);
  });

  it('يعيد reload بمرجع ثابت عبر إعادة التصيير', () => {
    const deferred = createDeferred<string>();
    const queryFn = () => deferred.promise;

    const { result, rerender } = renderAsyncQuery<string>({
      queryKey: 'lesson:1',
      initialData: '',
      queryFn,
    });

    const firstReload = result.current.reload;

    rerender({
      queryKey: 'lesson:1',
      initialData: '',
      queryFn,
    });

    expect(result.current.reload).toBe(firstReload);
  });
});
