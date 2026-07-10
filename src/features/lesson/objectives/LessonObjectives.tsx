import type { Objective } from '@shared-types/content.types';
import { SectionHeader } from '@design-system/components/SectionHeader';

interface LessonObjectivesProps {
  objectives: Objective[];
}

export function LessonObjectives({ objectives }: LessonObjectivesProps) {
  return (
    <section style={{ marginBottom: '1.25rem' }}>
      <SectionHeader title="أهداف التعلم" />

      {objectives.length === 0 ? (
        <p style={{ color: '#6B7280' }}>لا توجد أهداف مرتبطة بهذا الدرس بعد.</p>
      ) : (
        <ul style={{ margin: 0, paddingInlineStart: '1.25rem', lineHeight: 1.9 }}>
          {objectives.map((objective) => (
            <li key={objective.id}>{objective.text}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
