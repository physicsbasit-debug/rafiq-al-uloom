import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { colors } from '@design-system/theme/colors';
import { isStudentSemesterVisible } from '@content/student-content-release';
import { StudentChoiceCard } from '@features/student/navigation/StudentChoiceCard';
import { StudentSelectionLayout } from '@features/student/navigation/StudentSelectionLayout';
import { useSemestersByGrade } from '@services/queries/content-query.hooks';

interface SemesterSelectionProps {
  gradeId: string;
  onSelectSemester: (semesterId: string) => void;
}

export function SemesterSelection({ gradeId, onSelectSemester }: SemesterSelectionProps) {
  const { data: semesters, isLoading, error, reload } = useSemestersByGrade(gradeId);
  const visibleSemesters = semesters.filter((semester) => isStudentSemesterVisible(semester.id));

  return (
    <QueryBoundary isLoading={isLoading} error={error} onRetry={reload}>
      <StudentSelectionLayout
        title="اختر الفصل الدراسي"
        description="الفصل الدراسي الأول هو الفصل الحالي المتاح للطالب. يبقى الفصل الثاني محفوظًا في النظام حتى موعد نشره."
        icon="semester"
      >
        {visibleSemesters.length === 0 ? (
          <p style={{ color: colors.textSecondary }}>
            لا يوجد فصل دراسي متاح للطلبة في هذا الصف حاليًا.
          </p>
        ) : null}

        {visibleSemesters.map((semester) => (
          <StudentChoiceCard
            key={semester.id}
            title={semester.name}
            subtitle="الفصل الحالي • متاح الآن"
            statusLabel="متاح"
            icon="semester"
            onClick={() => onSelectSemester(semester.id)}
          />
        ))}
      </StudentSelectionLayout>
    </QueryBoundary>
  );
}
