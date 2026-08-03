import { useState } from 'react';

import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';
import type { SignOutResult } from '@services/auth/auth.types';

interface GuestControlsProps {
  readonly mode: 'guest';
  readonly onSignIn: () => void;
  readonly onSignUp: () => void;
}

interface AuthenticatedControlsProps {
  readonly mode: 'authenticated';
  readonly email: string | null;
  readonly onSignOut: () => Promise<SignOutResult>;
}

type AccountControlsProps = GuestControlsProps | AuthenticatedControlsProps;

export function AccountControls(props: AccountControlsProps) {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (props.mode === 'guest') {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md }}>
        <button type="button" onClick={props.onSignIn} style={buttonStyle(true)}>
          تسجيل الدخول
        </button>
        <button type="button" onClick={props.onSignUp} style={buttonStyle(false)}>
          إنشاء حساب
        </button>
      </div>
    );
  }

  const { email, onSignOut } = props;

  async function handleSignOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    setErrorMessage(null);
    try {
      const result = await onSignOut();
      if (result.status === 'error') setErrorMessage(result.error.message);
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div style={{ marginTop: spacing.md }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: spacing.sm }}>
        {email ? <span dir="ltr">{email}</span> : null}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={isSigningOut}
          style={buttonStyle(false)}
        >
          {isSigningOut ? 'جارٍ تسجيل الخروج...' : 'تسجيل الخروج'}
        </button>
      </div>
      <div aria-live="polite">{errorMessage ? <span role="alert">{errorMessage}</span> : null}</div>
    </div>
  );
}

function buttonStyle(primary: boolean) {
  return {
    minHeight: '40px',
    border: `1px solid ${primary ? colors.surface : 'rgba(255,255,255,0.75)'}`,
    borderRadius: radius.md,
    backgroundColor: primary ? colors.surface : 'transparent',
    color: primary ? colors.primary : colors.surface,
    padding: `${spacing.sm} ${spacing.lg}`,
    fontFamily: 'inherit',
    fontWeight: typography.fontWeight.bold,
    cursor: 'pointer',
  } as const;
}
