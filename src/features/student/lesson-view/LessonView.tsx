import { AppButton } from '@design-system/components/AppButton';
import { colors } from '@design-system/theme/colors';
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
  onOpenReviewQuestions: () => void;
  onOpenMatchingGame: () => void;
  onOpenMasteryTest: () => void;
}

export function LessonView({
  lessonId,
  onBackToLessons,
  onOpenReviewQuestions,
  onOpenMatchingGame,
  onOpenMasteryTest,
}: LessonViewProps) {
  const lesson = getLessonById(lessonId);

  if (!lesson) {
    return (
      <section>
        <h2>لم يتم العثور على الدرس</h2>
        <AppButton label="العودة إلى الدروس" onClick={onBackToLessons} />
      </section>
    );
  }

  return (
    <article style={{ display: 'grid', gap: '0.9rem' }}>
      <header>
        <p style={{ margin: '0 0 0.25rem', color: colors.textSecondary, fontWeight: 800 }}>
          درس قراءة
        </p>
        <h2 style={{ margin: 0, color: colors.textPrimary }}>{lesson.title}</h2>
      </header>

      <LessonObjectives objectives={getObjectivesByLesson(lesson.id)} />
      <LessonSummary summary={lesson.summary} />
      <LessonConcepts concepts={lesson.keyConcepts} />
      <LessonExamples examples={lesson.examples} />
      <LessonMisconceptions misconceptions={lesson.misconceptions} />
      <LessonExperiments experiments={getExperimentsByLesson(lesson.id)} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.65rem',
        }}
      >
        <AppButton label="أسئلة المراجعة" onClick={onOpenReviewQuestions} />
        <AppButton label="لعبة تعليمية" onClick={onOpenMatchingGame} />
        <AppButton label="اختبار الإتقان" onClick={onOpenMasteryTest} />
        <AppButton label="العودة إلى الدروس" variant="secondary" onClick={onBackToLessons} />
      </div>
    </article>
  );
}
