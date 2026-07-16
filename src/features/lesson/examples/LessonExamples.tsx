import { SectionHeader } from '@design-system/components/SectionHeader';
import { colors } from '@design-system/theme/colors';

interface Props {
  examples: string[];
}

export function LessonExamples({ examples }: Props) {
  return (
    <section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: '1rem',
        padding: '1rem',
        backgroundColor: colors.surface,
      }}
    >
      <SectionHeader title="أمثلة" icon="🔎" />
      <ul
        style={{
          margin: 0,
          paddingInlineStart: '1.2rem',
          color: colors.textPrimary,
          lineHeight: 1.9,
        }}
      >
        {examples.map((example) => (
          <li key={example}>{example}</li>
        ))}
      </ul>
    </section>
  );
}
