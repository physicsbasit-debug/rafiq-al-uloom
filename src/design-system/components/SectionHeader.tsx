import { colors } from '@design-system/theme/colors';

interface SectionHeaderProps {
  title: string;
  icon?: string;
  description?: string;
}

export function SectionHeader({ title, icon, description }: SectionHeaderProps) {
  return (
    <header style={{ marginBottom: '0.85rem' }}>
      <h3
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
          margin: 0,
          color: colors.textPrimary,
          fontSize: '1.15rem',
        }}
      >
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        <span>{title}</span>
      </h3>

      {description ? (
        <p style={{ margin: '0.35rem 0 0', color: colors.textSecondary, lineHeight: 1.7 }}>
          {description}
        </p>
      ) : null}
    </header>
  );
}
