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
}

function unavailable(target: AiGenerationRequest['target']): AiGenerationResult {
  return { status: 'unavailable', target, reason: 'provider_unavailable' };
}

function aborted(target: AiGenerationRequest['target']): AiGenerationResult {
  return { status: 'aborted', target };
}

export class GatewayAiAuthoringProvider implements AiAuthoringProvider {
  readonly #gatewayUrl: string;
  readonly #publicApiKey: string;
  readonly #getAccessToken: () => Promise<string | null>;
  readonly #fetchImpl?: typeof fetch;

  constructor(dependencies: GatewayAiAuthoringProviderDependencies) {
    this.#gatewayUrl = dependencies.gatewayUrl.trim();
    this.#publicApiKey = dependencies.publicApiKey.trim();
    this.#getAccessToken = dependencies.getAccessToken;
    this.#fetchImpl = dependencies.fetchImpl;
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

    let response: Response;
    try {
      response = await fetchImpl(this.#gatewayUrl, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${normalizedAccessToken}`,
          apikey: this.#publicApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: options.signal,
        cache: 'no-store',
        credentials: 'omit',
        redirect: 'error',
      });
    } catch {
      return options.signal?.aborted ? aborted(request.target) : unavailable(request.target);
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
