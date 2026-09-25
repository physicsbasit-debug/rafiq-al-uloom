import {
  validateAiGenerationRequestRuntime,
  type RuntimeAiAuthoringTarget,
  type RuntimeAiGenerationRequest,
  type RuntimeAiGenerationResult,
} from '../../../src/services/ai-authoring/ai-authoring.runtime-contract.ts';

import { authorizeActiveTeacher } from './gateway-auth.ts';
import { consumeAiAuthoringQuota } from './gateway-quota.ts';
import {
  EDGE_REQUEST_ID_HEADER,
  resolveEdgeRequestId,
  writeEdgeDiagnostic,
  type EdgeDiagnosticOutcome,
  type EdgeDiagnosticTarget,
} from './edge-request-observability.ts';
import { resolveAllowedOrigins } from './gateway-origin-policy.ts';
import { generateLiveServerResult } from './live-server-provider.ts';

const MAX_BODY_BYTES = 32 * 1024;
const ALLOWED_ORIGINS = resolveAllowedOrigins(Deno.env.get('AI_GATEWAY_ALLOWED_ORIGINS'));

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

function responseHeaders(request: Request, requestId: string): Headers {
  const headers = new Headers({
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    vary: 'Origin',
    [EDGE_REQUEST_ID_HEADER]: requestId,
  });

  const origin = request.headers.get('origin');
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers.set('access-control-allow-origin', origin);
    headers.set(
      'access-control-allow-headers',
      `authorization, apikey, content-type, ${EDGE_REQUEST_ID_HEADER}`
    );
    headers.set('access-control-expose-headers', EDGE_REQUEST_ID_HEADER);
    headers.set('access-control-allow-methods', 'POST, OPTIONS');
  }

  return headers;
}

function jsonResponse(
  request: Request,
  requestId: string,
  status: number,
  body: unknown
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(request, requestId),
  });
}

function genericError(
  request: Request,
  requestId: string,
  status: number,
  error: string
): Response {
  return jsonResponse(request, requestId, status, { error });
}

function rateLimitedResponse(
  request: Request,
  requestId: string,
  quota: Extract<Awaited<ReturnType<typeof consumeAiAuthoringQuota>>, { status: 'rate_limited' }>
): Response {
  const headers = responseHeaders(request, requestId);
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
  const requestId = resolveEdgeRequestId(request);
  let diagnosticTarget: EdgeDiagnosticTarget = 'unknown';
  const finish = (response: Response, outcome: EdgeDiagnosticOutcome): Response => {
    writeEdgeDiagnostic({
      requestId,
      outcome,
      target: diagnosticTarget,
      statusCode: response.status,
    });
    return response;
  };

  const origin = request.headers.get('origin');
  if (origin && !ALLOWED_ORIGINS.has(origin))
    return finish(
      genericError(request, requestId, 403, 'origin_not_allowed'),
      'origin_not_allowed'
    );
  if (request.method === 'OPTIONS')
    return finish(
      new Response(null, { status: 204, headers: responseHeaders(request, requestId) }),
      'preflight'
    );
  if (request.method !== 'POST')
    return finish(
      genericError(request, requestId, 405, 'method_not_allowed'),
      'method_not_allowed'
    );

  const declaredLength = readDeclaredLength(request);
  if (declaredLength !== null && declaredLength > MAX_BODY_BYTES)
    return finish(genericError(request, requestId, 413, 'request_too_large'), 'request_too_large');
  const contentType = request.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.startsWith('application/json'))
    return finish(
      genericError(request, requestId, 415, 'unsupported_media_type'),
      'unsupported_media_type'
    );

  const boundedBody = await readBoundedBody(request);
  if (boundedBody.status === 'too_large')
    return finish(genericError(request, requestId, 413, 'request_too_large'), 'request_too_large');

  const authorization = await authorizeActiveTeacher(request);
  if (authorization.status === 'unauthenticated')
    return finish(genericError(request, requestId, 401, 'unauthenticated'), 'unauthenticated');
  if (authorization.status === 'forbidden')
    return finish(genericError(request, requestId, 403, 'forbidden'), 'forbidden');
  if (authorization.status === 'unavailable')
    return finish(
      genericError(request, requestId, 503, 'authorization_unavailable'),
      'authorization_unavailable'
    );

  const parsed = parseJsonBody(boundedBody.bytes);
  if (!parsed.valid)
    return finish(genericError(request, requestId, 400, 'invalid_json'), 'invalid_json');
  const validation = validateAiGenerationRequestRuntime(parsed.body);
  if (!validation.valid) {
    const target =
      isRecord(parsed.body) && isTarget(parsed.body.target) ? parsed.body.target : null;
    if (!target)
      return finish(genericError(request, requestId, 400, 'invalid_request'), 'invalid_request');
    diagnosticTarget = target;
    return finish(
      jsonResponse(request, requestId, 400, rejectedResult(target, validation.reason)),
      'invalid_request'
    );
  }

  const generationRequest = parsed.body as RuntimeAiGenerationRequest;
  diagnosticTarget = generationRequest.target;
  const quota = await consumeAiAuthoringQuota(request);
  if (quota.status === 'forbidden')
    return finish(genericError(request, requestId, 403, 'forbidden'), 'forbidden');
  if (quota.status === 'unavailable')
    return finish(genericError(request, requestId, 503, 'quota_unavailable'), 'quota_unavailable');
  if (quota.status === 'rate_limited')
    return finish(rateLimitedResponse(request, requestId, quota), 'rate_limited');

  const provider = await generateLiveServerResult(generationRequest, { signal: request.signal });
  if (provider.status === 'domain_result') {
    const outcome: EdgeDiagnosticOutcome =
      provider.result.status === 'success' ? 'success' : 'provider_invalid_output';
    return finish(jsonResponse(request, requestId, 200, provider.result), outcome);
  }
  if (provider.status === 'caller_aborted')
    return finish(
      jsonResponse(request, requestId, 200, {
        status: 'aborted',
        target: generationRequest.target,
      }),
      'caller_aborted'
    );
  if (provider.status === 'provider_timeout')
    return finish(genericError(request, requestId, 504, 'provider_timeout'), 'provider_timeout');
  if (provider.status === 'provider_unavailable')
    return finish(
      genericError(request, requestId, 503, 'provider_unavailable'),
      'provider_unavailable'
    );
  if (provider.status === 'provider_rejected')
    return finish(genericError(request, requestId, 502, 'provider_rejected'), 'provider_rejected');
  return finish(
    genericError(request, requestId, 502, 'provider_invalid_response'),
    'provider_invalid_response'
  );
}
