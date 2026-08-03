import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';

import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';
import type { AuthSessionContextValue } from './useAuthSession';

interface AuthEntryViewProps {
  readonly session: Pick<
    AuthSessionContextValue,
    | 'entryMode'
    | 'confirmationEmail'
    | 'signIn'
    | 'signUp'
    | 'openSignIn'
    | 'openSignUp'
    | 'closeAuthEntry'
  >;
}

export function AuthEntryView({ session }: AuthEntryViewProps) {
  return (
    <section
      aria-label="المصادقة"
      style={{
        maxWidth: '560px',
        margin: '0 auto',
        border: `1px solid ${colors.border}`,
        borderRadius: radius.xl,
        backgroundColor: colors.surface,
        boxShadow: 'var(--shadow-lg)',
        padding: spacing.xl,
      }}
    >
      {session.entryMode === 'sign_in' ? (
        <SignInForm
          onSubmit={session.signIn}
          onCreateAccount={session.openSignUp}
          onCancel={session.closeAuthEntry}
        />
      ) : null}

      {session.entryMode === 'sign_up' ? (
        <SignUpForm
          onSubmit={session.signUp}
          onSignIn={session.openSignIn}
          onCancel={session.closeAuthEntry}
        />
      ) : null}

      {session.entryMode === 'confirmation_required' ? (
        <div role="status" aria-live="polite">
          <h2 style={{ margin: 0, color: colors.textPrimary }}>راجع بريدك الإلكتروني</h2>
          <p
            style={{
              margin: `${spacing.md} 0`,
              color: colors.textSecondary,
              lineHeight: typography.lineHeight.lg,
            }}
          >
            أرسلنا تعليمات تأكيد الحساب إلى البريد المدخل. أكمل التأكيد ثم عد إلى تسجيل
            الدخول.
          </p>
          {session.confirmationEmail ? (
            <p dir="ltr" style={{ textAlign: 'left', fontWeight: typography.fontWeight.bold }}>
              {session.confirmationEmail}
            </p>
          ) : null}
          <div style={{ display: 'grid', gap: spacing.md, marginTop: spacing.xl }}>
            <button
              type="button"
              onClick={session.openSignIn}
              style={{
                minHeight: '48px',
                border: `1px solid ${colors.primary}`,
                borderRadius: radius.md,
                backgroundColor: colors.primary,
                color: colors.surface,
                fontFamily: 'inherit',
                fontWeight: typography.fontWeight.bold,
                cursor: 'pointer',
              }}
            >
              العودة إلى تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={session.closeAuthEntry}
              style={{
                minHeight: '44px',
                border: `1px solid ${colors.borderStrong}`,
                borderRadius: radius.md,
                backgroundColor: colors.surface,
                color: colors.textSecondary,
                fontFamily: 'inherit',
                fontWeight: typography.fontWeight.bold,
                cursor: 'pointer',
              }}
            >
              العودة إلى موضعي السابق
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
