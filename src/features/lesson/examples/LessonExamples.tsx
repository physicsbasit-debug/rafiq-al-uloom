import { SectionHeader } from '@design-system/components/SectionHeader';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';

interface Props {
  examples: string[];
}

export function LessonExamples({ examples }: Props) {
  return (
    <section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: spacing.lg,
        backgroundColor: colors.surface,
      }}
    >
      <SectionHeader title="أمثلة" icon="🔎" />
      <ul
        style={{
          margin: 0,
          paddingInlineStart: spacing.lg,
          color: colors.textPrimary,
          lineHeight: typography.lineHeight.xl,
        }}
      >
        {examples.map((example) => (
          <li key={example}>{example}</li>
        ))}
      </ul>
    </section>
  );
}
