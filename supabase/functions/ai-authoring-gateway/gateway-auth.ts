type GatewayAuthorizationResult =
  | { readonly status: 'authorized'; readonly userId: string }
  | { readonly status: 'unauthenticated' }
  | { readonly status: 'forbidden' }
  | { readonly status: 'unavailable' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

async function readAuthenticatedUserId(
  url: string,
  publicKey: string,
  token: string
): Promise<{ readonly status: 'success'; readonly userId: string } | GatewayAuthorizationResult> {
  let response: Response;

  try {
    response = await fetch(`${url}/auth/v1/user`, {
      headers: {
        authorization: `Bearer ${token}`,
        apikey: publicKey,
      },
    });
  } catch {
    return { status: 'unavailable' };
  }

  if (response.status === 401 || response.status === 403) {
    return { status: 'unauthenticated' };
  }
  if (!response.ok) {
    return { status: 'unavailable' };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { status: 'unavailable' };
  }

  if (!isRecord(body) || typeof body.id !== 'string' || body.id.length === 0) {
    return { status: 'unavailable' };
  }

  return { status: 'success', userId: body.id };
}

async function readOwnProfile(
  url: string,
  publicKey: string,
  token: string,
  userId: string
): Promise<GatewayAuthorizationResult> {
  const profileUrl = new URL(`${url}/rest/v1/profiles`);
  profileUrl.searchParams.set('select', 'id,role,status');
  profileUrl.searchParams.set('id', `eq.${userId}`);

  let response: Response;
  try {
    response = await fetch(profileUrl, {
      headers: {
        authorization: `Bearer ${token}`,
        apikey: publicKey,
      },
    });
  } catch {
    return { status: 'unavailable' };
  }

  if (response.status === 401 || response.status === 403) {
    return { status: 'unauthenticated' };
  }
  if (!response.ok) {
    return { status: 'unavailable' };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { status: 'unavailable' };
  }

  if (!Array.isArray(body) || body.length !== 1 || !isRecord(body[0])) {
    return { status: 'forbidden' };
  }

  const profile = body[0];
  if (profile.id !== userId || profile.role !== 'teacher' || profile.status !== 'active') {
    return { status: 'forbidden' };
  }

  return { status: 'authorized', userId };
}

export async function authorizeActiveTeacher(
  request: Request
): Promise<GatewayAuthorizationResult> {
  const token = readBearerToken(request);
  if (!token) return { status: 'unauthenticated' };

  const environment = readGatewayEnvironment();
  if (!environment) return { status: 'unavailable' };

  const user = await readAuthenticatedUserId(environment.url, environment.publicKey, token);
  if (user.status !== 'success') return user;

  return readOwnProfile(environment.url, environment.publicKey, token, user.userId);
}
