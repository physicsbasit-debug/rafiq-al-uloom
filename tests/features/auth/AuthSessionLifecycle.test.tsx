// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthSessionProvider } from '@features/auth/AuthSessionProvider';
import { useAuthSession } from '@features/auth/useAuthSession';
import type { AuthService } from '@services/auth/auth.service';
import type {
  AuthState,
  AuthStateChange,
  AuthStateChangeListener,
  SignOutResult,
} from '@services/auth/auth.types';
import { createAuthorizationService } from '@services/auth/authorization.service';
import type { ProfileReadResult, UserProfile } from '@services/auth/authorization.types';
import type { ProfileService } from '@services/auth/profile.service';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });

  return { promise, resolve };
}

function authenticatedState(
  userId = 'user-1',
  overrides: Partial<Extract<AuthState, { status: 'authenticated' }>> = {}
): Extract<AuthState, { status: 'authenticated' }> {
  const user = {
    id: userId,
    email: `${userId}@example.com`,
    emailConfirmedAt: '2026-08-03T00:00:00.000Z',
  };

  return {
    status: 'authenticated',
    user,
    session: {
      expiresAt: 1785718800,
      user,
    },
    ...overrides,
  };
}

function profile(userId = 'user-1', overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: userId,
    displayName: null,
    role: 'student',
    status: 'active',
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:00:00.000Z',
    ...overrides,
  };
}

function success(resultProfile: UserProfile): ProfileReadResult {
  return { status: 'success', profile: resultProfile };
}

function createAuthController(
  getCurrentSession: AuthService['getCurrentSession'] = async () => ({ status: 'guest' })
) {
  const listeners = new Set<AuthStateChangeListener>();
  const signOutResult: SignOutResult = { status: 'guest' };

  const auth: AuthService = {
    getCurrentSession: vi.fn<AuthService['getCurrentSession']>(getCurrentSession),
    getCurrentUser: vi.fn<AuthService['getCurrentUser']>(async () => ({ status: 'guest' })),
    signInWithPassword: vi.fn<AuthService['signInWithPassword']>(async () => ({
      status: 'error',
      error: { code: 'unknown', message: 'تعذر إكمال العملية.' },
    })),
    signUp: vi.fn<AuthService['signUp']>(async () => ({
      status: 'error',
      error: { code: 'unknown', message: 'تعذر إكمال العملية.' },
    })),
    signOut: vi.fn<AuthService['signOut']>(async () => signOutResult),
    onAuthStateChange: vi.fn<AuthService['onAuthStateChange']>((listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }),
  };

  return {
    auth,
    emit(change: AuthStateChange) {
      for (const listener of [...listeners]) {
        listener(change);
      }
    },
  };
}

function createHarness(
  options: {
    readonly getCurrentSession?: AuthService['getCurrentSession'];
    readonly getUserProfile?: ProfileService['getUserProfile'];
  } = {}
) {
  const authController = createAuthController(options.getCurrentSession);
  const getUserProfile = vi.fn<ProfileService['getUserProfile']>(
    options.getUserProfile ?? (async (userId: string) => success(profile(userId)))
  );
  const profiles: ProfileService = { getUserProfile };
  const authorization = createAuthorizationService(authController.auth, profiles);

  return {
    services: { auth: authController.auth, authorization },
    auth: authController.auth,
    authorization,
    getUserProfile,
    emit: authController.emit,
  };
}

function Consumer() {
  const session = useAuthSession();
  const authenticatedUserId =
    session.authState.status === 'authenticated' ? session.authState.user.id : 'none';
  const expiresAt =
    session.authState.status === 'authenticated'
      ? String(session.authState.session.expiresAt)
      : 'none';
  const profileId =
    session.authorizationState && 'profile' in session.authorizationState
      ? session.authorizationState.profile.id
      : 'none';

  return (
    <div>
      <span data-testid="auth-status">{session.authState.status}</span>
      <span data-testid="auth-user">{authenticatedUserId}</span>
      <span data-testid="expires-at">{expiresAt}</span>
      <span data-testid="authorization-status">{session.authorizationState?.status ?? 'none'}</span>
      <span data-testid="profile-user">{profileId}</span>
      <button type="button" onClick={() => void session.retrySession()}>
        retry-session
      </button>
      <button type="button" onClick={() => void session.refreshAuthorization()}>
        refresh-authorization
      </button>
      <button type="button" onClick={() => void session.signOut()}>
        sign-out
      </button>
    </div>
  );
}

function renderHarness(harness: ReturnType<typeof createHarness>) {
  return render(
    <AuthSessionProvider services={harness.services}>
      <Consumer />
    </AuthSessionProvider>
  );
}

const sessionError: AuthState = {
  status: 'error',
  error: {
    code: 'network_error',
    message: 'تعذر استعادة الجلسة.',
  },
};

