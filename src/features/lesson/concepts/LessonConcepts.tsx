import { SectionHeader } from '@design-system/components/SectionHeader';

interface LessonConceptsProps {
  concepts: string[];
}

export function LessonConcepts({ concepts }: LessonConceptsProps) {
  return (
    <section style={{ marginBottom: '1.25rem' }}>
      <SectionHeader title="المفاهيم الأساسية" />

      {concepts.length === 0 ? (
        <p style={{ color: '#6B7280' }}>لا توجد مفاهيم أساسية مضافة بعد.</p>
      ) : (
        <ul style={{ margin: 0, paddingInlineStart: '1.25rem', lineHeight: 1.9 }}>
          {concepts.map((concept) => (
            <li key={concept}>{concept}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
