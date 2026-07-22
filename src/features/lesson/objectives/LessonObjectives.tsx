import { SectionHeader } from '@design-system/components/SectionHeader';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';
import type { Objective } from '@shared-types/content.types';

interface Props {
  objectives: Objective[];
}

export function LessonObjectives({ objectives }: Props) {
  return (
    <section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: spacing.lg,
        backgroundColor: colors.surface,
      }}
    >
      <SectionHeader title="أهداف التعلم" icon="🎯" />
      <ul
        style={{
          margin: 0,
          paddingInlineStart: spacing.lg,
          color: colors.textPrimary,
          lineHeight: typography.lineHeight.xl,
        }}
      >
        {objectives.map((objective) => (
          <li key={objective.id}>{objective.text}</li>
        ))}
      </ul>
    </section>
  );
}
