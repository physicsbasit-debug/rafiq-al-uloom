import {
  CLIENT_ASYNC_TIMEOUT_MS,
  isClientAsyncAbortError,
  runWithClientDeadline,
} from '@services/runtime/client-async-boundary';
import { validateAiGenerationRequest } from './ai-authoring.contract';
import type { AiAuthoringProvider } from './ai-authoring.provider';
import { validateGatewayAiGenerationResult } from './gateway-ai-authoring.response';
import type {
  AiGenerationOptions,
  AiGenerationRequest,
  AiGenerationResult,
} from './ai-authoring.types';

export interface GatewayAiAuthoringProviderDependencies {
  readonly gatewayUrl: string;
  readonly publicApiKey: string;
  readonly getAccessToken: () => Promise<string | null>;
  readonly fetchImpl?: typeof fetch;
  readonly transportTimeoutMs?: number;
  readonly createRequestId?: () => string;
}

function unavailable(target: AiGenerationRequest['target']): AiGenerationResult {
  return { status: 'unavailable', target, reason: 'provider_unavailable' };
}

function aborted(target: AiGenerationRequest['target']): AiGenerationResult {
  return { status: 'aborted', target };
}

const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fallbackRequestId(): string {
  const seed = `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`.padEnd(32, '0');
  const hex = seed
    .slice(0, 32)
    .replace(/[^0-9a-f]/gi, '0')
    .padEnd(32, '0')
    .split('');
  hex[12] = '4';
  hex[16] = '8';
  return `${hex.slice(0, 8).join('')}-${hex.slice(8, 12).join('')}-${hex
    .slice(12, 16)
    .join('')}-${hex.slice(16, 20).join('')}-${hex.slice(20, 32).join('')}`;
}

function defaultCreateRequestId(): string {
  try {
    const generated = globalThis.crypto?.randomUUID?.() ?? '';
    return REQUEST_ID_PATTERN.test(generated) ? generated.toLowerCase() : fallbackRequestId();
  } catch {
    return fallbackRequestId();
  }
}

function safeRequestId(createRequestId: () => string): string {
  try {
    const value = createRequestId().trim();
    return REQUEST_ID_PATTERN.test(value) ? value.toLowerCase() : fallbackRequestId();
  } catch {
    return fallbackRequestId();
  }
}

export class GatewayAiAuthoringProvider implements AiAuthoringProvider {
  readonly #gatewayUrl: string;
  readonly #publicApiKey: string;
  readonly #getAccessToken: () => Promise<string | null>;
  readonly #fetchImpl?: typeof fetch;
  readonly #transportTimeoutMs: number;
  readonly #createRequestId: () => string;

  constructor(dependencies: GatewayAiAuthoringProviderDependencies) {
    this.#gatewayUrl = dependencies.gatewayUrl.trim();
    this.#publicApiKey = dependencies.publicApiKey.trim();
    this.#getAccessToken = dependencies.getAccessToken;
    this.#fetchImpl = dependencies.fetchImpl;
    this.#transportTimeoutMs =
      dependencies.transportTimeoutMs ?? CLIENT_ASYNC_TIMEOUT_MS.aiGatewayTransport;
    this.#createRequestId = dependencies.createRequestId ?? defaultCreateRequestId;
  }

  async generate(
    request: AiGenerationRequest,
    options: AiGenerationOptions = {}
  ): Promise<AiGenerationResult> {
    if (options.signal?.aborted) {
      return aborted(request.target);
    }

    const validation = validateAiGenerationRequest(request);
    if (!validation.valid) {
      return {
        status: 'rejected',
        target: request.target,
        reason: 'invalid_request',
        requestReason: validation.reason,
      };
    }

    if (!this.#gatewayUrl || !this.#publicApiKey) {
      return unavailable(request.target);
    }

    let accessToken: string | null;
    try {
      accessToken = await this.#getAccessToken();
    } catch {
      return options.signal?.aborted ? aborted(request.target) : unavailable(request.target);
    }

    if (options.signal?.aborted) {
      return aborted(request.target);
    }

    const normalizedAccessToken = accessToken?.trim() ?? '';
    if (!normalizedAccessToken) {
      return unavailable(request.target);
    }

    const fetchImpl = this.#fetchImpl ?? globalThis.fetch;
    if (typeof fetchImpl !== 'function') {
      return unavailable(request.target);
    }

    const requestId = safeRequestId(this.#createRequestId);

    let response: Response;
    try {
      response = await runWithClientDeadline(
        (signal) =>
          fetchImpl(this.#gatewayUrl, {
            method: 'POST',
            headers: {
              authorization: `Bearer ${normalizedAccessToken}`,
              apikey: this.#publicApiKey,
              'content-type': 'application/json',
              'x-rafiq-request-id': requestId,
            },
            body: JSON.stringify(request),
            signal,
            cache: 'no-store',
            credentials: 'omit',
            redirect: 'error',
          }),
        {
          signal: options.signal,
          timeoutMs: this.#transportTimeoutMs,
        }
      );
    } catch (error) {
      if (isClientAsyncAbortError(error) && error.source === 'caller') {
        return aborted(request.target);
      }

      return unavailable(request.target);
    }

    if (options.signal?.aborted) {
      return aborted(request.target);
    }

    if (response.status !== 200) {
      return unavailable(request.target);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      return options.signal?.aborted ? aborted(request.target) : unavailable(request.target);
    }

    if (options.signal?.aborted) {
      return aborted(request.target);
    }

    const resultValidation = validateGatewayAiGenerationResult(request, body);
    return resultValidation.valid ? resultValidation.result : unavailable(request.target);
  }
}
