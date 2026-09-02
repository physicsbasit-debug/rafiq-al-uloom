import { useState } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';
import type { Inquiry } from '@shared-types/inquiry.types';

interface InquiryRunnerProps {
  inquiry: Inquiry;
  onBack: () => void;
}

const textareaStyle = {
  width: '100%',
  minHeight: '110px',
  resize: 'vertical' as const,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.md,
  padding: spacing.md,
  backgroundColor: colors.surface,
  color: colors.textPrimary,
  font: 'inherit',
  lineHeight: typography.lineHeight.xl,
};

function ResponseField({
  id,
  label,
  prompt,
  value,
  onChange,
}: {
  id: string;
  label: string;
  prompt: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <section style={{ display: 'grid', gap: spacing.sm }}>
      <label htmlFor={id} style={{ color: colors.textPrimary, fontWeight: 900 }}>
        {label}
      </label>
      <p style={{ margin: 0, color: colors.textSecondary, lineHeight: typography.lineHeight.xl }}>
        {prompt}
      </p>
      <textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        style={textareaStyle}
      />
    </section>
  );
}

export function InquiryRunner({ inquiry, onBack }: InquiryRunnerProps) {
  const [hypothesisText, setHypothesisText] = useState('');
  const [observationText, setObservationText] = useState('');
  const [conclusionText, setConclusionText] = useState('');

  return (
    <section style={{ display: 'grid', gap: spacing.lg }}>
      <header>
        <p style={{ margin: `0 0 ${spacing.xs}`, color: colors.textSecondary, fontWeight: 800 }}>
          استقصاء علمي موجّه
        </p>
        <h2 style={{ margin: `0 0 ${spacing.sm}`, color: colors.textPrimary }}>{inquiry.title}</h2>
        <p style={{ margin: 0, color: colors.textSecondary, lineHeight: typography.lineHeight.xl }}>
          {inquiry.instructions}
        </p>
      </header>

      <section
        aria-labelledby="inquiry-context-title"
        style={{
          display: 'grid',
          gap: spacing.sm,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          padding: spacing.lg,
          backgroundColor: colors.surfaceMuted,
        }}
      >
        <h3 id="inquiry-context-title" style={{ margin: 0, color: colors.textPrimary }}>
          الحالة العلمية
        </h3>
        <p style={{ margin: 0, color: colors.textPrimary, lineHeight: typography.lineHeight.xl }}>
          {inquiry.context}
        </p>
        <p style={{ margin: 0, color: colors.textPrimary, fontWeight: 900 }}>
          {inquiry.drivingQuestion}
        </p>
      </section>

      <ResponseField
        id={`${inquiry.id}-hypothesis`}
        label="الفرضية"
        prompt={inquiry.hypothesisPrompt}
        value={hypothesisText}
        onChange={setHypothesisText}
      />

      <ResponseField
        id={`${inquiry.id}-observation`}
        label="الملاحظة أو الدليل"
        prompt={inquiry.observationPrompt}
        value={observationText}
        onChange={setObservationText}
      />

      <ResponseField
        id={`${inquiry.id}-conclusion`}
        label="الاستنتاج"
        prompt={inquiry.conclusionPrompt}
        value={conclusionText}
        onChange={setConclusionText}
      />

      <div style={{ maxWidth: '220px' }}>
        <AppButton label="العودة إلى الأنشطة" variant="secondary" onClick={onBack} />
      </div>
    </section>
  );
}
