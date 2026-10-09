import { useMemo, useState } from 'react';
import { StudentBackAction } from '@features/student/navigation/StudentBackAction';
import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { ScientificText } from '@design-system/components/ScientificText';
import { spacing } from '@design-system/theme/spacing';
import { useReviewQuestions } from '@services/queries/content-query.hooks';
import type { Question } from '@shared-types/quiz.types';
import { getStudentQuestionVisual } from '@content/student-question-visuals';
import { Grade9LengthVolumeReview } from './Grade9LengthVolumeReview';
import {
  grade9Lesson11QuestionDesign,
  type InternalReviewRole,
} from '@content/learning-design/grade9-lesson-1-1-learning-design';

interface ReviewQuestionsViewProps {
  lessonId: string;
  onBackToLesson: () => void;
  onComplete?: () => void;
}

interface ReviewQuestionsContentProps {
  questions: Question[];
  onBackToLesson: () => void;
  onComplete?: () => void;
}

interface ReviewResponse {
  readonly selectedIndex: number | null;
  readonly attempts: number;
  readonly resolved: boolean;
  readonly correct: boolean;
}

interface ReviewSummaryGroup {
  readonly label: string;
  readonly questionIds: string[];
}

const REVIEW_ROLE_LABELS: Readonly<Record<InternalReviewRole, string>> = {
  recall: 'استرجاع الفكرة',
  apply: 'تطبيق قصير',
  visual_read: 'قراءة مرئية',
  misconception: 'اكتشاف خطأ مفاهيمي',
  concept_link: 'ربط المفهوم',
};

export function ReviewQuestionsView({
  lessonId,
  onBackToLesson,
  onComplete,
}: ReviewQuestionsViewProps) {
  const questionsQuery = useReviewQuestions(lessonId);

  return (
    <QueryBoundary
      isLoading={questionsQuery.isLoading}
      error={questionsQuery.error}
      onRetry={questionsQuery.reload}
    >
      {lessonId === 'g9-phy-s1-u1-l2' ? (
        <Grade9LengthVolumeReview questions={questionsQuery.data} onBackToLesson={onBackToLesson} />
      ) : (
        <ReviewQuestionsContent
          questions={questionsQuery.data}
          onBackToLesson={onBackToLesson}
          onComplete={onComplete}
        />
      )}
    </QueryBoundary>
  );
}

function buildSummaryGroups(questions: Question[]): ReviewSummaryGroup[] {
  const groups = new Map<string, string[]>();

  questions.forEach((question, index) => {
    const groupLabel =
      grade9Lesson11QuestionDesign[question.id]?.reviewSummaryGroup ?? `الفكرة ${index + 1}`;
    const current = groups.get(groupLabel) ?? [];
    current.push(question.id);
    groups.set(groupLabel, current);
  });

  return Array.from(groups, ([label, questionIds]) => ({ label, questionIds }));
}

