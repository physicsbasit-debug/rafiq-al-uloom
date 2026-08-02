import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AuthService } from '@services/auth/auth.service';
import { createAuthorizationService } from '@services/auth/authorization.service';
import type {
  AuthStateChange,
  AuthStateChangeListener,
} from '@services/auth/auth.types';
import type {
  ProfileReadResult,
  UserProfile,
} from '@services/auth/authorization.types';
import type { ProfileService } from '@services/auth/profile.service';

function profile(
  status: UserProfile['status'] = 'active',
  overrides: Partial<UserProfile> = {}
): UserProfile {
  return {
    id: 'user-1',
    displayName: null,
    role: 'student',
    status,
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z',
    ...overrides,
  };
}

function authenticatedChange(
  event: AuthStateChange['event'],
  userId = 'user-1'
): AuthStateChange {
  return {
    event,
    state: {
      status: 'authenticated',
      user: {
        id: userId,
        email: `${userId}@example.com`,
        emailConfirmedAt: '2026-08-03T00:00:00.000Z',
      },
      session: {
        expiresAt: 1785718800,
        user: {
          id: userId,
          email: `${userId}@example.com`,
          emailConfirmedAt: '2026-08-03T00:00:00.000Z',
        },
      },
    },
  };
}

function createAuthMock() {
  let listener: AuthStateChangeListener | undefined;
  const unsubscribe = vi.fn();
  const onAuthStateChange = vi.fn((next: AuthStateChangeListener) => {
    listener = next;
    return unsubscribe;
  });

  return {
    auth: { onAuthStateChange } as Pick<AuthService, 'onAuthStateChange'>,
    onAuthStateChange,
    unsubscribe,
    emit(change: AuthStateChange) {
      listener?.(change);
    },
  };
}

function success(resultProfile: UserProfile): ProfileReadResult {
  return { status: 'success', profile: resultProfile };
}

