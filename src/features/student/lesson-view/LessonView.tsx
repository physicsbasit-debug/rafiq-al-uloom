import { AppButton } from '@design-system/components/AppButton';
import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { colors } from '@design-system/theme/colors';
import { spacing } from '@design-system/theme/spacing';
import { LessonConcepts } from '@features/lesson/concepts/LessonConcepts';
import { LessonExamples } from '@features/lesson/examples/LessonExamples';
import { LessonExperiments } from '@features/lesson/experiments/LessonExperiments';
import { LessonMisconceptions } from '@features/lesson/misconceptions/LessonMisconceptions';
import { LessonObjectives } from '@features/lesson/objectives/LessonObjectives';
import { LessonSummary } from '@features/lesson/summary/LessonSummary';
import type { Lesson, Objective } from '@shared-types/content.types';
import type { Experiment } from '@shared-types/experiment.types';
import {
  useLesson,
  useLessonExperiments,
  useLessonObjectives,
} from '@services/queries/content-query.hooks';

interface LessonViewProps {
  lessonId: string;
  onBackToLessons: () => void;
  onOpenReviewQuestions: () => void;
  onOpenActivities: () => void;
  onOpenMatchingGame: () => void;
  onOpenMasteryTest: () => void;
}

interface LessonViewContentProps extends Omit<LessonViewProps, 'lessonId'> {
  lesson: Lesson | undefined;
  objectives: Objective[];
  experiments: Experiment[];
}

function LessonViewContent({
  lesson,
  objectives,
  experiments,
  onBackToLessons,
  onOpenReviewQuestions,
  onOpenActivities,
  onOpenMatchingGame,
  onOpenMasteryTest,
}: LessonViewContentProps) {
  if (!lesson) {
    return (
      <section>
        <h2>لم يتم العثور على الدرس</h2>
        <AppButton label="العودة إلى الدروس" onClick={onBackToLessons} />
      </section>
    );
  }

  return (
    <article style={{ display: 'grid', gap: spacing.lg }}>
      <header>
        <p
          style={{
            margin: `0 0 ${spacing.xs}`,
            color: colors.textSecondary,
            fontWeight: 800,
          }}
        >
          درس قراءة
        </p>
        <h2 style={{ margin: 0, color: colors.textPrimary }}>{lesson.title}</h2>
      </header>

      <LessonObjectives objectives={objectives} />
      <LessonSummary summary={lesson.summary} />
      <LessonConcepts concepts={lesson.keyConcepts} />
      <LessonExamples examples={lesson.examples} />
      <LessonMisconceptions misconceptions={lesson.misconceptions} />
      <LessonExperiments experiments={experiments} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: spacing.md,
        }}
      >
        <AppButton label="أسئلة المراجعة" onClick={onOpenReviewQuestions} />
        <AppButton label="الأنشطة العلمية" onClick={onOpenActivities} />
        <AppButton label="لعبة تعليمية" onClick={onOpenMatchingGame} />
        <AppButton label="اختبار الإتقان" onClick={onOpenMasteryTest} />
        <AppButton label="العودة إلى الدروس" variant="secondary" onClick={onBackToLessons} />
      </div>
    </article>
  );
}

export function LessonView({
  lessonId,
  onBackToLessons,
  onOpenReviewQuestions,
  onOpenActivities,
  onOpenMatchingGame,
  onOpenMasteryTest,
}: LessonViewProps) {
  const lessonQuery = useLesson(lessonId);
  const objectivesQuery = useLessonObjectives(lessonId);
  const experimentsQuery = useLessonExperiments(lessonId);

  const isLoading =
    lessonQuery.isLoading || objectivesQuery.isLoading || experimentsQuery.isLoading;
  const error = lessonQuery.error || objectivesQuery.error || experimentsQuery.error;

  function handleRetry() {
    lessonQuery.reload();
    objectivesQuery.reload();
    experimentsQuery.reload();
  }

  return (
    <QueryBoundary isLoading={isLoading} error={error} onRetry={handleRetry}>
      <LessonViewContent
        lesson={lessonQuery.data}
        objectives={objectivesQuery.data}
        experiments={experimentsQuery.data}
        onBackToLessons={onBackToLessons}
        onOpenReviewQuestions={onOpenReviewQuestions}
        onOpenActivities={onOpenActivities}
        onOpenMatchingGame={onOpenMatchingGame}
        onOpenMasteryTest={onOpenMasteryTest}
      />
    </QueryBoundary>
  );
}
