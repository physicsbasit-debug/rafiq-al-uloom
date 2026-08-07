import type {
  AuthoringRejectedResult,
  AuthoringRejectionReason,
  AuthoringUnavailableReason,
  AuthoringUnavailableResult,
} from './authoring.types';

interface ErrorShape {
  readonly code?: unknown;
  readonly message?: unknown;
  readonly status?: unknown;
}

function readShape(error: unknown): ErrorShape {
  return typeof error === 'object' && error !== null ? error : {};
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeStatus(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}

export function toAuthoringUnavailableReason(error: unknown): AuthoringUnavailableReason {
  const shape = readShape(error);
  const code = normalizeText(shape.code);
  const message = normalizeText(shape.message);
  const status = normalizeStatus(shape.status);

  if (
    error instanceof TypeError ||
    code === 'network_error' ||
    message.includes('fetch') ||
    message.includes('network')
  ) {
    return 'network_error';
  }

  if (
    code === 'service_unavailable' ||
    code === 'pgrst002' ||
    (status !== undefined && status >= 500)
  ) {
    return 'service_unavailable';
  }

  return 'unknown';
}

export function authoringUnavailableResult(error: unknown): AuthoringUnavailableResult {
  return {
    status: 'unavailable',
    reason: toAuthoringUnavailableReason(error),
  };
}

export function authoringRejected(reason: AuthoringRejectionReason): AuthoringRejectedResult {
  return {
    status: 'rejected',
    reason,
  };
}

export function createAuthoringDiagnosticError(
  operation: string,
  publicReason: AuthoringUnavailableReason,
  cause: unknown
): Error {
  return new Error(`${operation}: ${publicReason}`, { cause });
}
