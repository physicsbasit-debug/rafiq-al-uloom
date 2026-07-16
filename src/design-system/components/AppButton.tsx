import { colors } from '@design-system/theme/colors';

interface AppButtonProps {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

export function AppButton({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
}: AppButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        minHeight: '44px',
        width: '100%',
        fontFamily: 'inherit',
        fontSize: '1rem',
        fontWeight: 800,
        padding: '0.7rem 1rem',
        borderRadius: '0.85rem',
        border: isPrimary ? `1px solid ${colors.primary}` : `1px solid ${colors.primary}`,
        backgroundColor: disabled
          ? colors.disabledBackground
          : isPrimary
            ? colors.primary
            : colors.surface,
        color: disabled
          ? colors.disabledText
          : isPrimary
            ? colors.surface
            : colors.primary,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {label}
    </button>
  );
}