describe('Auth session lifecycle integration', () => {
  it('يستعيد Authorization صراحة بعد Retry ناجح بلا Auth event جديد', async () => {
    const getCurrentSession = vi
      .fn<AuthService['getCurrentSession']>()
      .mockResolvedValueOnce(sessionError)
      .mockResolvedValueOnce(authenticatedState('recovered-user'));
    const harness = createHarness({ getCurrentSession });
    renderHarness(harness);

    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('error'));
    fireEvent.click(screen.getByRole('button', { name: 'retry-session' }));

    await waitFor(() =>
      expect(screen.getByTestId('authorization-status')).toHaveTextContent('authorized')
    );
    expect(screen.getByTestId('auth-user')).toHaveTextContent('recovered-user');
    expect(screen.getByTestId('profile-user')).toHaveTextContent('recovered-user');
    expect(harness.getUserProfile).toHaveBeenCalledWith(
      'recovered-user',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('ينتقل من session_error إلى Guest بلا طلب Profile عند Retry بلا جلسة', async () => {
    const getCurrentSession = vi
      .fn<AuthService['getCurrentSession']>()
      .mockResolvedValueOnce(sessionError)
      .mockResolvedValueOnce({ status: 'guest' });
    const harness = createHarness({ getCurrentSession });
    renderHarness(harness);

    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('error'));
    fireEvent.click(screen.getByRole('button', { name: 'retry-session' }));

    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('guest'));
    expect(screen.getByTestId('authorization-status')).toHaveTextContent('none');
    expect(harness.getUserProfile).not.toHaveBeenCalled();
  });

  it('يتجاهل نتيجة Retry قديمة بعد حدث Auth أحدث لمستخدم آخر', async () => {
    const retryResult = deferred<AuthState>();
    const getCurrentSession = vi
      .fn<AuthService['getCurrentSession']>()
      .mockResolvedValueOnce(sessionError)
      .mockImplementationOnce(() => retryResult.promise);
    const harness = createHarness({ getCurrentSession });
    renderHarness(harness);

    await waitFor(() => expect(screen.getByTestId('auth-status')).toHaveTextContent('error'));
    fireEvent.click(screen.getByRole('button', { name: 'retry-session' }));

    act(() => {
      harness.emit({ event: 'signed_in', state: authenticatedState('newer-user') });
    });
    await waitFor(() => expect(screen.getByTestId('profile-user')).toHaveTextContent('newer-user'));

    await act(async () => {
      retryResult.resolve(authenticatedState('stale-user'));
      await retryResult.promise;
    });

    expect(screen.getByTestId('auth-user')).toHaveTextContent('newer-user');
    expect(screen.getByTestId('profile-user')).toHaveTextContent('newer-user');
  });

  it.each([
    'token_refreshed',
    'user_updated',
    'password_recovery',
    'mfa_challenge_verified',
    'unknown',
  ] as const)('يحدث Auth عند %s بلا إعادة قراءة Profile', async (event) => {
    const initialSession = deferred<AuthState>();
    const harness = createHarness({ getCurrentSession: () => initialSession.promise });
    renderHarness(harness);

    act(() => {
      harness.emit({ event: 'initial_session', state: authenticatedState('user-1') });
    });
    await waitFor(() =>
      expect(screen.getByTestId('authorization-status')).toHaveTextContent('authorized')
    );
    harness.getUserProfile.mockClear();

    act(() => {
      harness.emit({
        event,
        state: authenticatedState('user-1', {
          session: {
            expiresAt: 1785722400,
            user: {
              id: 'user-1',
              email: 'updated@example.com',
              emailConfirmedAt: '2026-08-03T00:00:00.000Z',
            },
          },
          user: {
            id: 'user-1',
            email: 'updated@example.com',
            emailConfirmedAt: '2026-08-03T00:00:00.000Z',
          },
        }),
      });
    });

    expect(screen.getByTestId('expires-at')).toHaveTextContent('1785722400');
    expect(screen.getByTestId('authorization-status')).toHaveTextContent('authorized');
    expect(harness.getUserProfile).not.toHaveBeenCalled();
  });

  it('يعكس refreshAuthorization الصريح تغير الحالة الإدارية إلى suspended', async () => {
    const initialSession = deferred<AuthState>();
    const getUserProfile = vi
      .fn<ProfileService['getUserProfile']>()
      .mockResolvedValueOnce(success(profile('user-1')))
      .mockResolvedValueOnce(success(profile('user-1', { status: 'suspended' })));
    const harness = createHarness({
      getCurrentSession: () => initialSession.promise,
      getUserProfile,
    });
    renderHarness(harness);

    act(() => {
      harness.emit({ event: 'initial_session', state: authenticatedState('user-1') });
    });
    await waitFor(() =>
      expect(screen.getByTestId('authorization-status')).toHaveTextContent('authorized')
    );

    fireEvent.click(screen.getByRole('button', { name: 'refresh-authorization' }));

    await waitFor(() =>
      expect(screen.getByTestId('authorization-status')).toHaveTextContent('suspended')
    );
    expect(getUserProfile).toHaveBeenCalledTimes(2);
  });

  it('يتعافى من profile_error عبر refreshAuthorization الصريح', async () => {
    const initialSession = deferred<AuthState>();
    const getUserProfile = vi
      .fn<ProfileService['getUserProfile']>()
      .mockResolvedValueOnce({
        status: 'error',
        error: { code: 'network_error', message: 'تعذر قراءة Profile.' },
      })
      .mockResolvedValueOnce(success(profile('user-1')));
    const harness = createHarness({
      getCurrentSession: () => initialSession.promise,
      getUserProfile,
    });
    renderHarness(harness);

    act(() => {
      harness.emit({ event: 'initial_session', state: authenticatedState('user-1') });
    });
    await waitFor(() =>
      expect(screen.getByTestId('authorization-status')).toHaveTextContent('profile_error')
    );

    fireEvent.click(screen.getByRole('button', { name: 'refresh-authorization' }));

    await waitFor(() =>
      expect(screen.getByTestId('authorization-status')).toHaveTextContent('authorized')
    );
    expect(getUserProfile).toHaveBeenCalledTimes(2);
  });

  it('يمسح Auth وAuthorization عند signed_out صادر من خارج الواجهة', async () => {
    const initialSession = deferred<AuthState>();
    const harness = createHarness({ getCurrentSession: () => initialSession.promise });
    renderHarness(harness);

    act(() => {
      harness.emit({ event: 'initial_session', state: authenticatedState('user-1') });
    });
    await waitFor(() =>
      expect(screen.getByTestId('authorization-status')).toHaveTextContent('authorized')
    );

    act(() => {
      harness.emit({ event: 'signed_out', state: { status: 'guest' } });
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('guest');
    expect(screen.getByTestId('authorization-status')).toHaveTextContent('none');
    expect(harness.authorization.getCurrentState()).toBeNull();
  });

  it('يبقي الجلسة والتفويض عند فشل Sign Out', async () => {
    const initialSession = deferred<AuthState>();
    const harness = createHarness({ getCurrentSession: () => initialSession.promise });
    vi.mocked(harness.auth.signOut).mockResolvedValue({
      status: 'error',
      error: { code: 'network_error', message: 'تعذر تسجيل الخروج.' },
    });
    renderHarness(harness);

    act(() => {
      harness.emit({ event: 'initial_session', state: authenticatedState('user-1') });
    });
    await waitFor(() =>
      expect(screen.getByTestId('authorization-status')).toHaveTextContent('authorized')
    );

    fireEvent.click(screen.getByRole('button', { name: 'sign-out' }));
    await waitFor(() => expect(harness.auth.signOut).toHaveBeenCalledTimes(1));

    expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('authorization-status')).toHaveTextContent('authorized');
  });

  it('لا يسمح لنتيجة Profile قديمة بالانتقال من المستخدم A إلى B', async () => {
    const firstProfile = deferred<ProfileReadResult>();
    const initialSession = deferred<AuthState>();
    const harness = createHarness({
      getCurrentSession: () => initialSession.promise,
      getUserProfile: async (userId) =>
        userId === 'user-a' ? firstProfile.promise : success(profile('user-b')),
    });
    renderHarness(harness);

    act(() => {
      harness.emit({ event: 'signed_in', state: authenticatedState('user-a') });
      harness.emit({ event: 'signed_in', state: authenticatedState('user-b') });
    });
    await waitFor(() => expect(screen.getByTestId('profile-user')).toHaveTextContent('user-b'));

    await act(async () => {
      firstProfile.resolve(success(profile('user-a')));
      await firstProfile.promise;
    });

    expect(screen.getByTestId('auth-user')).toHaveTextContent('user-b');
    expect(screen.getByTestId('profile-user')).toHaveTextContent('user-b');
  });

  it('يفشل مغلقًا ويمسح Authorization عند Auth error event', async () => {
    const initialSession = deferred<AuthState>();
    const harness = createHarness({ getCurrentSession: () => initialSession.promise });
    renderHarness(harness);

    act(() => {
      harness.emit({ event: 'initial_session', state: authenticatedState('user-1') });
    });
    await waitFor(() =>
      expect(screen.getByTestId('authorization-status')).toHaveTextContent('authorized')
    );

    act(() => {
      harness.emit({ event: 'unknown', state: sessionError });
    });

    expect(screen.getByTestId('auth-status')).toHaveTextContent('error');
    expect(screen.getByTestId('authorization-status')).toHaveTextContent('none');
  });
});
