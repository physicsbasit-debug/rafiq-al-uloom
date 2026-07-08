import type { ReactNode } from 'react';

interface AppCardProps {
  title: string;
  subtitle?: string;
  onClick?: () => void;
  accentColor?: string;
  disabled?: boolean;
  children?: ReactNode;
}

/**
 * بطاقة موحّدة تُعاد في كل شاشات التنقّل.
 * قابلة للنقر عبر الفأرة ولوحة المفاتيح (Enter/Space) — تطبيقًا لقاعدة Accessibility.
 */
export function AppCard({
  title,
  subtitle,
  onClick,
  accentColor = '#2F6FED',
  disabled = false,
  children,
}: AppCardProps) {
  const clickable = Boolean(onClick) && !disabled;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!clickable) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
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
        borderInlineStart: `4px solid ${accentColor}`,
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        background: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        cursor: clickable ? 'pointer' : 'default',
        opacity: disabled ? 0.55 : 1,
        textAlign: 'right',
      }}
    >
      <h3 style={{ margin: 0, fontSize: '1.125rem', color: '#1F2937' }}>{title}</h3>
      {subtitle ? (
        <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: '#6B7280' }}>{subtitle}</p>
      ) : null}
      {children}
    </div>
  );
}
