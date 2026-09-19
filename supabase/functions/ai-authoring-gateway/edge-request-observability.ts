export const EDGE_REQUEST_ID_HEADER = 'x-rafiq-request-id';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SAFE_FALLBACK_REQUEST_ID = '00000000-0000-4000-8000-000000000000';

const TARGETS = new Set([
  'lesson_summary',
  'objective',
  'review_question',
  'mastery_question',
] as const);

const OUTCOMES = new Set([
  'preflight',
  'origin_not_allowed',
  'method_not_allowed',
  'request_too_large',
  'unsupported_media_type',
  'unauthenticated',
  'forbidden',
  'authorization_unavailable',
  'invalid_json',
  'invalid_request',
  'quota_unavailable',
  'rate_limited',
  'success',
  'caller_aborted',
  'provider_timeout',
  'provider_unavailable',
  'provider_rejected',
  'provider_invalid_output',
  'provider_invalid_response',
  'unknown',
] as const);

export type EdgeDiagnosticTarget =
  'lesson_summary' | 'objective' | 'review_question' | 'mastery_question' | 'unknown';

export type EdgeDiagnosticOutcome =
  | 'preflight'
  | 'origin_not_allowed'
  | 'method_not_allowed'
  | 'request_too_large'
  | 'unsupported_media_type'
  | 'unauthenticated'
  | 'forbidden'
  | 'authorization_unavailable'
  | 'invalid_json'
  | 'invalid_request'
  | 'quota_unavailable'
  | 'rate_limited'
  | 'success'
  | 'caller_aborted'
  | 'provider_timeout'
  | 'provider_unavailable'
  | 'provider_rejected'
  | 'provider_invalid_output'
  | 'provider_invalid_response'
  | 'unknown';

export interface EdgeDiagnosticInput {
  readonly requestId: string;
  readonly outcome: EdgeDiagnosticOutcome;
  readonly target: EdgeDiagnosticTarget;
  readonly statusCode: number;
}

export interface EdgeDiagnosticEvent {
  readonly event: 'ai_gateway_request';
  readonly requestId: string;
  readonly outcome: EdgeDiagnosticOutcome;
  readonly target: EdgeDiagnosticTarget;
  readonly statusCode: number;
}

export type EdgeDiagnosticSink = (event: EdgeDiagnosticEvent) => void;

function fallbackRequestId(): string {
  try {
    const seed = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.padEnd(32, '0');
    const hex = seed
      .slice(0, 32)
      .replace(/[^0-9a-f]/gi, '0')
      .padEnd(32, '0')
      .split('');
    hex[12] = '4';
    hex[16] = '8';
    return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex.slice(12, 16).join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20, 32).join('')}`;
  } catch {
    return SAFE_FALLBACK_REQUEST_ID;
  }
}

function safeGeneratedRequestId(createRequestId: () => string): string {
  try {
    const candidate = createRequestId().trim();
    return UUID_PATTERN.test(candidate) ? candidate.toLowerCase() : fallbackRequestId();
  } catch {
    return fallbackRequestId();
  }
}

export function resolveEdgeRequestId(
  request: Pick<Request, 'headers'>,
  createRequestId: () => string = () => crypto.randomUUID()
): string {
  const supplied = request.headers.get(EDGE_REQUEST_ID_HEADER)?.trim() ?? '';
  if (UUID_PATTERN.test(supplied)) return supplied.toLowerCase();
  return safeGeneratedRequestId(createRequestId);
}

function sanitizeRequestId(value: unknown): string {
  if (typeof value !== 'string') return SAFE_FALLBACK_REQUEST_ID;
  const normalized = value.trim().toLowerCase();
  return UUID_PATTERN.test(normalized) ? normalized : SAFE_FALLBACK_REQUEST_ID;
}

function sanitizeTarget(value: unknown): EdgeDiagnosticTarget {
  return typeof value === 'string' && TARGETS.has(value as never)
    ? (value as EdgeDiagnosticTarget)
    : 'unknown';
}

function sanitizeOutcome(value: unknown): EdgeDiagnosticOutcome {
  return typeof value === 'string' && OUTCOMES.has(value as never)
    ? (value as EdgeDiagnosticOutcome)
    : 'unknown';
}

function sanitizeStatusCode(value: unknown): number {
  return Number.isInteger(value) && Number(value) >= 100 && Number(value) <= 599
    ? Number(value)
    : 0;
}

function defaultEdgeDiagnosticSink(event: EdgeDiagnosticEvent): void {
  console.info('[rafiq-edge]', event);
}

export function writeEdgeDiagnostic(
  input: EdgeDiagnosticInput,
  sink: EdgeDiagnosticSink = defaultEdgeDiagnosticSink
): void {
  const event: EdgeDiagnosticEvent = {
    event: 'ai_gateway_request',
    requestId: sanitizeRequestId(input.requestId),
    outcome: sanitizeOutcome(input.outcome),
    target: sanitizeTarget(input.target),
    statusCode: sanitizeStatusCode(input.statusCode),
  };
  try {
    sink(event);
  } catch {
    /* diagnostics never break the request path */
  }
}
