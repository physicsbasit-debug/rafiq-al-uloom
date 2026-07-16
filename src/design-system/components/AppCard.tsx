import type { ReactNode } from 'react';
import { colors } from '@design-system/theme/colors';

interface AppCardProps {
  title: string;
  subtitle?: string;
  onClick?: () => void;
  accentColor?: string;
  disabled?: boolean;
  children?: ReactNode;
}

export function AppCard({
  title,
  subtitle,
  onClick,
  accentColor = colors.primary,
  disabled = false,
  children,
}: AppCardProps) {
  const clickable = Boolean(onClick) && !disabled;

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!clickable) return;

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onClick?.();
    }
  }

  return (
    <div
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-disabled={disabled || undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={handleKeyDown}
      style={{
        minHeight: '88px',
        border: `1px solid ${colors.border}`,
        borderInlineStart: `5px solid ${accentColor}`,
        borderRadius: '1rem',
        padding: '1rem 1.1rem',
        backgroundColor: colors.surface,
        boxShadow: '0 8px 24px rgba(31, 41, 55, 0.06)',
        cursor: clickable ? 'pointer' : 'default',
        opacity: disabled ? 0.6 : 1,
        textAlign: 'right',
      }}
    >
      <h3 style={{ margin: 0, fontSize: '1.12rem', color: colors.textPrimary }}>{title}</h3>
      {subtitle ? (
        <p style={{ margin: '0.35rem 0 0', color: colors.textSecondary, lineHeight: 1.7 }}>
          {subtitle}
        </p>
      ) : null}
      {children}
    </div>
  );
}
