import type { Experiment } from '@shared-types/experiment.types';
import { SectionHeader } from '@design-system/components/SectionHeader';
import { ExperimentCard } from '@features/experiments/experiment-card';

interface LessonExperimentsProps {
  experiments: Experiment[];
}

export function LessonExperiments({ experiments }: LessonExperimentsProps) {
  return (
    <section style={{ marginBottom: '1.25rem' }}>
      <SectionHeader title="تجربة عملية" />

      {experiments.length === 0 ? (
        <p style={{ color: '#6B7280' }}>لا توجد تجربة مرتبطة بهذا الدرس بعد.</p>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          {experiments.map((experiment) => (
            <ExperimentCard key={experiment.id} experiment={experiment} />
          ))}
        </div>
      )}
    </section>
  );
}
