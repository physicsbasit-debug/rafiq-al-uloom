import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';

interface ChoiceButtonProps {
  label: string;
  choice: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  selectedHint?: string;
}

export function ChoiceButton({ label, choice, selected, disabled, onClick, selectedHint }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={selected}
      style={{
        minHeight: '52px',
        width: '100%',
        display: 'grid',
        gridTemplateColumns: '2.2rem 1fr',
        alignItems: 'center',
        gap: spacing.md,
        textAlign: 'right',
        border: selected ? `2px solid ${colors.primary}` : `1px solid ${colors.borderStrong}`,
        borderRadius: radius.lg,
        backgroundColor: selected ? colors.primarySoft : colors.surfaceMuted,
        color: colors.textPrimary,
        padding: `${spacing.md} ${spacing.md}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        fontSize: typography.fontSize.md,
        lineHeight: typography.lineHeight.lg,
      }}
    >
      <span
        dir="ltr"
        aria-hidden="true"
        style={{
          display: 'inline-grid',
          placeItems: 'center',
          width: '2rem',
          height: '2rem',
          borderRadius: radius.pill,
          backgroundColor: selected ? colors.primary : colors.surface,
          color: selected ? colors.surface : colors.textPrimary,
          border: `1px solid ${selected ? colors.primary : colors.borderStrong}`,
          fontWeight: 900,
        }}
      >
        {label}
      </span>
      <span>
        {choice}
        {selected && selectedHint ? <span style={{ marginInlineStart: spacing.sm, color: colors.textSecondary }}>{selectedHint}</span> : null}
      </span>
    </button>
  );
}
