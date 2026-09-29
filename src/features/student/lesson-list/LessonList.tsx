import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { StudentChoiceCard } from '@features/student/navigation/StudentChoiceCard';
import { StudentSelectionLayout } from '@features/student/navigation/StudentSelectionLayout';
import { useLessonsByUnit } from '@services/queries/content-query.hooks';

interface LessonListProps {
  unitId: string;
  onSelectLesson: (lessonId: string) => void;
}

export function LessonList({ unitId, onSelectLesson }: LessonListProps) {
  const { data: lessons, isLoading, error, reload } = useLessonsByUnit(unitId);

  return (
    <QueryBoundary isLoading={isLoading} error={error} onRetry={reload}>
      <StudentSelectionLayout
        title="الدروس"
        description="اختر الدرس للانتقال إلى الشرح والأنشطة والأسئلة المرتبطة به."
        icon="lesson"
      >
        {lessons.map((lesson) => (
          <StudentChoiceCard
            key={lesson.id}
            title={lesson.title}
            subtitle={`الدرس ${lesson.order}`}
            icon="lesson"
            onClick={() => onSelectLesson(lesson.id)}
          />
        ))}
      </StudentSelectionLayout>
    </QueryBoundary>
  );
}
