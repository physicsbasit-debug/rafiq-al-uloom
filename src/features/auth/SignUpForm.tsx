import { type ChangeEvent, type FormEvent, useState } from 'react';

import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';
import type { SignUpCredentials, SignUpResult } from '@services/auth/auth.types';

interface SignUpFormProps {
  readonly onSubmit: (credentials: SignUpCredentials) => Promise<SignUpResult>;
  readonly onSignIn: () => void;
  readonly onCancel: () => void;
}

const REQUIRED_FIELDS_MESSAGE = 'أكمل البريد الإلكتروني وكلمتي المرور.';
const PASSWORD_MISMATCH_MESSAGE = 'كلمتا المرور غير متطابقتين.';

const inputStyle = {
  width: '100%',
  minHeight: '48px',
  border: `1px solid ${colors.borderStrong}`,
  borderRadius: radius.md,
  padding: `${spacing.md} ${spacing.lg}`,
  backgroundColor: colors.surface,
  color: colors.textPrimary,
  fontFamily: 'inherit',
  fontSize: typography.fontSize.md,
} as const;

const secondaryButtonStyle = {
  minHeight: '44px',
  border: `1px solid ${colors.primary}`,
  borderRadius: radius.md,
  backgroundColor: colors.surface,
  color: colors.primary,
  padding: `${spacing.md} ${spacing.lg}`,
  fontFamily: 'inherit',
  fontWeight: typography.fontWeight.bold,
  cursor: 'pointer',
} as const;

export function SignUpForm({ onSubmit, onSignIn, onCancel }: SignUpFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!email.trim() || !password || !passwordConfirmation) {
      setErrorMessage(REQUIRED_FIELDS_MESSAGE);
      return;
    }

    if (password !== passwordConfirmation) {
      setErrorMessage(PASSWORD_MISMATCH_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await onSubmit({ email: email.trim(), password });

      if (result.status === 'error') {
        setErrorMessage(result.error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-labelledby="sign-up-title">
      <h2 id="sign-up-title" style={{ margin: 0, color: colors.textPrimary }}>
        إنشاء حساب
      </h2>
      <p
        style={{
          margin: `${spacing.sm} 0 ${spacing.xl}`,
          color: colors.textSecondary,
          lineHeight: typography.lineHeight.lg,
        }}
      >
        ينشأ الحساب بدور طالب وحالة معلّقة حتى يكتمل التفعيل.
      </p>

      <div style={{ display: 'grid', gap: spacing.lg }}>
        <label style={{ display: 'grid', gap: spacing.sm, fontWeight: typography.fontWeight.bold }}>
          <span>البريد الإلكتروني</span>
          <input
            id="sign-up-email"
            name="email"
            type="email"
            dir="ltr"
            autoComplete="email"
            required
            value={email}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setEmail(event.target.value);
              setErrorMessage(null);
            }}
            disabled={isSubmitting}
            style={{ ...inputStyle, textAlign: 'left' }}
          />
        </label>

        <label style={{ display: 'grid', gap: spacing.sm, fontWeight: typography.fontWeight.bold }}>
          <span>كلمة المرور</span>
          <input
            id="sign-up-password"
            name="password"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setPassword(event.target.value);
              setErrorMessage(null);
            }}
            disabled={isSubmitting}
            style={{ ...inputStyle, textAlign: 'left' }}
          />
        </label>

        <label style={{ display: 'grid', gap: spacing.sm, fontWeight: typography.fontWeight.bold }}>
          <span>تأكيد كلمة المرور</span>
          <input
            id="sign-up-password-confirmation"
            name="passwordConfirmation"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            required
            value={passwordConfirmation}
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setPasswordConfirmation(event.target.value);
              setErrorMessage(null);
            }}
            disabled={isSubmitting}
            style={{ ...inputStyle, textAlign: 'left' }}
          />
        </label>
      </div>

      <div
        aria-live="polite"
        style={{
          minHeight: '3.25rem',
          marginTop: spacing.md,
          color: colors.errorDark,
          lineHeight: typography.lineHeight.lg,
        }}
      >
        {errorMessage ? <p role="alert" style={{ margin: 0 }}>{errorMessage}</p> : null}
      </div>

      <div style={{ display: 'grid', gap: spacing.md }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            minHeight: '48px',
            border: `1px solid ${colors.primary}`,
            borderRadius: radius.md,
            backgroundColor: isSubmitting ? colors.disabledBackground : colors.primary,
            color: isSubmitting ? colors.disabledText : colors.surface,
            padding: `${spacing.md} ${spacing.lg}`,
            fontFamily: 'inherit',
            fontWeight: typography.fontWeight.bold,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'جارٍ إنشاء الحساب...' : 'إنشاء الحساب'}
        </button>

        <button type="button" onClick={onSignIn} disabled={isSubmitting} style={secondaryButtonStyle}>
          لدي حساب بالفعل
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          style={{
            ...secondaryButtonStyle,
            borderColor: colors.borderStrong,
            color: colors.textSecondary,
          }}
        >
          العودة إلى موضعي السابق
        </button>
      </div>
    </form>
  );
}
