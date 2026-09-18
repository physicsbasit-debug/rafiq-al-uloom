export type RuntimeDiagnosticKind =
  'react_render_error' | 'window_error' | 'unhandled_rejection' | 'service_error';

export type RuntimeDiagnosticSource = 'react' | 'browser' | 'service';

export type RuntimeServiceName =
  'auth' | 'profile' | 'authorization' | 'authoring' | 'mastery_results';

export type RuntimeErrorType =
  | 'Error'
  | 'TypeError'
  | 'RangeError'
  | 'ReferenceError'
  | 'SyntaxError'
  | 'DOMException'
  | 'UnknownError';

type RuntimeFailureDiagnosticInput = {
  readonly kind: 'react_render_error' | 'window_error' | 'unhandled_rejection';
  readonly source: 'react' | 'browser';
  readonly error: unknown;
};

type RuntimeServiceDiagnosticInput = {
  readonly kind: 'service_error';
  readonly source: 'service';
  readonly service: RuntimeServiceName;
  readonly operation: string;
  readonly reason: string;
};

export type RuntimeDiagnosticInput = RuntimeFailureDiagnosticInput | RuntimeServiceDiagnosticInput;

interface RuntimeDiagnosticEventBase {
  readonly referenceId: string;
  readonly occurredAt: string;
}

export type RuntimeDiagnosticEvent = RuntimeDiagnosticEventBase &
  (
    | {
        readonly kind: 'react_render_error' | 'window_error' | 'unhandled_rejection';
        readonly source: 'react' | 'browser';
        readonly errorType: RuntimeErrorType;
      }
    | {
        readonly kind: 'service_error';
        readonly source: 'service';
        readonly service: RuntimeServiceName;
        readonly operation: string;
        readonly reason: string;
      }
  );

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
    const baseEvent: RuntimeDiagnosticEventBase = {
      referenceId: randomUUID(),
      occurredAt: nowIso(),
    };

    const event: RuntimeDiagnosticEvent =
      input.kind === 'service_error'
        ? {
            ...baseEvent,
            kind: input.kind,
            source: input.source,
            service: input.service,
            operation: input.operation,
            reason: input.reason,
          }
        : {
            ...baseEvent,
            kind: input.kind,
            source: input.source,
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
