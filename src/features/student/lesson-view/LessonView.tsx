import { AppButton } from '@design-system/components/AppButton';
import { QueryBoundary } from '@design-system/components/QueryBoundary';
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

import { LessonActionGrid } from './LessonActionGrid';

interface LessonViewProps {
  lessonId: string;
  onBackToLessons: () => void;
  onOpenReviewQuestions: () => void;
  onOpenActivities: () => void;
  onOpenMatchingGame: () => void;
  onOpenVirtualLabs: () => void;
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
  onOpenVirtualLabs,
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
    <article className="rafiq-lesson-view">
      <header className="rafiq-lesson-hero">
        <p>درس الفيزياء</p>
        <h2>{lesson.title}</h2>
        <span>اقرأ المفاهيم، شاهد الأمثلة، ثم اختر طريقة التدريب المناسبة لك.</span>
      </header>

      <div className="rafiq-lesson-content-stack">
        <LessonObjectives objectives={objectives} />
        <LessonSummary summary={lesson.summary} />
        <LessonConcepts concepts={lesson.keyConcepts} />
        <LessonExamples examples={lesson.examples} />
        <LessonMisconceptions misconceptions={lesson.misconceptions} />
        <LessonExperiments experiments={experiments} />
      </div>

      <LessonActionGrid
        onOpenReviewQuestions={onOpenReviewQuestions}
        onOpenActivities={onOpenActivities}
        onOpenMatchingGame={onOpenMatchingGame}
        onOpenVirtualLabs={onOpenVirtualLabs}
        onOpenMasteryTest={onOpenMasteryTest}
        onBackToLessons={onBackToLessons}
      />
    </article>
  );
}

export function LessonView({
  lessonId,
  onBackToLessons,
  onOpenReviewQuestions,
  onOpenActivities,
  onOpenMatchingGame,
  onOpenVirtualLabs,
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
        onOpenVirtualLabs={onOpenVirtualLabs}
        onOpenMasteryTest={onOpenMasteryTest}
      />
    </QueryBoundary>
  );
}
