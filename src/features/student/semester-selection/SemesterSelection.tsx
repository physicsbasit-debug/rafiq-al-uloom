import { AppCard } from '@design-system/components/AppCard';
import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { colors } from '@design-system/theme/colors';
import { useSemestersByGrade } from '@services/queries/content-query.hooks';

interface SemesterSelectionProps {
  gradeId: string;
  onSelectSemester: (semesterId: string) => void;
}

export function SemesterSelection({ gradeId, onSelectSemester }: SemesterSelectionProps) {
  const { data: semesters, isLoading, error, reload } = useSemestersByGrade(gradeId);

  return (
    <QueryBoundary isLoading={isLoading} error={error} onRetry={reload}>
      <section>
        <h2 style={{ margin: '0 0 0.9rem', color: colors.textPrimary }}>
          اختر الفصل الدراسي
        </h2>
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
    </QueryBoundary>
  );
}
