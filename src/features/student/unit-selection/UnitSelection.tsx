import { AppCard } from '@design-system/components/AppCard';
import { colors } from '@design-system/theme/colors';
import { getUnitsBySubjectAndSemester } from '@services/data/local-content.repository';

interface UnitSelectionProps {
  semesterId: string;
  subjectId: string;
  onSelectUnit: (unitId: string) => void;
}

export function UnitSelection({ semesterId, subjectId, onSelectUnit }: UnitSelectionProps) {
  const units = getUnitsBySubjectAndSemester(subjectId, semesterId);

  return (
    <section>
      <h2 style={{ margin: '0 0 0.9rem', color: colors.textPrimary }}>اختر الوحدة</h2>
      <div style={{ display: 'grid', gap: '0.8rem' }}>
        {units.map((unit) => (
          <AppCard key={unit.id} title={unit.title} onClick={() => onSelectUnit(unit.id)} />
        ))}
      </div>
    </section>
  );
}
