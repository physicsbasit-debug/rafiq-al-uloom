type QuotaLimitReason = 'burst' | 'daily' | 'burst_and_daily';

export type GatewayQuotaResult =
  | {
      readonly status: 'allowed';
      readonly remainingBurst: number;
      readonly remainingDaily: number;
    }
  | {
      readonly status: 'rate_limited';
      readonly remainingBurst: number;
      readonly remainingDaily: number;
      readonly retryAfterSeconds: number;
      readonly limitReason: QuotaLimitReason;
    }
  | { readonly status: 'forbidden' }
  | { readonly status: 'unavailable' };

type RpcQuotaRow = {
  readonly allowed: boolean;
  readonly remaining_burst: number | null;
  readonly remaining_daily: number | null;
  readonly retry_after_seconds: number | null;
  readonly limit_reason: QuotaLimitReason | 'unauthorized' | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isNullableNonNegativeInteger(value: unknown): value is number | null {
  return value === null || isNonNegativeInteger(value);
}

function isQuotaLimitReason(value: unknown): value is QuotaLimitReason {
  return value === 'burst' || value === 'daily' || value === 'burst_and_daily';
}

function readBearerToken(request: Request): string | null {
  const authorization = request.headers.get('authorization');
  if (!authorization) return null;

  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  return match?.[1]?.trim() || null;
}

function readGatewayEnvironment(): { readonly url: string; readonly publicKey: string } | null {
  const url = Deno.env.get('SUPABASE_URL')?.replace(/\/$/, '');
  const publicKey =
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? undefined;

  return url && publicKey ? { url, publicKey } : null;
}

function parseQuotaRow(value: unknown): RpcQuotaRow | null {
  if (!isRecord(value)) return null;

  const allowed = value.allowed;
  const remainingBurst = value.remaining_burst;
  const remainingDaily = value.remaining_daily;
  const retryAfterSeconds = value.retry_after_seconds;
  const limitReason = value.limit_reason;

  if (typeof allowed !== 'boolean') return null;
  if (!isNullableNonNegativeInteger(remainingBurst)) return null;
  if (!isNullableNonNegativeInteger(remainingDaily)) return null;
  if (!isNullableNonNegativeInteger(retryAfterSeconds)) return null;
  if (limitReason !== null && limitReason !== 'unauthorized' && !isQuotaLimitReason(limitReason)) {
    return null;
  }

  return {
    allowed,
    remaining_burst: remainingBurst,
    remaining_daily: remainingDaily,
    retry_after_seconds: retryAfterSeconds,
    limit_reason: limitReason,
  };
}

export async function consumeAiAuthoringQuota(request: Request): Promise<GatewayQuotaResult> {
  const token = readBearerToken(request);
  if (!token) return { status: 'forbidden' };

  const environment = readGatewayEnvironment();
  if (!environment) return { status: 'unavailable' };

  let response: Response;
  try {
    response = await fetch(`${environment.url}/rest/v1/rpc/consume_ai_authoring_quota`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        apikey: environment.publicKey,
        'content-type': 'application/json',
      },
      body: '{}',
    });
  } catch {
    return { status: 'unavailable' };
  }

  if (response.status === 401) {
    return { status: 'forbidden' };
  }

  // A 403 here means the already-authorized teacher could not execute the
  // trusted RPC, which is an infrastructure/configuration failure, not quota denial.
  if (!response.ok) {
    return { status: 'unavailable' };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { status: 'unavailable' };
  }

  const rowValue = Array.isArray(body) && body.length === 1 ? body[0] : null;
  const row = parseQuotaRow(rowValue);
  if (!row) return { status: 'unavailable' };

  if (!row.allowed && row.limit_reason === 'unauthorized') {
    return { status: 'forbidden' };
  }

  if (row.allowed) {
    if (
      row.remaining_burst === null ||
      row.remaining_daily === null ||
      row.retry_after_seconds !== 0 ||
      row.limit_reason !== null
    ) {
      return { status: 'unavailable' };
    }

    return {
      status: 'allowed',
      remainingBurst: row.remaining_burst,
      remainingDaily: row.remaining_daily,
    };
  }

  if (
    !isQuotaLimitReason(row.limit_reason) ||
    row.remaining_burst === null ||
    row.remaining_daily === null ||
    row.retry_after_seconds === null ||
    row.retry_after_seconds < 1
  ) {
    return { status: 'unavailable' };
  }

  return {
    status: 'rate_limited',
    remainingBurst: row.remaining_burst,
    remainingDaily: row.remaining_daily,
    retryAfterSeconds: row.retry_after_seconds,
    limitReason: row.limit_reason,
  };
}
