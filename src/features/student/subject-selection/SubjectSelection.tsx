import { getSubjectsByGrade } from '@services/data/local-content.repository';
import { AppCard } from '@design-system/components/AppCard';

interface SubjectSelectionProps {
  gradeId: string;
  onSelectSubject: (subjectId: string) => void;
}

export function SubjectSelection({ gradeId, onSelectSubject }: SubjectSelectionProps) {
  const subjects = getSubjectsByGrade(gradeId);
  return (
    <section>
      <h2 style={{ color: '#1F2937' }}>اختر المادة</h2>
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
    </section>
  );
}
