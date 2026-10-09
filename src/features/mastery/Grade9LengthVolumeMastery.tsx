import { useMemo, useState } from 'react';

import {
  getGrade9Lesson12MasteryDimension,
  getGrade9Lesson12MasteryStageLabel,
} from '@content/learning-design/grade9-lesson-1-2-learning-design';
import { getStudentQuestionVisual } from '@content/student-question-visuals';
import { ScientificText } from '@design-system/components/ScientificText';
import { StudentBackAction } from '@features/student/navigation/StudentBackAction';
import type { MasteryResult } from '@shared-types/mastery.types';
import type { Question } from '@shared-types/quiz.types';
import { areAllQuestionsAnswered, calculateScore, type AnswersByQuestionId } from '@utils/scoring';

import { classifyMasteryScore } from './mastery-classifier';
import { MasteryResultSaveStatus } from './MasteryResultSaveStatus';
import { getMasteryRecommendation } from './recommendations';
import { useMasteryResultPersistence } from './useMasteryResultPersistence';

interface Grade9LengthVolumeMasteryProps {
  readonly questions: Question[];
  readonly lessonId: string;
  readonly onBackToLesson: () => void;
}

const VARIANT_B_QUESTIONS: Readonly<
  Record<string, Pick<Question, 'prompt' | 'choices' | 'explanation'>>
> = {
  'g9-s1-u1-l2-mq1': {
    prompt:
      'مسطرة لا يمكن الاعتماد على بدايتها. وُضعت بداية شريط عند 1.7 cm ونهايته عند 11.1 cm. ما طول الشريط الصحيح؟',
    choices: ['9.4 cm', '11.1 cm', '12.8 cm', '1.7 cm'],
    explanation:
      'عند تعذر البدء من الصفر نطرح قراءة البداية من قراءة النهاية: 11.1 cm - 1.7 cm = 9.4 cm.',
  },
  'g9-s1-u1-l2-mq2': {
    prompt:
      'لإيجاد قطر سلك رفيع، لُفَّت 30 لفة متجاورة منه فشغلت عرضًا كليًا مقداره 18.0 mm. ما قطر السلك تقريبًا؟',
    choices: ['0.60 mm', '1.67 mm', '18.0 mm', '540 mm'],
    explanation: 'هذا قياس غير مباشر: نقسم العرض الكلي على عدد اللفات، 18.0 mm ÷ 30 = 0.60 mm.',
  },
  'g9-s1-u1-l2-mq3': {
    prompt:
      'في ميكرومتر، آخر قراءة ظاهرة على التدريج الرئيسي هي 3.5 mm، وخط المرجع يطابق 17 تقسيمًا، قيمة كل تقسيم 0.01 mm. ما القراءة النهائية؟',
    choices: ['3.67 mm', '3.17 mm', '3.50 mm', '17.5 mm'],
    explanation: 'قراءة التدريج الكسري = 17 × 0.01 mm = 0.17 mm، ثم 3.5 mm + 0.17 mm = 3.67 mm.',
  },
  'g9-s1-u1-l2-mq4': {
    prompt:
      'أثناء فحص قطعة من سبيكة معدنية غير منتظمة في ورشة جودة، غُمِرت القطعة مع مكعب معدني معياري حجمه 2 mL في مخبار مدرج. كان مستوى الماء قبل الغمر 28 mL وأصبح 36 mL بعد غمر الجسمين بالكامل. ما حجم قطعة السبيكة؟',
    choices: ['6 mL', '2 mL', '8 mL', '10 mL'],
    explanation:
      'الإزاحة الكلية 8 mL، وبعد طرح حجم المكعب المعياري 2 mL يكون حجم قطعة السبيكة 6 mL.',
  },
  'g9-s1-u1-l2-mq5': {
    prompt:
      'يُصنع قالب صابون مستطيل وفق مخطط إنتاج. طوله 10 cm وعرضه 6 cm، والحجم المطلوب للقالب 180 cm³. ما السُمك المطلوب للقالب؟',
    choices: ['3 cm', '6 cm', '10 cm', '30 cm'],
    explanation: 'السُمك = الحجم ÷ (الطول × العرض) = 180 ÷ (10 × 6) = 3 cm.',
  },
};

