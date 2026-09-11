export const CLIENT_ASYNC_TIMEOUT_MS = {
  contentQuery: 15_000,
  aiGatewayTransport: 30_000,
} as const;

export type ClientAsyncAbortSource = 'caller' | 'timeout';

export class ClientAsyncAbortError extends Error {
  readonly source: ClientAsyncAbortSource;

  constructor(source: ClientAsyncAbortSource) {
    super(source === 'timeout' ? 'Client operation timed out.' : 'Client operation aborted.');
    this.name = 'ClientAsyncAbortError';
    this.source = source;
  }
}

export interface ClientDeadlineOptions {
  readonly timeoutMs: number;
  readonly signal?: AbortSignal;
}

export function isClientAsyncAbortError(error: unknown): error is ClientAsyncAbortError {
  return error instanceof ClientAsyncAbortError;
}

function assertTimeout(timeoutMs: number): void {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new RangeError('Client deadline must be a positive finite number.');
  }
}

export async function runWithClientDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  { timeoutMs, signal: callerSignal }: ClientDeadlineOptions
): Promise<T> {
  assertTimeout(timeoutMs);

  if (callerSignal?.aborted) {
    throw new ClientAsyncAbortError('caller');
  }

  const controller = new AbortController();
  let abortSource: ClientAsyncAbortSource | null = null;
  let rejectBoundary!: (error: ClientAsyncAbortError) => void;

  const boundary = new Promise<never>((_resolve, reject) => {
    rejectBoundary = reject;
  });

  const abort = (source: ClientAsyncAbortSource) => {
    if (abortSource !== null) return;

    abortSource = source;
    const error = new ClientAsyncAbortError(source);

    // Reject the boundary first so its deterministic category wins the race even when
    // the underlying transport rejects synchronously in response to controller.abort().
    rejectBoundary(error);
    controller.abort();
  };

  const onCallerAbort = () => abort('caller');
  callerSignal?.addEventListener('abort', onCallerAbort, { once: true });

  const timeoutId = globalThis.setTimeout(() => abort('timeout'), timeoutMs);
  const operationPromise = Promise.resolve().then(() => operation(controller.signal));

  try {
    return await Promise.race([operationPromise, boundary]);
  } finally {
    globalThis.clearTimeout(timeoutId);
    callerSignal?.removeEventListener('abort', onCallerAbort);
  }
}