function createProfileMock(
  implementation: ProfileService['getUserProfile'] = async () =>
    success(profile())
) {
  const getUserProfile = vi.fn(implementation);
  return {
    profiles: { getUserProfile } as ProfileService,
    getUserProfile,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

async function waitForState(
  service: ReturnType<typeof createAuthorizationService>,
  expected: string
): Promise<void> {
  await vi.waitFor(() => {
    expect(service.getCurrentState()?.status).toBe(expected);
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Authorization service', () => {
  it('ينشئ اشتراك Auth مركزيًا واحدًا لعدة مستمعين', () => {
    const auth = createAuthMock();
    const profiles = createProfileMock();
    const service = createAuthorizationService(auth.auth, profiles.profiles);

    const removeFirst = service.onAuthorizationStateChange(vi.fn());
    const removeSecond = service.onAuthorizationStateChange(vi.fn());

    expect(auth.onAuthStateChange).toHaveBeenCalledTimes(1);
    removeFirst();
    expect(auth.unsubscribe).not.toHaveBeenCalled();
    removeSecond();
    expect(auth.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('يقرأ Profile عند initial_session وينتج authorized للحساب النشط', async () => {
    const auth = createAuthMock();
    const profiles = createProfileMock();
    const service = createAuthorizationService(auth.auth, profiles.profiles);
    service.onAuthorizationStateChange(vi.fn());

    auth.emit(authenticatedChange('initial_session'));

    expect(service.getCurrentState()).toEqual({
      status: 'loading_profile',
      userId: 'user-1',
    });
    await waitForState(service, 'authorized');
    expect(profiles.getUserProfile).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['pending', 'pending'],
    ['suspended', 'suspended'],
  ] as const)('يحوّل حالة %s إلى AuthorizationState مطابقة', async (profileStatus, expected) => {
    const auth = createAuthMock();
    const profiles = createProfileMock(async () => success(profile(profileStatus)));
    const service = createAuthorizationService(auth.auth, profiles.profiles);
    service.onAuthorizationStateChange(vi.fn());

    auth.emit(authenticatedChange('signed_in'));

    await waitForState(service, expected);
  });

  it('ينتج profile_error عند فشل قراءة Profile', async () => {
    const auth = createAuthMock();
    const profiles = createProfileMock(async () => ({
      status: 'error',
      error: {
        code: 'missing_profile',
        message: 'تعذر العثور على ملف المستخدم.',
      },
    }));
    const service = createAuthorizationService(auth.auth, profiles.profiles);
    service.onAuthorizationStateChange(vi.fn());

    auth.emit(authenticatedChange('signed_in'));

    await waitForState(service, 'profile_error');
    expect(service.getCurrentState()).toEqual({
      status: 'profile_error',
      error: {
        code: 'missing_profile',
        message: 'تعذر العثور على ملف المستخدم.',
      },
    });
  });

  it.each([
    'token_refreshed',
    'user_updated',
    'password_recovery',
    'mfa_challenge_verified',
    'unknown',
  ] as const)('لا يعيد القراءة عند حدث %s', async (event) => {
    const auth = createAuthMock();
    const profiles = createProfileMock();
    const service = createAuthorizationService(auth.auth, profiles.profiles);
    service.onAuthorizationStateChange(vi.fn());

    auth.emit(authenticatedChange('initial_session'));
    await waitForState(service, 'authorized');
    profiles.getUserProfile.mockClear();

    auth.emit(authenticatedChange(event));
    await Promise.resolve();

    expect(profiles.getUserProfile).not.toHaveBeenCalled();
  });

  it('لا يكرر signed_in للمستخدم نفسه بعد تحميل Profile صالح', async () => {
    const auth = createAuthMock();
    const profiles = createProfileMock();
    const service = createAuthorizationService(auth.auth, profiles.profiles);
    service.onAuthorizationStateChange(vi.fn());

    auth.emit(authenticatedChange('signed_in'));
    await waitForState(service, 'authorized');
    auth.emit(authenticatedChange('signed_in'));
    await Promise.resolve();

    expect(profiles.getUserProfile).toHaveBeenCalledTimes(1);
  });

  it('يعيد القراءة بعد profile_error عند signed_in جديد', async () => {
    const auth = createAuthMock();
    const profiles = createProfileMock();
    profiles.getUserProfile
      .mockResolvedValueOnce({
        status: 'error',
        error: { code: 'network_error', message: 'تعذر الاتصال.' },
      })
      .mockResolvedValueOnce(success(profile()));
    const service = createAuthorizationService(auth.auth, profiles.profiles);
    service.onAuthorizationStateChange(vi.fn());

    auth.emit(authenticatedChange('signed_in'));
    await waitForState(service, 'profile_error');
    auth.emit(authenticatedChange('signed_in'));
    await waitForState(service, 'authorized');

    expect(profiles.getUserProfile).toHaveBeenCalledTimes(2);
  });

  it('يلغي طلب المستخدم السابق عند الانتقال إلى مستخدم آخر', async () => {
    const auth = createAuthMock();
    const first = deferred<ProfileReadResult>();
    const signals: AbortSignal[] = [];
    const profiles = createProfileMock(async (userId, options) => {
      if (options?.signal) signals.push(options.signal);
      return userId === 'user-1'
        ? first.promise
        : success(profile('active', { id: 'user-2' }));
    });
    const service = createAuthorizationService(auth.auth, profiles.profiles);
    service.onAuthorizationStateChange(vi.fn());

    auth.emit(authenticatedChange('signed_in', 'user-1'));
    auth.emit(authenticatedChange('signed_in', 'user-2'));

    await waitForState(service, 'authorized');
    expect(signals[0]?.aborted).toBe(true);
    expect(service.getCurrentState()).toMatchObject({
      status: 'authorized',
      profile: { id: 'user-2' },
    });

    first.resolve(success(profile('active', { id: 'user-1' })));
    await Promise.resolve();
    expect(service.getCurrentState()).toMatchObject({
      profile: { id: 'user-2' },
    });
  });

  it('يلغي الطلب ويمسح التفويض عند signed_out', async () => {
    const auth = createAuthMock();
    const pending = deferred<ProfileReadResult>();
    let signal: AbortSignal | undefined;
    const profiles = createProfileMock(async (_userId, options) => {
      signal = options?.signal;
      return pending.promise;
    });
    const service = createAuthorizationService(auth.auth, profiles.profiles);
    service.onAuthorizationStateChange(vi.fn());

    auth.emit(authenticatedChange('signed_in'));
    auth.emit({ event: 'signed_out', state: { status: 'guest' } });

    expect(signal?.aborted).toBe(true);
    expect(service.getCurrentState()).toBeNull();
  });

  it('يتجاهل نتيجة متأخرة بعد تسجيل الخروج', async () => {
    const auth = createAuthMock();
    const pending = deferred<ProfileReadResult>();
    const profiles = createProfileMock(async () => pending.promise);
    const service = createAuthorizationService(auth.auth, profiles.profiles);
    service.onAuthorizationStateChange(vi.fn());

    auth.emit(authenticatedChange('signed_in'));
    auth.emit({ event: 'signed_out', state: { status: 'guest' } });
    pending.resolve(success(profile()));
    await Promise.resolve();

    expect(service.getCurrentState()).toBeNull();
  });

  it('ينفذ refreshAuthorization بطلب جديد صريح', async () => {
    const auth = createAuthMock();
    const profiles = createProfileMock();
    const service = createAuthorizationService(auth.auth, profiles.profiles);
    service.onAuthorizationStateChange(vi.fn());

    auth.emit(authenticatedChange('initial_session'));
    await waitForState(service, 'authorized');
    await service.refreshAuthorization();

    expect(profiles.getUserProfile).toHaveBeenCalledTimes(2);
  });

  it('لا ينفذ refreshAuthorization قبل معرفة مستخدم مصادق عليه', async () => {
    const auth = createAuthMock();
    const profiles = createProfileMock();
    const service = createAuthorizationService(auth.auth, profiles.profiles);

    await service.refreshAuthorization();

    expect(profiles.getUserProfile).not.toHaveBeenCalled();
  });

  it('يلغي الطلب الجاري عند إزالة آخر Listener', async () => {
    const auth = createAuthMock();
    const pending = deferred<ProfileReadResult>();
    let signal: AbortSignal | undefined;
    const profiles = createProfileMock(async (_userId, options) => {
      signal = options?.signal;
      return pending.promise;
    });
    const service = createAuthorizationService(auth.auth, profiles.profiles);
    const remove = service.onAuthorizationStateChange(vi.fn());

    auth.emit(authenticatedChange('signed_in'));
    remove();

    expect(signal?.aborted).toBe(true);
    expect(auth.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
