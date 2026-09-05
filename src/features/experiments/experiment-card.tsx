import type { ReactNode } from 'react';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';
import { getStudentExperimentSafetyDecision } from '@features/activities/student-experiment-safety';
import type { Experiment } from '@shared-types/experiment.types';

interface ExperimentCardProps {
  experiment: Experiment;
}

interface DetailSectionProps {
  title: string;
  children: ReactNode;
}

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
  const safetyDecision = getStudentExperimentSafetyDecision(experiment.safetyLevel);

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
          السلامة: {safetyDecision.safetyLabel}
        </p>
      </header>

      {safetyDecision.notice ? (
        <p
          role="note"
          style={{
            margin: `0 0 ${spacing.md}`,
            padding: spacing.md,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            color: colors.textPrimary,
            fontWeight: 800,
            lineHeight: typography.lineHeight.lg,
          }}
        >
          {safetyDecision.notice}
        </p>
      ) : null}

      <div style={{ display: 'grid', gap: spacing.md }}>
        <DetailSection title="هدف التجربة">
          <p style={{ margin: 0, color: colors.textPrimary, lineHeight: typography.lineHeight.xl }}>
            {experiment.objective}
          </p>
        </DetailSection>

        {safetyDecision.showTools ? (
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
        ) : null}

        {safetyDecision.showSteps ? (
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
        ) : null}

        {safetyDecision.showSafetyNotes ? (
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
        ) : null}

        {safetyDecision.showObservationPrompt ? (
          <DetailSection
            title={
              safetyDecision.mode === 'supervised_preview'
                ? 'سؤال للملاحظة والمناقشة'
                : 'ملاحظة متوقعة'
            }
          >
            <p
              style={{ margin: 0, color: colors.textPrimary, lineHeight: typography.lineHeight.xl }}
            >
              {experiment.observationPrompt}
            </p>
          </DetailSection>
        ) : null}

        {safetyDecision.showConclusionPrompt ? (
          <DetailSection
            title={
              safetyDecision.mode === 'supervised_preview' ? 'سؤال للاستنتاج والمناقشة' : 'استنتاج'
            }
          >
            <p
              style={{ margin: 0, color: colors.textPrimary, lineHeight: typography.lineHeight.xl }}
            >
              {experiment.conclusionPrompt}
            </p>
          </DetailSection>
        ) : null}

        {safetyDecision.showHomeAlternative && experiment.homeAlternative ? (
          <DetailSection title="بديل منزلي">
            <p
              style={{ margin: 0, color: colors.textPrimary, lineHeight: typography.lineHeight.xl }}
            >
              {experiment.homeAlternative}
            </p>
          </DetailSection>
        ) : null}
      </div>
    </article>
  );
}
