import type { Experiment } from '@shared-types/experiment.types';
import { SectionHeader } from '@design-system/components/SectionHeader';

interface ExperimentCardProps {
  experiment: Experiment;
}

function getSafetyLevelLabel(safetyLevel: Experiment['safetyLevel']): string {
  switch (safetyLevel) {
    case 'safe_home':
      return 'يمكن تنفيذها في المنزل';
    case 'teacher_supervised':
      return 'بإشراف المعلم';
    case 'lab_only':
      return 'في المختبر فقط';
    case 'not_allowed':
      return 'للعرض فقط';
    default:
      return 'مستوى سلامة غير محدد';
  }
}

export function ExperimentCard({ experiment }: ExperimentCardProps) {
  return (
    <article
      style={{
        border: '1px solid #D1D5DB',
        borderRadius: '1rem',
        padding: '1rem',
        backgroundColor: '#F9FAFB',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <h4 style={{ margin: 0, color: '#1F2937' }}>{experiment.title}</h4>

        <span
          style={{
            display: 'inline-flex',
            borderRadius: '999px',
            backgroundColor: '#DBEAFE',
            color: '#1D4ED8',
            padding: '0.25rem 0.7rem',
            fontSize: '0.85rem',
            fontWeight: 700,
          }}
        >
          {getSafetyLevelLabel(experiment.safetyLevel)}
        </span>
      </div>

      <p style={{ marginTop: 0, color: '#374151', lineHeight: 1.8 }}>{experiment.objective}</p>

      <SectionHeader title="الأدوات" />
      <ul style={{ marginTop: 0, paddingInlineStart: '1.25rem', lineHeight: 1.8 }}>
        {experiment.tools.map((tool) => (
          <li key={tool}>{tool}</li>
        ))}
      </ul>

      <SectionHeader title="خطوات التنفيذ" />
      <ol style={{ marginTop: 0, paddingInlineStart: '1.25rem', lineHeight: 1.8 }}>
        {experiment.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <SectionHeader title="احتياطات السلامة" />
      <ul style={{ marginTop: 0, paddingInlineStart: '1.25rem', lineHeight: 1.8 }}>
        {experiment.safetyNotes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>

      <div style={{ display: 'grid', gap: '0.5rem', marginTop: '1rem' }}>
        <p style={{ margin: 0, color: '#374151', lineHeight: 1.8 }}>
          <strong>ملاحظة متوقعة: </strong>
          {experiment.observationPrompt}
        </p>

        <p style={{ margin: 0, color: '#374151', lineHeight: 1.8 }}>
          <strong>استنتاج: </strong>
          {experiment.conclusionPrompt}
        </p>

        {experiment.homeAlternative ? (
          <p style={{ margin: 0, color: '#374151', lineHeight: 1.8 }}>
            <strong>بديل منزلي: </strong>
            {experiment.homeAlternative}
          </p>
        ) : null}
      </div>
    </article>
  );
}
