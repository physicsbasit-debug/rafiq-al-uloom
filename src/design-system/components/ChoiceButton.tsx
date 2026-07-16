import { colors } from '@design-system/theme/colors';

interface ChoiceButtonProps {
  label: string;
  choice: string;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
  selectedHint?: string;
}

export function ChoiceButton({
  label,
  choice,
  selected,
  disabled,
  onClick,
  selectedHint,
}: ChoiceButtonProps) {
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
        gap: '0.7rem',
        textAlign: 'right',
        border: selected ? `2px solid ${colors.primary}` : `1px solid ${colors.borderStrong}`,
        borderRadius: '0.9rem',
        backgroundColor: selected ? colors.primarySoft : colors.surfaceMuted,
        color: colors.textPrimary,
        padding: '0.65rem 0.8rem',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        fontSize: '1rem',
        lineHeight: 1.6,
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
          borderRadius: '999px',
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
        {selected && selectedHint ? (
          <span style={{ marginInlineStart: '0.45rem', color: colors.textSecondary }}>
            {selectedHint}
          </span>
        ) : null}
      </span>
    </button>
  );
}
