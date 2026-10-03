import { useMemo, useState } from 'react';

import { ScientificText } from '@design-system/components/ScientificText';
import { StudentBackAction } from '@features/student/navigation/StudentBackAction';
import { StudentIcon } from '@features/student/navigation/StudentIcon';

type SkillKey = 'spot' | 'judge' | 'repair' | 'report';
type Decision = 'valid' | 'repair';

type SpotScenario = {
  readonly subject: string;
  readonly value: string;
  readonly unit: string;
  readonly correctedUnit: string;
  readonly explanation: string;
};

type JudgeCard = {
  readonly statement: string;
  readonly decision: Decision;
  readonly explanation: string;
};

type RepairScenario = {
  readonly quantity: string;
  readonly value: string;
  readonly wrongUnit: string;
  readonly choices: readonly string[];
  readonly correctUnit: string;
  readonly explanation: string;
};

type ReportRow = {
  readonly label: string;
  readonly measurement: string;
  readonly valid: boolean;
  readonly correctedMeasurement?: string;
};

type ReportScenario = {
  readonly rows: readonly ReportRow[];
  readonly explanation: string;
};

type ScenarioSet = {
  readonly spot: SpotScenario;
  readonly judge: readonly JudgeCard[];
  readonly repair: RepairScenario;
  readonly report: ReportScenario;
};

const SCENARIO_SETS: readonly ScenarioSet[] = [
  {
    spot: {
      subject: 'طول القلم',
      value: '18',
      unit: 'kg',
      correctedUnit: 'cm',
      explanation: 'kg تقيس الكتلة، بينما طول القلم يحتاج وحدة طول مناسبة مثل cm.',
    },
    judge: [
      {
        statement: 'طول كتاب = 24 cm',
        decision: 'valid',
        explanation: 'cm وحدة مناسبة لطول جسم صغير مثل الكتاب.',
      },
      {
        statement: 'حجم دواء = 5 kg',
        decision: 'repair',
        explanation: 'kg تقيس الكتلة، بينما حجم الدواء يحتاج وحدة حجم مثل mL.',
      },
      {
        statement: 'المسافة بين مدينتين = 85 km',
        decision: 'valid',
        explanation: 'km مناسبة للمسافات الكبيرة بين المدن.',
      },
      {
        statement: 'زمن سباق قصير = 12 cm',
        decision: 'repair',
        explanation: 'cm تقيس الطول، بينما الزمن يحتاج وحدة زمن مثل s.',
      },
    ],
    repair: {
      quantity: 'المسافة',
      value: '3',
      wrongUnit: 'mL',
      choices: ['m', 'kg', 'mL', 's'],
      correctUnit: 'm',
      explanation: 'المسافة كمية طول؛ لذلك m مناسبة هنا، بينما mL وحدة حجم.',
    },
    report: {
      rows: [
        { label: 'كتلة الحجر', measurement: '250 g', valid: true },
        { label: 'حجم الماء', measurement: '100 mL', valid: true },
        { label: 'طول الطاولة', measurement: '2 kg', valid: false, correctedMeasurement: '2 m' },
        { label: 'زمن الجري', measurement: '12 s', valid: true },
      ],
      explanation: 'السطر الخاص بطول الطاولة يستخدم kg، وهي وحدة كتلة وليست وحدة طول.',
    },
  },
  {
    spot: {
      subject: 'زمن السباق',
      value: '9',
      unit: 'cm',
      correctedUnit: 's',
      explanation: 'cm تقيس الطول، بينما زمن السباق يحتاج وحدة زمن مناسبة مثل s.',
    },
    judge: [
      {
        statement: 'قطر مسمار = 8 mm',
        decision: 'valid',
        explanation: 'mm مناسبة لقياس أبعاد صغيرة مثل قطر المسمار.',
      },
      {
        statement: 'كتلة حقيبة = 4 kg',
        decision: 'valid',
        explanation: 'kg وحدة مناسبة لقياس كتلة الحقيبة.',
      },
      {
        statement: 'حجم عصير = 250 s',
        decision: 'repair',
        explanation: 's تقيس الزمن، بينما حجم السائل يحتاج وحدة حجم مثل mL.',
      },
      {
        statement: 'طول ممر = 16 m',
        decision: 'valid',
        explanation: 'm مناسبة لطول ممر بهذا المقياس.',
      },
    ],
    repair: {
      quantity: 'حجم العينة',
      value: '40',
      wrongUnit: 's',
      choices: ['mL', 'kg', 's', 'cm'],
      correctUnit: 'mL',
      explanation: 'الحجم يحتاج وحدة حجم؛ mL مناسبة لعينة سائلة صغيرة، بينما s وحدة زمن.',
    },
    report: {
      rows: [
        { label: 'طول السلك', measurement: '1.2 m', valid: true },
        { label: 'زمن التسخين', measurement: '45 s', valid: true },
        { label: 'كتلة العينة', measurement: '80 mL', valid: false, correctedMeasurement: '80 g' },
        { label: 'حجم المحلول', measurement: '60 mL', valid: true },
      ],
      explanation: 'السطر الخاص بكتلة العينة يستخدم mL، وهي وحدة حجم وليست وحدة كتلة.',
    },
  },
];

