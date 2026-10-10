import { useMemo, useState } from 'react';

import { ScientificText } from '@design-system/components/ScientificText';
import { spacing } from '@design-system/theme/spacing';
import {
  grade9Lesson13ReviewDesign,
  grade9Lesson13ReviewQuestion5Steps,
  type Grade9Lesson13ReviewRole,
} from '@content/learning-design/grade9-lesson-1-3-learning-design';
import { StudentBackAction } from '@features/student/navigation/StudentBackAction';
import {
  buildReviewChoiceLayout,
  shouldPreserveReviewChoiceOrder,
  type ReviewChoiceIdentity,
} from '@features/student/review-questions/review-choice-layout';
import type { Question } from '@shared-types/quiz.types';

import './Grade9TimeMeasurementReview.css';

interface Grade9TimeMeasurementReviewProps {
  readonly questions: Question[];
  readonly onBackToLesson: () => void;
  readonly onComplete?: () => void;
}

interface ResponseState {
  readonly selectedIndex: number | null;
  readonly attempts: number;
  readonly resolved: boolean;
  readonly correct: boolean;
}

const ROLE_LABELS: Readonly<Record<Grade9Lesson13ReviewRole, string>> = {
  recall: 'استرجاع معنى الفترة',
  apply: 'تطبيق قصير',
  visual_read: 'قراءة مرئية',
  misconception: 'اكتشاف خطأ مفاهيمي',
  concept_link: 'ربط المفهوم',
};

const Q5_ID = 'g9-s1-u1-l3-rq5';

