export interface AuthUser {
  readonly id: string;
  readonly email: string | null;
  readonly emailConfirmedAt: string | null;
}

export interface AuthSession {
  readonly expiresAt: number | null;
  readonly user: AuthUser;
}

export type PublicAuthErrorCode =
  | 'invalid_input'
  | 'invalid_credentials'
  | 'weak_password'
  | 'rate_limited'
  | 'network_error'
  | 'service_unavailable'
  | 'unknown';

export interface PublicAuthError {
  readonly code: PublicAuthErrorCode;
  readonly message: string;
}

export type AuthState =
  | { readonly status: 'loading' }
  | { readonly status: 'guest' }
  | {
      readonly status: 'authenticated';
      readonly user: AuthUser;
      readonly session: AuthSession;
    }
  | {
      readonly status: 'error';
      readonly error: PublicAuthError;
    };

export type ReadyAuthState = Exclude<AuthState, { readonly status: 'loading' }>;

export type SignInResult =
  | {
      readonly status: 'authenticated';
      readonly user: AuthUser;
      readonly session: AuthSession;
    }
  | {
      readonly status: 'error';
      readonly error: PublicAuthError;
    };

export type SignUpResult =
  | {
      readonly status: 'confirmation_required';
      readonly email: string;
    }
  | {
      readonly status: 'authenticated';
      readonly user: AuthUser;
      readonly session: AuthSession;
    }
  | {
      readonly status: 'error';
      readonly error: PublicAuthError;
    };

export type SignOutResult =
  | { readonly status: 'guest' }
  | {
      readonly status: 'error';
      readonly error: PublicAuthError;
    };

export type CurrentUserResult =
  | { readonly status: 'guest' }
  | {
      readonly status: 'authenticated';
      readonly user: AuthUser;
    }
  | {
      readonly status: 'error';
      readonly error: PublicAuthError;
    };

export type AuthEvent =
  | 'initial_session'
  | 'signed_in'
  | 'signed_out'
  | 'token_refreshed'
  | 'user_updated'
  | 'password_recovery'
  | 'mfa_challenge_verified'
  | 'unknown';

export interface AuthStateChange {
  readonly event: AuthEvent;
  readonly state: ReadyAuthState;
}

export interface SignInCredentials {
  readonly email: string;
  readonly password: string;
}

export interface SignUpCredentials {
  readonly email: string;
  readonly password: string;
  readonly emailRedirectTo?: string;
}

export type AuthStateChangeListener = (change: AuthStateChange) => void;
