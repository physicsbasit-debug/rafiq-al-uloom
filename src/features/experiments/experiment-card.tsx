import type { ReactNode } from 'react';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';
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
        borderRadius: radius.md,
        padding: spacing.md,
        backgroundColor: colors.surface,
      }}
    >
      <h5
        style={{
          margin: `0 0 ${spacing.sm}`,
          color: colors.textPrimary,
          fontSize: typography.fontSize.md,
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
        borderRadius: radius.lg,
        padding: spacing.lg,
        backgroundColor: colors.surfaceMuted,
      }}
    >
      <header style={{ marginBottom: spacing.md }}>
        <h4
          style={{
            margin: `0 0 ${spacing.sm}`,
            color: colors.textPrimary,
            fontSize: typography.fontSize.lg,
          }}
        >
          {experiment.title}
        </h4>

        <p
          style={{
            margin: 0,
            color: colors.textSecondary,
            fontWeight: typography.fontWeight.bold,
            lineHeight: typography.lineHeight.lg,
          }}
        >
          السلامة: {safetyLabels[experiment.safetyLevel]}
        </p>
      </header>

      <div style={{ display: 'grid', gap: spacing.md }}>
        <DetailSection title="هدف التجربة">
          <p style={{ margin: 0, color: colors.textPrimary, lineHeight: typography.lineHeight.xl }}>
            {experiment.objective}
          </p>
        </DetailSection>
        <DetailSection title="الأدوات">
          <ul
            style={{
              margin: 0,
              paddingInlineStart: spacing.lg,
              color: colors.textPrimary,
              lineHeight: typography.lineHeight.xl,
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
              paddingInlineStart: spacing.xl,
              color: colors.textPrimary,
              lineHeight: typography.lineHeight.xl,
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
              paddingInlineStart: spacing.lg,
              color: colors.textPrimary,
              lineHeight: typography.lineHeight.xl,
            }}
          >
            {experiment.safetyNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </DetailSection>
        <DetailSection title="ملاحظة متوقعة">
          <p style={{ margin: 0, color: colors.textPrimary, lineHeight: typography.lineHeight.xl }}>
            {experiment.observationPrompt}
          </p>
        </DetailSection>
        <DetailSection title="استنتاج">
          <p style={{ margin: 0, color: colors.textPrimary, lineHeight: typography.lineHeight.xl }}>
            {experiment.conclusionPrompt}
          </p>
        </DetailSection>
        <DetailSection title="بديل منزلي">
          <p style={{ margin: 0, color: colors.textPrimary, lineHeight: typography.lineHeight.xl }}>
            {experiment.homeAlternative}
          </p>
        </DetailSection>
      </div>
    </article>
  );
}
