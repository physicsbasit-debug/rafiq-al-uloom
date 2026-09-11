export type RuntimeDiagnosticKind = 'react_render_error' | 'window_error' | 'unhandled_rejection';

export type RuntimeDiagnosticSource = 'react' | 'browser';

export type RuntimeErrorType =
  | 'Error'
  | 'TypeError'
  | 'RangeError'
  | 'ReferenceError'
  | 'SyntaxError'
  | 'DOMException'
  | 'UnknownError';

export interface RuntimeDiagnosticInput {
  readonly kind: RuntimeDiagnosticKind;
  readonly source: RuntimeDiagnosticSource;
  readonly error: unknown;
}

export interface RuntimeDiagnosticEvent {
  readonly referenceId: string;
  readonly kind: RuntimeDiagnosticKind;
  readonly source: RuntimeDiagnosticSource;
  readonly occurredAt: string;
  readonly errorType: RuntimeErrorType;
}

export type RuntimeDiagnosticSink = (event: RuntimeDiagnosticEvent) => void;
export type RuntimeDiagnosticReporter = (input: RuntimeDiagnosticInput) => string;

interface RuntimeDiagnosticDependencies {
  readonly randomUUID?: () => string;
  readonly nowIso?: () => string;
}

function fallbackReferenceId(): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 10);
  return `runtime-${time}-${random}`;
}

function defaultRandomUUID(): string {
  try {
    if (typeof globalThis.crypto?.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // Fall through to a non-secret reference identifier.
  }

  return fallbackReferenceId();
}

function classifyErrorType(error: unknown): RuntimeErrorType {
  if (typeof DOMException !== 'undefined' && error instanceof DOMException) {
    return 'DOMException';
  }
  if (error instanceof TypeError) return 'TypeError';
  if (error instanceof RangeError) return 'RangeError';
  if (error instanceof ReferenceError) return 'ReferenceError';
  if (error instanceof SyntaxError) return 'SyntaxError';
  if (error instanceof Error) return 'Error';
  return 'UnknownError';
}

function defaultRuntimeDiagnosticSink(event: RuntimeDiagnosticEvent): void {
  try {
    console.error('[rafiq-runtime]', event);
  } catch {
    // Diagnostics must never become a second application failure.
  }
}

export function createRuntimeDiagnosticReporter(
  sink: RuntimeDiagnosticSink = defaultRuntimeDiagnosticSink,
  dependencies: RuntimeDiagnosticDependencies = {}
): RuntimeDiagnosticReporter {
  const randomUUID = dependencies.randomUUID ?? defaultRandomUUID;
  const nowIso = dependencies.nowIso ?? (() => new Date().toISOString());

  return (input) => {
    const event: RuntimeDiagnosticEvent = {
      referenceId: randomUUID(),
      kind: input.kind,
      source: input.source,
      occurredAt: nowIso(),
      errorType: classifyErrorType(input.error),
    };

    try {
      sink(event);
    } catch {
      // A telemetry/logging sink is never allowed to break the product path.
    }

    return event.referenceId;
  };
}

export const reportRuntimeDiagnostic = createRuntimeDiagnosticReporter();

type RuntimeWindow = Pick<Window, 'addEventListener' | 'removeEventListener'>;

export function installGlobalRuntimeDiagnostics(
  target: RuntimeWindow = window,
  reporter: RuntimeDiagnosticReporter = reportRuntimeDiagnostic
): () => void {
  const onWindowError = (event: Event) => {
    const errorEvent = event as ErrorEvent;
    reporter({
      kind: 'window_error',
      source: 'browser',
      error: errorEvent.error,
    });
  };

  const onUnhandledRejection = (event: Event) => {
    const rejectionEvent = event as PromiseRejectionEvent;
    reporter({
      kind: 'unhandled_rejection',
      source: 'browser',
      error: rejectionEvent.reason,
    });
  };

  target.addEventListener('error', onWindowError);
  target.addEventListener('unhandledrejection', onUnhandledRejection);

  return () => {
    target.removeEventListener('error', onWindowError);
    target.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
}
