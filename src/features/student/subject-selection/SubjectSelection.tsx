import { AppCard } from '@design-system/components/AppCard';
import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { colors } from '@design-system/theme/colors';
import { useSubjectsBySemester } from '@services/queries/content-query.hooks';

interface SubjectSelectionProps {
  semesterId: string;
  onSelectSubject: (subjectId: string) => void;
}

export function SubjectSelection({ semesterId, onSelectSubject }: SubjectSelectionProps) {
  const { data: subjects, isLoading, error, reload } = useSubjectsBySemester(semesterId);

  return (
    <QueryBoundary isLoading={isLoading} error={error} onRetry={reload}>
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
    </QueryBoundary>
  );
}
