import type { AuthChangeEvent, Session, SupabaseClient, User } from '@supabase/supabase-js';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAuthService, getCurrentAccessToken } from '@services/auth/auth.service';

function createUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    aud: 'authenticated',
    role: 'authenticated',
    email: 'student@example.com',
    email_confirmed_at: '2026-08-02T10:00:00.000Z',
    phone: '',
    app_metadata: {},
    user_metadata: {},
    identities: [],
    created_at: '2026-08-02T09:00:00.000Z',
    updated_at: '2026-08-02T10:00:00.000Z',
    is_anonymous: false,
    ...overrides,
  };
}

function createSession(overrides: Partial<Session> = {}): Session {
  return {
    access_token: 'access-token',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: 1785668400,
    refresh_token: 'refresh-token',
    user: createUser(),
    ...overrides,
  };
}

function createClientMock() {
  let authCallback: ((event: AuthChangeEvent, session: Session | null) => void) | undefined;
  const unsubscribe = vi.fn();

  const auth = {
    getSession: vi.fn(),
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChange: vi.fn((callback: typeof authCallback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe } } };
    }),
  };

  return {
    client: { auth } as unknown as Pick<SupabaseClient, 'auth'>,
    auth,
    unsubscribe,
    emit(event: AuthChangeEvent, session: Session | null) {
      authCallback?.(event, session);
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
});

