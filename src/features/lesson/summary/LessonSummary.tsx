import { SectionHeader } from '@design-system/components/SectionHeader';

interface LessonSummaryProps {
  summary: string;
}

export function LessonSummary({ summary }: LessonSummaryProps) {
  return (
    <section style={{ marginBottom: '1.25rem' }}>
      <SectionHeader title="ملخص الدرس" />
      <p style={{ margin: 0, color: '#374151', lineHeight: 2 }}>{summary}</p>
    </section>
  );
}
