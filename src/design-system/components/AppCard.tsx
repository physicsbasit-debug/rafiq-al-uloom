import type { ReactNode } from 'react';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';

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
        borderRadius: radius.lg,
        padding: `${spacing.lg} ${spacing.lg}`,
        backgroundColor: colors.surface,
        boxShadow: 'var(--shadow-lg)',
        cursor: clickable ? 'pointer' : 'default',
        opacity: disabled ? 0.6 : 1,
        textAlign: 'right',
      }}
    >
      <h3
        style={{
          margin: 0,
          fontSize: typography.fontSize.lg,
          color: colors.textPrimary,
        }}
      >
        {title}
      </h3>

      {subtitle ? (
        <p
          style={{
            margin: `${spacing.xs} 0 0`,
            color: colors.textSecondary,
            lineHeight: typography.lineHeight.lg,
          }}
        >
          {subtitle}
        </p>
      ) : null}

      {children}
    </div>
  );
}
