import type { CSSProperties } from 'react';

import { StudentIcon, type StudentIconName } from './StudentIcon';

interface StudentChoiceCardProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly icon: StudentIconName;
  readonly onClick: () => void;
  readonly accentColor?: string;
}

export function StudentChoiceCard({
  title,
  subtitle,
  icon,
  onClick,
  accentColor = '#00695c',
}: StudentChoiceCardProps) {
  const style: CSSProperties = {
    borderInlineStart: `5px solid ${accentColor}`,
  };

  return (
    <button
      type="button"
      aria-label={title}
      className="rafiq-student-choice-card"
      style={style}
      onClick={onClick}
    >
      <span className="rafiq-student-choice-icon" style={{ color: accentColor }} aria-hidden="true">
        <StudentIcon name={icon} width="28" height="28" />
      </span>

      <span className="rafiq-student-choice-copy">
        <strong>{title}</strong>
        {subtitle ? <span>{subtitle}</span> : null}
      </span>

      <span className="rafiq-student-choice-arrow" aria-hidden="true">
        <StudentIcon name="chevron-left" width="24" height="24" />
      </span>
    </button>
  );
}
