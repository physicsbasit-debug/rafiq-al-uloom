import { SectionHeader } from '@design-system/components/SectionHeader';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { ExperimentCard } from '@features/experiments/experiment-card';
import type { Experiment } from '@shared-types/experiment.types';

interface LessonExperimentsProps {
  experiments: Experiment[];
}

export function LessonExperiments({ experiments }: LessonExperimentsProps) {
  if (experiments.length === 0) return null;

  return (
    <section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: spacing.lg,
        backgroundColor: colors.surface,
      }}
    >
      <SectionHeader title="تجربة عملية" icon="🧪" />
      <div style={{ display: 'grid', gap: spacing.md }}>
        {experiments.map((experiment) => (
          <ExperimentCard key={experiment.id} experiment={experiment} />
        ))}
      </div>
    </section>
  );
}
