import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { StudentChoiceCard } from '@features/student/navigation/StudentChoiceCard';
import { StudentSelectionLayout } from '@features/student/navigation/StudentSelectionLayout';
import { useSemestersByGrade } from '@services/queries/content-query.hooks';

interface SemesterSelectionProps {
  gradeId: string;
  onSelectSemester: (semesterId: string) => void;
}

export function SemesterSelection({ gradeId, onSelectSemester }: SemesterSelectionProps) {
  const { data: semesters, isLoading, error, reload } = useSemestersByGrade(gradeId);

  return (
    <QueryBoundary isLoading={isLoading} error={error} onRetry={reload}>
      <StudentSelectionLayout
        title="اختر الفصل الدراسي"
        description="ستظهر لك الفصول المتاحة للطالب فقط وفق إعدادات النشر الحالية."
        icon="semester"
      >
        {semesters.map((semester) => (
          <StudentChoiceCard
            key={semester.id}
            title={semester.name}
            subtitle={`الفصل ${semester.order}`}
            icon="semester"
            onClick={() => onSelectSemester(semester.id)}
          />
        ))}
      </StudentSelectionLayout>
    </QueryBoundary>
  );
}
