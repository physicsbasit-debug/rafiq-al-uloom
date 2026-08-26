import {
  validateAiGenerationRequestRuntime,
  type RuntimeAiAuthoringTarget,
  type RuntimeAiGenerationRequest,
  type RuntimeAiGenerationResult,
} from '../../../src/services/ai-authoring/ai-authoring.runtime-contract.ts';

import { authorizeActiveTeacher } from './gateway-auth.ts';
import { consumeAiAuthoringQuota } from './gateway-quota.ts';
import { generateLiveServerResult } from './live-server-provider.ts';

const MAX_BODY_BYTES = 32 * 1024;
const ALLOWED_ORIGINS = new Set([
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTarget(value: unknown): value is RuntimeAiAuthoringTarget {
  return (
    value === 'lesson_summary' ||
    value === 'objective' ||
    value === 'review_question' ||
    value === 'mastery_question'
  );
}

function responseHeaders(request: Request): Headers {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    vary: 'Origin',
  });

  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('access-control-allow-origin', origin);
    headers.set('access-control-allow-headers', 'authorization, apikey, content-type');
    headers.set('access-control-allow-methods', 'POST, OPTIONS');
  }

  return headers;
}

function jsonResponse(request: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(request),
  });
}

function genericError(request: Request, status: number, error: string): Response {
  return jsonResponse(request, status, { error });
}

function rateLimitedResponse(
  request: Request,
  quota: Extract<Awaited<ReturnType<typeof consumeAiAuthoringQuota>>, { status: 'rate_limited' }>
): Response {
  const headers = responseHeaders(request);
  headers.set('retry-after', String(quota.retryAfterSeconds));

  return new Response(
    JSON.stringify({
      error: 'rate_limited',
      limitReason: quota.limitReason,
      remainingBurst: quota.remainingBurst,
      remainingDaily: quota.remainingDaily,
      retryAfterSeconds: quota.retryAfterSeconds,
    }),
    {
      status: 429,
      headers,
    }
  );
}

function readDeclaredLength(request: Request): number | null {
  const raw = request.headers.get('content-length');
  if (!raw) return null;

  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

type BoundedBodyResult =
  { readonly status: 'success'; readonly bytes: Uint8Array } | { readonly status: 'too_large' };

async function readBoundedBody(request: Request): Promise<BoundedBodyResult> {
  if (!request.body) {
    return { status: 'success', bytes: new Uint8Array() };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        return { status: 'too_large' };
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return { status: 'success', bytes };
}

function parseJsonBody(
  bytes: Uint8Array
): { readonly valid: true; readonly body: unknown } | { readonly valid: false } {
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return { valid: true, body: JSON.parse(text) as unknown };
  } catch {
    return { valid: false };
  }
}

function rejectedResult(
  target: RuntimeAiAuthoringTarget,
  requestReason: Extract<
    RuntimeAiGenerationResult,
    { readonly status: 'rejected' }
  >['requestReason']
): RuntimeAiGenerationResult {
  return {
    status: 'rejected',
    target,
    reason: 'invalid_request',
    requestReason,
  };
}

export async function handleAiAuthoringGatewayRequest(request: Request): Promise<Response> {
  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return genericError(request, 403, 'origin_not_allowed');
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: responseHeaders(request) });
  }

  if (request.method !== 'POST') {
    return genericError(request, 405, 'method_not_allowed');
  }

  const declaredLength = readDeclaredLength(request);
  if (declaredLength !== null && declaredLength > MAX_BODY_BYTES) {
    return genericError(request, 413, 'request_too_large');
  }

  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json')) {
    return genericError(request, 415, 'unsupported_media_type');
  }

  // Enforce the real byte ceiling before any Auth/Profile/provider work. Platform
  // verify_jwt still occurs before the function is entered in the normal deployed path.
  const boundedBody = await readBoundedBody(request);
  if (boundedBody.status === 'too_large') {
    return genericError(request, 413, 'request_too_large');
  }

  const authorization = await authorizeActiveTeacher(request);
  if (authorization.status === 'unauthenticated') {
    return genericError(request, 401, 'unauthenticated');
  }
  if (authorization.status === 'forbidden') {
    return genericError(request, 403, 'forbidden');
  }
  if (authorization.status === 'unavailable') {
    return genericError(request, 503, 'authorization_unavailable');
  }

  const parsed = parseJsonBody(boundedBody.bytes);
  if (!parsed.valid) {
    return genericError(request, 400, 'invalid_json');
  }

  const validation = validateAiGenerationRequestRuntime(parsed.body);
  if (!validation.valid) {
    const target =
      isRecord(parsed.body) && isTarget(parsed.body.target) ? parsed.body.target : null;

    if (!target) {
      return genericError(request, 400, 'invalid_request');
    }

    return jsonResponse(request, 400, rejectedResult(target, validation.reason));
  }

  const generationRequest = parsed.body as RuntimeAiGenerationRequest;

  // Phase 4-3B invariant: reserve quota only after strict validation and immediately
  // before provider invocation. A committed reservation is never refunded.
  const quota = await consumeAiAuthoringQuota(request);
  if (quota.status === 'forbidden') {
    return genericError(request, 403, 'forbidden');
  }
  if (quota.status === 'unavailable') {
    return genericError(request, 503, 'quota_unavailable');
  }
  if (quota.status === 'rate_limited') {
    return rateLimitedResponse(request, quota);
  }

  const provider = await generateLiveServerResult(generationRequest, { signal: request.signal });

  if (provider.status === 'domain_result') {
    return jsonResponse(request, 200, provider.result);
  }
  if (provider.status === 'caller_aborted') {
    return jsonResponse(request, 200, { status: 'aborted', target: generationRequest.target });
  }
  if (provider.status === 'provider_timeout') {
    return genericError(request, 504, 'provider_timeout');
  }
  if (provider.status === 'provider_unavailable') {
    return genericError(request, 503, 'provider_unavailable');
  }
  if (provider.status === 'provider_rejected') {
    return genericError(request, 502, 'provider_rejected');
  }

  return genericError(request, 502, 'provider_invalid_response');
}
