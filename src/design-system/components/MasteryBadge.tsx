import type { MasteryClassification } from '@shared-types/mastery.types';

interface MasteryBadgeProps {
  classification: MasteryClassification;
}

function getBadgeStyle(classification: MasteryClassification): {
  borderColor: string;
  backgroundColor: string;
  color: string;
} {
  switch (classification) {
    case 'متقن':
      return {
        borderColor: '#A7F3D0',
        backgroundColor: '#ECFDF5',
        color: '#047857',
      };
    case 'قريب من الإتقان':
      return {
        borderColor: '#FDE68A',
        backgroundColor: '#FFFBEB',
        color: '#B45309',
      };
    case 'يحتاج مراجعة':
      return {
        borderColor: '#FECACA',
        backgroundColor: '#FEF2F2',
        color: '#B91C1C',
      };
    default:
      return {
        borderColor: '#D1D5DB',
        backgroundColor: '#F9FAFB',
        color: '#374151',
      };
  }
}

export function MasteryBadge({ classification }: MasteryBadgeProps) {
  const style = getBadgeStyle(classification);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        border: `1px solid ${style.borderColor}`,
        borderRadius: '999px',
        backgroundColor: style.backgroundColor,
        color: style.color,
        padding: '0.35rem 0.7rem',
        fontWeight: 900,
        lineHeight: 1.5,
      }}
    >
      {classification}
    </span>
  );
}
