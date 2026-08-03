// @vitest-environment jsdom

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthSessionProvider } from '@features/auth/AuthSessionProvider';
import { useAuthSession } from '@features/auth/useAuthSession';
import type { AuthService } from '@services/auth/auth.service';
import type { AuthStateChangeListener } from '@services/auth/auth.types';
import type { AuthorizationService } from '@services/auth/authorization.service';
import type { AuthorizationStateListener } from '@services/auth/authorization.types';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function createServices(
  sessionPromise: AuthService['getCurrentSession'] = async () => ({ status: 'guest' })
) {
  let authListener: AuthStateChangeListener | undefined;
  let authorizationListener: AuthorizationStateListener | undefined;
  const removeAuth = vi.fn();
  const removeAuthorization = vi.fn();

  const auth: AuthService = {
    getCurrentSession: vi.fn(sessionPromise),
    getCurrentUser: vi.fn(async () => ({ status: 'guest' })),
    signInWithPassword: vi.fn(async () => ({
      status: 'error',
      error: { code: 'unknown', message: 'تعذر إكمال العملية.' },
    })),
    signUp: vi.fn(async () => ({
      status: 'error',
      error: { code: 'unknown', message: 'تعذر إكمال العملية.' },
    })),
    signOut: vi.fn(async () => ({ status: 'guest' })),
    onAuthStateChange: vi.fn((listener: AuthStateChangeListener) => {
      authListener = listener;
      return removeAuth;
    }),
  };

  const authorization: AuthorizationService = {
    getCurrentState: vi.fn(() => null),
    ensureAuthorizationForUser: vi.fn(async () => undefined),
    refreshAuthorization: vi.fn(async () => undefined),
    onAuthorizationStateChange: vi.fn((listener: AuthorizationStateListener) => {
      authorizationListener = listener;
      return removeAuthorization;
    }),
  };

  return {
    services: { auth, authorization },
    auth,
    authorization,
    removeAuth,
    removeAuthorization,
    emitAuth(change: Parameters<AuthStateChangeListener>[0]) {
      authListener?.(change);
    },
    emitAuthorization(state: Parameters<AuthorizationStateListener>[0]) {
      authorizationListener?.(state);
    },
  };
}

function Consumer() {
  const session = useAuthSession();
  return (
    <div>
      <span data-testid="auth">{session.authState.status}</span>
      <span data-testid="authorization">{session.authorizationState?.status ?? 'none'}</span>
      <span data-testid="entry">{session.entryMode}</span>
      <span data-testid="confirmation">{session.confirmationEmail ?? 'none'}</span>
      <button type="button" onClick={session.openSignIn}>
        open-sign-in
      </button>
      <button type="button" onClick={session.openSignUp}>
        open-sign-up
      </button>
      <button type="button" onClick={session.closeAuthEntry}>
        close-entry
      </button>
      <button
        type="button"
        onClick={() => void session.signIn({ email: 'a@example.com', password: 'pw' })}
      >
        sign-in
      </button>
      <button
        type="button"
        onClick={() => void session.signUp({ email: 'a@example.com', password: 'pw' })}
      >
        sign-up
      </button>
      <button type="button" onClick={() => void session.signOut()}>
        sign-out
      </button>
    </div>
  );
}

const authenticatedChange = {
  event: 'initial_session' as const,
  state: {
    status: 'authenticated' as const,
    user: { id: 'user-1', email: 'a@example.com', emailConfirmedAt: null },
    session: {
      expiresAt: null,
      user: { id: 'user-1', email: 'a@example.com', emailConfirmedAt: null },
    },
  },
};