describe('Auth service', () => {
  it('يعيد guest عند غياب الجلسة', async () => {
    const mock = createClientMock();
    mock.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });

    const service = createAuthService(mock.client);

    await expect(service.getCurrentSession()).resolves.toEqual({ status: 'guest' });
  });

  it('يعيد جلسة تطبيقية عند وجود جلسة Supabase', async () => {
    const mock = createClientMock();
    mock.auth.getSession.mockResolvedValue({
      data: { session: createSession() },
      error: null,
    });

    const service = createAuthService(mock.client);

    await expect(service.getCurrentSession()).resolves.toEqual({
      status: 'authenticated',
      user: {
        id: 'user-1',
        email: 'student@example.com',
        emailConfirmedAt: '2026-08-02T10:00:00.000Z',
      },
      session: {
        expiresAt: 1785668400,
        user: {
          id: 'user-1',
          email: 'student@example.com',
          emailConfirmedAt: '2026-08-02T10:00:00.000Z',
        },
      },
    });
  });

  it('يسجل الدخول برسالة عامة عند بيانات مرفوضة', async () => {
    const mock = createClientMock();
    mock.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'invalid_credentials', message: 'raw internal text', status: 400 },
    });

    const service = createAuthService(mock.client);
    const result = await service.signInWithPassword({
      email: 'student@example.com',
      password: 'wrong-password',
    });

    expect(result).toEqual({
      status: 'error',
      error: { code: 'invalid_credentials', message: 'بيانات الدخول غير صحيحة.' },
    });
    expect(JSON.stringify(result)).not.toContain('raw internal text');
  });

  it('يسجل الدخول بنجاح دون اعتبار الجلسة تفويضًا', async () => {
    const mock = createClientMock();
    mock.auth.signInWithPassword.mockResolvedValue({
      data: { user: createUser(), session: createSession() },
      error: null,
    });

    const service = createAuthService(mock.client);
    const result = await service.signInWithPassword({
      email: 'student@example.com',
      password: 'secure-password',
    });

    expect(result.status).toBe('authenticated');
    expect(result).not.toHaveProperty('profile');
    expect(result).not.toHaveProperty('role');
  });

  it('يعيد confirmation_required عندما تكون session null', async () => {
    const mock = createClientMock();
    mock.auth.signUp.mockResolvedValue({
      data: { user: createUser(), session: null },
      error: null,
    });

    const service = createAuthService(mock.client);

    await expect(
      service.signUp({ email: 'new@example.com', password: 'secure-password' })
    ).resolves.toEqual({ status: 'confirmation_required', email: 'new@example.com' });
  });

  it('يدعم التسجيل الذي يعيد جلسة دفاعيًا', async () => {
    const mock = createClientMock();
    mock.auth.signUp.mockResolvedValue({
      data: { user: createUser(), session: createSession() },
      error: null,
    });

    const service = createAuthService(mock.client);
    const result = await service.signUp({
      email: 'new@example.com',
      password: 'secure-password',
    });

    expect(result.status).toBe('authenticated');
  });

  it('يخفي حالة البريد الموجود خلف confirmation_required', async () => {
    const mock = createClientMock();
    mock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'user_already_exists', message: 'User already registered', status: 422 },
    });

    const service = createAuthService(mock.client);

    await expect(
      service.signUp({ email: 'existing@example.com', password: 'secure-password' })
    ).resolves.toEqual({
      status: 'confirmation_required',
      email: 'existing@example.com',
    });
  });

  it('يصنف كلمة المرور الضعيفة دون كشف النص الخام', async () => {
    const mock = createClientMock();
    mock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'weak_password', message: 'Password should contain symbols', status: 422 },
    });

    const service = createAuthService(mock.client);
    const result = await service.signUp({
      email: 'new@example.com',
      password: 'weak',
    });

    expect(result).toEqual({
      status: 'error',
      error: { code: 'weak_password', message: 'كلمة المرور لا تحقق متطلبات الأمان.' },
    });
    expect(JSON.stringify(result)).not.toContain('symbols');
  });

  it('يصنف rate limiting برسالة آمنة', async () => {
    const mock = createClientMock();
    mock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { code: 'over_request_rate_limit', message: 'raw quota details', status: 429 },
    });

    const service = createAuthService(mock.client);
    const result = await service.signUp({
      email: 'new@example.com',
      password: 'secure-password',
    });

    expect(result).toEqual({
      status: 'error',
      error: { code: 'rate_limited', message: 'تم إجراء محاولات كثيرة. حاول لاحقًا.' },
    });
    expect(JSON.stringify(result)).not.toContain('quota');
  });

  it('يعطي rate limiting أولوية على رسالة تحتوي كلمة password', async () => {
    const mock = createClientMock();
    mock.auth.signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        code: 'over_email_send_rate_limit',
        message: 'Too many password recovery emails. Please try again later.',
        status: 429,
      },
    });

    const service = createAuthService(mock.client);
    const result = await service.signUp({
      email: 'new@example.com',
      password: 'secure-password',
    });

    expect(result).toEqual({
      status: 'error',
      error: { code: 'rate_limited', message: 'تم إجراء محاولات كثيرة. حاول لاحقًا.' },
    });
    expect(JSON.stringify(result)).not.toContain('password recovery');
  });

  it('يسجل الخروج ويعيد guest', async () => {
    const mock = createClientMock();
    mock.auth.signOut.mockResolvedValue({ error: null });

    const service = createAuthService(mock.client);

    await expect(service.signOut()).resolves.toEqual({ status: 'guest' });
  });

  it('ينشئ اشتراك Supabase واحدًا لعدة مستمعين ويلغيه عند آخر مستمع', async () => {
    const mock = createClientMock();
    const service = createAuthService(mock.client);
    const firstListener = vi.fn();
    const secondListener = vi.fn();

    const removeFirst = service.onAuthStateChange(firstListener);
    const removeSecond = service.onAuthStateChange(secondListener);

    expect(mock.auth.onAuthStateChange).toHaveBeenCalledTimes(1);

    mock.emit('SIGNED_IN', createSession());
    await new Promise<void>((resolve) => queueMicrotask(resolve));

    expect(firstListener).toHaveBeenCalledTimes(1);
    expect(secondListener).toHaveBeenCalledTimes(1);

    removeFirst();
    expect(mock.unsubscribe).not.toHaveBeenCalled();

    removeSecond();
    expect(mock.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('يحافظ على AbortError كما هو', async () => {
    const mock = createClientMock();
    const abortError = Object.assign(new Error('aborted'), { name: 'AbortError' });
    mock.auth.getSession.mockRejectedValue(abortError);

    const service = createAuthService(mock.client);

    await expect(service.getCurrentSession()).rejects.toBe(abortError);
  });

  it('يحفظ الخطأ الأصلي في cause تشخيصيًا ولا يعرضه في PublicAuthError', async () => {
    const mock = createClientMock();
    const rawError = new Error('SMTP table internal failure');
    const diagnostics: Error[] = [];
    mock.auth.signUp.mockRejectedValue(rawError);

    const service = createAuthService(mock.client, {
      reportDiagnostic: (error) => diagnostics.push(error),
    });
    const result = await service.signUp({
      email: 'new@example.com',
      password: 'secure-password',
    });

    expect(result).toEqual({
      status: 'error',
      error: { code: 'unknown', message: 'تعذر إكمال العملية حاليًا. حاول لاحقًا.' },
    });
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]?.cause).toBe(rawError);
    expect(JSON.stringify(result)).not.toContain('SMTP');
  });

  it('لا يهيئ Supabase عند مجرد استيراد ملف الخدمة', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    await expect(import('@services/auth/auth.service')).resolves.toBeDefined();
  });
});

describe('Current access token', () => {
  it('يعيد access token الحالي بعد تطبيعه', async () => {
    const mock = createClientMock();
    mock.auth.getSession.mockResolvedValue({
      data: { session: createSession({ access_token: '  gateway-token  ' }) },
      error: null,
    });
    await expect(getCurrentAccessToken(mock.client)).resolves.toBe('gateway-token');
  });

  it('يفشل مغلقًا عند غياب الجلسة أو خطأ Auth أو exception', async () => {
    const mock = createClientMock();
    mock.auth.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    await expect(getCurrentAccessToken(mock.client)).resolves.toBeNull();
    mock.auth.getSession.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'auth failed' },
    });
    await expect(getCurrentAccessToken(mock.client)).resolves.toBeNull();
    mock.auth.getSession.mockRejectedValueOnce(new Error('network failed'));
    await expect(getCurrentAccessToken(mock.client)).resolves.toBeNull();
  });
});
