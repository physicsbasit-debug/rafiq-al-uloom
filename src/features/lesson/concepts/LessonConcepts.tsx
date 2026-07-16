import { SectionHeader } from '@design-system/components/SectionHeader';
import { colors } from '@design-system/theme/colors';

interface Props {
  concepts: string[];
}

export function LessonConcepts({ concepts }: Props) {
  return (
    <section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: '1rem',
        padding: '1rem',
        backgroundColor: colors.surface,
      }}
    >
      <SectionHeader title="المفاهيم الأساسية" icon="💡" />
      <ul
        style={{
          margin: 0,
          paddingInlineStart: '1.2rem',
          color: colors.textPrimary,
          lineHeight: 1.9,
        }}
      >
        {concepts.map((concept) => (
          <li key={concept}>{concept}</li>
        ))}
      </ul>
    </section>
  );
}