const ROUND_LABELS = [
  'اكتشف الخطأ',
  'سليم أم يحتاج إصلاحًا؟',
  'أصلح البطاقة',
  'تقرير المختبر',
] as const;

const SKILL_LABELS: Readonly<Record<SkillKey, string>> = {
  spot: 'اكتشاف الجزء الخاطئ في سجل القياس',
  judge: 'التمييز بين القياس السليم والقياس الذي يحتاج إصلاحًا',
  repair: 'اختيار وحدة تناسب الكمية المقاسة',
  report: 'مراجعة تقرير علمي قبل اعتماده',
};

interface Props {
  readonly onBack: () => void;
}

interface FeedbackState {
  readonly kind: 'correct' | 'wrong';
  readonly title: string;
  readonly message: string;
}

function RoundProgress({ roundIndex }: { readonly roundIndex: number }) {
  return (
    <ol className="rafiq-inspector-progress" aria-label="تقدم جولات مفتش القياس">
      {ROUND_LABELS.map((label, index) => {
        const status = index < roundIndex ? 'is-done' : index === roundIndex ? 'is-current' : '';
        return (
          <li key={label} className={status} aria-current={index === roundIndex ? 'step' : undefined}>
            <span>{index < roundIndex ? '✓' : index + 1}</span>
            <strong>{label}</strong>
          </li>
        );
      })}
    </ol>
  );
}

function Feedback({ feedback }: { readonly feedback: FeedbackState }) {
  return (
    <div
      className={`rafiq-inspector-feedback ${feedback.kind === 'correct' ? 'is-correct' : 'is-wrong'}`}
      role="status"
      aria-live="polite"
    >
      <span className="rafiq-inspector-feedback-icon" aria-hidden="true">
        {feedback.kind === 'correct' ? '✓' : '×'}
      </span>
      <div>
        <strong>{feedback.title}</strong>
        <p>
          <ScientificText text={feedback.message} />
        </p>
      </div>
    </div>
  );
}