describe('AuthSessionProvider', () => {
  it('يبدأ بحالة loading ولا يعرض guest قبل انتهاء الاستعادة', () => {
    const currentSession = deferred<Awaited<ReturnType<AuthService['getCurrentSession']>>>();
    const mock = createServices(() => currentSession.promise);

    render(
      <AuthSessionProvider services={mock.services}>
        <Consumer />
      </AuthSessionProvider>
    );

    expect(screen.getByTestId('auth')).toHaveTextContent('loading');
  });

  it('ينتقل إلى guest عند عدم وجود جلسة', async () => {
    const mock = createServices();
    render(
      <AuthSessionProvider services={mock.services}>
        <Consumer />
      </AuthSessionProvider>
    );

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('guest'));
  });

  it('يربط initial_session بحالة Authorization دون وميض guest', async () => {
    const currentSession = deferred<Awaited<ReturnType<AuthService['getCurrentSession']>>>();
    const mock = createServices(() => currentSession.promise);
    render(
      <AuthSessionProvider services={mock.services}>
        <Consumer />
      </AuthSessionProvider>
    );

    act(() => {
      mock.emitAuthorization({ status: 'loading_profile', userId: 'user-1' });
      mock.emitAuth(authenticatedChange);
    });

    expect(screen.getByTestId('auth')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('authorization')).toHaveTextContent('loading_profile');
    expect(screen.getByTestId('auth')).not.toHaveTextContent('guest');
  });

  it('يفتح ويغلق واجهة المصادقة بمعزل عن حالة الجلسة', async () => {
    const mock = createServices();
    render(
      <AuthSessionProvider services={mock.services}>
        <Consumer />
      </AuthSessionProvider>
    );
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('guest'));

    fireEvent.click(screen.getByRole('button', { name: 'open-sign-in' }));
    expect(screen.getByTestId('entry')).toHaveTextContent('sign_in');
    fireEvent.click(screen.getByRole('button', { name: 'open-sign-up' }));
    expect(screen.getByTestId('entry')).toHaveTextContent('sign_up');
    fireEvent.click(screen.getByRole('button', { name: 'close-entry' }));
    expect(screen.getByTestId('entry')).toHaveTextContent('closed');
  });

  it('ينقل confirmation_required إلى شاشة التأكيد دون كشف حالة البريد', async () => {
    const mock = createServices();
    vi.mocked(mock.auth.signUp).mockResolvedValue({
      status: 'confirmation_required',
      email: 'a@example.com',
    });
    render(
      <AuthSessionProvider services={mock.services}>
        <Consumer />
      </AuthSessionProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'sign-up' }));

    await waitFor(() =>
      expect(screen.getByTestId('entry')).toHaveTextContent('confirmation_required')
    );
    expect(screen.getByTestId('confirmation')).toHaveTextContent('a@example.com');
  });

  it('يغلق واجهة الدخول عند نجاح المصادقة وينتظر Authorization', async () => {
    const mock = createServices();
    vi.mocked(mock.auth.signInWithPassword).mockResolvedValue({
      status: 'authenticated',
      user: authenticatedChange.state.user,
      session: authenticatedChange.state.session,
    });
    render(
      <AuthSessionProvider services={mock.services}>
        <Consumer />
      </AuthSessionProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'open-sign-in' }));

    fireEvent.click(screen.getByRole('button', { name: 'sign-in' }));

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('authenticated'));
    expect(screen.getByTestId('entry')).toHaveTextContent('closed');
    expect(screen.getByTestId('authorization')).toHaveTextContent('none');
  });

  it('لا تسمح نتيجة استعادة قديمة بمسح دخول ناجح أحدث', async () => {
    const currentSession = deferred<Awaited<ReturnType<AuthService['getCurrentSession']>>>();
    const mock = createServices(() => currentSession.promise);
    vi.mocked(mock.auth.signInWithPassword).mockResolvedValue({
      status: 'authenticated',
      user: authenticatedChange.state.user,
      session: authenticatedChange.state.session,
    });
    render(
      <AuthSessionProvider services={mock.services}>
        <Consumer />
      </AuthSessionProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'sign-in' }));
    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('authenticated'));

    currentSession.resolve({ status: 'guest' });
    await Promise.resolve();

    expect(screen.getByTestId('auth')).toHaveTextContent('authenticated');
  });

  it('يمسح التفويض وواجهة Auth عند نجاح تسجيل الخروج', async () => {
    const mock = createServices();
    render(
      <AuthSessionProvider services={mock.services}>
        <Consumer />
      </AuthSessionProvider>
    );
    act(() => {
      mock.emitAuthorization({
        status: 'authorized',
        profile: {
          id: 'user-1',
          displayName: null,
          role: 'student',
          status: 'active',
          createdAt: '2026-08-03T00:00:00.000Z',
          updatedAt: '2026-08-03T00:00:00.000Z',
        },
      });
      mock.emitAuth(authenticatedChange);
    });

    fireEvent.click(screen.getByRole('button', { name: 'sign-out' }));

    await waitFor(() => expect(screen.getByTestId('auth')).toHaveTextContent('guest'));
    expect(screen.getByTestId('authorization')).toHaveTextContent('none');
    expect(screen.getByTestId('entry')).toHaveTextContent('closed');
  });

  it('يلغي الاشتراكين عند إزالة Provider', () => {
    const currentSession = deferred<Awaited<ReturnType<AuthService['getCurrentSession']>>>();
    const mock = createServices(() => currentSession.promise);
    const view = render(
      <AuthSessionProvider services={mock.services}>
        <Consumer />
      </AuthSessionProvider>
    );

    view.unmount();

    expect(mock.removeAuth).toHaveBeenCalledTimes(1);
    expect(mock.removeAuthorization).toHaveBeenCalledTimes(1);
  });
});