export function Grade9TimeMeasurementReview({
  questions,
  onBackToLesson,
  onComplete,
}: Grade9TimeMeasurementReviewProps) {
  const orderedQuestions = useMemo(
    () =>
      grade9Lesson13ReviewDesign
        .map(({ id }) => questions.find((question) => question.id === id))
        .filter((question): question is Question => Boolean(question)),
    [questions]
  );

  const [position, setPosition] = useState(0);
  const [responses, setResponses] = useState<Record<string, ResponseState>>({});
  const [q5StepIndex, setQ5StepIndex] = useState(0);
  const [q5Responses, setQ5Responses] = useState<Record<string, ResponseState>>({});
  const [complete, setComplete] = useState(false);
  const [choiceSeed] = useState(() => Math.floor(Math.random() * 100_000) + 1);

  if (orderedQuestions.length !== 5) {
    return (
      <section className="rafiq-review-flow">
        <ReviewHero />
        <div className="rafiq-l13-review-contract-warning" role="alert">
          تعذر تحميل عقد المراجعة الخماسي كاملًا.
        </div>
        <div style={{ marginTop: spacing.lg }}>
          <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
        </div>
      </section>
    );
  }

  if (complete) {
    return (
      <ReviewSummary
        questions={orderedQuestions}
        responses={responses}
        q5Responses={q5Responses}
        onBackToLesson={onBackToLesson}
        onRestart={() => {
          setPosition(0);
          setResponses({});
          setQ5StepIndex(0);
          setQ5Responses({});
          setComplete(false);
        }}
      />
    );
  }

  const question = orderedQuestions[position];
  const design = grade9Lesson13ReviewDesign[position];
  const isQuestion5 = question.id === Q5_ID;
  const q5Step = grade9Lesson13ReviewQuestion5Steps[q5StepIndex];

  const activeResponse = isQuestion5 ? q5Responses[q5Step.id] : responses[question.id];
  const sourceChoices = isQuestion5 ? q5Step.choices : question.choices;
  const sourceCorrectAnswerIndex = isQuestion5
    ? q5Step.correctAnswerIndex
    : question.correctAnswerIndex;
  const displayAttempt = activeResponse
    ? activeResponse.selectedIndex === null
      ? activeResponse.attempts + 1
      : activeResponse.attempts
    : 1;
  const choiceIdentities: ReviewChoiceIdentity[] = sourceChoices.map((choice, index) => ({
    id: `${isQuestion5 ? `${question.id}-${q5Step.id}` : question.id}-choice-${index}`,
    text: choice,
    diagnosis: index === sourceCorrectAnswerIndex ? 'correct' : `distractor-${index}`,
    correct: index === sourceCorrectAnswerIndex,
  }));
  const activeChoices = buildReviewChoiceLayout(choiceIdentities, {
    seed: choiceSeed,
    questionIndex: position + (isQuestion5 ? q5StepIndex : 0),
    attempt: displayAttempt,
    preserveOrder: shouldPreserveReviewChoiceOrder(sourceChoices),
  });
  const hint = isQuestion5 ? q5Step.hint : design.hint;
  const explanation = isQuestion5 ? q5Step.explanation : question.explanation;
  const selectedIndex = activeResponse?.selectedIndex ?? null;
  const canRetry = Boolean(activeResponse && !activeResponse.resolved && !activeResponse.correct);
  const canAdvance = Boolean(activeResponse?.resolved);
  const progress = Math.round(((position + 1) / orderedQuestions.length) * 100);

  function selectChoice(choiceIndex: number) {
    if (activeResponse?.resolved || (activeResponse && activeResponse.selectedIndex !== null))
      return;

    const attempts = (activeResponse?.attempts ?? 0) + 1;
    const correct = activeChoices[choiceIndex]?.correct === true;
    const next: ResponseState = {
      selectedIndex: choiceIndex,
      attempts,
      resolved: correct || attempts >= 2,
      correct,
    };

    if (isQuestion5) {
      setQ5Responses((current) => ({ ...current, [q5Step.id]: next }));
    } else {
      setResponses((current) => ({ ...current, [question.id]: next }));
    }
  }

  function retry() {
    if (!activeResponse || activeResponse.resolved) return;
    const next = { ...activeResponse, selectedIndex: null };

    if (isQuestion5) {
      setQ5Responses((current) => ({ ...current, [q5Step.id]: next }));
    } else {
      setResponses((current) => ({ ...current, [question.id]: next }));
    }
  }

  function next() {
    if (!canAdvance) return;

    if (isQuestion5) {
      if (q5StepIndex < grade9Lesson13ReviewQuestion5Steps.length - 1) {
        setQ5StepIndex((index) => index + 1);
        return;
      }

      setComplete(true);
      onComplete?.();
      return;
    }

    setPosition((index) => index + 1);
  }

  function previous() {
    if (isQuestion5 && q5StepIndex > 0) {
      setQ5StepIndex((index) => index - 1);
      return;
    }
    setPosition((index) => Math.max(0, index - 1));
  }

  return (
    <section className="rafiq-review-flow rafiq-l13-review">
      <ReviewHero />

      <div className="rafiq-review-progress-block">
        <div className="rafiq-review-progress-copy">
          <strong aria-label={`السؤال ${position + 1} من 5`}>
            السؤال <bdi dir="ltr">{position + 1}</bdi> من <bdi dir="ltr">5</bdi>
          </strong>
          <span>{ROLE_LABELS[design.role]}</span>
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
        {isQuestion5 ? (
          <div className="rafiq-l13-review-substep">
            <strong>الخطوة {q5StepIndex + 1} من 3</strong>
            <span>{q5Step.title}</span>
          </div>
        ) : null}

        <div className="rafiq-review-question-copy">
          <h3>
            <ScientificText text={isQuestion5 ? q5Step.prompt : question.prompt} />
          </h3>
        </div>

        <ReviewVisual questionId={question.id} />

        {isQuestion5 && activeResponse ? (
          <div className="rafiq-l13-review-attempt">المحاولة {activeResponse.attempts} من 2</div>
        ) : null}

        <div className="rafiq-review-choice-grid" aria-label="خيارات الإجابة">
          {activeChoices.map((choice, index) => {
            const selected = selectedIndex === index;
            const correct = choice.correct;
            const stateClass = selected ? (correct ? 'is-correct' : 'is-wrong') : '';

            return (
              <button
                key={choice.id}
                type="button"
                className={`rafiq-review-choice ${stateClass}`.trim()}
                aria-label={choice.text}
                aria-pressed={selected}
                data-choice-id={choice.id}
                data-diagnosis={choice.diagnosis}
                data-correct={correct ? 'true' : 'false'}
                disabled={selectedIndex !== null}
                onClick={() => selectChoice(index)}
              >
                <ScientificText text={choice.text} />
              </button>
            );
          })}
        </div>

        {activeResponse && activeResponse.selectedIndex !== null ? (
          <div
            className={`rafiq-review-feedback ${activeResponse.correct ? 'is-correct' : 'is-wrong'}`}
            role="status"
          >
            <strong>{activeResponse.correct ? '✓ صحيح' : 'تحتاج مراجعة هذه الفكرة'}</strong>
            <span>
              <ScientificText
                text={activeResponse.correct || activeResponse.resolved ? explanation : hint}
              />
            </span>
            {canRetry ? (
              <button type="button" onClick={retry}>
                حاول مرة أخرى
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="rafiq-review-navigation">
          <button
            type="button"
            className="rafiq-review-secondary-action"
            disabled={position === 0 && q5StepIndex === 0}
            onClick={previous}
          >
            السابق
          </button>
          <button
            type="button"
            className="rafiq-review-primary-action"
            disabled={!canAdvance}
            onClick={next}
          >
            {isQuestion5
              ? q5StepIndex === grade9Lesson13ReviewQuestion5Steps.length - 1
                ? 'إنهاء المراجعة'
                : 'الخطوة التالية'
              : 'السؤال التالي'}
          </button>
        </div>
      </article>

      <div style={{ marginTop: spacing.lg }}>
        <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
      </div>
    </section>
  );
}

function ReviewVisual({ questionId }: { readonly questionId: string }) {
  if (questionId === 'g9-s1-u1-l3-rq1') {
    return (
      <figure
        className="rafiq-l13-review-visual"
        role="img"
        aria-label="خط زمني يوضح فترة بين بداية حدث ونهايته دون أرقام"
        dir="ltr"
      >
        <svg viewBox="0 0 760 180" aria-hidden="true">
          <line x1="110" y1="92" x2="650" y2="92" />
          <path d="M650 92 620 72M650 92 620 112" />
          <circle cx="150" cy="92" r="16" />
          <circle cx="610" cy="92" r="16" />
          <text x="150" y="145">
            البداية
          </text>
          <text x="610" y="145">
            النهاية
          </text>
          <text x="380" y="55">
            الفترة الزمنية
          </text>
        </svg>
      </figure>
    );
  }

  if (questionId === 'g9-s1-u1-l3-rq2') {
    return (
      <figure
        className="rafiq-l13-review-visual"
        role="img"
        aria-label="شريط يوضح 25 صورة موزعة على ثانية واحدة"
        dir="ltr"
      >
        <div className="rafiq-l13-frame-strip">
          {Array.from({ length: 25 }, (_, index) => (
            <span key={index} aria-hidden="true" />
          ))}
        </div>
        <figcaption>25 صورة في ثانية واحدة</figcaption>
      </figure>
    );
  }

  if (questionId === 'g9-s1-u1-l3-rq3') {
    return (
      <div className="rafiq-l13-review-table-wrap">
        <table className="rafiq-l13-review-table" aria-label="سجل القراءات الزمنية الثلاث">
          <thead>
            <tr>
              <th>المحاولة</th>
              <th>الزمن</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>0.82 ثانية</td>
            </tr>
            <tr>
              <td>2</td>
              <td>0.84 ثانية</td>
            </tr>
            <tr>
              <td>3</td>
              <td>0.92 ثانية</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  if (questionId === 'g9-s1-u1-l3-rq4') {
    return (
      <figure
        className="rafiq-l13-review-visual"
        role="img"
        aria-label="مسار بندول من البداية إلى الطرف المقابل ثم العودة إلى البداية"
        dir="ltr"
      >
        <svg viewBox="0 0 760 260" aria-hidden="true">
          <circle cx="380" cy="42" r="10" />
          <path d="M380 42 Q280 130 220 210" className="path-muted" />
          <path d="M380 42 Q480 130 540 210" className="path-muted" />
          <line x1="380" y1="42" x2="220" y2="210" />
          <circle cx="220" cy="210" r="24" />
          <circle cx="540" cy="210" r="24" className="bob-muted" />
          <path d="M260 205 Q380 135 500 205" className="motion-path" />
          <path d="M500 205 472 190M500 205 474 222" className="motion-path" />
          <path d="M500 225 Q380 285 260 225" className="motion-path return" />
          <path d="M260 225 288 210M260 225 286 242" className="motion-path return" />
          <text x="220" y="252">
            البداية / العودة
          </text>
          <text x="540" y="252">
            الطرف المقابل
          </text>
        </svg>
      </figure>
    );
  }

  return (
    <div className="rafiq-l13-review-table-wrap">
      <table className="rafiq-l13-review-table" aria-label="بيانات قياس الزمن الدوري للبندول">
        <thead>
          <tr>
            <th>عدد التأرجحات</th>
            <th>الزمن الكلي</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>20</td>
            <td>17.4 ثانية</td>
          </tr>
          <tr>
            <td>50</td>
            <td>43.2 ثانية</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function ReviewSummary({
  questions,
  responses,
  q5Responses,
  onBackToLesson,
  onRestart,
}: {
  readonly questions: Question[];
  readonly responses: Record<string, ResponseState>;
  readonly q5Responses: Record<string, ResponseState>;
  readonly onBackToLesson: () => void;
  readonly onRestart: () => void;
}) {
  return (
    <section className="rafiq-review-flow rafiq-l13-review">
      <ReviewHero />
      <section className="rafiq-review-summary" aria-labelledby="l13-review-summary-title">
        <div className="rafiq-review-summary-heading">
          <span aria-hidden="true">✓</span>
          <div>
            <p>اكتملت المراجعة</p>
            <h3 id="l13-review-summary-title">مراجعة فهمك</h3>
            <span>تظهر هنا الأفكار التي ثبتت والأفكار التي تستحق مراجعة قصيرة قبل الأنشطة.</span>
          </div>
        </div>

        <div className="rafiq-review-summary-list">
          {grade9Lesson13ReviewDesign.map((design, index) => {
            const mastered =
              design.id === Q5_ID
                ? grade9Lesson13ReviewQuestion5Steps.every((step) => q5Responses[step.id]?.correct)
                : responses[questions[index].id]?.correct;

            return (
              <div key={design.id} className={mastered ? 'is-mastered' : 'is-review'}>
                <strong>{design.summaryGroup}</strong>
                <span>{mastered ? 'أتقنت' : 'يحتاج مراجعة'}</span>
              </div>
            );
          })}
        </div>

        <div className="rafiq-review-summary-actions">
          <button type="button" className="rafiq-review-secondary-action" onClick={onRestart}>
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

function ReviewHero() {
  return (
    <header className="rafiq-learning-hub-hero rafiq-review-hero">
      <div className="rafiq-learning-hub-hero-icon" aria-hidden="true">
        ✓
      </div>
      <div>
        <p>ثبّت فهمك وصحح الأخطاء مباشرة</p>
        <h2>أسئلة مراجعة قياس الزمن</h2>
        <span>استرجع الفكرة، طبّقها، اقرأ الدليل، اكشف الخطأ، ثم اربط القياس بالدقة.</span>
      </div>
    </header>
  );
}
