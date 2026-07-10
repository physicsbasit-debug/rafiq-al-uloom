import { AppCard } from '@design-system/components/AppCard';
import { getUnitsBySubjectAndSemester } from '@services/data/local-content.repository';

interface UnitSelectionProps {
  subjectId: string;
  semesterId: string;
  onSelectUnit: (unitId: string) => void;
}

export function UnitSelection({ subjectId, semesterId, onSelectUnit }: UnitSelectionProps) {
  const units = getUnitsBySubjectAndSemester(subjectId, semesterId);

  return (
    <section>
      <h2 style={{ color: '#1F2937' }}>اختر الوحدة</h2>

      {units.length === 0 ? (
        <p style={{ color: '#6B7280' }}>لا توجد وحدات مضافة لهذه المادة في هذا الفصل بعد.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {units.map((unit) => (
            <AppCard key={unit.id} title={unit.title} onClick={() => onSelectUnit(unit.id)} />
          ))}
        </div>
      )}
    </section>
  );
}
