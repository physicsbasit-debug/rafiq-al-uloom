import { AppCard } from '@design-system/components/AppCard';
import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { colors } from '@design-system/theme/colors';
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
      <section>
        <h2 style={{ margin: '0 0 0.9rem', color: colors.textPrimary }}>اختر الوحدة</h2>
        <div style={{ display: 'grid', gap: '0.8rem' }}>
          {units.map((unit) => (
            <AppCard key={unit.id} title={unit.title} onClick={() => onSelectUnit(unit.id)} />
          ))}
        </div>
      </section>
    </QueryBoundary>
  );
}
