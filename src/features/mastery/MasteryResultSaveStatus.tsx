import { AppButton } from '@design-system/components/AppButton';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import type { MasterySaveState } from './mastery-result-save.types';

interface MasteryResultSaveStatusProps {
  readonly state: MasterySaveState;
  readonly onRetry: () => void;
}

export function MasteryResultSaveStatus({
  state,
  onRetry,
}: MasteryResultSaveStatusProps) {
  if (state.status === 'idle' || state.status === 'not_applicable') {
    return null;
  }

  if (state.status === 'saving') {
    return (
      <p role="status" data-save-status="saving" style={{ color: colors.textSecondary }}>
        جارٍ حفظ النتيجة في حسابك...
      </p>
    );
  }

  if (state.status === 'saved') {
    return (
      <p role="status" data-save-status="saved" style={{ color: colors.successDark, fontWeight: 800 }}>
        {state.reconciliation === 'display_reconciled_to_server'
          ? 'تم حفظ النتيجة واعتماد الدرجة الرسمية.'
          : 'تم حفظ النتيجة في حسابك.'}
      </p>
    );
  }

  const isUnavailable =
    state.failure.kind === 'submission' && state.failure.result.status === 'unavailable';
  return (
    <div
      role="alert"
      data-save-status="failed"
      style={{
        display: 'grid',
        gap: spacing.sm,
        border: `1px solid ${colors.warning}`,
        borderRadius: radius.md,
        padding: spacing.md,
      }}
    >
      <p style={{ margin: 0, color: colors.textPrimary }}>
        {isUnavailable
          ? 'ظهرت نتيجتك، لكن تعذر حفظها الآن.'
          : 'ظهرت نتيجتك، لكن لم يتم اعتماد حفظها.'}
      </p>
      {state.retryable ? (
        <div style={{ maxWidth: '220px' }}>
          <AppButton label="إعادة محاولة الحفظ" variant="secondary" onClick={onRetry} />
        </div>
      ) : null}
    </div>
  );
}
