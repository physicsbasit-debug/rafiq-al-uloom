import { AppCard } from '@design-system/components/AppCard';
import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { colors } from '@design-system/theme/colors';
import { useGrades } from '@services/queries/content-query.hooks';

interface GradeSelectionProps {
  onSelectGrade: (gradeId: string) => void;
}

export function GradeSelection({ onSelectGrade }: GradeSelectionProps) {
  const { data: grades, isLoading, error, reload } = useGrades();

  return (
    <QueryBoundary isLoading={isLoading} error={error} onRetry={reload}>
      <section>
        <h2 style={{ margin: '0 0 0.9rem', color: colors.textPrimary }}>اختر الصف</h2>
        <div style={{ display: 'grid', gap: '0.8rem' }}>
          {grades.map((grade) => (
            <AppCard key={grade.id} title={grade.name} onClick={() => onSelectGrade(grade.id)} />
          ))}
        </div>
      </section>
    </QueryBoundary>
  );
}