const VARIANT_B_VISUALS: Readonly<Record<string, { readonly src: string; readonly alt: string }>> =
  {
    'g9-s1-u1-l2-mq4': {
      src: '/lesson-visuals/mastery/g9-length-volume/combined-displacement-alloy.svg',
      alt: 'مخبار مدرج قبل الغمر وبعد غمر مكعب معدني معياري وقطعة سبيكة غير منتظمة بالكامل',
    },
    'g9-s1-u1-l2-mq5': {
      src: '/lesson-visuals/mastery/g9-length-volume/orthographic-soap-block.svg',
      alt: 'مخطط إنتاج مسطح لقالب صابون مستطيل يوضح بعدين معلومين والسُمك بعلامة استفهام',
    },
  };

const REVIEW_TARGETS: Readonly<Record<string, string>> = {
  'القياس بالمسطرة وتصحيح نقطة البداية':
    'راجع طريقة القياس عندما لا تبدأ من الصفر: الطول = قراءة النهاية - قراءة البداية.',
  'القياس غير المباشر للأبعاد الصغيرة':
    'راجع القياس غير المباشر: قِس مجموعة متطابقة ثم اقسم القياس الكلي على عددها.',
  'قراءة الميكرومتر': 'راجع قراءة الميكرومتر: اجمع قراءة التدريج الرئيسي مع قراءة التدريج الكسري.',
  'استنتاج حجم مجهول من الإزاحة الكلية':
    'راجع الإزاحة المركبة: احسب الحجم الكلي المزاح ثم استبعد حجم الجسم المعلوم للوصول إلى الحجم المجهول.',
  'استنتاج بعد مجهول من حجم معلوم':
    'راجع العلاقة بين الحجم والأبعاد: عندما يكون الحجم وبعدان معلومين يمكن استنتاج البعد الثالث.',
};

function getMasteryLevel(correctCount: number, total: number): string {
  if (correctCount === total) return 'إتقان مرحلي متقدم';
  if (correctCount >= total - 1) return 'إتقان مرحلي جيد';
  if (correctCount >= Math.ceil(total * 0.6)) return 'إتقان مرحلي قيد التثبيت';
  return 'يحتاج إلى مراجعة مركزة';
}

export function Grade9LengthVolumeMastery({
  questions,
  lessonId,
  onBackToLesson,
}: Grade9LengthVolumeMasteryProps) {
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
            ...(VARIANT_B_QUESTIONS[question.id] ?? {}),
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
      dimension: getGrade9Lesson12MasteryDimension(question.id),
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
            <h2>إتقان مرحلي: قياس الطول والحجم</h2>
            <p>
              خمسة مواقف جديدة تقيس قدرتك على اختيار طريقة القياس وقراءة الأدوات ونقل الفكرة إلى
              مسائل جديدة، من دون تلميحات أثناء الحل.
            </p>
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
      ? (REVIEW_TARGETS[review[0]] ?? 'راجع الفكرة التي لم تتقنها ثم أعد التحقق.')
      : 'أكملت أهداف هذا الجزء بنجاح. واصل التعلم وانتقل إلى موقف جديد بثقة.';

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
              <p>انتهى الاختبار. التقرير يوضح ما أتقنته وما يحتاج إلى مراجعة حسب مهارات القياس.</p>
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
                  ? 'راجع المهارة المحددة أولًا، ثم أعد التحقق. الإعادة تستخدم سياقًا وأرقامًا مختلفة بدل نسخ السؤال نفسه.'
                  : 'نتيجتك تشير إلى قدرتك على استخدام مهارات القياس والحجم في مواقف جديدة دون مساعدة.'}
              </p>
            </div>
            <div className="rafiq-mastery-report-actions">
              {review.length ? (
                <button
                  type="button"
                  className="rafiq-mastery-primary-action"
                  onClick={onBackToLesson}
                >
                  راجع المهارة في الدرس
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

  const baseVisual = getStudentQuestionVisual(currentQuestion.id);
  const visual =
    attemptVariant === 1 ? (VARIANT_B_VISUALS[currentQuestion.id] ?? baseVisual) : baseVisual;
  const scenarioLabel = getGrade9Lesson12MasteryStageLabel(currentQuestion.id) ?? 'موقف جديد';
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
