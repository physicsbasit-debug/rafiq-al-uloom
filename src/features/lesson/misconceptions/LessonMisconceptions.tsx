import { SectionHeader } from '@design-system/components/SectionHeader';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';

interface Props {
  misconceptions: string[];
}

export function LessonMisconceptions({ misconceptions }: Props) {
  return (
    <section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: spacing.lg,
        backgroundColor: colors.surface,
      }}
    >
      <SectionHeader title="أخطاء شائعة" icon="⚠️" />
      <ul
        style={{
          margin: 0,
          paddingInlineStart: spacing.lg,
          color: colors.textPrimary,
          lineHeight: typography.lineHeight.xl,
        }}
      >
        {misconceptions.map((misconception) => (
          <li key={misconception}>{misconception}</li>
        ))}
      </ul>
    </section>
  );
}
