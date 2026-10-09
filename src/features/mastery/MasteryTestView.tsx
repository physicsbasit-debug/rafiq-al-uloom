import { useMemo, useState } from 'react';
import { AppButton } from '@design-system/components/AppButton';
import { ChoiceButton } from '@design-system/components/ChoiceButton';
import { ScientificText } from '@design-system/components/ScientificText';
import { MasteryBadge } from '@design-system/components/MasteryBadge';
import { StudentBackAction } from '@features/student/navigation/StudentBackAction';
import { QueryBoundary } from '@design-system/components/QueryBoundary';
import { colors } from '@design-system/theme/colors';
import { radius } from '@design-system/theme/radius';
import { spacing } from '@design-system/theme/spacing';
import { typography } from '@design-system/theme/typography';
import { getStudentQuestionVisual } from '@content/student-question-visuals';
import { getGrade9Lesson11MasteryDimension } from '@content/learning-design/grade9-lesson-1-1-learning-design';
import { Grade9LengthVolumeMastery } from './Grade9LengthVolumeMastery';
import { getQuestionFeedback } from '@features/quiz/quiz-engine';
import type { MasteryResult } from '@shared-types/mastery.types';
import type { Question } from '@shared-types/quiz.types';
import { useMasteryQuestions } from '@services/queries/content-query.hooks';
import { areAllQuestionsAnswered, calculateScore, type AnswersByQuestionId } from '@utils/scoring';
import { classifyMasteryScore } from './mastery-classifier';
import { MasteryResultSaveStatus } from './MasteryResultSaveStatus';
import { useMasteryResultPersistence } from './useMasteryResultPersistence';
import { getMasteryRecommendation } from './recommendations';

interface MasteryTestViewProps {
  lessonId: string;
  onBackToLesson: () => void;
}
interface MasteryTestContentProps {
  questions: Question[];
  lessonId: string;
  onBackToLesson: () => void;
}

function withOfficialScore(
  result: MasteryResult | null,
  officialScore: number
): MasteryResult | null {
  if (!result || result.score === officialScore) return result;
  const classification = classifyMasteryScore(officialScore);
  return {
    ...result,
    score: officialScore,
    classification,
    recommendation: getMasteryRecommendation(classification),
  };
}

function ReviewItem({
  question,
  questionNumber,
  selectedIndex,
}: {
  question: Question;
  questionNumber: number;
  selectedIndex?: number;
}) {
  const feedback = getQuestionFeedback(question, selectedIndex ?? -1);
  return (
    <article
      style={{
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        padding: spacing.md,
        backgroundColor: colors.surface,
      }}
    >
      <p style={{ margin: `0 0 ${spacing.xs}`, color: colors.textSecondary, fontWeight: 800 }}>
        السؤال <bdi dir="ltr">{questionNumber}</bdi>
      </p>
      <h4 style={{ margin: `0 0 ${spacing.sm}`, color: colors.textPrimary }}>
        <ScientificText text={question.prompt} />
      </h4>
      <p
        style={{
          color: feedback.isCorrect ? colors.successDark : colors.errorDark,
          fontWeight: 900,
        }}
      >
        {feedback.isCorrect ? '✓ إجابة صحيحة' : '✕ إجابة خاطئة'}
      </p>
      <p style={{ color: colors.textPrimary }}>
        <strong>اختيارك: </strong>
        {feedback.selectedChoice !== null ? (
          <ScientificText text={feedback.selectedChoice} />
        ) : (
          'لم تُسجّل إجابة'
        )}
      </p>
      <p style={{ color: colors.textPrimary }}>
        <strong>الإجابة الصحيحة: </strong>
        <ScientificText text={feedback.correctChoice} />
      </p>
      <p style={{ color: colors.textPrimary, lineHeight: typography.lineHeight.lg }}>
        <strong>الشرح: </strong>
        <ScientificText text={feedback.explanation} />
      </p>
    </article>
  );
}

