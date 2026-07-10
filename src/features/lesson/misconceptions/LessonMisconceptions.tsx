import { SectionHeader } from '@design-system/components/SectionHeader';

interface LessonMisconceptionsProps {
  misconceptions: string[];
}

export function LessonMisconceptions({ misconceptions }: LessonMisconceptionsProps) {
  return (
    <section style={{ marginBottom: '1.25rem' }}>
      <SectionHeader
        title="أخطاء شائعة"
        description="تنبيهات تساعد الطالب على تجنب الفهم الخاطئ للمفهوم."
      />

      {misconceptions.length === 0 ? (
        <p style={{ color: '#6B7280' }}>لا توجد أخطاء شائعة مضافة بعد.</p>
      ) : (
        <ul style={{ margin: 0, paddingInlineStart: '1.25rem', lineHeight: 1.9 }}>
          {misconceptions.map((misconception) => (
            <li key={misconception}>{misconception}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