function ReviewQuestionsContent({
  questions,
  onBackToLesson,
  onComplete,
}: ReviewQuestionsContentProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, ReviewResponse>>({});
  const [isComplete, setIsComplete] = useState(false);

  const summaryGroups = useMemo(() => buildSummaryGroups(questions), [questions]);

  if (questions.length === 0) {
    return (
      <section className="rafiq-review-flow">
        <ReviewHero />
        <div style={{ marginTop: spacing.lg }}>
          <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
        </div>
      </section>
    );
  }

  if (isComplete) {
    const weakGroups = summaryGroups.filter(({ questionIds }) =>
      questionIds.some((questionId) => !responses[questionId]?.correct)
    );

    return (
      <section className="rafiq-review-flow">
        <ReviewHero />
        <section className="rafiq-review-summary" aria-labelledby="review-summary-title">
          <div className="rafiq-review-summary-heading">
            <span aria-hidden="true">✓</span>
            <div>
              <p>اكتملت المراجعة</p>
              <h3 id="review-summary-title">مراجعة فهمك</h3>
              <span>
                النتيجة هنا ترشدك إلى الفكرة التي تحتاج تثبيتها، وليست حكمًا نهائيًا على إتقانك.
              </span>
            </div>
          </div>

          <div className="rafiq-review-summary-list">
            {summaryGroups.map(({ label, questionIds }) => {
              const mastered = questionIds.every((questionId) => responses[questionId]?.correct);
              return (
                <div key={label} className={mastered ? 'is-mastered' : 'is-review'}>
                  <strong>{label}</strong>
                  <span>{mastered ? 'أتقنت' : 'يحتاج مراجعة'}</span>
                </div>
              );
            })}
          </div>

          <div className="rafiq-review-summary-actions">
            {weakGroups.length > 0 ? (
              <button
                type="button"
                className="rafiq-review-primary-action"
                onClick={onBackToLesson}
              >
                راجع الفكرة التي تحتاجها
              </button>
            ) : null}
            <button
              type="button"
              className="rafiq-review-secondary-action"
              onClick={() => {
                setResponses({});
                setCurrentIndex(0);
                setIsComplete(false);
              }}
            >
              أعد المراجعة
            </button>
          </div>
        </section>

        <div style={{ marginTop: spacing.lg }}>
          <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
        </div>
      </section>
    );
  }

  const question = questions[currentIndex];
  const response = responses[question.id];
  const selectedIndex = response?.selectedIndex ?? null;
  const design = grade9Lesson11QuestionDesign[question.id];
  const reviewRole = design?.reviewRole;
  const stageLabel = reviewRole ? REVIEW_ROLE_LABELS[reviewRole] : 'تثبيت الفهم';
  const hint = design?.reviewHint ?? 'أعد قراءة السؤال وحدد أولًا الفكرة العلمية التي يقيسها.';
  const visual = getStudentQuestionVisual(question.id);
  const isCorrectSelection = selectedIndex === question.correctAnswerIndex;
  const canRetry = Boolean(response && !response.resolved && !response.correct);
  const canAdvance = Boolean(response?.resolved);
  const progress = Math.round(((currentIndex + 1) / questions.length) * 100);

  function handleSelectChoice(choiceIndex: number) {
    const current = responses[question.id];
    if (current?.resolved || (current && current.selectedIndex !== null)) {
      return;
    }

    const attempts = (current?.attempts ?? 0) + 1;
    const correct = choiceIndex === question.correctAnswerIndex;
    const resolved = correct || attempts >= 2;

    setResponses((previous) => ({
      ...previous,
      [question.id]: {
        selectedIndex: choiceIndex,
        attempts,
        resolved,
        correct,
      },
    }));
  }

  function handleRetry() {
    setResponses((previous) => {
      const current = previous[question.id];
      if (!current || current.resolved) {
        return previous;
      }

      return {
        ...previous,
        [question.id]: {
          ...current,
          selectedIndex: null,
        },
      };
    });
  }

  function handleNext() {
    if (!canAdvance) {
      return;
    }

    if (currentIndex === questions.length - 1) {
      setIsComplete(true);
      onComplete?.();
      return;
    }

    setCurrentIndex((index) => index + 1);
  }

  return (
    <section className="rafiq-review-flow">
      <ReviewHero />

      <div className="rafiq-review-progress-block">
        <div className="rafiq-review-progress-copy">
          <strong aria-label={`السؤال ${currentIndex + 1} من ${questions.length}`}>
            السؤال <bdi dir="ltr">{currentIndex + 1}</bdi> من{' '}
            <bdi dir="ltr">{questions.length}</bdi>
          </strong>
          <span>{stageLabel}</span>
        </div>
        <div
          className="rafiq-review-progress"
          role="progressbar"
          aria-label="تقدم أسئلة المراجعة"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <article className="rafiq-review-question-card">
        <div className="rafiq-review-question-copy">
          <h3>
            <ScientificText text={question.prompt} />
          </h3>
        </div>

        {visual ? (
          <figure className="rafiq-review-visual">
            <img src={visual.src} alt={visual.alt} width="1200" height="675" loading="lazy" />
          </figure>
        ) : null}

        <div className="rafiq-review-choice-grid" aria-label="خيارات الإجابة">
          {question.choices.map((choice, index) => {
            const selected = selectedIndex === index;
            const stateClass = selected ? (isCorrectSelection ? 'is-correct' : 'is-wrong') : '';

            return (
              <button
                key={choice}
                type="button"
                className={`rafiq-review-choice ${stateClass}`.trim()}
                aria-label={choice}
                aria-pressed={selected}
                disabled={selectedIndex !== null}
                onClick={() => handleSelectChoice(index)}
              >
                <ScientificText text={choice} />
              </button>
            );
          })}
        </div>

        {response && response.selectedIndex !== null ? (
          <div
            className={`rafiq-review-feedback ${response.correct ? 'is-correct' : 'is-wrong'}`}
            role="status"
          >
            <strong>{response.correct ? '✓ صحيح' : 'تحتاج مراجعة هذه الفكرة'}</strong>
            <span>
              <ScientificText
                text={response.correct || response.resolved ? question.explanation : hint}
              />
            </span>
            {canRetry ? (
              <button type="button" onClick={handleRetry}>
                حاول مرة أخرى
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="rafiq-review-navigation">
          <button
            type="button"
            className="rafiq-review-secondary-action"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
          >
            السؤال السابق
          </button>
          <button
            type="button"
            className="rafiq-review-primary-action"
            disabled={!canAdvance}
            onClick={handleNext}
          >
            {currentIndex === questions.length - 1 ? 'إنهاء المراجعة' : 'السؤال التالي'}
          </button>
        </div>
      </article>

      <div style={{ marginTop: spacing.lg }}>
        <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
      </div>
    </section>
  );
}

function ReviewHero() {
  return (
    <header className="rafiq-learning-hub-hero rafiq-review-hero">
      <div className="rafiq-learning-hub-hero-icon" aria-hidden="true">
        ✓
      </div>
      <div>
        <p>ثبّت فهمك وصحح الأخطاء مباشرة</p>
        <h2>أسئلة المراجعة</h2>
        <span>استرجع الفكرة، طبّقها، اقرأ الموقف، اكشف الخطأ، ثم اربط المفهوم.</span>
      </div>
    </header>
  );
}
