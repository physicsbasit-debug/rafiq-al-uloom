import type { ReactNode } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import type { ContentQueryError } from '@services/queries/query.types';
import { isClientAsyncAbortError } from '@services/runtime/client-async-boundary';

interface QueryBoundaryProps {
  isLoading: boolean;
  error: ContentQueryError | null;
  onRetry: () => void;
  children: ReactNode;
}

function publicQueryErrorMessage(error: ContentQueryError): string {
  if (!error.cause) {
    return error.message;
  }

  if (isClientAsyncAbortError(error.cause) && error.cause.source === 'timeout') {
    return 'استغرق تحميل البيانات وقتًا أطول من المتوقع. حاول مرة أخرى.';
  }

  return 'تعذر تحميل البيانات. حاول مرة أخرى.';
}

export function QueryBoundary({ isLoading, error, onRetry, children }: QueryBoundaryProps) {
  if (isLoading) {
    return (
      <div
        role="status"
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          padding: spacing.lg,
          backgroundColor: colors.surfaceMuted,
          color: colors.textSecondary,
        }}
      >
        جارٍ تحميل البيانات...
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        style={{
          border: `1px solid ${colors.error}`,
          borderRadius: radius.md,
          padding: spacing.lg,
          backgroundColor: colors.errorSoft,
          color: colors.errorDark,
        }}
      >
        <p style={{ margin: `0 0 ${spacing.md}` }}>{publicQueryErrorMessage(error)}</p>
        <AppButton label="إعادة المحاولة" variant="secondary" onClick={onRetry} />
      </div>
    );
  }

  return <>{children}</>;
}
