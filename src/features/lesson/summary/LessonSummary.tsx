import { SectionHeader } from '@design-system/components/SectionHeader';
import { colors } from '@design-system/theme/colors';


interface Props {
  summary: string;
}

export function LessonSummary({ summary }: Props) {
  return (
    <section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: '1rem',
        padding: '1rem',
        backgroundColor: colors.surface,
      }}
    >
      <SectionHeader title="ملخص الدرس" icon="📝" />
      <p style={{ margin: 0, color: colors.textPrimary, lineHeight: 1.95 }}>{summary}</p>
    </section>
  );
}
