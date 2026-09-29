import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { StudentChoiceCard } from '@features/student/navigation/StudentChoiceCard';
import { StudentSelectionLayout } from '@features/student/navigation/StudentSelectionLayout';
import { useGrades } from '@services/queries/content-query.hooks';

interface GradeSelectionProps {
  onSelectGrade: (gradeId: string) => void;
}

export function GradeSelection({ onSelectGrade }: GradeSelectionProps) {
  const { data: grades, isLoading, error, reload } = useGrades();

  return (
    <QueryBoundary isLoading={isLoading} error={error} onRetry={reload}>
      <StudentSelectionLayout
        title="اختر الصف"
        description="ابدأ بتحديد صفك لتظهر لك الفصول والمحتوى المناسب فقط."
        icon="grade"
      >
        {grades.map((grade) => (
          <StudentChoiceCard
            key={grade.id}
            title={grade.name}
            subtitle="محتوى الفيزياء المخصص لهذا الصف"
            icon="grade"
            onClick={() => onSelectGrade(grade.id)}
          />
        ))}
      </StudentSelectionLayout>
    </QueryBoundary>
  );
}
