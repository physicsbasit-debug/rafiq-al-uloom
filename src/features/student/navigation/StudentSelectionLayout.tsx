import type { ReactNode } from 'react';

import { StudentIcon, type StudentIconName } from './StudentIcon';

interface StudentSelectionLayoutProps {
  readonly title: string;
  readonly description: string;
  readonly icon: StudentIconName;
  readonly children: ReactNode;
}

export function StudentSelectionLayout({
  title,
  description,
  icon,
  children,
}: StudentSelectionLayoutProps) {
  return (
    <section className="rafiq-student-selection">
      <div className="rafiq-student-selection-heading">
        <span className="rafiq-student-selection-heading-icon" aria-hidden="true">
          <StudentIcon name={icon} width="30" height="30" />
        </span>

        <div>
          <span className="rafiq-student-selection-eyebrow">خطوتك الآن</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>

      <div className="rafiq-student-choice-grid">{children}</div>
    </section>
  );
}
