import { AppCard } from '@design-system/components/AppCard';
import { getSubjectsBySemester } from '@services/data/local-content.repository';

interface SubjectSelectionProps {
  semesterId: string;
  onSelectSubject: (subjectId: string) => void;
}

export function SubjectSelection({ semesterId, onSelectSubject }: SubjectSelectionProps) {
  const subjects = getSubjectsBySemester(semesterId);

  return (
    <section>
      <h2 style={{ color: '#1F2937' }}>اختر المادة</h2>

      {subjects.length === 0 ? (
        <p style={{ color: '#6B7280' }}>لا توجد مواد مضافة لهذا الفصل بعد.</p>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {subjects.map((subject) => (
            <AppCard
              key={subject.id}
              title={subject.name}
              accentColor={subject.themeColor}
              onClick={() => onSelectSubject(subject.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
