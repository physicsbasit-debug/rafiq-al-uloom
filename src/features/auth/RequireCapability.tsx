import type { ReactNode } from 'react';

import { colors } from '@design-system/theme/colors';
import type { AuthorizationOperation } from '@services/auth/authorization.operations';
import type {
  AuthorizationDecision,
  AuthorizationDecisionReason,
} from '@services/auth/authorization.policy';

import { useAuthorizationDecision } from './useAuthorizationDecision';

interface RequireCapabilityProps {
  readonly operation: AuthorizationOperation;
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}

const REJECTION_MESSAGES: Record<
  Exclude<AuthorizationDecisionReason, 'allowed'>,
  string
> = {
  guest: 'هذه العملية تتطلب حسابًا نشطًا.',
  profile_loading: 'جارٍ التحقق من صلاحيات الحساب.',
  session_error: 'تعذر التحقق من جلسة الحساب.',
  profile_error: 'تعذر التحقق من صلاحيات الحساب.',
  account_pending: 'الحساب في انتظار التفعيل.',
  account_suspended: 'الحساب موقوف حاليًا.',
  role_not_allowed: 'لا يملك هذا الحساب صلاحية تنفيذ العملية.',
  operation_not_available: 'هذه الميزة غير متاحة بعد.',
};

function DefaultAuthorizationFallback({
  decision,
}: {
  readonly decision: Exclude<AuthorizationDecision, { readonly allowed: true }>;
}) {
  return (
    <section
      role="alert"
      aria-live="polite"
      style={{
        padding: '1rem',
        borderRadius: '0.75rem',
        backgroundColor: colors.surface,
        color: colors.textPrimary,
        boxShadow: '0 8px 24px rgba(31, 41, 55, 0.08)',
      }}
    >
      <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem' }}>تعذر فتح هذه المساحة</h2>
      <p style={{ margin: 0, lineHeight: 1.7 }}>
        {REJECTION_MESSAGES[decision.reason]}
      </p>
    </section>
  );
}

export function RequireCapability({
  operation,
  children,
  fallback,
}: RequireCapabilityProps) {
  const decision = useAuthorizationDecision(operation);

  if (!decision.allowed) {
    return fallback ?? <DefaultAuthorizationFallback decision={decision} />;
  }

  return children;
}
