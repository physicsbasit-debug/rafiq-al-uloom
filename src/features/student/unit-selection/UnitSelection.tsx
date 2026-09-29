import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { StudentChoiceCard } from '@features/student/navigation/StudentChoiceCard';
import { StudentSelectionLayout } from '@features/student/navigation/StudentSelectionLayout';
import { useUnitsBySubjectAndSemester } from '@services/queries/content-query.hooks';

interface UnitSelectionProps {
  semesterId: string;
  subjectId: string;
  onSelectUnit: (unitId: string) => void;
}

export function UnitSelection({ semesterId, subjectId, onSelectUnit }: UnitSelectionProps) {
  const {
    data: units,
    isLoading,
    error,
    reload,
  } = useUnitsBySubjectAndSemester(subjectId, semesterId);

  return (
    <QueryBoundary isLoading={isLoading} error={error} onRetry={reload}>
      <StudentSelectionLayout
        title="اختر الوحدة"
        description="الوحدات مرتبة كما يعيدها مصدر المحتوى، وتظهر للطالب الوحدات المنشورة والمتاحة فقط."
        icon="unit"
      >
        {units.map((unit) => (
          <StudentChoiceCard
            key={unit.id}
            title={unit.title}
            subtitle={`الوحدة ${unit.order}`}
            icon="unit"
            onClick={() => onSelectUnit(unit.id)}
          />
        ))}
      </StudentSelectionLayout>
    </QueryBoundary>
  );
}
