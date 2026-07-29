import { AppCard } from '@design-system/components/AppCard';
import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { colors } from '@design-system/theme/colors';
import { useLessonsByUnit } from '@services/queries/content-query.hooks';

interface LessonListProps {
  unitId: string;
  onSelectLesson: (lessonId: string) => void;
}

export function LessonList({ unitId, onSelectLesson }: LessonListProps) {
  const { data: lessons, isLoading, error, reload } = useLessonsByUnit(unitId);

  return (
    <QueryBoundary isLoading={isLoading} error={error} onRetry={reload}>
      <section>
        <h2 style={{ margin: '0 0 0.9rem', color: colors.textPrimary }}>الدروس</h2>
        <div style={{ display: 'grid', gap: '0.8rem' }}>
          {lessons.map((lesson) => (
            <AppCard
              key={lesson.id}
              title={lesson.title}
              subtitle={`الدرس ${lesson.order}`}
              onClick={() => onSelectLesson(lesson.id)}
            />
          ))}
        </div>
      </section>
    </QueryBoundary>
  );
}
