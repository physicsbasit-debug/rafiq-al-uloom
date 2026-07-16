import type { ReactNode } from 'react';
import { colors } from '@design-system/theme/colors';
import type { Experiment } from '@shared-types/experiment.types';

interface ExperimentCardProps {
  experiment: Experiment;
}

interface DetailSectionProps {
  title: string;
  children: ReactNode;
}

const safetyLabels: Record<Experiment['safetyLevel'], string> = {
  safe_home: 'يمكن تنفيذها في المنزل',
  teacher_supervised: 'بإشراف المعلم',
  lab_only: 'في المختبر فقط',
  not_allowed: 'للعرض فقط',
};

function DetailSection({ title, children }: DetailSectionProps) {
  return (
    <section
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: '0.85rem',
        padding: '0.8rem',
        backgroundColor: colors.surface,
      }}
    >
      <h5
        style={{
          margin: '0 0 0.45rem',
          color: colors.textPrimary,
          fontSize: '1rem',
        }}
      >
        {title}
      </h5>
      {children}
    </section>
  );
}

export function ExperimentCard({ experiment }: ExperimentCardProps) {
  return (
    <article
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: '0.95rem',
        padding: '0.9rem',
        backgroundColor: colors.surfaceMuted,
      }}
    >
      <header style={{ marginBottom: '0.8rem' }}>
        <h4
          style={{
            margin: '0 0 0.4rem',
            color: colors.textPrimary,
            fontSize: '1.1rem',
          }}
        >
          {experiment.title}
        </h4>

        <p
          style={{
            margin: 0,
            color: colors.textSecondary,
            fontWeight: 800,
            lineHeight: 1.7,
          }}
        >
          السلامة: {safetyLabels[experiment.safetyLevel]}
        </p>
      </header>

      <div style={{ display: 'grid', gap: '0.7rem' }}>
        <DetailSection title="هدف التجربة">
          <p style={{ margin: 0, color: colors.textPrimary, lineHeight: 1.85 }}>
            {experiment.objective}
          </p>
        </DetailSection>

        <DetailSection title="الأدوات">
          <ul
            style={{
              margin: 0,
              paddingInlineStart: '1.2rem',
              color: colors.textPrimary,
              lineHeight: 1.85,
            }}
          >
            {experiment.tools.map((tool) => (
              <li key={tool}>{tool}</li>
            ))}
          </ul>
        </DetailSection>

        <DetailSection title="خطوات التنفيذ">
          <ol
            style={{
              margin: 0,
              paddingInlineStart: '1.35rem',
              color: colors.textPrimary,
              lineHeight: 1.9,
            }}
          >
            {experiment.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </DetailSection>

        <DetailSection title="احتياطات السلامة">
          <ul
            style={{
              margin: 0,
              paddingInlineStart: '1.2rem',
              color: colors.textPrimary,
              lineHeight: 1.85,
            }}
          >
            {experiment.safetyNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </DetailSection>

        <DetailSection title="ملاحظة متوقعة">
          <p style={{ margin: 0, color: colors.textPrimary, lineHeight: 1.85 }}>
            {experiment.observationPrompt}
          </p>
        </DetailSection>

        <DetailSection title="استنتاج">
          <p style={{ margin: 0, color: colors.textPrimary, lineHeight: 1.85 }}>
            {experiment.conclusionPrompt}
          </p>
        </DetailSection>

        <DetailSection title="بديل منزلي">
          <p style={{ margin: 0, color: colors.textPrimary, lineHeight: 1.85 }}>
            {experiment.homeAlternative}
          </p>
        </DetailSection>
      </div>
    </article>
  );
}
