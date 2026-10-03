import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { UnitSelection } from '@features/student/unit-selection/UnitSelection';
import { useSubjectsBySemester } from '@services/queries/content-query.hooks';

interface PhysicsUnitSelectionProps {
  readonly semesterId: string;
  readonly onSelectUnit: (unitId: string) => void;
}

export function PhysicsUnitSelection({ semesterId, onSelectUnit }: PhysicsUnitSelectionProps) {
  const subjectsQuery = useSubjectsBySemester(semesterId);
  const physicsSubject =
    subjectsQuery.data.find((subject) => subject.name.trim() === 'الفيزياء') ??
    subjectsQuery.data[0];

  return (
    <QueryBoundary
      isLoading={subjectsQuery.isLoading}
      error={subjectsQuery.error}
      onRetry={subjectsQuery.reload}
    >
      {physicsSubject ? (
        <UnitSelection
          semesterId={semesterId}
          subjectId={physicsSubject.id}
          onSelectUnit={onSelectUnit}
        />
      ) : (
        <section role="status" className="rafiq-empty-learning-state">
          <h2>الوحدات غير متاحة حاليًا</h2>
          <p>لم يتم العثور على كتالوج الفيزياء لهذا الفصل الدراسي.</p>
        </section>
      )}
    </QueryBoundary>
  );
}
