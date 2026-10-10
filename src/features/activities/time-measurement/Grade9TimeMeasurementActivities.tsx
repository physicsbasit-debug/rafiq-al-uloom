import { deterministicShuffle } from '../../student/review-questions/review-choice-layout';
import { grade9Lesson13GuidedPendulumExperiment } from '../../../content/learning-design/grade9-lesson-1-3-learning-design';
import { useEffect, useRef, useState } from 'react';

import { StudentBackAction } from '@features/student/navigation/StudentBackAction';
import { StudentIcon, type StudentIconName } from '@features/student/navigation/StudentIcon';
import { normalizeNumericInput } from '@utils/numeric-input';

interface Grade9TimeMeasurementActivitiesProps {
  readonly onBackToLesson: () => void;
}

type ActivityState = 'available' | 'preparing' | 'unavailable';
type ActivityMode = 'menu' | 'inquiry' | 'data' | 'experiment';
type InquiryStage =
  'prediction' | 'trial-1' | 'trial-2' | 'mean' | 'trial-50' | 'compare' | 'reflection';

interface ActivityCardDefinition {
  readonly key: 'inquiry' | 'simulation' | 'data' | 'experiment';
  readonly heading: string;
  readonly title: string;
  readonly description: string;
  readonly icon: StudentIconName;
  readonly visual: string;
  readonly visualAlt: string;
  readonly state: ActivityState;
}

const VISUAL_BASE = '/lesson-visuals/activities/g9-time-measurement';

const PREDICTIONS = [
  'قياس 10 نبضات أفضل دائمًا لأنه يستغرق وقتًا أقصر',
  'لا يختلف أثر تشغيل وإيقاف الساعة بين 10 و50 نبضة',
  'قياس 50 نبضة قد يقلل أثر تشغيل وإيقاف الساعة على تقدير زمن النبضة الواحدة',
] as const;

const COMPARISON_OPTIONS = [
  {
    id: 'shorter',
    text: 'قياس 10 نبضات أفضل لأن تشغيل الساعة يحدث لمدة أقصر',
    correct: false,
  },
  {
    id: 'same',
    text: 'لا يتغير أثر تشغيل وإيقاف الساعة مهما تغيّر عدد النبضات',
    correct: false,
  },
  {
    id: 'distributed',
    text: 'يتوزع أثر تشغيل وإيقاف الساعة على عدد أكبر من النبضات عند قياس 50 نبضة',
    correct: true,
  },
] as const;

const ACTIVITY_CARDS: readonly ActivityCardDefinition[] = [
  {
    key: 'inquiry',
    heading: 'الاستقصاء العلمي',
    title: 'ساعة الجسم',
    description:
      'تنبأ أولًا، ثم قِس 10 نبضات مرتين واحسب المتوسط، وبعدها قِس 50 نبضة وقارن الطريقتين.',
    icon: 'inquiry',
    visual: `${VISUAL_BASE}/body-clock-inquiry.svg`,
    visualAlt: 'معصم ونبض وساعة توقيت لتمهيد استقصاء ساعة الجسم',
    state: 'available',
  },
  {
    key: 'simulation',
    heading: 'المحاكاة',
    title: 'محاكاة قياس الزمن',
    description: 'لا يوجد أصل محاكاة معتمد لهذا الدرس.',
    icon: 'simulation',
    visual: `${VISUAL_BASE}/simulation-unavailable.svg`,
    visualAlt: 'ساعة توقيت باهتة تدل على أن المحاكاة غير متوفرة في هذا الدرس',
    state: 'unavailable',
  },
  {
    key: 'data',
    heading: 'نشاط البيانات',
    title: 'بيانات النبض: الراحة وبعد نشاط خفيف',
    description:
      'قارن زمن 10 نبضات في حالتي الراحة وبعد نشاط خفيف، ثم استخرج النمط والدليل دون حساب متوسط جديد.',
    icon: 'data',
    visual: `${VISUAL_BASE}/pulse-data.svg`,
    visualAlt: 'دفتر بيانات ومجموعتان من نقاط النبض للراحة وبعد نشاط خفيف',
    state: 'available',
  },
  {
    key: 'experiment',
    heading: 'التجربة الموجهة',
    title: 'قياس الزمن الدوري للبندول',
    description:
      'ثبّت شروط المقارنة، جرّب أداتي الزمن، سجّل عشر قياسات، استخرج المدى بنفسك، ثم قارن بقياس 20 اهتزازة.',
    icon: 'experiment',
    visual: `${VISUAL_BASE}/pendulum-experiment.svg`,
    visualAlt: 'حامل بندول وساعة توقيت ودفتر قياس لتمهيد التجربة الموجهة',
    state: 'available',
  },
] as const;

function formatSeconds(value: number, digits = 2): string {
  return value.toFixed(digits);
}

function TenPulseWindowNote({ seconds }: { readonly seconds: number }) {
  if (seconds >= 6 && seconds <= 12) {
    return (
      <div className="rafiq-science-feedback is-success" role="status">
        <strong>المدة ضمن المدى المقترح للنشاط</strong>
        <span>سجّلنا القياس كما هو.</span>
      </div>
    );
  }

  return (
    <div className="rafiq-science-feedback is-review" role="status">
      <strong>تنبيه على مدة القياس</strong>
      <span>
        هذه المدة خارج المدى المقترح 6–12 ثانية. هذا تنبيه فقط ولا يمنع المتابعة، وسنحتفظ بالقياس
        كما سجلته.
      </span>
    </div>
  );
}

function PulseTimer({
  pulseCount,
  measuredSeconds,
  onMeasured,
}: {
  readonly pulseCount: 10 | 50;
  readonly measuredSeconds: number | null;
  readonly onMeasured: (seconds: number) => void;
}) {
  const [running, setRunning] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;

    const timer = window.setInterval(() => {
      if (startedAtRef.current === null) return;
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 100);

    return () => window.clearInterval(timer);
  }, [running]);

  function start() {
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setRunning(true);
  }

  function stop() {
    if (startedAtRef.current === null) return;
    const seconds = Math.max(0.01, (Date.now() - startedAtRef.current) / 1000);
    setElapsedMs(seconds * 1000);
    setRunning(false);
    startedAtRef.current = null;
    onMeasured(seconds);
  }

  const shownSeconds = measuredSeconds ?? elapsedMs / 1000;

  return (
    <div className="rafiq-inquiry-comparison">
      <div>
        <strong>
          <bdi dir="ltr">{formatSeconds(shownSeconds, 1)} s</bdi>
        </strong>
        <span>
          {measuredSeconds === null
            ? `ابدأ الساعة مع أول نبضة، ثم أوقفها بعد ${pulseCount} نبضات.`
            : `سُجل زمن ${pulseCount} نبضات.`}
        </span>
      </div>

      {measuredSeconds === null ? (
        running ? (
          <button type="button" className="rafiq-science-primary" onClick={stop}>
            أوقف بعد {pulseCount} نبضات
          </button>
        ) : (
          <button type="button" className="rafiq-science-primary" onClick={start}>
            ابدأ القياس
          </button>
        )
      ) : null}
    </div>
  );
}

function InquiryHeader() {
  return (
    <header className="rafiq-science-activity-header is-inquiry">
      <span className="rafiq-science-activity-header-icon" aria-hidden="true">
        <StudentIcon name="inquiry" width="34" height="34" />
      </span>
      <div>
        <p>الاستقصاء العلمي</p>
        <h2>ساعة الجسم</h2>
        <span>تنبأ، قِس، احسب، ثم قارن قبل أن تعود إلى توقعك الأول.</span>
      </div>
    </header>
  );
}

