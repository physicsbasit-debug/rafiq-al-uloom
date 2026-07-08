import { getLessonsByUnit } from '@services/data/local-content.repository';
import { AppCard } from '@design-system/components/AppCard';

interface LessonListProps {
  unitId: string;
  onSelectLesson: (lessonId: string) => void;
}

export function LessonList({ unitId, onSelectLesson }: LessonListProps) {
  const lessons = getLessonsByUnit(unitId);
  return (
    <section>
      <h2 style={{ color: '#1F2937' }}>الدروس</h2>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
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
  );
}
