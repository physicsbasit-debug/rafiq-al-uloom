import { AppCard } from '@design-system/components/AppCard';
import { colors } from '@design-system/theme/colors';
import { getSubjectsBySemester } from '@services/data/local-content.repository';

interface SubjectSelectionProps {
  semesterId: string;
  onSelectSubject: (subjectId: string) => void;
}

export function SubjectSelection({ semesterId, onSelectSubject }: SubjectSelectionProps) {
  const subjects = getSubjectsBySemester(semesterId);

  return (
    <section>
      <h2 style={{ margin: '0 0 0.9rem', color: colors.textPrimary }}>اختر المادة</h2>

      {subjects.length === 0 ? (
        <p style={{ color: colors.textSecondary }}>لا توجد مواد مرتبطة بهذا الفصل بعد.</p>
      ) : null}

      <div style={{ display: 'grid', gap: '0.8rem' }}>
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