function InquirySteps({ stage }: { readonly stage: InquiryStage }) {
  const order: readonly InquiryStage[] = [
    'prediction',
    'trial-1',
    'trial-2',
    'mean',
    'trial-50',
    'compare',
    'reflection',
  ];
  const current = order.indexOf(stage);

  return (
    <ol className="rafiq-inquiry-steps" aria-label="خطوات استقصاء ساعة الجسم">
      {['توقّع', '10 نبضات', 'كرر القياس', 'احسب المتوسط', '50 نبضة', 'قارن', 'استنتج'].map(
        (label, index) => (
          <li key={label} className={index === current ? 'is-active' : ''}>
            {label}
          </li>
        )
      )}
    </ol>
  );
}

function BodyClockInquiry({
  onBack,
  onComplete,
}: {
  readonly onBack: () => void;
  readonly onComplete: () => void;
}) {
  const [stage, setStage] = useState<InquiryStage>('prediction');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [trialOne, setTrialOne] = useState<number | null>(null);
  const [trialTwo, setTrialTwo] = useState<number | null>(null);
  const [fiftyPulseSeconds, setFiftyPulseSeconds] = useState<number | null>(null);
  const [meanInput, setMeanInput] = useState('');
  const [meanAttempts, setMeanAttempts] = useState(0);
  const [meanAccepted, setMeanAccepted] = useState(false);
  const [comparisonAttempts, setComparisonAttempts] = useState(0);
  const [comparisonResolved, setComparisonResolved] = useState(false);

  const expectedMean = trialOne !== null && trialTwo !== null ? (trialOne + trialTwo) / 2 : null;

  function checkMean() {
    if (expectedMean === null) return;

    const entered = normalizeNumericInput(meanInput);
    const nextAttempts = meanAttempts + 1;
    setMeanAttempts(nextAttempts);

    if (entered !== null && Math.abs(entered - expectedMean) <= 0.05) {
      setMeanAccepted(true);
    }
  }

  function chooseComparison(correct: boolean) {
    const nextAttempts = comparisonAttempts + 1;
    setComparisonAttempts(nextAttempts);

    if (correct || nextAttempts >= 2) {
      setComparisonResolved(true);
    }
  }

  return (
    <section className="rafiq-science-activity-view">
      <button type="button" className="rafiq-science-back" onClick={onBack}>
        <StudentIcon name="chevron-right" width="20" height="20" />
        العودة إلى الأنشطة العلمية
      </button>

      <InquiryHeader />
      <InquirySteps stage={stage} />

      <article className="rafiq-science-task-card">
        {stage === 'prediction' ? (
          <>
            <div className="rafiq-inquiry-question">
              <strong>توقّع قبل أن تقيس</strong>
              <span>
                أي عبارة تتوقع أن تصف طريقة القياس الأفضل عندما نهتم بأثر تشغيل وإيقاف الساعة؟
              </span>
            </div>

            <div className="rafiq-inquiry-evidence-grid">
              {PREDICTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={
                    prediction === option
                      ? 'rafiq-inquiry-evidence is-selected'
                      : 'rafiq-inquiry-evidence'
                  }
                  aria-pressed={prediction === option}
                  onClick={() => setPrediction(option)}
                >
                  {option}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="rafiq-science-primary"
              disabled={prediction === null}
              onClick={() => setStage('trial-1')}
            >
              ثبّت توقعي وابدأ القياس
            </button>
          </>
        ) : null}

        {stage === 'trial-1' ? (
          <>
            <div className="rafiq-inquiry-question">
              <strong>المحاولة الأولى: 10 نبضات</strong>
              <span>ضع إصبعين على موضع النبض. ابدأ الساعة مع أول نبضة، وعدّ حتى 10 ثم أوقفها.</span>
            </div>

            <PulseTimer pulseCount={10} measuredSeconds={trialOne} onMeasured={setTrialOne} />

            {trialOne !== null ? (
              <>
                <TenPulseWindowNote seconds={trialOne} />
                <button
                  type="button"
                  className="rafiq-science-primary"
                  onClick={() => setStage('trial-2')}
                >
                  انتقل إلى المحاولة الثانية
                </button>
              </>
            ) : null}
          </>
        ) : null}

        {stage === 'trial-2' ? (
          <>
            <div className="rafiq-inquiry-question">
              <strong>المحاولة الثانية: 10 نبضات</strong>
              <span>كرر القياس بالطريقة نفسها دون تغيير عدد النبضات.</span>
            </div>

            <PulseTimer pulseCount={10} measuredSeconds={trialTwo} onMeasured={setTrialTwo} />

            {trialTwo !== null ? (
              <>
                <TenPulseWindowNote seconds={trialTwo} />
                <button
                  type="button"
                  className="rafiq-science-primary"
                  onClick={() => setStage('mean')}
                >
                  احسب متوسط القياسين
                </button>
              </>
            ) : null}
          </>
        ) : null}

        {stage === 'mean' && expectedMean !== null ? (
          <>
            <div className="rafiq-inquiry-comparison">
              <div>
                <strong>
                  المحاولة الأولى: <bdi dir="ltr">{formatSeconds(trialOne ?? 0)} s</bdi>
                </strong>
                <span>زمن 10 نبضات</span>
              </div>
              <div>
                <strong>
                  المحاولة الثانية: <bdi dir="ltr">{formatSeconds(trialTwo ?? 0)} s</bdi>
                </strong>
                <span>زمن 10 نبضات</span>
              </div>
            </div>

            <div className="rafiq-inquiry-question">
              <strong>احسب متوسط زمن 10 نبضات</strong>
              <span>اكتب الناتج بالثواني.</span>
            </div>

            <label className="rafiq-data-input-wrap">
              <span>متوسط زمن 10 نبضات</span>
              <input
                aria-label="متوسط زمن 10 نبضات"
                inputMode="decimal"
                value={meanInput}
                disabled={meanAccepted || meanAttempts >= 2}
                onChange={(event) => setMeanInput(event.target.value)}
              />
              <span>ثانية</span>
            </label>

            {!meanAccepted && meanAttempts < 2 ? (
              <button
                type="button"
                className="rafiq-science-primary"
                disabled={normalizeNumericInput(meanInput) === null}
                onClick={checkMean}
              >
                تحقق من المتوسط
              </button>
            ) : null}

            {meanAttempts === 1 && !meanAccepted ? (
              <div className="rafiq-science-feedback is-review" role="status">
                <strong>تلميح</strong>
                <span>اجمع الزمنين ثم اقسم على 2.</span>
              </div>
            ) : null}

            {meanAttempts >= 2 && !meanAccepted ? (
              <div className="rafiq-science-feedback is-review" role="status">
                <strong>الإجابة بعد المحاولة الثانية</strong>
                <span>المتوسط الصحيح هو {formatSeconds(expectedMean)} ثانية.</span>
              </div>
            ) : null}

            {meanAccepted ? (
              <div className="rafiq-science-feedback is-success" role="status">
                <strong>حساب صحيح</strong>
                <span>استخدمت القياسين معًا بدل الاعتماد على محاولة واحدة.</span>
              </div>
            ) : null}

            {meanAccepted || meanAttempts >= 2 ? (
              <button
                type="button"
                className="rafiq-science-primary"
                onClick={() => setStage('trial-50')}
              >
                انتقل إلى قياس 50 نبضة
              </button>
            ) : null}
          </>
        ) : null}

        {stage === 'trial-50' ? (
          <>
            <div className="rafiq-inquiry-question">
              <strong>الآن: 50 نبضة</strong>
              <span>
                كرر الفكرة، لكن هذه المرة عدّ 50 نبضة كاملة قبل إيقاف الساعة. لا توجد نافذة 6–12
                ثانية لهذا القياس.
              </span>
            </div>

            <PulseTimer
              pulseCount={50}
              measuredSeconds={fiftyPulseSeconds}
              onMeasured={setFiftyPulseSeconds}
            />

            {fiftyPulseSeconds !== null ? (
              <button
                type="button"
                className="rafiq-science-primary"
                onClick={() => setStage('compare')}
              >
                قارن الطريقتين
              </button>
            ) : null}
          </>
        ) : null}

        {stage === 'compare' && expectedMean !== null && fiftyPulseSeconds !== null ? (
          <>
            <div className="rafiq-inquiry-comparison">
              <div>
                <strong>
                  من قياس 10 نبضات: <bdi dir="ltr">{formatSeconds(expectedMean / 10)} s</bdi>
                </strong>
                <span>تقدير زمن نبضة واحدة من متوسط القياسين.</span>
              </div>
              <div>
                <strong>
                  من قياس 50 نبضة: <bdi dir="ltr">{formatSeconds(fiftyPulseSeconds / 50)} s</bdi>
                </strong>
                <span>تقدير زمن نبضة واحدة من القياس الأطول.</span>
              </div>
            </div>

            <div className="rafiq-inquiry-question">
              <strong>لماذا يفيد القياس الأطول هنا؟</strong>
              <span>اختر تفسيرًا مرتبطًا بطريقة تشغيل وإيقاف الساعة.</span>
            </div>

            <div className="rafiq-inquiry-evidence-grid">
              {COMPARISON_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="rafiq-inquiry-evidence"
                  disabled={comparisonResolved}
                  onClick={() => chooseComparison(option.correct)}
                >
                  {option.text}
                </button>
              ))}
            </div>

            {comparisonAttempts === 1 && !comparisonResolved ? (
              <div className="rafiq-science-feedback is-review" role="status">
                <strong>تلميح</strong>
                <span>
                  فكّر في لحظة تشغيل وإيقاف الساعة: ماذا يحدث لأثرها على تقدير نبضة واحدة عندما تقيس
                  عددًا أكبر من النبضات؟
                </span>
              </div>
            ) : null}

            {comparisonAttempts >= 2 && comparisonResolved ? (
              <div className="rafiq-science-feedback is-review" role="status">
                <strong>التفسير المعتمد</strong>
                <span>يتوزع أثر تشغيل وإيقاف الساعة على عدد أكبر من النبضات عند قياس 50 نبضة.</span>
              </div>
            ) : null}

            {comparisonResolved ? (
              <button
                type="button"
                className="rafiq-science-primary"
                onClick={() => setStage('reflection')}
              >
                ارجع إلى توقعي
              </button>
            ) : null}
          </>
        ) : null}

        {stage === 'reflection' && prediction ? (
          <>
            <div className="rafiq-inquiry-question">
              <strong>ارجع إلى توقعك الأول</strong>
              <span>{prediction}</span>
            </div>

            <div className="rafiq-science-feedback is-success" role="status">
              <strong>ما الذي أثبته النشاط؟</strong>
              <span>
                عند قياس عدد أكبر من النبضات يتوزع أثر تشغيل وإيقاف الساعة على عدد أكبر من النبضات.
                لذلك لا نحكم من قِصر مدة القياس وحده.
              </span>
            </div>

            <p className="rafiq-science-note">
              قياسات النبض التي سجلتها بقيت داخل هذه الجلسة في المتصفح ولم تُرسل إلى الخادم.
            </p>

            <button
              type="button"
              className="rafiq-science-primary"
              onClick={() => {
                onComplete();
                onBack();
              }}
            >
              إنهاء الاستقصاء
            </button>
          </>
        ) : null}
      </article>
    </section>
  );
}