function LearningSummary({
  questions,
  answers,
}: {
  questions: Question[];
  answers: AnswersByQuestionId;
}) {
  const rows = questions
    .map((question) => ({
      dimension: getGrade9Lesson11MasteryDimension(question.id),
      correct: answers[question.id] === question.correctAnswerIndex,
    }))
    .filter((row): row is { dimension: string; correct: boolean } => Boolean(row.dimension));

  const dimensions = [...new Set(rows.map((row) => row.dimension))];
  const mastered = dimensions.filter((dimension) =>
    rows.filter((row) => row.dimension === dimension).every((row) => row.correct)
  );
  const review = dimensions.filter((dimension) => !mastered.includes(dimension));

  return (
    <section className="rafiq-mastery-learning-summary" aria-label="ملخص تعلمك">
      <h4>صورتك بعد الاختبار</h4>
      <div className="rafiq-learning-result-grid">
        <div className="is-mastered">
          <strong>أتقنت</strong>
          {mastered.length ? (
            <ul>
              {mastered.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <span>لم تكتمل نقطة إتقان بعد.</span>
          )}
        </div>
        <div className="is-review">
          <strong>راجع</strong>
          {review.length ? (
            <ul>
              {review.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ) : (
            <span>لا توجد نقطة تحتاج مراجعة الآن.</span>
          )}
        </div>
      </div>
    </section>
  );
}

const G9_LESSON_11_ID = 'g9-phy-s1-u1-l1';

const G9_MASTERY_SCENARIO_LABELS = [
  'موقف جديد',
  'موقف من الحياة الواقعية',
  'موقف تحليلي',
  'موقف كمي جديد',
  'موقف تطبيقي جديد',
] as const;

const G9_MASTERY_VARIANT_B_PROMPTS: Readonly<Record<string, string>> = {
  'g9-s1-u1-l1-mq1':
    'أرسل مهندس صيانة مخططًا لفتحة تثبيت وكتب: «قطر الفتحة = 12» من دون وحدة. ما المشكلة في هذا التسجيل؟',
  'g9-s1-u1-l1-mq2':
    'مختبران في مدينتين مختلفتين يتبادلان قياسات لعينات متطابقة، لكن كل مختبر يسجل الأطوال بوحدة مختلفة. لماذا يحتاجان إلى نظام وحدات متفق عليه؟',
  'g9-s1-u1-l1-mq3':
    'قاس طالبان بعدًا صغيرًا بأداتين؛ إحداهما رقمية والأخرى ذات تدريج أوضح. قال أحدهما: «الشاشة الرقمية تعني أن القياس أدق دائمًا». أي استنتاج علمي أكثر صحة؟',
  'g9-s1-u1-l1-mq4':
    'كتب فريق أ طول قضيب بأنه 1.6 m، وكتب فريق ب للطول نفسه 1600 mm. ماذا تستنتج بعد توحيد الوحدة؟',
  'g9-s1-u1-l1-mq5':
    'يصنع مورد محورًا لذراع روبوت في بلد، وسيُركب الجزء في مصنع آخر. أرسل المورد قياسًا مقداره 6 من دون وحدة. ما المشكلة التي قد تحدث، وما الممارسة التي تمنعها؟',
};

const G9_REVIEW_TARGETS: Readonly<Record<string, string>> = {
  'فهم القياس المكتمل': 'راجع فكرة: القياس = قيمة عددية + وحدة مناسبة.',
  'استخدام الوحدات المشتركة والتواصل العلمي':
    'راجع فكرة: توحيد الوحدة قبل المقارنة وأهمية لغة قياس مشتركة.',
  'الدقة والموثوقية في القياس': 'راجع فقرة: الدقة في القياس، ولا تحكم من شكل الأداة وحده.',
  'تطبيق المفهوم في موقف جديد':
    'راجع فكرة: لماذا يجب أن يكون القياس واضحًا وقابلًا للنقل بين فرق مختلفة.',
};

function getMasteryLevel(correctCount: number, total: number): string {
  if (correctCount === total) return 'إتقان مرحلي متقدم';
  if (correctCount >= total - 1) return 'إتقان مرحلي جيد';
  if (correctCount >= Math.ceil(total * 0.6)) return 'إتقان مرحلي قيد التثبيت';
  return 'يحتاج إلى مراجعة مركزة';
}

function Grade9Lesson11MasteryExperience({
  questions,
  lessonId,
  onBackToLesson,
}: MasteryTestContentProps) {
  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswersByQuestionId>({});
  const [result, setResult] = useState<MasteryResult | null>(null);
  const [attemptVariant, setAttemptVariant] = useState<0 | 1>(0);
  const persistence = useMasteryResultPersistence(lessonId);

  const attemptQuestions = useMemo(
    () =>
      attemptVariant === 0
        ? questions
        : questions.map((question) => ({
            ...question,
            prompt: G9_MASTERY_VARIANT_B_PROMPTS[question.id] ?? question.prompt,
          })),
    [attemptVariant, questions]
  );

  const currentQuestion = attemptQuestions[currentIndex];
  const selectedIndex = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isComplete = areAllQuestionsAnswered(attemptQuestions, answers);

  function selectChoice(choiceIndex: number) {
    if (!currentQuestion || result) return;
    setAnswers((current) => ({ ...current, [currentQuestion.id]: choiceIndex }));
  }

  function finishTest() {
    if (!isComplete || result) return;
    const scoreResult = calculateScore(attemptQuestions, answers);
    const classification = classifyMasteryScore(scoreResult.score);
    const nextResult: MasteryResult = {
      id: `mastery-${lessonId}-local-session`,
      studentId: 'local-session',
      lessonId,
      score: scoreResult.score,
      classification,
      recommendation: getMasteryRecommendation(classification),
      createdAt: 'local-session',
    };
    setResult(nextResult);
    persistence.submitAttempt({ questions: attemptQuestions, answersByQuestionId: answers });
  }

  function startRetake() {
    setAttemptVariant((current) => (current === 0 ? 1 : 0));
    setAnswers({});
    setResult(null);
    setCurrentIndex(0);
    setStarted(true);
  }

  const rows = attemptQuestions
    .map((question) => ({
      dimension: getGrade9Lesson11MasteryDimension(question.id),
      correct: answers[question.id] === question.correctAnswerIndex,
    }))
    .filter((row): row is { dimension: string; correct: boolean } => Boolean(row.dimension));
  const dimensions = [...new Set(rows.map((row) => row.dimension))];
  const mastered = dimensions.filter((dimension) =>
    rows.filter((row) => row.dimension === dimension).every((row) => row.correct)
  );
  const review = dimensions.filter((dimension) => !mastered.includes(dimension));
  const correctCount = attemptQuestions.filter(
    (question) => answers[question.id] === question.correctAnswerIndex
  ).length;

  if (!started) {
    return (
      <section className="rafiq-mastery-stage-shell">
        <div className="rafiq-mastery-intro-card">
          <div className="rafiq-mastery-intro-copy">
            <span className="rafiq-mastery-eyebrow">اختبار الإتقان</span>
            <h2>إتقان مرحلي: أهمية القياس</h2>
            <p>استخدم ما تعلمته في مواقف جديدة، ثم تعرّف على جوانب القوة وما يحتاج إلى مراجعة.</p>
            <div className="rafiq-mastery-intro-facts" aria-label="خصائص اختبار الإتقان">
              <div>
                <strong>5</strong>
                <span>مواقف جديدة</span>
              </div>
              <div>
                <strong>لا توجد</strong>
                <span>تلميحات أثناء الحل</span>
              </div>
              <div>
                <strong>بعد النهاية</strong>
                <span>يظهر التقرير التشخيصي</span>
              </div>
            </div>
            <button type="button" className="rafiq-mastery-start" onClick={() => setStarted(true)}>
              ابدأ اختبار الإتقان
            </button>
          </div>
          <div className="rafiq-mastery-intro-visual" aria-hidden="true">
            <div className="rafiq-mastery-target-mark">
              <span>✓</span>
            </div>
            <div className="rafiq-mastery-orbit one" />
            <div className="rafiq-mastery-orbit two" />
          </div>
        </div>
        <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
      </section>
    );
  }

  if (result) {
    const level = getMasteryLevel(correctCount, attemptQuestions.length);
    const reviewTarget = review.length
      ? (G9_REVIEW_TARGETS[review[0]] ?? 'راجع الفكرة التي لم تتقنها ثم أعد التحقق.')
      : 'أكملت أهداف هذا الجزء بنجاح. انتقل إلى التعلم التالي وواصل نقل الفكرة إلى مواقف جديدة.';

    return (
      <section className="rafiq-mastery-stage-shell">
        <div className="rafiq-mastery-report">
          <div className="rafiq-mastery-report-hero">
            <div className="rafiq-mastery-report-mark" aria-hidden="true">
              ✓
            </div>
            <div>
              <span>تقرير إتقانك</span>
              <h2>{level}</h2>
              <p>أكملت اختبار الإتقان. هذه خريطة أدائك حسب المهارات، وليست مجرد درجة.</p>
            </div>
            <div
              className="rafiq-mastery-score-ring"
              aria-label={`النتيجة ${correctCount} من ${attemptQuestions.length}`}
            >
              <strong>
                <bdi dir="ltr">
                  {correctCount}/{attemptQuestions.length}
                </bdi>
              </strong>
              <span>مواقف صحيحة</span>
            </div>
          </div>

          <div className="rafiq-mastery-skill-report" aria-label="تفاصيل الأداء">
            {dimensions.map((dimension) => {
              const ok = mastered.includes(dimension);
              return (
                <div key={dimension} className={ok ? 'is-mastered' : 'is-review'}>
                  <span className="rafiq-mastery-skill-icon" aria-hidden="true">
                    {ok ? '✓' : '!'}
                  </span>
                  <strong>{dimension}</strong>
                  <span>{ok ? 'متقن' : 'يحتاج مراجعة'}</span>
                </div>
              );
            })}
          </div>

          <div className="rafiq-mastery-next-action">
            <div>
              <span>ماذا تفعل الآن؟</span>
              <strong>{review.length ? reviewTarget : 'واصل إلى الدرس التالي.'}</strong>
              <p>
                {review.length
                  ? 'لا نعيد الأسئلة نفسها. راجع الفكرة أولًا، ثم أعد التحقق بمواقف وأرقام مختلفة.'
                  : 'نتيجتك تشير إلى أنك تستطيع استخدام الفكرة في مواقف جديدة دون مساعدة.'}
              </p>
            </div>
            <div className="rafiq-mastery-report-actions">
              {review.length ? (
                <button
                  type="button"
                  className="rafiq-mastery-primary-action"
                  onClick={onBackToLesson}
                >
                  راجع الفكرة في الدرس
                </button>
              ) : null}
              <button
                type="button"
                className="rafiq-mastery-secondary-action"
                onClick={startRetake}
              >
                إعادة التحقق بمواقف جديدة
              </button>
              <button type="button" className="rafiq-mastery-ghost-action" onClick={onBackToLesson}>
                العودة إلى الدرس
              </button>
            </div>
          </div>
          <MasteryResultSaveStatus state={persistence.state} onRetry={persistence.retry} />
        </div>
      </section>
    );
  }

  if (!currentQuestion) {
    return (
      <section className="rafiq-mastery-stage-shell">
        <p role="alert">لا توجد مواقف إتقان متاحة لهذا الدرس.</p>
        <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
      </section>
    );
  }

  const visual = getStudentQuestionVisual(currentQuestion.id);
  const scenarioLabel = G9_MASTERY_SCENARIO_LABELS[currentIndex] ?? 'موقف جديد';
  const progress = ((currentIndex + 1) / attemptQuestions.length) * 100;

  return (
    <section className="rafiq-mastery-stage-shell">
      <div className="rafiq-mastery-progress-row">
        <strong aria-label={`السؤال ${currentIndex + 1} من ${attemptQuestions.length}`}>
          السؤال <bdi dir="ltr">{currentIndex + 1}</bdi> من{' '}
          <bdi dir="ltr">{attemptQuestions.length}</bdi>
        </strong>
        <div className="rafiq-mastery-dots" aria-label="تقدم اختبار الإتقان">
          {attemptQuestions.map((question, index) => (
            <span
              key={question.id}
              className={
                index === currentIndex ? 'is-current' : index < currentIndex ? 'is-past' : ''
              }
            />
          ))}
        </div>
      </div>
      <div
        className="rafiq-mastery-progress-track"
        role="progressbar"
        aria-label="تقدم اختبار الإتقان"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <span style={{ width: `${progress}%` }} />
      </div>

      <article className="rafiq-mastery-scenario-card">
        <div className="rafiq-mastery-scenario-label">{scenarioLabel}</div>
        {visual ? (
          <img
            className="rafiq-mastery-scenario-visual"
            src={visual.src}
            alt={visual.alt}
            width="1200"
            height="675"
          />
        ) : null}
        <h2>
          <ScientificText text={currentQuestion.prompt} />
        </h2>
        <div className="rafiq-mastery-choice-list" aria-label="اختيارات الموقف">
          {currentQuestion.choices.map((choice, choiceIndex) => (
            <button
              key={choice}
              type="button"
              className={selectedIndex === choiceIndex ? 'is-selected' : ''}
              aria-pressed={selectedIndex === choiceIndex}
              onClick={() => selectChoice(choiceIndex)}
            >
              <span className="rafiq-mastery-choice-radio" aria-hidden="true" />
              <ScientificText text={choice} />
            </button>
          ))}
        </div>
        <p className="rafiq-mastery-silent-note">لن تظهر صحة الإجابة أثناء الاختبار.</p>
      </article>

      <div className="rafiq-mastery-navigation">
        <button
          type="button"
          className="rafiq-mastery-secondary-action"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
        >
          السؤال السابق
        </button>
        {currentIndex < attemptQuestions.length - 1 ? (
          <button
            type="button"
            className="rafiq-mastery-primary-action"
            disabled={selectedIndex === undefined}
            onClick={() =>
              setCurrentIndex((current) => Math.min(attemptQuestions.length - 1, current + 1))
            }
          >
            السؤال التالي
          </button>
        ) : (
          <button
            type="button"
            className="rafiq-mastery-primary-action"
            disabled={!isComplete}
            onClick={finishTest}
          >
            إنهاء الاختبار
          </button>
        )}
      </div>
      <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
    </section>
  );
}

function MasteryTestContentRouter(props: MasteryTestContentProps) {
  if (props.lessonId === G9_LESSON_11_ID) {
    return <Grade9Lesson11MasteryExperience {...props} />;
  }
  if (props.lessonId === 'g9-phy-s1-u1-l2') {
    return <Grade9LengthVolumeMastery {...props} />;
  }
  return <GenericMasteryTestContent {...props} />;
}

function GenericMasteryTestContent({
  questions,
  lessonId,
  onBackToLesson,
}: MasteryTestContentProps) {
  const [answers, setAnswers] = useState<AnswersByQuestionId>({});
  const [result, setResult] = useState<MasteryResult | null>(null);
  const persistence = useMasteryResultPersistence(lessonId);
  const isComplete = areAllQuestionsAnswered(questions, answers);
  const displayedResult =
    persistence.state.status === 'saved'
      ? withOfficialScore(result, persistence.state.result.percentage)
      : result;
  const isGrade9Lesson11 = lessonId === 'g9-phy-s1-u1-l1';

  function handleSelectChoice(questionId: string, choiceIndex: number) {
    if (!result && answers[questionId] === undefined)
      setAnswers((current) => ({ ...current, [questionId]: choiceIndex }));
  }

  function handleFinishTest() {
    if (!isComplete) return;
    const scoreResult = calculateScore(questions, answers);
    const classification = classifyMasteryScore(scoreResult.score);
    setResult({
      id: `mastery-${lessonId}-local-session`,
      studentId: 'local-session',
      lessonId,
      score: scoreResult.score,
      classification,
      recommendation: getMasteryRecommendation(classification),
      createdAt: 'local-session',
    });
    persistence.submitAttempt({ questions, answersByQuestionId: answers });
  }

  return (
    <section>
      <header className="rafiq-learning-hub-hero" style={{ marginBottom: spacing.lg }}>
        <div>
          <p>{isGrade9Lesson11 ? 'تحقق بعد التعلم' : 'قياس الإتقان'}</p>
          <h2>{isGrade9Lesson11 ? 'إتقان مرحلي: أهمية القياس' : 'اختبار الإتقان'}</h2>
          {isGrade9Lesson11 ? (
            <span>
              خمسة مواقف جديدة للتحقق من قدرتك على استخدام الفكرة، لا تكرار أسئلة المراجعة.
            </span>
          ) : null}
        </div>
      </header>

      <div style={{ display: 'grid', gap: spacing.md }}>
        {questions.map((question, questionIndex) => {
          const selectedIndex = answers[question.id];
          const hasAnswered = selectedIndex !== undefined;
          const visual = getStudentQuestionVisual(question.id);
          return (
            <article
              key={question.id}
              style={{
                border: `1px solid ${colors.border}`,
                borderRadius: radius.lg,
                padding: spacing.lg,
                backgroundColor: colors.surface,
              }}
            >
              <p
                style={{
                  margin: `0 0 ${spacing.xs}`,
                  color: colors.textSecondary,
                  fontWeight: 800,
                }}
              >
                سؤال <bdi dir="ltr">{questionIndex + 1}</bdi>
              </p>
              {visual ? (
                <img
                  className="rafiq-question-visual"
                  src={visual.src}
                  alt={visual.alt}
                  width="1200"
                  height="675"
                  loading="lazy"
                />
              ) : null}
              <h3
                style={{
                  margin: `0 0 ${spacing.md}`,
                  color: colors.textPrimary,
                  fontSize: typography.fontSize.md,
                  lineHeight: typography.lineHeight.xl,
                }}
              >
                <ScientificText text={question.prompt} />
              </h3>
              <div style={{ display: 'grid', gap: spacing.sm }}>
                {question.choices.map((choice, choiceIndex) => (
                  <ChoiceButton
                    key={choice}
                    label={String.fromCharCode(65 + choiceIndex)}
                    choice={choice}
                    selected={selectedIndex === choiceIndex}
                    disabled={hasAnswered || Boolean(result)}
                    onClick={() => handleSelectChoice(question.id, choiceIndex)}
                    selectedHint="(تم اختيارها)"
                  />
                ))}
              </div>
            </article>
          );
        })}
      </div>

      {!displayedResult ? (
        <div style={{ marginTop: spacing.lg }}>
          <p style={{ color: colors.textSecondary, lineHeight: typography.lineHeight.lg }}>
            تمت الإجابة عن <bdi dir="ltr">{Object.keys(answers).length}</bdi> من{' '}
            <bdi dir="ltr">{questions.length}</bdi> أسئلة.
          </p>
          {!isComplete ? (
            <p role="status" style={{ color: colors.warning, fontWeight: 800 }}>
              أكمل الإجابة عن جميع الأسئلة لتفعيل زر إنهاء الاختبار.
            </p>
          ) : null}
          <AppButton label="إنهاء الاختبار" disabled={!isComplete} onClick={handleFinishTest} />
        </div>
      ) : (
        <section
          style={{
            marginTop: spacing.lg,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.lg,
            padding: spacing.lg,
            backgroundColor: colors.surfaceMuted,
          }}
        >
          <h3 style={{ marginTop: 0, color: colors.textPrimary }}>نتيجة اختبار الإتقان</h3>
          <p style={{ color: colors.textPrimary, fontWeight: 900 }}>
            الدرجة: <bdi dir="ltr">{displayedResult.score}</bdi> من <bdi dir="ltr">100</bdi>
          </p>
          <MasteryBadge classification={displayedResult.classification} />
          <p style={{ color: colors.textPrimary, lineHeight: typography.lineHeight.lg }}>
            <strong>التوصية: </strong>
            {displayedResult.recommendation}
          </p>
          {isGrade9Lesson11 ? <LearningSummary questions={questions} answers={answers} /> : null}
          <MasteryResultSaveStatus state={persistence.state} onRetry={persistence.retry} />
          <div style={{ display: 'grid', gap: spacing.md }}>
            {questions.map((question, index) => (
              <ReviewItem
                key={question.id}
                question={question}
                questionNumber={index + 1}
                selectedIndex={answers[question.id]}
              />
            ))}
          </div>
        </section>
      )}

      <div style={{ marginTop: spacing.lg }}>
        <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
      </div>
    </section>
  );
}

export function MasteryTestView({ lessonId, onBackToLesson }: MasteryTestViewProps) {
  const questionsQuery = useMasteryQuestions(lessonId);
  return (
    <QueryBoundary
      isLoading={questionsQuery.isLoading}
      error={questionsQuery.error}
      onRetry={questionsQuery.reload}
    >
      <MasteryTestContentRouter
        key={lessonId}
        questions={questionsQuery.data}
        lessonId={lessonId}
        onBackToLesson={onBackToLesson}
      />
    </QueryBoundary>
  );
}
