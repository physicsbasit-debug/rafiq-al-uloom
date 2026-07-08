import { getGrades } from '@services/data/local-content.repository';
import { AppCard } from '@design-system/components/AppCard';

interface GradeSelectionProps {
  onSelectGrade: (gradeId: string) => void;
}

export function GradeSelection({ onSelectGrade }: GradeSelectionProps) {
  const grades = getGrades();
  return (
    <section>
      <h2 style={{ color: '#1F2937' }}>اختر الصف</h2>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {grades.map((grade) => (
          <AppCard key={grade.id} title={grade.name} onClick={() => onSelectGrade(grade.id)} />
        ))}
      </div>
    </section>
  );
}