function PulseDataActivity({
  onBack,
  onComplete,
}: {
  readonly onBack: () => void;
  readonly onComplete: () => void;
}) {
  const rest = [8.4, 8.7, 8.2, 8.5, 8.6] as const;
  const afterActivity = [6.3, 6.1, 5.9, 6.2, 6.0] as const;

  const [comparisonAttempts, setComparisonAttempts] = useState(0);
  const [comparisonResolved, setComparisonResolved] = useState(false);
  const [comparisonCorrect, setComparisonCorrect] = useState(false);

  const [inferenceAttempts, setInferenceAttempts] = useState(0);
  const [inferenceResolved, setInferenceResolved] = useState(false);
  const [inferenceCorrect, setInferenceCorrect] = useState(false);

  const [evidenceAttempts, setEvidenceAttempts] = useState(0);
  const [evidenceResolved, setEvidenceResolved] = useState(false);
  const [evidenceCorrect, setEvidenceCorrect] = useState(false);

  function answerComparison(correct: boolean) {
    if (comparisonResolved) return;
    const next = comparisonAttempts + 1;
    setComparisonAttempts(next);

    if (correct) {
      setComparisonCorrect(true);
      setComparisonResolved(true);
    } else if (next >= 2) {
      setComparisonResolved(true);
    }
  }

  function answerInference(correct: boolean) {
    if (inferenceResolved) return;
    const next = inferenceAttempts + 1;
    setInferenceAttempts(next);

    if (correct) {
      setInferenceCorrect(true);
      setInferenceResolved(true);
    } else if (next >= 2) {
      setInferenceResolved(true);
    }
  }

  function answerEvidence(correct: boolean) {
    if (evidenceResolved) return;
    const next = evidenceAttempts + 1;
    setEvidenceAttempts(next);

    if (correct) {
      setEvidenceCorrect(true);
      setEvidenceResolved(true);
      onComplete();
    } else if (next >= 2) {
      setEvidenceResolved(true);
      onComplete();
    }
  }

  return (
    <section className="rafiq-science-activity-view">
      <button type="button" className="rafiq-science-back" onClick={onBack}>
        <StudentIcon name="chevron-right" width="20" height="20" />
        العودة إلى الأنشطة العلمية
      </button>

      <header className="rafiq-science-activity-header is-data">
        <span className="rafiq-science-activity-header-icon" aria-hidden="true">
          <StudentIcon name="data" width="34" height="34" />
        </span>
        <div>
          <p>نشاط البيانات</p>
          <h2>الراحة وبعد نشاط خفيف</h2>
          <span>
            قارن زمن العدد نفسه من النبضات في حالتين، ثم استخرج النمط والدليل مباشرة من البيانات.
          </span>
        </div>
      </header>

      <article className="rafiq-science-task-card">
        <img
          src={`${VISUAL_BASE}/pulse-data.svg`}
          alt="دفتر بيانات ومجموعتان من نقاط النبض للراحة وبعد نشاط خفيف"
        />

        <div className="rafiq-science-note" role="note">
          <strong>بيانات توضيحية معدّة للنشاط</strong>
          <span>
            جميع القيم تمثل زمن 10 نبضات بالثواني. لا تحتاج إلى حساب متوسط جديد؛ اقرأ النمط كما هو.
          </span>
        </div>

        <div className="rafiq-data-table-wrap">
          <table className="rafiq-data-table">
            <caption>زمن 10 نبضات في حالتين</caption>
            <thead>
              <tr>
                <th>الحالة</th>
                <th>1</th>
                <th>2</th>
                <th>3</th>
                <th>4</th>
                <th>5</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">في الراحة</th>
                {rest.map((value, index) => (
                  <td key={`rest-${index}`}>
                    <bdi dir="ltr">{value.toFixed(1)}</bdi>
                  </td>
                ))}
              </tr>
              <tr>
                <th scope="row">بعد نشاط خفيف</th>
                {afterActivity.map((value, index) => (
                  <td key={`activity-${index}`}>
                    <bdi dir="ltr">{value.toFixed(1)}</bdi>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        <div className="rafiq-data-decision-stage">
          <strong>1. أي حالة تعرض زمنًا أقصر عمومًا لنفس 10 نبضات؟</strong>
          <div>
            <button
              type="button"
              disabled={comparisonResolved}
              onClick={() => answerComparison(false)}
            >
              في الراحة
            </button>
            <button
              type="button"
              disabled={comparisonResolved}
              onClick={() => answerComparison(true)}
            >
              بعد النشاط الخفيف
            </button>
          </div>
        </div>

        {comparisonAttempts === 1 && !comparisonResolved ? (
          <div className="rafiq-science-feedback is-review" role="status">
            <strong>تلميح</strong>
            <span>قارن القيم لنفس العدد من النبضات، ولا تبحث عن أكبر رقم منفرد فقط.</span>
          </div>
        ) : null}

        {comparisonResolved ? (
          <div
            className={`rafiq-science-feedback ${comparisonCorrect ? 'is-success' : 'is-review'}`}
            role="status"
          >
            <strong>
              {comparisonCorrect ? 'قراءة صحيحة للنمط' : 'الإجابة المعتمدة: بعد النشاط الخفيف'}
            </strong>
            <span>البيانات بعد النشاط الخفيف تعرض زمنًا أقصر لنفس العدد من النبضات.</span>
          </div>
        ) : null}

        {comparisonResolved ? (
          <div className="rafiq-data-decision-stage">
            <strong>2. ماذا يعني الزمن الأقصر لنفس 10 نبضات؟</strong>
            <div>
              <button
                type="button"
                disabled={inferenceResolved}
                onClick={() => answerInference(false)}
              >
                النبض أبطأ بعد النشاط الخفيف
              </button>
              <button
                type="button"
                disabled={inferenceResolved}
                onClick={() => answerInference(true)}
              >
                النبض أسرع بعد النشاط الخفيف
              </button>
              <button
                type="button"
                disabled={inferenceResolved}
                onClick={() => answerInference(false)}
              >
                لا يمكن المقارنة لأن الأعداد مختلفة
              </button>
            </div>
          </div>
        ) : null}

        {inferenceAttempts === 1 && !inferenceResolved ? (
          <div className="rafiq-science-feedback is-review" role="status">
            <strong>تلميح</strong>
            <span>عدد النبضات ثابت في الحالتين؛ فكّر فيما يعنيه إنجاز العدد نفسه في زمن أقل.</span>
          </div>
        ) : null}

        {inferenceResolved ? (
          <div
            className={`rafiq-science-feedback ${inferenceCorrect ? 'is-success' : 'is-review'}`}
            role="status"
          >
            <strong>
              {inferenceCorrect ? 'استنتاج صحيح' : 'الإجابة المعتمدة: النبض أسرع بعد النشاط الخفيف'}
            </strong>
            <span>عندما يحدث العدد نفسه من النبضات في زمن أقل، يكون معدل النبض أكبر.</span>
          </div>
        ) : null}

        {inferenceResolved ? (
          <div className="rafiq-data-decision-stage">
            <strong>اختر الدليل المباشر من الجدول</strong>
            <div>
              <button
                type="button"
                disabled={evidenceResolved}
                onClick={() => answerEvidence(false)}
              >
                أكبر قيمة في الجدول موجودة في الراحة
              </button>
              <button
                type="button"
                disabled={evidenceResolved}
                onClick={() => answerEvidence(true)}
              >
                كل أزمنة ما بعد النشاط أقل من كل أزمنة الراحة
              </button>
              <button
                type="button"
                disabled={evidenceResolved}
                onClick={() => answerEvidence(false)}
              >
                عدد القراءات خمس في كل مجموعة
              </button>
            </div>
          </div>
        ) : null}

        {evidenceAttempts === 1 && !evidenceResolved ? (
          <div className="rafiq-science-feedback is-review" role="status">
            <strong>تلميح</strong>
            <span>ابحث عن ملاحظة تقارن المجموعتين مباشرة، لا عن حقيقة جانبية في الجدول.</span>
          </div>
        ) : null}

        {evidenceResolved ? (
          <div
            className={`rafiq-science-feedback ${evidenceCorrect ? 'is-success' : 'is-review'}`}
            role="status"
          >
            <strong>استنتاج مدعوم بالبيانات</strong>
            <span>
              كل قيم ما بعد النشاط الخفيف أقصر من قيم الراحة، لذلك تدعم البيانات أن النبض صار أسرع
              بعد النشاط.
            </span>
          </div>
        ) : null}
      </article>
    </section>
  );
}

const ANALOG_TIMER_RESOLUTION_SECONDS = 0.1;

function quantizeAnalogSeconds(seconds: number) {
  return Math.round(seconds / ANALOG_TIMER_RESOLUTION_SECONDS) * ANALOG_TIMER_RESOLUTION_SECONDS;
}

function AnalogStopwatchFace({
  seconds,
  running,
}: {
  readonly seconds: number;
  readonly running: boolean;
}) {
  const displayedSeconds = quantizeAnalogSeconds(seconds);
  const secondAngle = (displayedSeconds % 60) * 6;
  const minuteAngle = ((displayedSeconds / 60) % 60) * 6;

  return (
    <div
      className={`rafiq-analog-stopwatch${running ? ' is-running' : ''}`}
      aria-label="واجهة الساعة التناظرية"
    >
      <div className="rafiq-analog-stopwatch-face" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <span
            key={index}
            className="rafiq-analog-stopwatch-tick"
            style={{ transform: `rotate(${index * 30}deg)` }}
          />
        ))}

        <span
          className="rafiq-analog-stopwatch-hand is-minute"
          style={{ transform: `rotate(${minuteAngle}deg)` }}
        />

        <span
          className="rafiq-analog-stopwatch-hand is-second"
          style={{ transform: `rotate(${secondAngle}deg)` }}
        />

        <span className="rafiq-analog-stopwatch-center" />
      </div>

      <bdi
        dir="ltr"
        className="rafiq-analog-stopwatch-value"
        data-testid="analog-stopwatch-readout"
      >
        {displayedSeconds.toFixed(1)} s
      </bdi>

      <span className="rafiq-analog-stopwatch-resolution">أقل تقسيم: 0.1 ث</span>
    </div>
  );
}

