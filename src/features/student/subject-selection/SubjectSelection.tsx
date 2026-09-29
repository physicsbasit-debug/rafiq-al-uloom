import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { colors } from '@design-system/theme/colors';
import { StudentChoiceCard } from '@features/student/navigation/StudentChoiceCard';
import { StudentSelectionLayout } from '@features/student/navigation/StudentSelectionLayout';
import { useSubjectsBySemester } from '@services/queries/content-query.hooks';

interface SubjectSelectionProps {
  semesterId: string;
  onSelectSubject: (subjectId: string) => void;
}

export function SubjectSelection({ semesterId, onSelectSubject }: SubjectSelectionProps) {
  const { data: subjects, isLoading, error, reload } = useSubjectsBySemester(semesterId);

  return (
    <QueryBoundary isLoading={isLoading} error={error} onRetry={reload}>
      <StudentSelectionLayout
        title="اختر المادة"
        description="رفيق العلوم مخصص حاليًا لمادة الفيزياء للصفين التاسع والعاشر."
        icon="physics"
      >
        {subjects.length === 0 ? (
          <p style={{ color: colors.textSecondary }}>لا توجد مواد مرتبطة بهذا الفصل بعد.</p>
        ) : null}

        {subjects.map((subject) => (
          <StudentChoiceCard
            key={subject.id}
            title={subject.name}
            subtitle="ادخل إلى وحدات المادة ودروسها"
            icon="physics"
            accentColor={subject.themeColor}
            onClick={() => onSelectSubject(subject.id)}
          />
        ))}
      </StudentSelectionLayout>
    </QueryBoundary>
  );
}
