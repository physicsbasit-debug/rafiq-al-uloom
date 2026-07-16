import { SectionHeader } from '@design-system/components/SectionHeader';
import { colors } from '@design-system/theme/colors';


interface Props {
  misconceptions: string[];
}

export function LessonMisconceptions({ misconceptions }: Props) {
  return (
    <section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: '1rem',
        padding: '1rem',
        backgroundColor: colors.surface,
      }}
    >
      <SectionHeader title="أخطاء شائعة" icon="⚠️" />
      <ul style={{ margin: 0, paddingInlineStart: '1.2rem', color: colors.textPrimary, lineHeight: 1.9 }}>
          {misconceptions.map((misconception) => <li key={misconception}>{misconception}</li>)}
        </ul>
    </section>
  );
}
