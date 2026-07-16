import { AppCard } from '@design-system/components/AppCard';
import { colors } from '@design-system/theme/colors';
import { getGrades } from '@services/data/local-content.repository';

interface GradeSelectionProps {
  onSelectGrade: (gradeId: string) => void;
}

export function GradeSelection({ onSelectGrade }: GradeSelectionProps) {
  const grades = getGrades();

  return (
    <section>
      <h2 style={{ margin: '0 0 0.9rem', color: colors.textPrimary }}>اختر الصف</h2>
      <div style={{ display: 'grid', gap: '0.8rem' }}>
        {grades.map((grade) => (
          <AppCard key={grade.id} title={grade.name} onClick={() => onSelectGrade(grade.id)} />
        ))}
      </div>
    </section>
  );
}
