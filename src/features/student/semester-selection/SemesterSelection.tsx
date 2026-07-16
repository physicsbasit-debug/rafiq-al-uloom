import { AppCard } from '@design-system/components/AppCard';
import { colors } from '@design-system/theme/colors';
import { getSemestersByGrade } from '@services/data/local-content.repository';

interface SemesterSelectionProps {
  gradeId: string;
  onSelectSemester: (semesterId: string) => void;
}

export function SemesterSelection({ gradeId, onSelectSemester }: SemesterSelectionProps) {
  const semesters = getSemestersByGrade(gradeId);

  return (
    <section>
      <h2 style={{ margin: '0 0 0.9rem', color: colors.textPrimary }}>اختر الفصل الدراسي</h2>
      <div style={{ display: 'grid', gap: '0.8rem' }}>
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
