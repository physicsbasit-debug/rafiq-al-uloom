import { type ReactNode, useState } from 'react';

import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';
import type { SignOutResult } from '@services/auth/auth.types';
import type { AuthorizationState } from '@services/auth/authorization.types';

type BlockingAuthorizationState = Exclude<
  AuthorizationState,
  { readonly status: 'authorized' }
>;

type AccountStatusState =
  | BlockingAuthorizationState
  | { readonly status: 'session_loading' }
  | { readonly status: 'session_error'; readonly message: string };

interface AccountStatusViewProps {
  readonly state: AccountStatusState;
  readonly onRetry: () => Promise<void>;
  readonly onSignOut: () => Promise<SignOutResult>;
}

interface StatusContent {
  readonly title: string;
  readonly description: string;
  readonly retry: boolean;
}

export function AccountStatusView({ state, onRetry, onSignOut }: AccountStatusViewProps) {
  const [busyAction, setBusyAction] = useState<'retry' | 'sign_out' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (state.status === 'session_loading' || state.status === 'loading_profile') {
    return (
      <StatusCard
        role="status"
        title="جارٍ تجهيز حسابك"
        description="نتحقق من الجلسة وصلاحية الحساب قبل عرض المحتوى."
      />
    );
  }

  const content = getStatusContent(state);

  async function runRetry() {
    setBusyAction('retry');
    setActionError(null);

    try {
      await onRetry();
    } finally {
      setBusyAction(null);
    }
  }

  async function runSignOut() {
    setBusyAction('sign_out');
    setActionError(null);

    try {
      const result = await onSignOut();
      if (result.status === 'error') {
        setActionError(result.error.message);
      }
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <StatusCard role="alert" title={content.title} description={content.description}>
      <div style={{ display: 'grid', gap: spacing.md, marginTop: spacing.xl }}>
        {content.retry ? (
          <button
            type="button"
            onClick={runRetry}
            disabled={busyAction !== null}
            style={primaryButtonStyle}
          >
            {busyAction === 'retry' ? 'جارٍ إعادة المحاولة...' : 'إعادة المحاولة'}
          </button>
        ) : null}

        <button
          type="button"
          onClick={runSignOut}
          disabled={busyAction !== null}
          style={secondaryButtonStyle}
        >
          {busyAction === 'sign_out' ? 'جارٍ تسجيل الخروج...' : 'تسجيل الخروج'}
        </button>
      </div>

      <div aria-live="polite">
        {actionError ? (
          <p role="alert" style={{ color: colors.errorDark }}>
            {actionError}
          </p>
        ) : null}
      </div>
    </StatusCard>
  );
}

function getStatusContent(
  state: Exclude<AccountStatusState, { readonly status: 'session_loading' | 'loading_profile' }>
): StatusContent {
  switch (state.status) {
    case 'pending':
      return {
        title: 'الحساب في انتظار التفعيل',
        description: 'تم إنشاء الحساب، لكنه لم يُفعّل بعد للوصول إلى المحتوى السحابي.',
        retry: true,
      };
    case 'suspended':
      return {
        title: 'الحساب موقوف',
        description: 'لا يمكن لهذا الحساب الوصول إلى المحتوى السحابي حاليًا.',
        retry: false,
      };
    case 'profile_error':
      return {
        title: 'تعذر قراءة بيانات الحساب',
        description: state.error.message,
        retry: true,
      };
    case 'session_error':
      return {
        title: 'تعذر استعادة الجلسة',
        description: state.message,
        retry: true,
      };
  }
}

interface StatusCardProps {
  readonly title: string;
  readonly description: string;
  readonly children?: ReactNode;
  readonly role: 'status' | 'alert';
}

function StatusCard({ title, description, children, role }: StatusCardProps) {
  return (
    <section
      role={role}
      style={{
        maxWidth: '560px',
        margin: '0 auto',
        border: `1px solid ${colors.border}`,
        borderRadius: radius.xl,
        backgroundColor: colors.surface,
        padding: spacing.xl,
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <h2 style={{ margin: 0 }}>{title}</h2>
      <p style={{ color: colors.textSecondary, lineHeight: typography.lineHeight.lg }}>
        {description}
      </p>
      {children}
    </section>
  );
}

const primaryButtonStyle = {
  minHeight: '48px',
  border: `1px solid ${colors.primary}`,
  borderRadius: radius.md,
  backgroundColor: colors.primary,
  color: colors.surface,
  fontFamily: 'inherit',
  fontWeight: typography.fontWeight.bold,
  cursor: 'pointer',
} as const;

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  backgroundColor: colors.surface,
  color: colors.primary,
} as const;