export function MeasurementMissionGame({ onBack }: Props) {
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [roundIndex, setRoundIndex] = useState(0);
  const [mistakes, setMistakes] = useState<Record<SkillKey, number>>({
    spot: 0,
    judge: 0,
    repair: 0,
    report: 0,
  });
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [spotSolved, setSpotSolved] = useState(false);
  const [judgeIndex, setJudgeIndex] = useState(0);
  const [judgeSolved, setJudgeSolved] = useState(false);
  const [repairSolved, setRepairSolved] = useState(false);
  const [reportSolved, setReportSolved] = useState(false);
  const [safeReportRows, setSafeReportRows] = useState<number[]>([]);

  const scenario = SCENARIO_SETS[scenarioIndex % SCENARIO_SETS.length];
  const completed = roundIndex >= ROUND_LABELS.length;

  const result = useMemo(() => {
    const entries = (Object.keys(SKILL_LABELS) as SkillKey[]).map((key) => ({
      key,
      label: SKILL_LABELS[key],
      mastered: mistakes[key] === 0,
    }));
    return {
      mastered: entries.filter((entry) => entry.mastered),
      review: entries.filter((entry) => !entry.mastered),
    };
  }, [mistakes]);

  function addMistake(skill: SkillKey) {
    setMistakes((current) => ({ ...current, [skill]: current[skill] + 1 }));
  }

  function moveToRound(nextRound: number) {
    setFeedback(null);
    setRoundIndex(nextRound);
  }

  function restart() {
    setScenarioIndex((current) => (current + 1) % SCENARIO_SETS.length);
    setRoundIndex(0);
    setMistakes({ spot: 0, judge: 0, repair: 0, report: 0 });
    setFeedback(null);
    setSpotSolved(false);
    setJudgeIndex(0);
    setJudgeSolved(false);
    setRepairSolved(false);
    setReportSolved(false);
    setSafeReportRows([]);
  }

  if (completed) {
    return (
      <section className="rafiq-measurement-mission rafiq-inspector-game">
        <header className="rafiq-inspector-hero is-result">
          <div className="rafiq-inspector-hero-art" aria-hidden="true">
            <img
              src="/lesson-visuals/games/g9-importance-measurement/measurement-inspector-kit.svg"
              alt=""
            />
          </div>
          <div>
            <p>نتيجة التحدي</p>
            <h2>تقرير مفتش القياس</h2>
            <span>أكملت الجولات الأربع. التقرير يوضح ما نفذته بثبات وما يستحق جولة تدريب أخرى.</span>
          </div>
        </header>

        <div className="rafiq-inspector-result-grid">
          <section className="is-mastered" aria-labelledby="inspector-mastered-title">
            <h3 id="inspector-mastered-title">أتقنت</h3>
            {result.mastered.length ? (
              <ul>
                {result.mastered.map((entry) => (
                  <li key={entry.key}>{entry.label}</li>
                ))}
              </ul>
            ) : (
              <p>هذه الجولة كشفت أكثر من نقطة تحتاج تدريبًا. هذا بالضبط سبب وجود اللعبة.</p>
            )}
          </section>
          <section className="is-review" aria-labelledby="inspector-review-title">
            <h3 id="inspector-review-title">راجع</h3>
            {result.review.length ? (
              <ul>
                {result.review.map((entry) => (
                  <li key={entry.key}>{entry.label}</li>
                ))}
              </ul>
            ) : (
              <p>لا توجد نقطة تحتاج مراجعة في هذه الجولة.</p>
            )}
          </section>
        </div>

        <div className="rafiq-inspector-cognitive-closure">
          <span>قاعدة ذهنية تحملها معك</span>
          <strong>قبل اعتماد أي قياس: حدّد الكمية، افحص الوحدة، ثم اسأل هل القيمة معقولة في هذا السياق؟</strong>
        </div>

        <div className="rafiq-inspector-result-actions">
          <button type="button" className="rafiq-inspector-primary" onClick={restart}>
            <StudentIcon name="game" width="22" height="22" />
            أعد تحدي الأخطاء
          </button>
          <StudentBackAction label="العودة إلى الدرس" onClick={onBack} />
        </div>
      </section>
    );
  }

  const judgeCard = scenario.judge[judgeIndex];

  return (
    <section className="rafiq-measurement-mission rafiq-inspector-game">
      <header className="rafiq-inspector-hero">
        <div className="rafiq-inspector-hero-art" aria-hidden="true">
          <img
            src="/lesson-visuals/games/g9-importance-measurement/measurement-inspector-kit.svg"
            alt=""
          />
        </div>
        <div className="rafiq-inspector-hero-copy">
          <span className="rafiq-inspector-kicker">الألعاب التعليمية</span>
          <h2>مفتش القياس</h2>
          <p>واجه تحديات قصيرة، اكتشف الخطأ، واتخذ قرارك مع تغذية راجعة مباشرة.</p>
        </div>
        <div
          className="rafiq-inspector-round-badge"
          aria-label={`الجولة ${roundIndex + 1} من 4`}
        >
          الجولة <bdi dir="ltr">{roundIndex + 1}</bdi> من <bdi dir="ltr">4</bdi>
        </div>
      </header>

      <RoundProgress roundIndex={roundIndex} />

      {roundIndex === 0 ? (
        <article className="rafiq-inspector-stage is-forensic" aria-labelledby="round-one-title">
          <div className="rafiq-inspector-stage-heading">
            <span>الجولة 1</span>
            <div>
              <h3 id="round-one-title">اكتشف الخطأ</h3>
              <p>افحص سجل القياس كما يفعل المفتش: لا تبحث عن رقم غريب، بل عن جزء لا ينسجم مع الكمية المقاسة.</p>
            </div>
          </div>

          <div className="rafiq-inspector-thinking-protocol" aria-label="بروتوكول فحص القياس">
            <span className="is-active">1 حدّد الكمية</span>
            <span className="is-active">2 افحص الوحدة</span>
            <span>3 اختبر المعقولية</span>
            <span>4 اعتمد القرار</span>
          </div>

          <div className={`rafiq-inspector-evidence-scene${spotSolved ? ' is-solved' : ''}`}>
            <div className="rafiq-inspector-evidence-visual">
              <img
                src="/lesson-visuals/games/g9-importance-measurement/pencil-measurement.svg"
                alt="قلم موضوع بجوار تدريج قياس"
              />
              <span className="rafiq-inspector-scan-line" aria-hidden="true" />
              <span className="rafiq-inspector-lens" aria-hidden="true" />
            </div>

            <section className="rafiq-inspector-evidence-panel" aria-label="سجل القياس قيد الفحص">
              <header>
                <div>
                  <span className="rafiq-inspector-case-id">سجل 01</span>
                  <strong>{spotSolved ? 'تم التصحيح' : 'قيد الفحص'}</strong>
                </div>
                <span className={`rafiq-inspector-case-status${spotSolved ? ' is-solved' : ''}`}>
                  {spotSolved ? '✓' : '؟'}
                </span>
              </header>

              <p className="rafiq-inspector-microcopy">اضغط الجزء الذي ترى أنه لا ينتمي إلى هذا القياس.</p>

              <div className="rafiq-inspector-measurement-ledger" aria-label="سجل القياس">
                <strong>{scenario.spot.subject}</strong>
                <span>=</span>
                <button
                  type="button"
                  className={`rafiq-inspector-token${feedback?.kind === 'wrong' && !spotSolved ? ' is-shaken' : ''}`}
                  disabled={spotSolved}
                  aria-label={`القيمة ${scenario.spot.value}`}
                  onClick={() => {
                    addMistake('spot');
                    setFeedback({
                      kind: 'wrong',
                      title: 'القيمة ليست موضع الخلل',
                      message: 'القيمة العددية قد تكون معقولة. افحص أولًا: ما نوع الكمية؟ ثم هل الوحدة تقيس النوع نفسه؟',
                    });
                  }}
                >
                  <bdi dir="ltr">{scenario.spot.value}</bdi>
                </button>
                <button
                  type="button"
                  className={`rafiq-inspector-token is-unit${spotSolved ? ' is-correct is-installed' : ''}`}
                  disabled={spotSolved}
                  aria-label={`الوحدة ${spotSolved ? scenario.spot.correctedUnit : scenario.spot.unit}`}
                  onClick={() => {
                    setSpotSolved(true);
                    setFeedback({
                      kind: 'correct',
                      title: 'تم رصد الخلل وإصلاح السجل',
                      message: scenario.spot.explanation,
                    });
                  }}
                >
                  <ScientificText text={spotSolved ? scenario.spot.correctedUnit : scenario.spot.unit} />
                </button>
              </div>

              <div className="rafiq-inspector-evidence-rule">
                <span>قاعدة المفتش</span>
                <strong>الوحدة يجب أن تقيس النوع نفسه الذي تصفه الكمية.</strong>
              </div>
            </section>
          </div>

          {feedback ? <Feedback feedback={feedback} /> : null}

          {spotSolved ? (
            <button type="button" className="rafiq-inspector-primary" onClick={() => moveToRound(1)}>
              الجولة التالية
              <StudentIcon name="chevron-left" width="20" height="20" />
            </button>
          ) : null}
        </article>
      ) : null}

      {roundIndex === 1 ? (
        <article className="rafiq-inspector-stage is-verdict" aria-labelledby="round-two-title">
          <div className="rafiq-inspector-stage-heading">
            <span>الجولة 2</span>
            <div>
              <h3 id="round-two-title">سليم أم يحتاج إصلاحًا؟</h3>
              <p>أصدر حكمًا سريعًا، لكن لا تتسرع: افحص علاقة الكمية بالوحدة، لا شكل الرقم.</p>
            </div>
          </div>

          <div className="rafiq-inspector-thinking-protocol compact" aria-label="بروتوكول الحكم">
            <span>حدّد الكمية</span>
            <span className="is-active">افحص الوحدة</span>
            <span className="is-active">أصدر الحكم</span>
          </div>

          <div className="rafiq-inspector-verdict-board">
            <div className="rafiq-inspector-verdict-visual">
              <img
                src="/lesson-visuals/games/g9-importance-measurement/measurement-objects.svg"
                alt="مجموعة أدوات وأجسام تستخدم في مواقف قياس متنوعة"
              />
              <span>بطاقة فحص <bdi dir="ltr">{judgeIndex + 1}/{scenario.judge.length}</bdi></span>
            </div>

            <div className={`rafiq-inspector-judge-card${judgeSolved ? ' is-resolved' : ''}`}>
              <span className="rafiq-inspector-card-kicker">سجل القياس</span>
              <ScientificText text={judgeCard.statement} />
              {judgeSolved ? (
                <strong className={`rafiq-inspector-verdict-stamp is-${judgeCard.decision}`}>
                  {judgeCard.decision === 'valid' ? 'سليم ✓' : 'يحتاج إصلاحًا'}
                </strong>
              ) : (
                <span className="rafiq-inspector-card-question">ما حكمك؟</span>
              )}
            </div>
          </div>

          <div className="rafiq-inspector-decision-row" aria-label="قرار فحص القياس">
            <button
              type="button"
              disabled={judgeSolved}
              className={judgeSolved && judgeCard.decision === 'valid' ? 'is-correct' : ''}
              onClick={() => {
                if (judgeCard.decision === 'valid') {
                  setJudgeSolved(true);
                  setFeedback({ kind: 'correct', title: 'قرار صحيح', message: judgeCard.explanation });
                } else {
                  addMistake('judge');
                  setFeedback({
                    kind: 'wrong',
                    title: 'الحكم يحتاج دليلًا أقوى',
                    message: 'حدّد نوع الكمية أولًا، ثم اسأل: هل الوحدة تقيس هذا النوع فعلًا؟',
                  });
                }
              }}
            >
              <span aria-hidden="true">✓</span>
              سليم
            </button>
            <button
              type="button"
              disabled={judgeSolved}
              className={judgeSolved && judgeCard.decision === 'repair' ? 'is-correct' : ''}
              onClick={() => {
                if (judgeCard.decision === 'repair') {
                  setJudgeSolved(true);
                  setFeedback({ kind: 'correct', title: 'قرار صحيح', message: judgeCard.explanation });
                } else {
                  addMistake('judge');
                  setFeedback({
                    kind: 'wrong',
                    title: 'هذا السجل متسق',
                    message: 'هذه الوحدة تناسب نوع الكمية في البطاقة. لا تجعل شكل الرقم يخدعك.',
                  });
                }
              }}
            >
              <span aria-hidden="true">↺</span>
              يحتاج إصلاحًا
            </button>
          </div>

          {feedback ? <Feedback feedback={feedback} /> : null}

          {judgeSolved ? (
            <button
              type="button"
              className="rafiq-inspector-primary"
              onClick={() => {
                setFeedback(null);
                if (judgeIndex === scenario.judge.length - 1) {
                  setJudgeIndex(0);
                  setJudgeSolved(false);
                  moveToRound(2);
                } else {
                  setJudgeIndex((current) => current + 1);
                  setJudgeSolved(false);
                }
              }}
            >
              {judgeIndex === scenario.judge.length - 1 ? 'انتقل إلى الجولة الثالثة' : 'البطاقة التالية'}
              <StudentIcon name="chevron-left" width="20" height="20" />
            </button>
          ) : null}
        </article>
      ) : null}

      {roundIndex === 2 ? (
        <article className="rafiq-inspector-stage is-repair-bench" aria-labelledby="round-three-title">
          <div className="rafiq-inspector-stage-heading">
            <span>الجولة 3</span>
            <div>
              <h3 id="round-three-title">أصلح البطاقة</h3>
              <p>أنت لا تختار رمزًا فقط. أنت تعيد بناء قياس حتى يصبح صالحًا للتواصل العلمي.</p>
            </div>
          </div>

          <div className="rafiq-inspector-thinking-protocol compact" aria-label="بروتوكول الإصلاح">
            <span className="is-active">شخّص الخلل</span>
            <span className="is-active">اختر وحدة من النوع الصحيح</span>
            <span>تحقق من السجل</span>
          </div>

          <div className="rafiq-inspector-repair-bench">
            <div className="rafiq-inspector-repair-visual">
              <img
                src="/lesson-visuals/games/g9-importance-measurement/road-measurement.svg"
                alt="طريق يستخدم بوصفه سياقًا لقياس مسافة"
              />
              <span>سياق القياس</span>
            </div>

            <div className="rafiq-inspector-repair-workspace">
              <span className="rafiq-inspector-card-kicker">بطاقة تحتاج إصلاحًا</span>
              <div className="rafiq-inspector-repair-card is-static">
                <strong>{scenario.repair.quantity}</strong>
                <span>=</span>
                <bdi dir="ltr">{scenario.repair.value}</bdi>
                <span className={`rafiq-inspector-repair-slot${repairSolved ? ' is-correct' : ''}`}>
                  <ScientificText text={repairSolved ? scenario.repair.correctUnit : scenario.repair.wrongUnit} />
                </span>
              </div>

              <div className="rafiq-inspector-before-after" aria-live="polite">
                <div>
                  <span>قبل الإصلاح</span>
                  <strong><ScientificText text={`${scenario.repair.value} ${scenario.repair.wrongUnit}`} /></strong>
                </div>
                <span aria-hidden="true">→</span>
                <div className={repairSolved ? 'is-revealed' : ''}>
                  <span>بعد الإصلاح</span>
                  <strong>{repairSolved ? <ScientificText text={`${scenario.repair.value} ${scenario.repair.correctUnit}`} /> : '—'}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="rafiq-inspector-unit-palette" aria-label="الوحدات المتاحة للإصلاح">
            {scenario.repair.choices.map((unit) => (
              <button
                key={unit}
                type="button"
                disabled={repairSolved}
                className={repairSolved && unit === scenario.repair.correctUnit ? 'is-correct is-installed' : ''}
                aria-label={`اختر الوحدة ${unit}`}
                onClick={() => {
                  if (unit === scenario.repair.correctUnit) {
                    setRepairSolved(true);
                    setFeedback({
                      kind: 'correct',
                      title: 'تم تركيب الوحدة الصحيحة',
                      message: scenario.repair.explanation,
                    });
                  } else {
                    addMistake('repair');
                    setFeedback({
                      kind: 'wrong',
                      title: 'هذه الوحدة من نوع مختلف',
                      message: `فكّر في نوع الكمية «${scenario.repair.quantity}» قبل اختيار رمز الوحدة.`,
                    });
                  }
                }}
              >
                <ScientificText text={unit} />
              </button>
            ))}
          </div>

          {feedback ? <Feedback feedback={feedback} /> : null}

          {repairSolved ? (
            <button type="button" className="rafiq-inspector-primary" onClick={() => moveToRound(3)}>
              الجولة الأخيرة
              <StudentIcon name="chevron-left" width="20" height="20" />
            </button>
          ) : null}
        </article>
      ) : null}

      {roundIndex === 3 ? (
        <article className="rafiq-inspector-stage is-report-audit" aria-labelledby="round-four-title">
          <div className="rafiq-inspector-stage-heading">
            <span>الجولة 4</span>
            <div>
              <h3 id="round-four-title">تقرير المختبر</h3>
              <p>الاعتماد النهائي مسؤولية المفتش. افحص كل سطر، واستبعد السليم، ثم التقط الخلل الحقيقي.</p>
            </div>
          </div>

          <div className="rafiq-inspector-thinking-protocol compact" aria-label="بروتوكول تدقيق التقرير">
            <span>افحص الكمية</span>
            <span>قارن الوحدة</span>
            <span className="is-active">استبعد السليم</span>
            <span className="is-active">اعتمد التقرير</span>
          </div>

          <div className="rafiq-inspector-report-layout">
            <div className="rafiq-inspector-report-visual">
              <img
                src="/lesson-visuals/games/g9-importance-measurement/lab-report.svg"
                alt="لوح تقرير مختبر وأدوات قياس"
              />
              <div>
                <span>حالة التقرير</span>
                <strong>{reportSolved ? 'تم رصد الخلل' : `بقي ${scenario.report.rows.length - safeReportRows.length} أسطر قيد الفحص`}</strong>
              </div>
            </div>

            <div className="rafiq-inspector-report" role="group" aria-label="سجل قياسات الفريق">
              <header>
                <StudentIcon name="review" width="22" height="22" />
                <div>
                  <strong>سجل القياسات</strong>
                  <span>اضغط السطر الذي تعتقد أنه يحتوي خللًا.</span>
                </div>
              </header>
              {scenario.report.rows.map((row, index) => {
                const isSafe = safeReportRows.includes(index);
                const isCaught = reportSolved && !row.valid;
                return (
                  <button
                    key={`${row.label}-${row.measurement}`}
                    type="button"
                    disabled={reportSolved || isSafe}
                    className={`${isSafe ? 'is-safe ' : ''}${isCaught ? 'is-caught' : ''}`.trim()}
                    aria-label={`${row.label} ${row.measurement}`}
                    onClick={() => {
                      if (!row.valid) {
                        setReportSolved(true);
                        setFeedback({
                          kind: 'correct',
                          title: 'تم اكتشاف الخلل قبل اعتماد التقرير',
                          message: scenario.report.explanation,
                        });
                      } else {
                        addMistake('report');
                        setSafeReportRows((current) => (current.includes(index) ? current : [...current, index]));
                        setFeedback({
                          kind: 'wrong',
                          title: 'هذا السطر اجتاز الفحص',
                          message: 'أحسنت في فحصه. استبعده الآن، ولا تبحث عن أكبر رقم أو أصغره؛ افحص علاقة الكمية بوحدتها.',
                        });
                      }
                    }}
                  >
                    <span>{isSafe ? '✓' : index + 1}</span>
                    <strong>{row.label}</strong>
                    <span className="rafiq-inspector-report-measurement">
                      {isCaught && row.correctedMeasurement ? (
                        <>
                          <s><ScientificText text={row.measurement} /></s>
                          <strong><ScientificText text={row.correctedMeasurement} /></strong>
                        </>
                      ) : (
                        <ScientificText text={row.measurement} />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {feedback ? <Feedback feedback={feedback} /> : null}

          {reportSolved ? (
            <button type="button" className="rafiq-inspector-primary" onClick={() => moveToRound(4)}>
              عرض تقريرك
              <StudentIcon name="chevron-left" width="20" height="20" />
            </button>
          ) : null}
        </article>
      ) : null}

      <StudentBackAction label="العودة إلى الدرس" onClick={onBack} />
    </section>
  );
}
