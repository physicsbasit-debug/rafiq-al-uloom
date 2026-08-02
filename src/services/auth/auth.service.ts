import type {
  AuthChangeEvent,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';

import { getSupabaseClient } from '@services/data/supabase-client';

import {
  createAuthDiagnosticError,
  isAbortError,
  isPotentialExistingUserError,
  toPublicAuthError,
} from './auth.errors';
import type {
  AuthEvent,
  AuthSession,
  AuthState,
  AuthStateChange,
  AuthStateChangeListener,
  AuthUser,
  CurrentUserResult,
  PublicAuthError,
  ReadyAuthState,
  SignInCredentials,
  SignInResult,
  SignOutResult,
  SignUpCredentials,
  SignUpResult,
} from './auth.types';

export interface AuthService {
  getCurrentSession(): Promise<AuthState>;
  getCurrentUser(): Promise<CurrentUserResult>;
  signInWithPassword(credentials: SignInCredentials): Promise<SignInResult>;
  signUp(credentials: SignUpCredentials): Promise<SignUpResult>;
  signOut(): Promise<SignOutResult>;
  onAuthStateChange(listener: AuthStateChangeListener): () => void;
}

export interface AuthServiceOptions {
  readonly reportDiagnostic?: (error: Error) => void;
}

type AuthClient = Pick<SupabaseClient, 'auth'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? null,
    emailConfirmedAt: user.email_confirmed_at ?? null,
  };
}

function mapSession(session: Session): AuthSession {
  return {
    expiresAt: session.expires_at ?? null,
    user: mapUser(session.user),
  };
}

function authenticatedState(session: Session): ReadyAuthState {
  const mappedSession = mapSession(session);

  return {
    status: 'authenticated',
    user: mappedSession.user,
    session: mappedSession,
  };
}

function mapAuthEvent(event: AuthChangeEvent): AuthEvent {
  switch (event) {
    case 'INITIAL_SESSION':
      return 'initial_session';
    case 'SIGNED_IN':
      return 'signed_in';
    case 'SIGNED_OUT':
      return 'signed_out';
    case 'TOKEN_REFRESHED':
      return 'token_refreshed';
    case 'USER_UPDATED':
      return 'user_updated';
    case 'PASSWORD_RECOVERY':
      return 'password_recovery';
    case 'MFA_CHALLENGE_VERIFIED':
      return 'mfa_challenge_verified';
    default:
      return 'unknown';
  }
}

function validateCredentials(credentials: SignInCredentials | SignUpCredentials): PublicAuthError | null {
  const email = credentials.email.trim();

  if (!EMAIL_PATTERN.test(email) || !credentials.password) {
    return toPublicAuthError({ code: 'validation_failed' });
  }

  return null;
}

export function createAuthService(
  client: AuthClient,
  options: AuthServiceOptions = {}
): AuthService {
  const listeners = new Set<AuthStateChangeListener>();
  let removeSupabaseListener: (() => void) | undefined;

  const reportDiagnostic = options.reportDiagnostic ?? (() => undefined);

  function report(operation: string, publicError: PublicAuthError, cause: unknown): void {
    reportDiagnostic(createAuthDiagnosticError(operation, publicError, cause));
  }

  function safeError(operation: string, error: unknown): PublicAuthError {
    const publicError = toPublicAuthError(error);
    report(operation, publicError, error);
    return publicError;
  }

  function ensureAuthSubscription(): void {
    if (removeSupabaseListener) {
      return;
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      const change: AuthStateChange = {
        event: mapAuthEvent(event),
        state: session ? authenticatedState(session) : { status: 'guest' },
      };

      queueMicrotask(() => {
        for (const listener of [...listeners]) {
          listener(change);
        }
      });
    });

    removeSupabaseListener = () => {
      subscription.unsubscribe();
      removeSupabaseListener = undefined;
    };
  }

  return {
    async getCurrentSession(): Promise<AuthState> {
      try {
        const { data, error } = await client.auth.getSession();

        if (error) {
          return { status: 'error', error: safeError('getCurrentSession', error) };
        }

        return data.session ? authenticatedState(data.session) : { status: 'guest' };
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        return { status: 'error', error: safeError('getCurrentSession', error) };
      }
    },

    async getCurrentUser(): Promise<CurrentUserResult> {
      try {
        const { data, error } = await client.auth.getUser();

        if (error) {
          return { status: 'error', error: safeError('getCurrentUser', error) };
        }

        return data.user
          ? { status: 'authenticated', user: mapUser(data.user) }
          : { status: 'guest' };
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        return { status: 'error', error: safeError('getCurrentUser', error) };
      }
    },

    async signInWithPassword(credentials: SignInCredentials): Promise<SignInResult> {
      const validationError = validateCredentials(credentials);
      if (validationError) {
        return { status: 'error', error: validationError };
      }

      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: credentials.email.trim(),
          password: credentials.password,
        });

        if (error) {
          return { status: 'error', error: safeError('signInWithPassword', error) };
        }

        if (!data.user || !data.session) {
          return {
            status: 'error',
            error: safeError('signInWithPassword', new Error('Missing authenticated session')),
          };
        }

        const session = mapSession(data.session);
        return { status: 'authenticated', user: session.user, session };
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        return { status: 'error', error: safeError('signInWithPassword', error) };
      }
    },

    async signUp(credentials: SignUpCredentials): Promise<SignUpResult> {
      const email = credentials.email.trim();
      const validationError = validateCredentials(credentials);
      if (validationError) {
        return { status: 'error', error: validationError };
      }

      try {
        const { data, error } = await client.auth.signUp({
          email,
          password: credentials.password,
          options: credentials.emailRedirectTo
            ? { emailRedirectTo: credentials.emailRedirectTo }
            : undefined,
        });

        if (error) {
          if (isPotentialExistingUserError(error)) {
            return { status: 'confirmation_required', email };
          }

          return { status: 'error', error: safeError('signUp', error) };
        }

        if (!data.session) {
          return { status: 'confirmation_required', email };
        }

        const session = mapSession(data.session);
        return { status: 'authenticated', user: session.user, session };
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        return { status: 'error', error: safeError('signUp', error) };
      }
    },

    async signOut(): Promise<SignOutResult> {
      try {
        const { error } = await client.auth.signOut();

        if (error) {
          return { status: 'error', error: safeError('signOut', error) };
        }

        return { status: 'guest' };
      } catch (error) {
        if (isAbortError(error)) {
          throw error;
        }

        return { status: 'error', error: safeError('signOut', error) };
      }
    },

    onAuthStateChange(listener: AuthStateChangeListener): () => void {
      listeners.add(listener);
      ensureAuthSubscription();

      let active = true;
      return () => {
        if (!active) {
          return;
        }

        active = false;
        listeners.delete(listener);

        if (listeners.size === 0) {
          removeSupabaseListener?.();
        }
      };
    },
  };
}

let defaultAuthService: AuthService | undefined;

function getDefaultAuthService(): AuthService {
  defaultAuthService ??= createAuthService(getSupabaseClient());
  return defaultAuthService;
}

export const authService: AuthService = {
  getCurrentSession: () => getDefaultAuthService().getCurrentSession(),
  getCurrentUser: () => getDefaultAuthService().getCurrentUser(),
  signInWithPassword: (credentials) =>
    getDefaultAuthService().signInWithPassword(credentials),
  signUp: (credentials) => getDefaultAuthService().signUp(credentials),
  signOut: () => getDefaultAuthService().signOut(),
  onAuthStateChange: (listener) => getDefaultAuthService().onAuthStateChange(listener),
};
