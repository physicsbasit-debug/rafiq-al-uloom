interface AppButtonProps {
  label: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

/**
 * زر أساسي/ثانوي موحّد. حالة تعطيل واضحة بصريًا.
 */
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
        fontFamily: 'inherit',
        fontSize: '0.95rem',
        padding: '0.5rem 1rem',
        borderRadius: '8px',
        border: isPrimary ? 'none' : '1px solid #2F6FED',
        background: isPrimary ? '#2F6FED' : 'transparent',
        color: isPrimary ? '#FFFFFF' : '#2F6FED',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}
