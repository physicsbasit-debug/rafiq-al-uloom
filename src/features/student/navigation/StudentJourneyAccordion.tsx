import { StudentIcon, type StudentIconName } from './StudentIcon';

type StudentStepName =
  | 'grade'
  | 'semester'
  | 'subject'
  | 'unit'
  | 'lessons'
  | 'lesson'
  | 'review'
  | 'activities'
  | 'game'
  | 'labs'
  | 'mastery';

interface StudentJourneyAccordionProps {
  readonly currentStep: StudentStepName;
}

const journeyItems: ReadonlyArray<{
  readonly key: 'grade' | 'semester' | 'subject' | 'unit' | 'lessons';
  readonly label: string;
  readonly icon: StudentIconName;
}> = [
  { key: 'grade', label: 'الصف', icon: 'grade' },
  { key: 'semester', label: 'الفصل', icon: 'semester' },
  { key: 'subject', label: 'المادة', icon: 'physics' },
  { key: 'unit', label: 'الوحدة', icon: 'unit' },
  { key: 'lessons', label: 'الدرس', icon: 'lesson' },
];

function currentJourneyIndex(step: StudentStepName) {
  if (step === 'grade') return 0;
  if (step === 'semester') return 1;
  if (step === 'subject') return 2;
  if (step === 'unit') return 3;
  return 4;
}

export function StudentJourneyAccordion({ currentStep }: StudentJourneyAccordionProps) {
  const currentIndex = currentJourneyIndex(currentStep);

  return (
    <details className="rafiq-student-journey" open>
      <summary>
        <span className="rafiq-student-journey-summary-icon" aria-hidden="true">
          <StudentIcon name="route" width="24" height="24" />
        </span>

        <span className="rafiq-student-journey-summary-copy">
          <strong>خريطة رحلتك التعليمية</strong>
          <span>من الصف إلى الدرس في خمس خطوات واضحة</span>
        </span>

        <span className="rafiq-student-journey-toggle-icon" aria-hidden="true">
          <StudentIcon name="chevron-down" width="24" height="24" />
        </span>
      </summary>

      <div className="rafiq-student-journey-grid" role="list" aria-label="مراحل رحلة التعلم">
        {journeyItems.map((item, index) => {
          const status =
            index < currentIndex ? 'complete' : index === currentIndex ? 'active' : 'next';
          const statusLabel =
            status === 'complete' ? 'مكتملة' : status === 'active' ? 'الحالية' : 'قادمة';

          return (
            <div
              key={item.key}
              role="listitem"
              aria-current={status === 'active' ? 'step' : undefined}
              aria-label={`مرحلة ${item.label} - ${statusLabel}`}
              className={`rafiq-student-journey-item is-${status}`}
            >
              <span className="rafiq-student-journey-icon" aria-hidden="true">
                <StudentIcon
                  name={status === 'complete' ? 'check' : item.icon}
                  width="24"
                  height="24"
                />
              </span>
              <strong>{item.label}</strong>
              <span>{statusLabel}</span>
            </div>
          );
        })}
      </div>
    </details>
  );
}
