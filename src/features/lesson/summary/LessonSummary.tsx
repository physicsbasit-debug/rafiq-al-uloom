import { SectionHeader } from '@design-system/components/SectionHeader';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';

interface Props {
  summary: string;
}

export function LessonSummary({ summary }: Props) {
  return (
    <section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: spacing.lg,
        backgroundColor: colors.surface,
      }}
    >
      <SectionHeader title="ملخص الدرس" icon="📝" />
      <p
        style={{
          margin: 0,
          color: colors.textPrimary,
          lineHeight: typography.lineHeight['2xl'],
        }}
      >
        {summary}
      </p>
    </section>
  );
}
