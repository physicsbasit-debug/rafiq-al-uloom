import { getUnitsBySubject } from '@services/data/local-content.repository';
import { AppCard } from '@design-system/components/AppCard';

interface UnitSelectionProps {
  subjectId: string;
  onSelectUnit: (unitId: string) => void;
}

export function UnitSelection({ subjectId, onSelectUnit }: UnitSelectionProps) {
  const units = getUnitsBySubject(subjectId);
  return (
    <section>
      <h2 style={{ color: '#1F2937' }}>اختر الوحدة</h2>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {units.map((unit) => (
          <AppCard key={unit.id} title={unit.title} onClick={() => onSelectUnit(unit.id)} />
        ))}
      </div>
    </section>
  );
}
