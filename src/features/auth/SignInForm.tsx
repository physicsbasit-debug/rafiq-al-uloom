import { type ChangeEvent, type FormEvent, useState } from 'react';

import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';
import type { SignInCredentials, SignInResult } from '@services/auth/auth.types';

interface SignInFormProps {
  readonly onSubmit: (credentials: SignInCredentials) => Promise<SignInResult>;
  readonly onCreateAccount: () => void;
  readonly onCancel: () => void;
}

const INVALID_CREDENTIALS_HINT =
  'تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور، وإن كنت قد أنشأت حسابك مؤخرًا فتأكد من إكمال تأكيد البريد الإلكتروني.';

const REQUIRED_FIELDS_MESSAGE = 'أدخل البريد الإلكتروني وكلمة المرور.';

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

export function SignInForm({ onSubmit, onCreateAccount, onCancel }: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    if (!email.trim() || !password) {
      setErrorMessage(REQUIRED_FIELDS_MESSAGE);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const result = await onSubmit({ email: email.trim(), password });

      if (result.status === 'error') {
        setErrorMessage(
          result.error.code === 'invalid_credentials'
            ? INVALID_CREDENTIALS_HINT
            : result.error.message
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form noValidate onSubmit={handleSubmit} aria-labelledby="sign-in-title">
      <h2 id="sign-in-title" style={{ margin: 0, color: colors.textPrimary }}>
        تسجيل الدخول
      </h2>
      <p
        style={{
          margin: `${spacing.sm} 0 ${spacing.xl}`,
          color: colors.textSecondary,
          lineHeight: typography.lineHeight.lg,
        }}
      >
        أدخل بيانات حسابك للمتابعة، أو عد إلى موضعك الحالي كزائر.
      </p>

      <div style={{ display: 'grid', gap: spacing.lg }}>
        <label style={{ display: 'grid', gap: spacing.sm, fontWeight: typography.fontWeight.bold }}>
          <span>البريد الإلكتروني</span>
          <input
            id="sign-in-email"
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
            id="sign-in-password"
            name="password"
            type="password"
            dir="ltr"
            autoComplete="current-password"
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
          {isSubmitting ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
        </button>

        <button type="button" onClick={onCreateAccount} disabled={isSubmitting} style={secondaryButtonStyle}>
          إنشاء حساب جديد
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