function GuidedPendulumVisual({
  running,
  label,
}: {
  readonly running: boolean;
  readonly label: string;
}) {
  return (
    <div className={`rafiq-guided-pendulum${running ? ' is-running' : ''}`} aria-label={label}>
      <div className="rafiq-guided-pendulum-frame" aria-hidden="true">
        <span className="rafiq-guided-pendulum-top" />

        <span className="rafiq-guided-pendulum-arm">
          <span className="rafiq-guided-pendulum-string" />
          <span className="rafiq-guided-pendulum-bob" />
        </span>

        <span className="rafiq-guided-pendulum-reference" />
      </div>

      <span className="rafiq-guided-pendulum-caption">
        علامة القياس: ابدأ وأوقف الساعة عند النقطة نفسها وفي الاتجاه نفسه.
      </span>
    </div>
  );
}

function GuidedPendulumExperiment({
  onBack,
  onComplete,
}: {
  readonly onBack: () => void;
  readonly onComplete: () => void;
}) {
  type TimerKind = 'analog' | 'digital';

  const [selectedControls, setSelectedControls] = useState<Set<string>>(() => new Set());
  const [controlsResolved, setControlsResolved] = useState(false);
  const [controlsCorrect, setControlsCorrect] = useState(false);
  const [controlAttempts, setControlAttempts] = useState(0);
  const [controlChoiceSeed] = useState(() => Date.now() & 0x7fffffff);
  const [controlsMessage, setControlsMessage] = useState<string | null>(null);

  const [activeTimer, setActiveTimer] = useState<TimerKind | null>(null);
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [analogElapsed, setAnalogElapsed] = useState(0);
  const [digitalElapsed, setDigitalElapsed] = useState(0);
  const [triedAnalog, setTriedAnalog] = useState(false);
  const [triedDigital, setTriedDigital] = useState(false);
  const [chosenTimer, setChosenTimer] = useState<TimerKind | null>(null);
  const [trialPendulumRunning, setTrialPendulumRunning] = useState(false);
  const [measurementClockRunning, setMeasurementClockRunning] = useState(false);
  const [measurementClockStartedAt, setMeasurementClockStartedAt] = useState<number | null>(null);
  const [measurementElapsed, setMeasurementElapsed] = useState(0);

  const [twentyPendulumRunning, setTwentyPendulumRunning] = useState(false);
  const [twentyClockRunning, setTwentyClockRunning] = useState(false);
  const [twentyClockStartedAt, setTwentyClockStartedAt] = useState<number | null>(null);
  const [twentyElapsed, setTwentyElapsed] = useState(0);

  const [measurements, setMeasurements] = useState<string[]>(() =>
    Array.from({ length: 10 }, () => '')
  );
  const [measurementsAccepted, setMeasurementsAccepted] = useState(false);
  const [measurementMessage, setMeasurementMessage] = useState<string | null>(null);

  const [minimumInput, setMinimumInput] = useState('');
  const [maximumInput, setMaximumInput] = useState('');
  const [rangeInput, setRangeInput] = useState('');
  const [rangeAttempts, setRangeAttempts] = useState(0);
  const [rangeResolved, setRangeResolved] = useState(false);
  const [rangeWasCorrect, setRangeWasCorrect] = useState(false);

  const [twentyTime, setTwentyTime] = useState('');
  const [twentyAccepted, setTwentyAccepted] = useState(false);
  const [methodAttempts, setMethodAttempts] = useState(0);
  const [methodResolved, setMethodResolved] = useState(false);
  const [methodCorrect, setMethodCorrect] = useState(false);

  useEffect(() => {
    if (!activeTimer || timerStartedAt === null) return;

    const update = () => {
      const elapsed = (Date.now() - timerStartedAt) / 1000;

      if (activeTimer === 'analog') {
        setAnalogElapsed(elapsed);
      } else {
        setDigitalElapsed(elapsed);
      }
    };

    update();
    const id = window.setInterval(update, 50);
    return () => window.clearInterval(id);
  }, [activeTimer, timerStartedAt]);

  useEffect(() => {
    if (!measurementClockRunning || measurementClockStartedAt === null) return;

    const update = () => {
      setMeasurementElapsed((Date.now() - measurementClockStartedAt) / 1000);
    };

    update();
    const id = window.setInterval(update, 50);
    return () => window.clearInterval(id);
  }, [measurementClockRunning, measurementClockStartedAt]);

  useEffect(() => {
    if (!twentyClockRunning || twentyClockStartedAt === null) return;

    const update = () => {
      setTwentyElapsed((Date.now() - twentyClockStartedAt) / 1000);
    };

    update();
    const id = window.setInterval(update, 50);
    return () => window.clearInterval(id);
  }, [twentyClockRunning, twentyClockStartedAt]);

  const controlQuestion = grade9Lesson13GuidedPendulumExperiment.controlledVariableQuestion;

  const controlledVariableOptions = deterministicShuffle(
    controlQuestion.choices,
    controlChoiceSeed
  );

  const requiredControlIds = new Set(
    controlQuestion.choices.filter((choice) => choice.correct).map((choice) => choice.id)
  );

  function toggleControl(choiceId: string) {
    if (controlsResolved) return;

    setSelectedControls((current) => {
      const next = new Set(current);

      if (next.has(choiceId)) next.delete(choiceId);
      else next.add(choiceId);

      return next;
    });

    setControlsMessage(null);
  }

  function checkControls() {
    if (selectedControls.size === 0 || controlsResolved) return;

    const correct =
      selectedControls.size === requiredControlIds.size &&
      [...requiredControlIds].every((choiceId) => selectedControls.has(choiceId));

    const selectedChangedVariable = selectedControls.has(controlQuestion.changedVariableId);

    const missingRequiredVariable = [...requiredControlIds].some(
      (choiceId) => !selectedControls.has(choiceId)
    );

    const selectedIrrelevantVariable = controlQuestion.choices.some(
      (choice) =>
        !choice.correct &&
        choice.id !== controlQuestion.changedVariableId &&
        selectedControls.has(choice.id)
    );

    const nextAttempt = controlAttempts + 1;
    setControlAttempts(nextAttempt);

    if (correct) {
      setControlsCorrect(true);
      setControlsResolved(true);
      setControlsMessage(controlQuestion.feedback.success);
      return;
    }

    let feedback: string = controlQuestion.feedback.selectedIrrelevant;

    if (selectedChangedVariable) {
      feedback = controlQuestion.feedback.selectedChanged;
    } else if (missingRequiredVariable) {
      feedback = controlQuestion.feedback.missingFixed;
    } else if (selectedIrrelevantVariable) {
      feedback = controlQuestion.feedback.selectedIrrelevant;
    }

    if (nextAttempt >= 2) {
      setControlsCorrect(false);
      setControlsResolved(true);
      setControlsMessage(`${feedback} ${controlQuestion.feedback.reveal}`);
      return;
    }

    setControlsMessage(feedback);
  }

  function toggleTimer(kind: TimerKind) {
    if (activeTimer === kind) {
      const elapsed =
        timerStartedAt === null
          ? kind === 'analog'
            ? analogElapsed
            : digitalElapsed
          : Math.max(0, (Date.now() - timerStartedAt) / 1000);

      if (kind === 'analog') {
        setAnalogElapsed(elapsed);
        setTriedAnalog(true);
      } else {
        setDigitalElapsed(elapsed);
        setTriedDigital(true);
      }

      setActiveTimer(null);
      setTimerStartedAt(null);
      return;
    }

    if (activeTimer !== null) return;

    if (kind === 'analog') {
      setAnalogElapsed(0);
    } else {
      setDigitalElapsed(0);
    }

    setTimerStartedAt(Date.now());
    setActiveTimer(kind);
  }

  function chooseTimer(kind: TimerKind) {
    if (!triedAnalog || !triedDigital || activeTimer !== null) return;

    setChosenTimer(kind);
    setTrialPendulumRunning(false);
    setMeasurementClockRunning(false);
    setMeasurementClockStartedAt(null);
    setMeasurementElapsed(0);
  }

  function startTrialPendulum() {
    if (measurementsAccepted || measurementClockRunning) return;

    setMeasurementElapsed(0);
    setTrialPendulumRunning(true);
  }

  function startMeasurementClock() {
    if (
      !chosenTimer ||
      !trialPendulumRunning ||
      measurementClockRunning ||
      measurementsAccepted ||
      measurements.every((value) => value.trim() !== '')
    ) {
      return;
    }

    setMeasurementElapsed(0);
    setMeasurementClockStartedAt(Date.now());
    setMeasurementClockRunning(true);
  }

  function stopMeasurementClock() {
    if (!measurementClockRunning || measurementClockStartedAt === null) return;

    const seconds = Math.max(0.01, (Date.now() - measurementClockStartedAt) / 1000);

    setMeasurementElapsed(seconds);
    setMeasurementClockRunning(false);
    setMeasurementClockStartedAt(null);
    setTrialPendulumRunning(false);

    setMeasurements((current) => {
      const index = current.findIndex((value) => value.trim() === '');
      if (index === -1) return current;

      const next = [...current];
      const recordedSeconds =
        chosenTimer === 'analog' ? quantizeAnalogSeconds(seconds).toFixed(1) : seconds.toFixed(2);

      next[index] = recordedSeconds;
      return next;
    });

    setMeasurementMessage('سُجلت القراءة من الساعة المختارة. أعد تشغيل البندول للمحاولة التالية.');
  }

  function startTwentyPendulum() {
    if (twentyAccepted || twentyClockRunning) return;

    setTwentyElapsed(0);
    setTwentyPendulumRunning(true);
  }

  function startTwentyClock() {
    if (!chosenTimer || !twentyPendulumRunning || twentyClockRunning || twentyAccepted) {
      return;
    }

    setTwentyElapsed(0);
    setTwentyClockStartedAt(Date.now());
    setTwentyClockRunning(true);
  }

  function stopTwentyClock() {
    if (!twentyClockRunning || twentyClockStartedAt === null) return;

    const seconds = Math.max(0.01, (Date.now() - twentyClockStartedAt) / 1000);

    setTwentyElapsed(seconds);
    setTwentyClockRunning(false);
    setTwentyClockStartedAt(null);
    setTwentyPendulumRunning(false);
    setTwentyTime(
      chosenTimer === 'analog' ? quantizeAnalogSeconds(seconds).toFixed(1) : seconds.toFixed(2)
    );
  }

  function updateMeasurement(index: number, value: string) {
    setMeasurements((current) =>
      current.map((entry, currentIndex) => (currentIndex === index ? value : entry))
    );
    setMeasurementMessage(null);
  }

  function parsedMeasurements() {
    return measurements.map((value) => normalizeNumericInput(value));
  }

  function acceptMeasurements() {
    const parsed = parsedMeasurements();

    if (parsed.some((value) => value === null || value <= 0)) {
      setMeasurementMessage('سجّل زمنًا موجبًا في القياسات العشرة قبل الانتقال إلى تحليل المدى.');
      return;
    }

    setMeasurementsAccepted(true);
    setMeasurementMessage(null);
  }

  function measurementStats() {
    const parsed = parsedMeasurements();

    if (parsed.some((value) => value === null)) return null;

    const values = parsed as number[];
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);

    return {
      minimum,
      maximum,
      range: maximum - minimum,
    };
  }

  function closeEnough(a: number | null, b: number, tolerance = 0.011) {
    return a !== null && Math.abs(a - b) <= tolerance;
  }

  function checkRange() {
    const stats = measurementStats();
    if (!stats) return;

    const minimum = normalizeNumericInput(minimumInput);
    const maximum = normalizeNumericInput(maximumInput);
    const range = normalizeNumericInput(rangeInput);

    const correct =
      closeEnough(minimum, stats.minimum) &&
      closeEnough(maximum, stats.maximum) &&
      closeEnough(range, stats.range);

    const nextAttempt = rangeAttempts + 1;
    setRangeAttempts(nextAttempt);

    if (correct) {
      setRangeWasCorrect(true);
      setRangeResolved(true);
      return;
    }

    if (nextAttempt >= 2) {
      setRangeResolved(true);
    }
  }

  function acceptTwentyTime() {
    const value = normalizeNumericInput(twentyTime);

    if (value === null || value <= 0) return;
    setTwentyAccepted(true);
  }

  function answerMethod(correct: boolean) {
    if (methodResolved) return;

    const nextAttempt = methodAttempts + 1;
    setMethodAttempts(nextAttempt);

    if (correct) {
      setMethodCorrect(true);
      setMethodResolved(true);
      onComplete();
      return;
    }

    if (nextAttempt >= 2) {
      setMethodResolved(true);
      onComplete();
    }
  }

  const stats = measurementStats();

  return (
    <section className="rafiq-science-activity-view">
      <button type="button" className="rafiq-science-back" onClick={onBack}>
        <StudentIcon name="chevron-right" width="20" height="20" />
        العودة إلى الأنشطة العلمية
      </button>

      <header className="rafiq-science-activity-header is-experiment">
        <span className="rafiq-science-activity-header-icon" aria-hidden="true">
          <StudentIcon name="experiment" width="34" height="34" />
        </span>
        <div>
          <p>التجربة الموجهة</p>
          <h2>قياس الزمن الدوري للبندول</h2>
          <span>استخدم البندول التفاعلي داخل النشاط، واختر أداة القياس ثم سجّل قراءاتك.</span>
        </div>
      </header>

      <article className="rafiq-science-task-card">
        <img
          src={`${VISUAL_BASE}/pendulum-experiment.svg`}
          alt="حامل بندول وساعة توقيت ودفتر قياس"
        />

        <section className="rafiq-data-decision-stage">
          <strong>1. ثبّت شروط المقارنة</strong>
          <span>اختر المتغيرات التي يجب إبقاؤها ثابتة عند مقارنة طريقتي القياس.</span>

          <div className="rafiq-pendulum-control-options">
            {controlledVariableOptions.map((choice) => {
              const selected = selectedControls.has(choice.id);

              return (
                <button
                  key={choice.id}
                  type="button"
                  aria-pressed={selected}
                  disabled={controlsResolved}
                  data-choice-id={choice.id}
                  data-diagnosis={choice.diagnosis}
                  className={`rafiq-pendulum-control-choice${selected ? ' is-selected' : ''}`}
                  onClick={() => toggleControl(choice.id)}
                >
                  <span className="rafiq-pendulum-control-check" aria-hidden="true">
                    {selected ? '✓' : ''}
                  </span>
                  <span>{choice.text}</span>
                </button>
              );
            })}
          </div>

          {!controlsResolved ? (
            <button
              type="button"
              className="rafiq-science-primary"
              disabled={selectedControls.size === 0}
              onClick={checkControls}
            >
              تحقق من المتغيرات المضبوطة
            </button>
          ) : null}
        </section>

        {controlsMessage ? (
          <div
            className={`rafiq-science-feedback ${controlsCorrect ? 'is-success' : 'is-review'}`}
            role="status"
          >
            <span>{controlsMessage}</span>
          </div>
        ) : null}

        {controlsResolved ? (
          <section className="rafiq-data-decision-stage">
            <strong>2. جرّب أداتي قياس الزمن</strong>
            <span>جرّب كل أداة مرة واحدة على الأقل، ثم اختر الأداة التي ستستخدمها مع البندول.</span>

            <div className="rafiq-pendulum-timer-compare">
              <article className="rafiq-pendulum-timer-card">
                <strong>الساعة التناظرية</strong>

                <AnalogStopwatchFace seconds={analogElapsed} running={activeTimer === 'analog'} />

                <button
                  type="button"
                  disabled={activeTimer !== null && activeTimer !== 'analog'}
                  onClick={() => toggleTimer('analog')}
                >
                  {activeTimer === 'analog' ? 'أوقف الساعة التناظرية' : 'ابدأ الساعة التناظرية'}
                </button>

                {triedAnalog ? <span className="rafiq-pendulum-tried">✓ تمت التجربة</span> : null}
              </article>

              <article className="rafiq-pendulum-timer-card">
                <strong>الساعة الرقمية</strong>

                <div
                  className={`rafiq-digital-stopwatch${
                    activeTimer === 'digital' ? ' is-running' : ''
                  }`}
                  aria-label="واجهة الساعة الرقمية"
                >
                  <bdi dir="ltr" data-testid="digital-trial-readout">
                    {digitalElapsed.toFixed(2)} s
                  </bdi>
                </div>

                <button
                  type="button"
                  disabled={activeTimer !== null && activeTimer !== 'digital'}
                  onClick={() => toggleTimer('digital')}
                >
                  {activeTimer === 'digital' ? 'أوقف الساعة الرقمية' : 'ابدأ الساعة الرقمية'}
                </button>

                {triedDigital ? <span className="rafiq-pendulum-tried">✓ تمت التجربة</span> : null}
              </article>
            </div>

            <div className="rafiq-pendulum-tool-choice">
              <button
                type="button"
                aria-pressed={chosenTimer === 'analog'}
                disabled={!triedAnalog || !triedDigital || activeTimer !== null}
                className={chosenTimer === 'analog' ? 'is-selected' : ''}
                onClick={() => chooseTimer('analog')}
              >
                {chosenTimer === 'analog'
                  ? '✓ تم اختيار الساعة التناظرية'
                  : 'أختار الساعة التناظرية'}
              </button>

              <button
                type="button"
                aria-pressed={chosenTimer === 'digital'}
                disabled={!triedAnalog || !triedDigital || activeTimer !== null}
                className={chosenTimer === 'digital' ? 'is-selected' : ''}
                onClick={() => chooseTimer('digital')}
              >
                {chosenTimer === 'digital' ? '✓ تم اختيار الساعة الرقمية' : 'أختار الساعة الرقمية'}
              </button>
            </div>

            {chosenTimer ? (
              <div className="rafiq-science-feedback is-success" role="status">
                <strong>
                  {chosenTimer === 'analog'
                    ? 'تم اختيار الساعة التناظرية'
                    : 'تم اختيار الساعة الرقمية'}
                </strong>
                <span>ظهر البندول أدناه. ستستخدم هذه الأداة نفسها في القياسات.</span>
              </div>
            ) : null}
          </section>
        ) : null}

        {chosenTimer ? (
          <section className="rafiq-data-decision-stage" id="pendulum-measurement-stage">
            <strong>3. قِس زمن اهتزازة كاملة واحدة عشر مرات</strong>

            <span>
              شغّل البندول، ثم استخدم الساعة التي اخترتها. ابدأ وأوقف القياس عند علامة القياس نفسها
              وفي الاتجاه نفسه.
            </span>

            <div className="rafiq-science-note" role="note">
              <strong>بروتوكول القياس</strong>
              <span>
                ابدأ وأوقف القياس عند النقطة نفسها وفي الاتجاه نفسه. تُسجّل القراءة تلقائيًا عند
                إيقاف الساعة، ويمكنك تعديلها قبل الاعتماد إذا احتجت.
              </span>
            </div>

            <div className="rafiq-pendulum-measurement-station">
              <GuidedPendulumVisual
                running={trialPendulumRunning}
                label="بندول القياس للمحاولات العشر"
              />

              <div className="rafiq-pendulum-chosen-timer">
                <strong>
                  {chosenTimer === 'analog' ? 'أداتك: الساعة التناظرية' : 'أداتك: الساعة الرقمية'}
                </strong>

                {chosenTimer === 'analog' ? (
                  <AnalogStopwatchFace
                    seconds={measurementElapsed}
                    running={measurementClockRunning}
                  />
                ) : (
                  <div
                    className={`rafiq-digital-stopwatch${
                      measurementClockRunning ? ' is-running' : ''
                    }`}
                    aria-label="الساعة الرقمية المختارة للقياس"
                  >
                    <bdi dir="ltr">{measurementElapsed.toFixed(2)} s</bdi>
                  </div>
                )}

                <div className="rafiq-pendulum-station-actions">
                  {!trialPendulumRunning &&
                  !measurementClockRunning &&
                  measurements.some((value) => value.trim() === '') ? (
                    <button type="button" onClick={startTrialPendulum}>
                      شغّل البندول للمحاولة{' '}
                      {measurements.filter((value) => value.trim() !== '').length + 1}
                    </button>
                  ) : null}

                  {trialPendulumRunning && !measurementClockRunning ? (
                    <button
                      type="button"
                      className="rafiq-science-primary"
                      onClick={startMeasurementClock}
                    >
                      {chosenTimer === 'analog'
                        ? 'ابدأ الساعة التناظرية للقياس'
                        : 'ابدأ الساعة الرقمية للقياس'}
                    </button>
                  ) : null}

                  {measurementClockRunning ? (
                    <button
                      type="button"
                      className="rafiq-science-primary"
                      onClick={stopMeasurementClock}
                    >
                      أوقف الساعة وسجّل القياس{' '}
                      {measurements.filter((value) => value.trim() !== '').length + 1}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <p>لن تُحذف أي قراءة تلقائيًا.</p>

            <div className="rafiq-inquiry-evidence-grid">
              {measurements.map((value, index) => (
                <label key={index}>
                  <span>القياس {index + 1}</span>
                  <input
                    aria-label={`زمن القياس ${index + 1}`}
                    inputMode="decimal"
                    value={value}
                    disabled={measurementsAccepted}
                    onChange={(event) => updateMeasurement(index, event.target.value)}
                  />
                  <span>ثانية</span>
                </label>
              ))}
            </div>

            {!measurementsAccepted ? (
              <button type="button" className="rafiq-science-primary" onClick={acceptMeasurements}>
                اعتمد القياسات العشرة
              </button>
            ) : null}

            {measurementMessage ? (
              <div className="rafiq-science-feedback is-review" role="status">
                <span>{measurementMessage}</span>
              </div>
            ) : null}
          </section>
        ) : null}

        {measurementsAccepted ? (
          <section className="rafiq-data-decision-stage">
            <strong>4. استخرج المدى من قياساتك</strong>
            <span>أنت الذي تحدد أقل قراءة وأكبر قراءة ثم تحسب الفرق بينهما.</span>

            <div className="rafiq-inquiry-evidence-grid">
              <label>
                <span>أقل زمن</span>
                <input
                  aria-label="أقل زمن"
                  inputMode="decimal"
                  value={minimumInput}
                  disabled={rangeResolved}
                  onChange={(event) => setMinimumInput(event.target.value)}
                />
              </label>

              <label>
                <span>أكبر زمن</span>
                <input
                  aria-label="أكبر زمن"
                  inputMode="decimal"
                  value={maximumInput}
                  disabled={rangeResolved}
                  onChange={(event) => setMaximumInput(event.target.value)}
                />
              </label>

              <label>
                <span>المدى</span>
                <input
                  aria-label="المدى"
                  inputMode="decimal"
                  value={rangeInput}
                  disabled={rangeResolved}
                  onChange={(event) => setRangeInput(event.target.value)}
                />
              </label>
            </div>

            {!rangeResolved ? (
              <button type="button" className="rafiq-science-primary" onClick={checkRange}>
                تحقق من المدى
              </button>
            ) : null}

            {rangeAttempts === 1 && !rangeResolved ? (
              <div className="rafiq-science-feedback is-review" role="status">
                <strong>تلميح</strong>
                <span>
                  ارجع إلى قياساتك العشرة نفسها: حدّد الأصغر والأكبر، ثم اطرح الأصغر من الأكبر.
                </span>
              </div>
            ) : null}

            {rangeResolved ? (
              <div
                className={`rafiq-science-feedback ${rangeWasCorrect ? 'is-success' : 'is-review'}`}
                role="status"
              >
                <strong>
                  {rangeWasCorrect ? 'حسبت المدى من بياناتك' : 'القيم الصحيحة من قياساتك'}
                </strong>

                {!rangeWasCorrect && stats ? (
                  <span>
                    أقل زمن = <bdi dir="ltr">{stats.minimum.toFixed(2)}</bdi> ثانية، أكبر زمن ={' '}
                    <bdi dir="ltr">{stats.maximum.toFixed(2)}</bdi> ثانية، والمدى ={' '}
                    <bdi dir="ltr">{stats.range.toFixed(2)}</bdi> ثانية.
                  </span>
                ) : (
                  <span>استخدمت جميع القراءات العشر كما سُجلت دون حذف أي قراءة تلقائيًا.</span>
                )}
              </div>
            ) : null}
          </section>
        ) : null}

        {rangeResolved ? (
          <section className="rafiq-data-decision-stage">
            <strong>5. قِس زمن 20 اهتزازة</strong>
            <span>
              استخدم البندول نفسه والأداة نفسها. عدّ 20 اهتزازة كاملة، ثم أوقف الساعة عند علامة
              القياس نفسها وفي الاتجاه نفسه.
            </span>

            <div className="rafiq-pendulum-measurement-station">
              <GuidedPendulumVisual
                running={twentyPendulumRunning}
                label="بندول قياس عشرين اهتزازة"
              />

              <div className="rafiq-pendulum-chosen-timer">
                <strong>
                  {chosenTimer === 'analog' ? 'أداتك: الساعة التناظرية' : 'أداتك: الساعة الرقمية'}
                </strong>

                {chosenTimer === 'analog' ? (
                  <AnalogStopwatchFace seconds={twentyElapsed} running={twentyClockRunning} />
                ) : (
                  <div
                    className={`rafiq-digital-stopwatch${twentyClockRunning ? ' is-running' : ''}`}
                    aria-label="الساعة الرقمية لقياس عشرين اهتزازة"
                  >
                    <bdi dir="ltr">{twentyElapsed.toFixed(2)} s</bdi>
                  </div>
                )}

                <div className="rafiq-pendulum-station-actions">
                  {!twentyPendulumRunning && !twentyClockRunning && !twentyAccepted ? (
                    <button type="button" onClick={startTwentyPendulum}>
                      شغّل بندول 20 اهتزازة
                    </button>
                  ) : null}

                  {twentyPendulumRunning && !twentyClockRunning && !twentyAccepted ? (
                    <button
                      type="button"
                      className="rafiq-science-primary"
                      onClick={startTwentyClock}
                    >
                      {chosenTimer === 'analog'
                        ? 'ابدأ الساعة التناظرية لقياس 20 اهتزازة'
                        : 'ابدأ الساعة الرقمية لقياس 20 اهتزازة'}
                    </button>
                  ) : null}

                  {twentyClockRunning ? (
                    <button
                      type="button"
                      className="rafiq-science-primary"
                      onClick={stopTwentyClock}
                    >
                      أوقف الساعة بعد 20 اهتزازة
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <label>
              <span>الزمن الكلي لعشرين اهتزازة</span>
              <input
                aria-label="الزمن الكلي لعشرين اهتزازة"
                inputMode="decimal"
                value={twentyTime}
                disabled={twentyAccepted}
                onChange={(event) => setTwentyTime(event.target.value)}
              />
              <span>ثانية</span>
            </label>

            {!twentyAccepted ? (
              <button type="button" className="rafiq-science-primary" onClick={acceptTwentyTime}>
                سجّل زمن 20 اهتزازة
              </button>
            ) : null}
          </section>
        ) : null}

        {twentyAccepted ? (
          <section className="rafiq-data-decision-stage">
            <strong>6. احكم على طريقة القياس</strong>
            <span>أي طريقة تقلل أثر تشغيل وإيقاف الساعة على تقدير زمن الاهتزازة الواحدة؟</span>

            <div>
              <button type="button" disabled={methodResolved} onClick={() => answerMethod(false)}>
                قياس اهتزازة واحدة فقط
              </button>

              <button type="button" disabled={methodResolved} onClick={() => answerMethod(true)}>
                قياس 20 اهتزازة ثم قسمة الزمن على 20
              </button>
            </div>

            {methodAttempts === 1 && !methodResolved ? (
              <div className="rafiq-science-feedback is-review" role="status">
                <strong>تلميح</strong>
                <span>
                  فكّر في أثر خطأ تشغيل وإيقاف الساعة عندما يتوزع على زمن أطول وعدد أكبر من
                  الاهتزازات.
                </span>
              </div>
            ) : null}

            {methodResolved ? (
              <div
                className={`rafiq-science-feedback ${methodCorrect ? 'is-success' : 'is-review'}`}
                role="status"
              >
                <strong>
                  {methodCorrect
                    ? 'حكم علمي صحيح'
                    : 'الإجابة المعتمدة: قياس 20 اهتزازة ثم قسمة الزمن على 20'}
                </strong>
                <span>
                  قياس عدد كبير من الاهتزازات يوزع أثر تشغيل وإيقاف الساعة على زمن كلي أطول.
                </span>
              </div>
            ) : null}
          </section>
        ) : null}
      </article>
    </section>
  );
}

export function Grade9TimeMeasurementActivities({
  onBackToLesson,
}: Grade9TimeMeasurementActivitiesProps) {
  const [mode, setMode] = useState<ActivityMode>('menu');
  const [inquiryComplete, setInquiryComplete] = useState(false);
  const [dataComplete, setDataComplete] = useState(false);
  const [experimentComplete, setExperimentComplete] = useState(false);

  if (mode === 'inquiry') {
    return (
      <BodyClockInquiry
        onBack={() => setMode('menu')}
        onComplete={() => setInquiryComplete(true)}
      />
    );
  }

  if (mode === 'data') {
    return (
      <PulseDataActivity onBack={() => setMode('menu')} onComplete={() => setDataComplete(true)} />
    );
  }

  if (mode === 'experiment') {
    return (
      <GuidedPendulumExperiment
        onBack={() => setMode('menu')}
        onComplete={() => setExperimentComplete(true)}
      />
    );
  }

  return (
    <section className="rafiq-science-hub">
      <header className="rafiq-learning-hub-hero rafiq-science-hub-hero">
        <span className="rafiq-learning-hub-hero-icon" aria-hidden="true">
          <StudentIcon name="activities" width="34" height="34" />
        </span>
        <div>
          <p>طبّق المفهوم بنفسك</p>
          <h2>الأنشطة العلمية</h2>
          <span>أربع فئات ثابتة للدرس. يظهر زر البدء فقط عندما يكون النشاط منفذًا وجاهزًا.</span>
        </div>
      </header>

      <div className="rafiq-science-hub-summary" aria-label="جاهزية الأنشطة العلمية">
        <strong>
          <bdi dir="ltr">3/3</bdi>
        </strong>
        <span>أنشطة جاهزة حاليًا</span>
      </div>

      <div className="rafiq-science-card-grid" aria-label="فئات الأنشطة العلمية الأربع">
        {ACTIVITY_CARDS.map((activity) => {
          const available = activity.state === 'available';
          const unavailable = activity.state === 'unavailable';
          const completed =
            activity.key === 'inquiry'
              ? inquiryComplete
              : activity.key === 'data'
                ? dataComplete
                : activity.key === 'experiment'
                  ? experimentComplete
                  : false;

          return (
            <article
              key={activity.key}
              className={`rafiq-science-card is-${activity.key}${
                unavailable || !available ? ' is-unavailable' : ''
              }`}
              aria-label={activity.heading}
              aria-disabled={available ? undefined : true}
            >
              <div className="rafiq-science-card-visual">
                <img src={activity.visual} alt={activity.visualAlt} />
              </div>

              <div className="rafiq-science-card-head">
                <span aria-hidden="true">
                  <StudentIcon name={activity.icon} width="27" height="27" />
                </span>
                <div>
                  <h3>{activity.heading}</h3>
                  <p>{activity.title}</p>
                </div>
              </div>

              <div
                className={`rafiq-science-availability ${
                  available ? 'is-available' : 'is-unavailable'
                }`}
              >
                <span aria-hidden="true">{available ? '✓' : '−'}</span>
                {available
                  ? completed
                    ? 'مكتمل'
                    : 'متوفر'
                  : unavailable
                    ? 'غير متوفر في هذا الدرس'
                    : 'قيد التجهيز'}
              </div>

              <p className="rafiq-science-unavailable-note">{activity.description}</p>

              {available && activity.key === 'inquiry' ? (
                <button type="button" onClick={() => setMode('inquiry')}>
                  {inquiryComplete ? 'أعد الاستقصاء' : 'ابدأ الاستقصاء'}
                  <StudentIcon name="chevron-left" width="20" height="20" />
                </button>
              ) : null}

              {available && activity.key === 'data' ? (
                <button type="button" onClick={() => setMode('data')}>
                  {dataComplete ? 'أعد نشاط البيانات' : 'ابدأ نشاط البيانات'}
                  <StudentIcon name="chevron-left" width="20" height="20" />
                </button>
              ) : null}
              {available && activity.key === 'experiment' ? (
                <button type="button" onClick={() => setMode('experiment')}>
                  {experimentComplete ? 'أعد التجربة الموجهة' : 'ابدأ التجربة الموجهة'}
                  <StudentIcon name="chevron-left" width="20" height="20" />
                </button>
              ) : null}
            </article>
          );
        })}
      </div>

      <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
    </section>
  );
}
