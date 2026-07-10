import { AppCard } from '@design-system/components/AppCard';
import { getSemestersByGrade } from '@services/data/local-content.repository';

interface SemesterSelectionProps {
  gradeId: string;
  onSelectSemester: (semesterId: string) => void;
}

export function SemesterSelection({ gradeId, onSelectSemester }: SemesterSelectionProps) {
  const semesters = getSemestersByGrade(gradeId);

  return (
    <section>
      <h2 style={{ color: '#1F2937' }}>اختر الفصل الدراسي</h2>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {semesters.map((semester) => (
          <AppCard
            key={semester.id}
            title={semester.name}
            onClick={() => onSelectSemester(semester.id)}
          />
        ))}
      </div>
    </section>
  );
}
