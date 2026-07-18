import { colors } from '@design-system/theme/colors';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';

interface SectionHeaderProps {
  title: string;
  icon?: string;
  description?: string;
}

export function SectionHeader({ title, icon, description }: SectionHeaderProps) {
  return (
    <header style={{ marginBottom: spacing.md }}>
      <h3
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          margin: 0,
          color: colors.textPrimary,
          fontSize: typography.fontSize.lg,
        }}
      >
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        <span>{title}</span>
      </h3>

      {description ? (
        <p
          style={{
            margin: `${spacing.xs} 0 0`,
            color: colors.textSecondary,
            lineHeight: typography.lineHeight.lg,
          }}
        >
          {description}
        </p>
      ) : null}
    </header>
  );
}
