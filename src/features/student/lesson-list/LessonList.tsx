import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { isStudentReferencePreviewLesson } from '@content/student-reference-preview';
import { colors } from '@design-system/theme/colors';
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
        description="تظهر بنية المنهج الآن، ولا يفتح للطالب إلا الدرس الذي اكتمل إعداده واعتماده للنشر."
        icon="lesson"
      >
        {lessons.length === 0 ? (
          <p style={{ color: colors.textSecondary }}>
            لا توجد دروس منشورة أو مخططة لهذه الوحدة حتى الآن.
          </p>
        ) : null}

        {lessons.map((lesson) => {
          const isPublished = lesson.status === 'approved';
          const isReferencePreview = isStudentReferencePreviewLesson(lesson.id);
          const isAvailable = isPublished || isReferencePreview;

          return (
            <StudentChoiceCard
              key={lesson.id}
              title={lesson.title}
              subtitle={
                isPublished
                  ? `الدرس ${lesson.order}`
                  : isReferencePreview
                    ? `الدرس ${lesson.order} • نموذج تجريبي`
                    : `الدرس ${lesson.order} • قيد الإعداد`
              }
              statusLabel={
                isPublished ? 'جاهز للتعلّم' : isReferencePreview ? 'معاينة' : 'قيد الإعداد'
              }
              icon="lesson"
              disabled={!isAvailable}
              onClick={() => onSelectLesson(lesson.id)}
            />
          );
        })}
      </StudentSelectionLayout>
    </QueryBoundary>
  );
}
