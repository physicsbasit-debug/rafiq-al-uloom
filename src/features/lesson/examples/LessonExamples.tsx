import { SectionHeader } from '@design-system/components/SectionHeader';

interface LessonExamplesProps {
  examples: string[];
}

export function LessonExamples({ examples }: LessonExamplesProps) {
  return (
    <section style={{ marginBottom: '1.25rem' }}>
      <SectionHeader title="أمثلة توضيحية" />

      {examples.length === 0 ? (
        <p style={{ color: '#6B7280' }}>لا توجد أمثلة مضافة بعد.</p>
      ) : (
        <ul style={{ margin: 0, paddingInlineStart: '1.25rem', lineHeight: 1.9 }}>
          {examples.map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
