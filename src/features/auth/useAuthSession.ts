import { createContext, useContext } from 'react';

import type { AuthService } from '@services/auth/auth.service';
import type {
  AuthState,
  SignInCredentials,
  SignInResult,
  SignOutResult,
  SignUpCredentials,
  SignUpResult,
} from '@services/auth/auth.types';
import type { AuthorizationService } from '@services/auth/authorization.service';
import type { AuthorizationState } from '@services/auth/authorization.types';

export type AuthEntryMode = 'closed' | 'sign_in' | 'sign_up' | 'confirmation_required';

export interface AuthSessionContextValue {
  readonly authState: AuthState;
  readonly authorizationState: AuthorizationState | null;
  readonly entryMode: AuthEntryMode;
  readonly confirmationEmail: string | null;
  openSignIn(): void;
  openSignUp(): void;
  closeAuthEntry(): void;
  signIn(credentials: SignInCredentials): Promise<SignInResult>;
  signUp(credentials: SignUpCredentials): Promise<SignUpResult>;
  signOut(): Promise<SignOutResult>;
  refreshAuthorization(): Promise<void>;
  retrySession(): Promise<void>;
}

export interface AuthSessionServices {
  readonly auth: AuthService;
  readonly authorization: AuthorizationService;
}

export const AuthSessionContext = createContext<AuthSessionContextValue | undefined>(undefined);

export function useAuthSession(): AuthSessionContextValue {
  const value = useContext(AuthSessionContext);

  if (!value) {
    throw new Error('useAuthSession must be used within AuthSessionProvider');
  }

  return value;
}
