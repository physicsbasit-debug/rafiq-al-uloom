import { SectionHeader } from '@design-system/components/SectionHeader';
import { colors } from '@design-system/theme/colors';
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
        borderRadius: '1rem',
        padding: '1rem',
        backgroundColor: colors.surface,
      }}
    >
      <SectionHeader title="تجربة عملية" icon="🧪" />
      <div style={{ display: 'grid', gap: '0.8rem' }}>
        {experiments.map((experiment) => (
          <ExperimentCard key={experiment.id} experiment={experiment} />
        ))}
      </div>
    </section>
  );
}
