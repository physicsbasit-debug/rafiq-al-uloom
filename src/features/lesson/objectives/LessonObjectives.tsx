import { SectionHeader } from '@design-system/components/SectionHeader';
import { colors } from '@design-system/theme/colors';
import type { Objective } from '@shared-types/content.types';

interface Props {
  objectives: Objective[];
}

export function LessonObjectives({ objectives }: Props) {
  return (
    <section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: '1rem',
        padding: '1rem',
        backgroundColor: colors.surface,
      }}
    >
      <SectionHeader title="أهداف التعلم" icon="🎯" />
      <ul style={{ margin: 0, paddingInlineStart: '1.2rem', color: colors.textPrimary, lineHeight: 1.9 }}>
          {objectives.map((objective) => <li key={objective.id}>{objective.text}</li>)}
        </ul>
    </section>
  );
}
