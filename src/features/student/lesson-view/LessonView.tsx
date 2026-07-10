import { AppButton } from '@design-system/components/AppButton';
import { LessonConcepts } from '@features/lesson/concepts/LessonConcepts';
import { LessonExamples } from '@features/lesson/examples/LessonExamples';
import { LessonExperiments } from '@features/lesson/experiments/LessonExperiments';
import { LessonMisconceptions } from '@features/lesson/misconceptions/LessonMisconceptions';
import { LessonObjectives } from '@features/lesson/objectives/LessonObjectives';
import { LessonSummary } from '@features/lesson/summary/LessonSummary';
import {
  getExperimentsByLesson,
  getLessonById,
  getObjectivesByLesson,
} from '@services/data/local-content.repository';

interface LessonViewProps {
  lessonId: string;
  onBackToLessons: () => void;
}

export function LessonView({ lessonId, onBackToLessons }: LessonViewProps) {
  const lesson = getLessonById(lessonId);

  if (!lesson) {
    return (
      <section>
        <h2>لم يتم العثور على الدرس</h2>
        <p style={{ color: '#6B7280', lineHeight: 1.8 }}>
          يبدو أن الدرس غير موجود في بيانات المحتوى الحالية.
        </p>
        <AppButton label="العودة إلى الدروس" onClick={onBackToLessons} />
      </section>
    );
  }

  const objectives = getObjectivesByLesson(lesson.id);
  const experiments = getExperimentsByLesson(lesson.id);

  return (
    <article>
      <header style={{ marginBottom: '1.5rem' }}>
        <p
          style={{
            margin: '0 0 0.4rem',
            color: '#6B7280',
            fontWeight: 700,
          }}
        >
          درس قراءة
        </p>

        <h2
          style={{
            margin: 0,
            color: '#1F2937',
            fontSize: '1.5rem',
          }}
        >
          {lesson.title}
        </h2>
      </header>

      <LessonObjectives objectives={objectives} />
      <LessonSummary summary={lesson.summary} />
      <LessonConcepts concepts={lesson.keyConcepts} />
      <LessonExamples examples={lesson.examples} />
      <LessonMisconceptions misconceptions={lesson.misconceptions} />
      <LessonExperiments experiments={experiments} />

      <div style={{ marginTop: '1.5rem' }}>
        <AppButton label="العودة إلى الدروس" onClick={onBackToLessons} />
      </div>
    </article>
  );
}
