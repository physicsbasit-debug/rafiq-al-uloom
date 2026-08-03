import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { authService } from '@services/auth/auth.service';
import type {
  AuthState,
  SignInCredentials,
  SignInResult,
  SignOutResult,
  SignUpCredentials,
  SignUpResult,
} from '@services/auth/auth.types';
import { authorizationService } from '@services/auth/authorization.service';
import type { AuthorizationState } from '@services/auth/authorization.types';

import {
  AuthSessionContext,
  type AuthEntryMode,
  type AuthSessionServices,
} from './useAuthSession';

interface AuthSessionProviderProps {
  readonly children: ReactNode;
  readonly services?: AuthSessionServices;
}

const DEFAULT_SERVICES: AuthSessionServices = {
  auth: authService,
  authorization: authorizationService,
};

export function AuthSessionProvider({
  children,
  services = DEFAULT_SERVICES,
}: AuthSessionProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' });
  const [authorizationState, setAuthorizationState] = useState<AuthorizationState | null>(() =>
    services.authorization.getCurrentState()
  );
  const [entryMode, setEntryMode] = useState<AuthEntryMode>('closed');
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const authEventVersionRef = useRef(0);

  useEffect(() => {
    let active = true;
    const initialEventVersion = authEventVersionRef.current;

    // Subscribe to Authorization first so INITIAL_SESSION can start the profile
    // request before the UI consumes the matching authenticated Auth state.
    const removeAuthorizationListener = services.authorization.onAuthorizationStateChange(
      (state) => {
        if (active) {
          setAuthorizationState(state);
        }
      }
    );

    const removeAuthListener = services.auth.onAuthStateChange((change) => {
      if (!active) {
        return;
      }

      authEventVersionRef.current += 1;
      setAuthState(change.state);

      if (change.state.status === 'authenticated') {
        setEntryMode('closed');
        setConfirmationEmail(null);
      } else {
        setAuthorizationState(null);
      }
    });

    void services.auth.getCurrentSession().then((state) => {
      if (
        !active ||
        authEventVersionRef.current !== initialEventVersion
      ) {
        return;
      }

      // For an existing authenticated session we deliberately wait for the
      // INITIAL_SESSION event. That event is what also synchronizes the
      // Authorization service with the same user and prevents UI flicker.
      if (state.status !== 'authenticated') {
        setAuthState(state);
        setAuthorizationState(null);
      }
    });

    return () => {
      active = false;
      authEventVersionRef.current += 1;
      removeAuthListener();
      removeAuthorizationListener();
    };
  }, [services]);

  const openSignIn = useCallback(() => {
    setConfirmationEmail(null);
    setEntryMode('sign_in');
  }, []);

  const openSignUp = useCallback(() => {
    setConfirmationEmail(null);
    setEntryMode('sign_up');
  }, []);

  const closeAuthEntry = useCallback(() => {
    setConfirmationEmail(null);
    setEntryMode('closed');
  }, []);

  const signIn = useCallback(
    async (credentials: SignInCredentials): Promise<SignInResult> => {
      const result = await services.auth.signInWithPassword(credentials);

      if (result.status === 'authenticated') {
        authEventVersionRef.current += 1;
        setAuthState({
          status: 'authenticated',
          user: result.user,
          session: result.session,
        });
        setEntryMode('closed');
        setConfirmationEmail(null);
      }

      return result;
    },
    [services]
  );

  const signUp = useCallback(
    async (credentials: SignUpCredentials): Promise<SignUpResult> => {
      const result = await services.auth.signUp(credentials);

      if (result.status === 'confirmation_required') {
        setConfirmationEmail(result.email);
        setEntryMode('confirmation_required');
      } else if (result.status === 'authenticated') {
        authEventVersionRef.current += 1;
        setAuthState({
          status: 'authenticated',
          user: result.user,
          session: result.session,
        });
        setEntryMode('closed');
        setConfirmationEmail(null);
      }

      return result;
    },
    [services]
  );

  const signOut = useCallback(async (): Promise<SignOutResult> => {
    const result = await services.auth.signOut();

    if (result.status === 'guest') {
      authEventVersionRef.current += 1;
      setAuthState({ status: 'guest' });
      setAuthorizationState(null);
      setEntryMode('closed');
      setConfirmationEmail(null);
    }

    return result;
  }, [services]);

  const refreshAuthorization = useCallback(
    () => services.authorization.refreshAuthorization(),
    [services]
  );

  const retrySession = useCallback(async (): Promise<void> => {
    const requestVersion = authEventVersionRef.current + 1;
    authEventVersionRef.current = requestVersion;
    setAuthState({ status: 'loading' });

    const state = await services.auth.getCurrentSession();
    if (authEventVersionRef.current !== requestVersion) {
      return;
    }

    if (state.status !== 'authenticated') {
      setAuthState(state);
      setAuthorizationState(null);
      return;
    }

    setAuthState(state);
    await services.authorization.refreshAuthorization();
  }, [services]);

  const value = useMemo(
    () => ({
      authState,
      authorizationState,
      entryMode,
      confirmationEmail,
      openSignIn,
      openSignUp,
      closeAuthEntry,
      signIn,
      signUp,
      signOut,
      refreshAuthorization,
      retrySession,
    }),
    [
      authState,
      authorizationState,
      entryMode,
      confirmationEmail,
      openSignIn,
      openSignUp,
      closeAuthEntry,
      signIn,
      signUp,
      signOut,
      refreshAuthorization,
      retrySession,
    ]
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}
