import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { ScientificText } from '@design-system/components/ScientificText';
import { StudentBackAction } from '@features/student/navigation/StudentBackAction';
import {
  grade9Lesson12ActivityCategories,
  type Grade9Lesson12ActivityCategoryId,
} from '@content/learning-design/grade9-lesson-1-2-activities-design';
import './Grade9LengthVolumeActivities.css';

interface Grade9LengthVolumeActivitiesProps {
  onBackToLesson: () => void;
}

type ActivityMode = 'menu' | Grade9Lesson12ActivityCategoryId;
type StationId = 'A' | 'B' | 'C';
type CauseKey = 'offset' | 'tilt' | 'tool';
type LongRodStep = 'start' | 'measure' | 'reposition' | 'sum';
type DataGroupId = 'A' | 'B' | 'C';

type ExperimentStation = 0 | 1 | 2 | 3;

const INQUIRY_STATIONS = [
  { id: 'A' as const, reading: '14.8 cm', note: 'الجسم مستقيم وبدايته عند الصفر.' },
  {
    id: 'B' as const,
    reading: '16.8 cm',
    note: 'بدأ الجسم عند 2.0 cm، وسُجلت قراءة النهاية مباشرة.',
  },
  { id: 'C' as const, reading: '14.1 cm', note: 'الجسم مائل عن تدريج المسطرة.' },
] as const;

const LONG_ROD_STEPS: readonly { id: LongRodStep; label: string }[] = [
  { id: 'sum', label: 'أجمع أطوال الأجزاء بعد إكمال القياس.' },
  { id: 'measure', label: 'أقيس الجزء الأول وأضع علامة واضحة عند نهايته.' },
  { id: 'start', label: 'أثبت نقطة البداية عند صفر المسطرة.' },
  { id: 'reposition', label: 'أنقل المسطرة لتبدأ من العلامة دون فجوة أو تداخل.' },
] as const;

const LONG_ROD_CORRECT_ORDER: readonly LongRodStep[] = ['start', 'measure', 'reposition', 'sum'];

const DATA_GROUPS: Readonly<Record<DataGroupId, readonly number[]>> = {
  A: [1.42, 1.44, 1.41, 1.43],
  B: [1.38, 1.47, 1.41, 1.45],
  C: [1.52, 1.52, 1.51, 1.52],
};

const WATER_LEVELS_ML = [26, 38, 47] as const;

const DIRECT_START_CM = 1.2;
const DIRECT_END_CM = 8.6;
const DIRECT_LENGTH_CM = DIRECT_END_CM - DIRECT_START_CM;
const DISC_MAIN_MM = 1.5;
const DISC_FRACTION_MM = 0.23;
const DISC_EXPECTED_MM = DISC_MAIN_MM + DISC_FRACTION_MM;
const STACK_TOTAL_MM = 15;
const STACK_SINGLE_MM = STACK_TOTAL_MM / 25;
const STONE_INITIAL_ML = 34;
const STONE_FINAL_ML = 46;
const STONE_VOLUME_ML = STONE_FINAL_ML - STONE_INITIAL_ML;

function formatDecimal(value: number, digits = 2): string {
  return Number(value.toFixed(digits)).toString();
}

function almostEqual(left: number, right: number, tolerance: number): boolean {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) <= tolerance;
}

function parsePositive(value: string): number | null {
  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function MenuIllustration({ id }: { id: Grade9Lesson12ActivityCategoryId }) {
  if (id === 'inquiry') {
    return (
      <svg
        viewBox="0 0 520 220"
        role="img"
        aria-label="ثلاث محاولات قياس بمسطرة لمقارنة طريقة الاستخدام"
      >
        <rect x="0" y="0" width="520" height="220" rx="24" fill="#eef8f5" />
        {[0, 1, 2].map((row) => (
          <g key={row} transform={`translate(54 ${42 + row * 58})`}>
            <rect
              x="0"
              y="16"
              width="320"
              height="28"
              rx="6"
              fill="#f0d79a"
              stroke="#9a7a36"
              strokeWidth="2"
            />
            {Array.from({ length: 17 }, (_, index) => (
              <line
                key={index}
                x1={14 + index * 18}
                y1="16"
                x2={14 + index * 18}
                y2={index % 5 === 0 ? 38 : 29}
                stroke="#5d523a"
              />
            ))}
            <rect
              x={row === 1 ? 82 : 34}
              y={row === 2 ? -3 : 2}
              width="216"
              height="16"
              rx="8"
              fill={row === 2 ? '#c98268' : '#5b8e95'}
              transform={row === 2 ? 'rotate(-7 142 5)' : undefined}
            />
            <circle cx="410" cy="28" r="18" fill="#dceee9" stroke="#41897c" strokeWidth="3" />
          </g>
        ))}
      </svg>
    );
  }

  if (id === 'simulation') {
    return (
      <svg
        viewBox="0 0 520 220"
        role="img"
        aria-label="عين تتحرك أمام مخبار مدرج لملاحظة اختلاف المنظر"
      >
        <rect width="520" height="220" rx="24" fill="#fff8df" />
        <rect
          x="270"
          y="24"
          width="90"
          height="172"
          rx="18"
          fill="#f9fdff"
          stroke="#65818a"
          strokeWidth="4"
        />
        <path d="M284 112 Q315 123 346 112 L346 180 L284 180 Z" fill="#86cfe1" opacity="0.8" />
        <path d="M284 112 Q315 123 346 112" fill="none" stroke="#1d89a9" strokeWidth="3" />
        {Array.from({ length: 11 }, (_, index) => (
          <line
            key={index}
            x1="360"
            y1={44 + index * 13}
            x2={index % 5 === 0 ? 390 : 378}
            y2={44 + index * 13}
            stroke="#526d72"
            strokeWidth={index % 5 === 0 ? 2 : 1}
          />
        ))}
        <ellipse cx="145" cy="108" rx="58" ry="38" fill="#fff" stroke="#4b7770" strokeWidth="4" />
        <circle cx="166" cy="108" r="13" fill="#2a625b" />
        <circle cx="170" cy="103" r="4" fill="#fff" />
        <line
          x1="200"
          y1="108"
          x2="284"
          y2="112"
          stroke="#d19b27"
          strokeWidth="4"
          strokeDasharray="9 7"
        />
        <path d="M116 55 V165" stroke="#4b8f83" strokeWidth="5" strokeLinecap="round" />
        <circle cx="116" cy="108" r="9" fill="#4b8f83" />
      </svg>
    );
  }

  if (id === 'data') {
    return (
      <svg viewBox="0 0 520 220" role="img" aria-label="جدول قياسات ومخطط نقطي لتحليل الاتساق">
        <rect width="520" height="220" rx="24" fill="#f5fbea" />
        <rect
          x="52"
          y="36"
          width="210"
          height="146"
          rx="16"
          fill="#fff"
          stroke="#b8d7bd"
          strokeWidth="3"
        />
        {[0, 1, 2, 3].map((row) => (
          <line
            key={row}
            x1="70"
            y1={70 + row * 28}
            x2="244"
            y2={70 + row * 28}
            stroke="#d7e6d9"
            strokeWidth="2"
          />
        ))}
        {[0, 1, 2].map((col) => (
          <line
            key={col}
            x1={112 + col * 44}
            y1="52"
            x2={112 + col * 44}
            y2="170"
            stroke="#d7e6d9"
            strokeWidth="2"
          />
        ))}
        <line x1="300" y1="166" x2="470" y2="166" stroke="#567b68" strokeWidth="3" />
        {[
          [326, 122],
          [342, 126],
          [357, 120],
          [390, 92],
          [420, 98],
          [443, 94],
        ].map(([cx, cy], index) => (
          <circle
            key={index}
            cx={cx}
            cy={cy}
            r="9"
            fill={index < 3 ? '#4d8a68' : '#b86d56'}
            stroke="#fff"
            strokeWidth="3"
          />
        ))}
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 520 220" role="img" aria-label="أدوات قياس متعددة في محطة تجربة موجهة">
      <rect width="520" height="220" rx="24" fill="#eef8f5" />
      <rect
        x="58"
        y="148"
        width="250"
        height="34"
        rx="6"
        fill="#f0d79a"
        stroke="#9a7a36"
        strokeWidth="2"
      />
      {Array.from({ length: 15 }, (_, index) => (
        <line
          key={index}
          x1={72 + index * 16}
          y1="148"
          x2={72 + index * 16}
          y2={index % 5 === 0 ? 173 : 162}
          stroke="#5c5038"
        />
      ))}
      <path
        d="M344 176 C322 88 374 40 444 66 C471 76 485 103 480 133"
        fill="none"
        stroke="#697f82"
        strokeWidth="23"
        strokeLinecap="round"
      />
      <rect
        x="395"
        y="105"
        width="86"
        height="44"
        rx="12"
        fill="#afbec1"
        stroke="#687d81"
        strokeWidth="3"
      />
      <rect
        x="90"
        y="54"
        width="86"
        height="72"
        rx="14"
        fill="#f9fdff"
        stroke="#6d858c"
        strokeWidth="4"
      />
      <path d="M102 91 Q133 100 164 91 L164 116 L102 116 Z" fill="#7ec9dd" />
      <circle cx="228" cy="90" r="35" fill="#887966" stroke="#5e554a" strokeWidth="4" />
    </svg>
  );
}

function MenuCard({
  id,
  label,
  title,
  description,
  complete,
  onOpen,
}: {
  id: Grade9Lesson12ActivityCategoryId;
  label: string;
  title: string;
  description: string;
  complete: boolean;
  onOpen: (id: Grade9Lesson12ActivityCategoryId) => void;
}) {
  return (
    <article className={`rafiq-l12-activity-card is-${id}${complete ? ' is-complete' : ''}`}>
      <div className="rafiq-l12-menu-visual">
        <MenuIllustration id={id} />
      </div>
      <div className="rafiq-l12-card-copy">
        <div className="rafiq-l12-card-title-row">
          <span className="rafiq-l12-activity-chip">{label}</span>
          <span className="rafiq-l12-available-badge">متوفر</span>
        </div>
        <h3>{label}</h3>
        <strong>{title}</strong>
        <p>{description}</p>
        {complete ? <span className="rafiq-l12-complete-badge">مكتمل</span> : null}
      </div>
      <button type="button" onClick={() => onOpen(id)}>
        {complete ? 'أعد النشاط' : `ابدأ ${label}`}
      </button>
    </article>
  );
}

function InquiryStationVisual({ station }: { station: StationId }) {
  const isB = station === 'B';
  const isC = station === 'C';
  const stripX1 = isB ? 98 : 68;
  const stripX2 = isB ? 320 : 290;

  return (
    <svg viewBox="0 0 360 220" role="img" aria-label={`محاولة القياس ${station}`}>
      <rect x="18" y="18" width="324" height="184" rx="22" fill="#f8fbfa" stroke="#cadbd6" />
      <circle cx="56" cy="58" r="16" fill="#d3b08c" />
      <path d="M40 102 Q56 76 72 102 L72 138 L40 138 Z" fill="#668a85" />
      <rect x="58" y="156" width="280" height="28" rx="6" fill="#f3dfaa" stroke="#8f7744" />
      {Array.from({ length: 181 }, (_, index) => {
        const x = 68 + index * 1.5;
        const centimeter = index % 10 === 0;
        const halfCentimeter = index % 5 === 0;
        return (
          <line
            key={index}
            x1={x}
            y1="156"
            x2={x}
            y2={centimeter ? 176 : halfCentimeter ? 171 : 165}
            stroke="#5f553f"
            strokeWidth={centimeter ? 1.8 : 0.85}
          />
        );
      })}
      <text x="66" y="194" fontSize="11" fill="#53605f">
        0
      </text>
      <text x="141" y="194" fontSize="11" fill="#53605f">
        5
      </text>
      <text x="216" y="194" fontSize="11" fill="#53605f">
        10
      </text>
      <text x="291" y="194" fontSize="11" fill="#53605f">
        15
      </text>
      <g transform={isC ? 'rotate(-17.7 179 137)' : undefined}>
        <rect
          x={stripX1}
          y="126"
          width={stripX2 - stripX1}
          height="16"
          rx="8"
          fill="#4b82a8"
          stroke="#2e5c7c"
        />
        <circle cx={stripX1} cy="134" r="4" fill="#193e57" />
        <circle cx={stripX2} cy="134" r="4" fill="#193e57" />
      </g>
      {isB ? (
        <>
          <path d="M98 144 V184" stroke="#b05649" strokeWidth="2" strokeDasharray="4 4" />
          <text x="84" y="116" fontSize="12" fill="#9a4339">
            البداية ليست عند الصفر
          </text>
        </>
      ) : null}
      <text x="302" y="48" fontSize="22" fontWeight="700" fill="#315e5a">
        {station}
      </text>
    </svg>
  );
}

function InquiryActivity({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [round, setRound] = useState<1 | 2>(1);
  const [prediction, setPrediction] = useState<StationId | null>(null);
  const [evidenceShown, setEvidenceShown] = useState(false);
  const [causeB, setCauseB] = useState<CauseKey | null>(null);
  const [causeC, setCauseC] = useState<CauseKey | null>(null);
  const [orderedSteps, setOrderedSteps] = useState<LongRodStep[]>([]);
  const [orderChecked, setOrderChecked] = useState(false);

  const causesCorrect = causeB === 'offset' && causeC === 'tilt';
  const orderCorrect =
    orderedSteps.length === LONG_ROD_CORRECT_ORDER.length &&
    orderedSteps.every((step, index) => step === LONG_ROD_CORRECT_ORDER[index]);

  if (round === 1) {
    return (
      <section className="rafiq-l12-activity-surface">
        <ActivityHeader eyebrow="الاستقصاء العلمي • الجولة 1" title="لماذا تختلف القياسات؟">
          ثلاثة طلاب يقيسون الشريط البلاستيكي نفسه. تنبأ أولًا، ثم اكشف الدليل واعزل سبب الاختلاف.
        </ActivityHeader>

        <div className="rafiq-l12-inquiry-stations">
          {INQUIRY_STATIONS.map((station) => (
            <article key={station.id} className="rafiq-l12-inquiry-station">
              <InquiryStationVisual station={station.id} />
              <button
                type="button"
                className={prediction === station.id ? 'is-selected' : ''}
                onClick={() => {
                  if (!evidenceShown) setPrediction(station.id);
                }}
              >
                أتوقع أن المحاولة {station.id} أكثر موثوقية
              </button>
              {evidenceShown ? (
                <div className="rafiq-l12-evidence">
                  <ScientificText text={`القراءة المسجلة: ${station.reading}`} />
                  <span>
                    <ScientificText text={station.note} />
                  </span>
                </div>
              ) : null}
            </article>
          ))}
        </div>

        {!evidenceShown ? (
          <div className="rafiq-l12-action-row">
            <button
              type="button"
              disabled={prediction === null}
              onClick={() => setEvidenceShown(true)}
            >
              نفّذ القياسات واكشف الدليل
            </button>
            {prediction ? (
              <span>سُجل تنبؤك. الآن اختبره بالدليل بدل تغييره بعد رؤية النتيجة.</span>
            ) : null}
          </div>
        ) : (
          <>
            <section className="rafiq-l12-cause-lab" aria-label="عزو أسباب اختلاف القياس">
              <div>
                <h3>حلّل المحاولة B</h3>
                <CauseButtons value={causeB} onChange={setCauseB} />
              </div>
              <div>
                <h3>حلّل المحاولة C</h3>
                <CauseButtons value={causeC} onChange={setCauseC} />
              </div>
            </section>

            {causeB && causeC ? (
              <div
                className={`rafiq-l12-feedback ${causesCorrect ? 'is-correct' : 'is-review'}`}
                role="status"
              >
                <strong>
                  {causesCorrect ? 'عزلت المتغيرين بنجاح' : 'راجع ما تغيّر فعليًا بين المحاولات'}
                </strong>
                <span>
                  {causesCorrect
                    ? 'في B تغيّر موضع البداية وسُجلت قراءة النهاية مباشرة، وفي C تغيّرت محاذاة الجسم مع التدريج. الأداة نفسها لم تتغير.'
                    : 'ابحث عن الفرق في طريقة وضع الجسم وبداية القياس، لا عن عامل لم يتغير مثل نوع المسطرة.'}
                </span>
                {causesCorrect ? (
                  <button type="button" onClick={() => setRound(2)}>
                    انتقل إلى تصميم إجراء أفضل
                  </button>
                ) : null}
              </div>
            ) : null}
          </>
        )}

        <BackToActivities onBack={onBack} />
      </section>
    );
  }

  return (
    <section className="rafiq-l12-activity-surface">
      <ActivityHeader eyebrow="الاستقصاء العلمي • الجولة 2" title="صمّم خطة قياس أطول من المسطرة">
        لديك قضيب خشبي مستقيم أطول من المسطرة المتاحة. رتب إجراءً يمنع الفجوات والتداخل بين المقاطع.
      </ActivityHeader>

      <div
        className="rafiq-l12-long-rod"
        role="img"
        aria-label="قضيب خشبي مستقيم أطول من مسطرة واحدة"
      >
        <div className="rafiq-l12-long-rod-object" />
        <div className="rafiq-l12-short-ruler">
          {Array.from({ length: 11 }, (_, index) => (
            <i key={index} />
          ))}
        </div>
        <span>المسطرة أقصر من الجسم، لكن الجسم مستقيم ويمكن قياسه على أجزاء متتابعة.</span>
      </div>

      <div className="rafiq-l12-order-builder" aria-label="رتب خطوات إجراء القياس">
        {LONG_ROD_STEPS.map((step) => {
          const position = orderedSteps.indexOf(step.id);
          return (
            <button
              key={step.id}
              type="button"
              disabled={orderChecked || position !== -1}
              className={position !== -1 ? 'is-selected' : ''}
              onClick={() => setOrderedSteps((current) => [...current, step.id])}
            >
              <span>{position === -1 ? 'اختر' : position + 1}</span>
              {step.label}
            </button>
          );
        })}
      </div>

      {orderedSteps.length === 4 && !orderChecked ? (
        <button type="button" className="rafiq-l12-primary" onClick={() => setOrderChecked(true)}>
          اختبر الخطة
        </button>
      ) : null}

      {orderChecked ? (
        <div
          className={`rafiq-l12-feedback ${orderCorrect ? 'is-correct' : 'is-review'}`}
          role="status"
        >
          <strong>
            {orderCorrect ? 'الخطة متصلة بلا فجوات أو تداخل' : 'ترتيب الخطة يحتاج إعادة بناء'}
          </strong>
          <span>
            {orderCorrect
              ? 'أنت لم تغيّر الأداة؛ بل صممت طريقة تجعل المسطرة القصيرة تقيس جسمًا أطول على أجزاء متتابعة ثم تجمعها.'
              : 'ابدأ بتثبيت نقطة البداية، ثم قس الجزء الأول، وبعدها انقل المسطرة من العلامة قبل جمع الأطوال.'}
          </span>
          {orderCorrect ? (
            <button type="button" onClick={onComplete}>
              إنهاء الاستقصاء
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setOrderedSteps([]);
                setOrderChecked(false);
              }}
            >
              أعد بناء الخطة
            </button>
          )}
        </div>
      ) : null}

      <BackToActivities onBack={onBack} />
    </section>
  );
}

function CauseButtons({
  value,
  onChange,
}: {
  value: CauseKey | null;
  onChange: (value: CauseKey) => void;
}) {
  const options: readonly { id: CauseKey; label: string }[] = [
    { id: 'offset', label: 'بدأ القياس من علامة غير الصفر وسُجلت قراءة النهاية مباشرة' },
    { id: 'tilt', label: 'الجسم غير محاذٍ لتدريج المسطرة' },
    { id: 'tool', label: 'تغيّر نوع الأداة المستخدمة' },
  ];

  return (
    <div className="rafiq-l12-cause-options">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={value === option.id ? 'is-selected' : ''}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ActivityHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <header className="rafiq-l12-activity-header">
      <p>{eyebrow}</p>
      <h2>{title}</h2>
      <span>{children}</span>
    </header>
  );
}

function BackToActivities({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" className="rafiq-l12-secondary" onClick={onBack}>
      العودة إلى الأنشطة
    </button>
  );
}

function SimulationActivity({
  onComplete,
  onBack,
}: {
  onComplete: () => void;
  onBack: () => void;
}) {
  const [round, setRound] = useState<1 | 2>(1);
  const [eyeOffset, setEyeOffset] = useState(-48);
  const [levelIndex, setLevelIndex] = useState(0);
  const [exploredAbove, setExploredAbove] = useState(true);
  const [exploredLevel, setExploredLevel] = useState(false);
  const [exploredBelow, setExploredBelow] = useState(false);
  const [changedLevel, setChangedLevel] = useState(false);

  const actualMl = WATER_LEVELS_ML[levelIndex];
  const bottomY = 340;
  const scaleHeight = 240;
  const actualY = bottomY - (actualMl / 60) * scaleHeight;
  const eyeY = actualY + eyeOffset;
  const frontWallRatio = 80 / 340;
  const apparentY = actualY + frontWallRatio * eyeOffset;
  const apparentMl = actualMl - ((apparentY - actualY) / scaleHeight) * 60;
  const atLevel = Math.abs(eyeOffset) <= 4;
  const explorationComplete = exploredAbove && exploredLevel && exploredBelow && changedLevel;

  function updateEye(value: number) {
    setEyeOffset(value);
    if (value < -16) setExploredAbove(true);
    if (Math.abs(value) <= 4) setExploredLevel(true);
    if (value > 16) setExploredBelow(true);
  }

  if (round === 2) {
    return <VolumeChangeSimulationRound onComplete={onComplete} onBack={onBack} />;
  }
  return (
    <section className="rafiq-l12-activity-surface">
      <ActivityHeader eyebrow="المحاكاة • الجولة 1 من 2" title="عينك جزء من القياس">
        حرّك العين رأسيًا. خط النظر حقيقي هندسيًا داخل النموذج، لذلك تتغير نقطة تقاطعه مع تدريج
        المخبار عندما تكون أعلى أو أسفل مستوى الماء.
      </ActivityHeader>

      <div className="rafiq-l12-parallax-layout">
        <div className="rafiq-l12-cylinder-sim">
          <svg
            viewBox="0 0 760 420"
            role="img"
            aria-label="مخبار مدرج بماء ذي سطح مقعر وخط نظر متحرك"
          >
            <defs>
              <linearGradient id="l12-water" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#78c7df" stopOpacity="0.72" />
                <stop offset="1" stopColor="#3aa5c4" stopOpacity="0.84" />
              </linearGradient>
            </defs>
            <rect
              x="228"
              y="72"
              width="164"
              height="286"
              rx="22"
              fill="#f9fdff"
              stroke="#62828b"
              strokeWidth="4"
            />
            <path
              d={`M242 ${actualY - 10} Q310 ${actualY + 10} 378 ${actualY - 10} L378 344 L242 344 Z`}
              fill="url(#l12-water)"
            />
            <path
              d={`M242 ${actualY - 10} Q310 ${actualY + 10} 378 ${actualY - 10}`}
              fill="none"
              stroke="#187e9d"
              strokeWidth="4"
            />
            {Array.from({ length: 31 }, (_, index) => {
              const y = bottomY - index * 8;
              const major = index % 5 === 0;
              return (
                <line
                  key={index}
                  x1={392}
                  y1={y}
                  x2={major ? 430 : 416}
                  y2={y}
                  stroke="#526c70"
                  strokeWidth={major ? 2.4 : 1.2}
                />
              );
            })}
            {[0, 10, 20, 30, 40, 50, 60].map((value) => (
              <text
                key={value}
                x="438"
                y={bottomY - (value / 60) * scaleHeight + 4}
                fontSize="13"
                fill="#42595d"
              >
                {value}
              </text>
            ))}

            <line
              x1="650"
              y1={eyeY}
              x2="310"
              y2={actualY}
              stroke="#b75445"
              strokeWidth="3"
              strokeDasharray="8 6"
            />
            <circle cx="392" cy={apparentY} r="6" fill="#b75445" />
            <line
              x1="392"
              y1={apparentY}
              x2="470"
              y2={apparentY}
              stroke="#b75445"
              strokeWidth="2"
              strokeDasharray="5 4"
            />

            <g transform={`translate(650 ${eyeY})`}>
              <ellipse cx="0" cy="0" rx="44" ry="25" fill="#fff" stroke="#345d62" strokeWidth="4" />
              <circle cx="0" cy="0" r="10" fill="#345d62" />
              <circle cx="-3" cy="-3" r="3" fill="#fff" />
            </g>

            <circle cx="310" cy={actualY} r="5" fill="#0f6c89" />
            {atLevel ? (
              <line
                x1="205"
                y1={actualY}
                x2="520"
                y2={actualY}
                stroke="#1f7a5f"
                strokeWidth="3"
                strokeDasharray="7 5"
              />
            ) : null}
          </svg>
          <div className="rafiq-l12-plot-unit">
            <ScientificText text="تدريج الحجم: mL" />
          </div>
        </div>

        <aside className="rafiq-l12-sim-controls">
          <label>
            <strong>موضع العين</strong>
            <span>أعلى</span>
            <input
              aria-label="موضع العين بالنسبة إلى مستوى الماء"
              type="range"
              min="-72"
              max="72"
              step="2"
              value={eyeOffset}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateEye(Number(event.currentTarget.value))
              }
            />
            <span>أسفل</span>
          </label>

          <div className={`rafiq-l12-reading-panel${atLevel ? ' is-level' : ''}`} role="status">
            <strong>{atLevel ? 'العين في المستوى الصحيح' : 'توجد زاوية اختلاف منظر'}</strong>
            <ScientificText
              text={`القراءة الظاهرية في المحاكاة: ${formatDecimal(apparentMl, 1)} mL`}
            />
            {atLevel ? (
              <ScientificText text={`قراءة الماء عند أسفل السطح المقعر: ${actualMl} mL`} />
            ) : null}
          </div>

          <button
            type="button"
            className="rafiq-l12-primary"
            onClick={() => {
              setLevelIndex((current) => (current + 1) % WATER_LEVELS_ML.length);
              setChangedLevel(true);
            }}
          >
            غيّر مستوى الماء
          </button>

          <div className="rafiq-l12-exploration-checks" aria-label="أثر الاستكشاف">
            <span className={exploredAbove ? 'is-done' : ''}>جرّبت النظر من أعلى</span>
            <span className={exploredLevel ? 'is-done' : ''}>وصلت إلى مستوى السطح</span>
            <span className={exploredBelow ? 'is-done' : ''}>جرّبت النظر من أسفل</span>
            <span className={changedLevel ? 'is-done' : ''}>اختبرت مستوى ماء جديدًا</span>
          </div>
        </aside>
      </div>

      {explorationComplete ? (
        <div className="rafiq-l12-feedback is-correct" role="status">
          <strong>اختبرت المتغير بدل مشاهدة حركة جاهزة</strong>
          <span>
            موضع العين غيّر القراءة الظاهرية، بينما القراءة الصحيحة استقرت عندما أصبح خط النظر
            أفقيًا عند أسفل السطح المقعر.
          </span>
          <button type="button" onClick={() => setRound(2)}>
            الانتقال إلى الجولة الثانية
          </button>
        </div>
      ) : null}

      <BackToActivities onBack={onBack} />
    </section>
  );
}

function VolumeChangeSimulationRound({
  onComplete,
  onBack,
}: {
  onComplete: () => void;
  onBack: () => void;
}) {
  const BASE = { length: 2, width: 3, height: 2 } as const;
  const TARGET_VOLUME = 48;
  const [length, setLength] = useState<number>(BASE.length);
  const [width, setWidth] = useState<number>(BASE.width);
  const [height, setHeight] = useState<number>(BASE.height);
  const [prediction, setPrediction] = useState<'double' | 'quadruple' | 'octuple' | null>(null);
  const [testedPrediction, setTestedPrediction] = useState(false);
  const [equivalent, setEquivalent] = useState<'48' | '4.8' | '480' | null>(null);

  const volume = length * width * height;
  const baseVolume = BASE.length * BASE.width * BASE.height;
  const doubledLengthTest =
    length === BASE.length * 2 && width === BASE.width && height === BASE.height;
  const predictionCorrect = prediction === 'double' && doubledLengthTest;
  const targetReached = volume === TARGET_VOLUME;
  const equivalenceCorrect = equivalent === '48';

  const cubes = useMemo(() => {
    const shapes: ReactNode[] = [];
    const size = 18;
    const depthX = 9;
    const depthY = 6;
    const originX = 310;
    const originY = 250;

    for (let z = 0; z < height; z += 1) {
      for (let y = width - 1; y >= 0; y -= 1) {
        for (let x = 0; x < length; x += 1) {
          const px = originX + (x - y) * size;
          const py = originY + (x + y) * depthY - z * size;
          const key = `${x}-${y}-${z}`;
          shapes.push(
            <g key={key} opacity="0.78">
              <polygon
                points={`${px},${py} ${px + size},${py + depthY} ${px + size - depthX},${py + depthY + depthX} ${px - depthX},${py + depthX}`}
                fill="#d9f1ec"
                stroke="#5b9a8c"
                strokeWidth="1"
              />
              <polygon
                points={`${px},${py} ${px - depthX},${py + depthX} ${px - depthX},${py + depthX + size} ${px},${py + size}`}
                fill="#bfe2da"
                stroke="#5b9a8c"
                strokeWidth="1"
              />
              <polygon
                points={`${px},${py} ${px + size},${py + depthY} ${px + size},${py + depthY + size} ${px},${py + size}`}
                fill="#eef9f6"
                stroke="#5b9a8c"
                strokeWidth="1"
              />
            </g>
          );
        }
      }
    }
    return shapes;
  }, [height, length, width]);

  return (
    <section className="rafiq-l12-activity-surface">
      <ActivityHeader eyebrow="المحاكاة • الجولة 2 من 2" title="مختبر الحجم المتغير">
        غيّر بُعدًا واحدًا أو أكثر وشاهد كيف يتغير الحجم. النموذج الشفاف مبني من مكعبات وحدة حجم،
        وكل مكعب يمثل 1 cm³.
      </ActivityHeader>

      <div className="rafiq-l12-volume-sim-layout">
        <div className="rafiq-l12-volume-model">
          <svg
            viewBox="0 0 720 390"
            role="img"
            aria-label="نموذج هندسي شفاف مبني من مكعبات وحدة حجم شفافة"
          >
            <defs>
              <linearGradient id="l12-volume-stage" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#f8fcfb" />
                <stop offset="1" stopColor="#edf6f3" />
              </linearGradient>
            </defs>
            <rect
              x="22"
              y="22"
              width="676"
              height="346"
              rx="24"
              fill="url(#l12-volume-stage)"
              stroke="#c6ddd7"
              strokeWidth="3"
            />
            <text x="54" y="62" fontSize="16" fontWeight="800" fill="#315b56">
              مكعبات الوحدة
            </text>
            {cubes}
            <line
              x1="118"
              y1="320"
              x2="560"
              y2="320"
              stroke="#d1a532"
              strokeWidth="3"
              strokeDasharray="8 7"
            />
            <text x="118" y="350" fontSize="16" fontWeight="800" fill="#7d6418">
              كل مكعب صغير = 1 cm³
            </text>
          </svg>
          <div className="rafiq-l12-volume-readout">
            <ScientificText text={`الأبعاد: ${length} cm × ${width} cm × ${height} cm`} />
            <ScientificText text={`الحجم الحالي: ${volume} cm³`} />
          </div>
        </div>

        <aside className="rafiq-l12-volume-controls">
          <section className="rafiq-l12-volume-prediction">
            <p>تنبأ أولًا: إذا ضاعفنا الطول فقط وأبقينا العرض والارتفاع ثابتين، ماذا يحدث للحجم؟</p>
            <div>
              <button
                type="button"
                className={prediction === 'double' ? 'is-selected' : ''}
                onClick={() => {
                  setPrediction('double');
                  setTestedPrediction(false);
                }}
              >
                يتضاعف
              </button>
              <button
                type="button"
                className={prediction === 'quadruple' ? 'is-selected' : ''}
                onClick={() => {
                  setPrediction('quadruple');
                  setTestedPrediction(false);
                }}
              >
                يصبح أربعة أضعاف
              </button>
              <button
                type="button"
                className={prediction === 'octuple' ? 'is-selected' : ''}
                onClick={() => {
                  setPrediction('octuple');
                  setTestedPrediction(false);
                }}
              >
                يصبح ثمانية أضعاف
              </button>
            </div>
          </section>

          <label>
            <span>الطول</span>
            <input
              aria-label="طول النموذج بالسنتيمتر"
              type="range"
              min="1"
              max="6"
              step="1"
              value={length}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setLength(Number(event.currentTarget.value));
                setTestedPrediction(false);
                setEquivalent(null);
              }}
            />
            <ScientificText text={`${length} cm`} />
          </label>
          <label>
            <span>العرض</span>
            <input
              aria-label="عرض النموذج بالسنتيمتر"
              type="range"
              min="1"
              max="6"
              step="1"
              value={width}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setWidth(Number(event.currentTarget.value));
                setTestedPrediction(false);
                setEquivalent(null);
              }}
            />
            <ScientificText text={`${width} cm`} />
          </label>
          <label>
            <span>الارتفاع</span>
            <input
              aria-label="ارتفاع النموذج بالسنتيمتر"
              type="range"
              min="1"
              max="6"
              step="1"
              value={height}
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                setHeight(Number(event.currentTarget.value));
                setTestedPrediction(false);
                setEquivalent(null);
              }}
            />
            <ScientificText text={`${height} cm`} />
          </label>

          <div className="rafiq-l12-volume-actions">
            <button
              type="button"
              className="rafiq-l12-secondary"
              onClick={() => {
                setLength(BASE.length);
                setWidth(BASE.width);
                setHeight(BASE.height);
                setTestedPrediction(false);
                setEquivalent(null);
              }}
            >
              أعد الأبعاد الأساسية
            </button>
            <button
              type="button"
              className="rafiq-l12-primary"
              disabled={!prediction || !doubledLengthTest}
              onClick={() => setTestedPrediction(true)}
            >
              اختبر التنبؤ عند مضاعفة الطول
            </button>
          </div>
        </aside>
      </div>

      {testedPrediction ? (
        <div
          className={`rafiq-l12-feedback ${predictionCorrect ? 'is-correct' : 'is-review'}`}
          role="status"
        >
          <strong>
            {predictionCorrect
              ? 'تنبؤك صمد أمام التجربة'
              : 'غيّرت بُعدًا واحدًا لكن التنبؤ لا يطابق الأثر'}
          </strong>
          <ScientificText
            text={`الحجم الأساسي = ${baseVolume} cm³، وبعد مضاعفة الطول = ${volume} cm³`}
          />
          <span>
            {predictionCorrect
              ? 'عندما يتضاعف بُعد واحد فقط وتبقى الأبعاد الأخرى ثابتة، يتضاعف الحجم.'
              : 'قارن الحجم الجديد بالحجم الأساسي بدل الاعتماد على شكل الصندوق وحده.'}
          </span>
        </div>
      ) : null}

      {predictionCorrect && testedPrediction ? (
        <section className="rafiq-l12-volume-target">
          <div>
            <p>تحدي التصميم</p>
            <h3>ابنِ الحجم المطلوب</h3>
            <ScientificText
              text={`اضبط الأبعاد بأي تركيب صحيح حتى يصبح الحجم ${TARGET_VOLUME} cm³.`}
            />
          </div>
          <strong className={targetReached ? 'is-done' : ''}>
            <ScientificText text={`${volume} cm³`} />
          </strong>
        </section>
      ) : null}

      {targetReached && predictionCorrect ? (
        <section className="rafiq-l12-volume-equivalence">
          <h3>اربط الحجم بوحدة السائل</h3>
          <p>
            <ScientificText text="بما أن 1 cm³ = 1 mL، فما حجم الماء الذي يملأ حيزًا مقداره 48 cm³ تمامًا؟" />
          </p>
          <div>
            {(['48', '4.8', '480'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={equivalent === value ? 'is-selected' : ''}
                onClick={() => setEquivalent(value)}
              >
                <ScientificText text={`${value} mL`} />
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {equivalent ? (
        <div
          className={`rafiq-l12-feedback ${equivalenceCorrect ? 'is-correct' : 'is-review'}`}
          role="status"
        >
          <strong>
            {equivalenceCorrect
              ? 'ربطت وحدتي الحجم دون تغيير المقدار'
              : 'الوحدة تغيرت، لكن مقدار الحجم لا يتضاعف ولا يُقسم'}
          </strong>
          {equivalenceCorrect ? (
            <ScientificText text="48 cm³ = 48 mL" />
          ) : (
            <ScientificText text="1 cm³ = 1 mL" />
          )}
          {equivalenceCorrect ? (
            <button type="button" onClick={onComplete}>
              إنهاء المحاكاة
            </button>
          ) : null}
        </div>
      ) : null}

      <BackToActivities onBack={onBack} />
    </section>
  );
}

function DataActivity({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [showPlot, setShowPlot] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DataGroupId | null>(null);
  const [accuracyJudgment, setAccuracyJudgment] = useState<'yes' | 'no' | null>(null);

  const ranges = useMemo(() => {
    return Object.fromEntries(
      (Object.keys(DATA_GROUPS) as DataGroupId[]).map((group) => {
        const values = DATA_GROUPS[group];
        return [group, Math.max(...values) - Math.min(...values)];
      })
    ) as Record<DataGroupId, number>;
  }, []);

  const consistencyCorrect = selectedGroup === 'C';
  const accuracyCorrect = accuracyJudgment === 'no';

  return (
    <section className="rafiq-l12-activity-surface">
      <ActivityHeader eyebrow="نشاط البيانات" title="أي القياسات أكثر اتساقًا؟">
        ثلاث مجموعات قاست سمك حلقة نايلون رقيقة بالميكرومتر أربع مرات. لا نملك قيمة مرجعية معلومة.
      </ActivityHeader>

      <div className="rafiq-l12-data-table-wrap">
        <table className="rafiq-l12-data-table">
          <caption>أربع قراءات لكل مجموعة</caption>
          <thead>
            <tr>
              <th>المجموعة</th>
              <th>1</th>
              <th>2</th>
              <th>3</th>
              <th>4</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(DATA_GROUPS) as DataGroupId[]).map((group) => (
              <tr key={group}>
                <th>{group}</th>
                {DATA_GROUPS[group].map((value, index) => (
                  <td key={`${group}-${index}`}>
                    <ScientificText text={`${value.toFixed(2)} mm`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!showPlot ? (
        <button type="button" className="rafiq-l12-primary" onClick={() => setShowPlot(true)}>
          مثّل البيانات بصريًا
        </button>
      ) : (
        <>
          <DotPlot />
          <section className="rafiq-l12-data-decision">
            <h3>أي مجموعة قراءاتها أكثر تقاربًا؟</h3>
            <div>
              {(Object.keys(DATA_GROUPS) as DataGroupId[]).map((group) => (
                <button
                  key={group}
                  type="button"
                  className={selectedGroup === group ? 'is-selected' : ''}
                  onClick={() => setSelectedGroup(group)}
                >
                  المجموعة {group}
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {selectedGroup ? (
        <div
          className={`rafiq-l12-feedback ${consistencyCorrect ? 'is-correct' : 'is-review'}`}
          role="status"
        >
          <strong>
            {consistencyCorrect
              ? 'قرأت التشتت لا الرقم الأكبر أو الأصغر'
              : 'قارن عرض الانتشار بين النقاط'}
          </strong>
          <ScientificText
            text={`مدى المجموعة ${selectedGroup} = ${formatDecimal(ranges[selectedGroup], 2)} mm`}
          />
          <span>
            {consistencyCorrect
              ? 'المجموعة C لها أصغر انتشار بين القراءات، لذلك نصفها بأنها الأكثر اتساقًا أو تقاربًا.'
              : 'الاتساق يتعلق بتقارب القراءات من بعضها، لا بكون قيمها أكبر أو أصغر.'}
          </span>
        </div>
      ) : null}

      {consistencyCorrect ? (
        <section className="rafiq-l12-accuracy-question">
          <h3>هل نستطيع من هذه البيانات وحدها تحديد المجموعة الأكثر دقة؟</h3>
          <div>
            <button
              type="button"
              className={accuracyJudgment === 'yes' ? 'is-selected' : ''}
              onClick={() => setAccuracyJudgment('yes')}
            >
              نعم، المجموعة الأكثر اتساقًا هي الأدق حتمًا
            </button>
            <button
              type="button"
              className={accuracyJudgment === 'no' ? 'is-selected' : ''}
              onClick={() => setAccuracyJudgment('no')}
            >
              لا، نحتاج قيمة مرجعية معروفة للحكم على الدقة
            </button>
          </div>
        </section>
      ) : null}

      {accuracyJudgment ? (
        <div
          className={`rafiq-l12-feedback ${accuracyCorrect ? 'is-correct' : 'is-review'}`}
          role="status"
        >
          <strong>
            {accuracyCorrect
              ? 'فصلت بين الاتساق والدقة'
              : 'الاتساق لا يثبت القرب من القيمة الصحيحة'}
          </strong>
          <span>
            {accuracyCorrect
              ? 'يمكن وصف تقارب القياسات من بعضها، لكن لا يمكن تحديد أي مجموعة أقرب إلى القيمة الصحيحة من دون معيار أو قيمة مرجعية.'
              : 'قد تكون القياسات متقاربة جدًا لكنها جميعًا منحازة عن القيمة الصحيحة. نحتاج مرجعًا للحكم على الدقة.'}
          </span>
          {accuracyCorrect ? (
            <button type="button" onClick={onComplete}>
              إنهاء نشاط البيانات
            </button>
          ) : null}
        </div>
      ) : null}

      <BackToActivities onBack={onBack} />
    </section>
  );
}

function DotPlot() {
  const min = 1.35;
  const max = 1.55;
  const left = 86;
  const right = 716;
  const xFor = (value: number) => left + ((value - min) / (max - min)) * (right - left);
  const rows: Record<DataGroupId, number> = { A: 82, B: 162, C: 242 };

  return (
    <div className="rafiq-l12-dotplot">
      <svg
        viewBox="0 0 760 310"
        role="img"
        aria-label="مخطط نقطي يوضح تشتت قراءات المجموعات الثلاث"
      >
        {(Object.keys(rows) as DataGroupId[]).map((group) => (
          <g key={group}>
            <text x="28" y={rows[group] + 6} fontSize="18" fontWeight="700" fill="#315d5b">
              {group}
            </text>
            <line
              x1={left}
              y1={rows[group]}
              x2={right}
              y2={rows[group]}
              stroke="#d5e0dd"
              strokeWidth="2"
            />
            {DATA_GROUPS[group].map((value, index) => (
              <circle
                key={`${group}-${index}`}
                cx={xFor(value)}
                cy={rows[group] + (index - 1.5) * 8}
                r="9"
                fill={group === 'A' ? '#4f86a7' : group === 'B' ? '#b86d56' : '#4d8a68'}
                stroke="#fff"
                strokeWidth="3"
              />
            ))}
          </g>
        ))}
        {[1.35, 1.4, 1.45, 1.5, 1.55].map((tick) => (
          <g key={tick}>
            <line x1={xFor(tick)} y1="52" x2={xFor(tick)} y2="274" stroke="#edf2f0" />
            <text x={xFor(tick) - 17} y="298" fontSize="13" fill="#536563">
              {tick.toFixed(2)}
            </text>
          </g>
        ))}
      </svg>
      <div className="rafiq-l12-plot-unit">
        <ScientificText text="المحور الأفقي: mm" />
      </div>
    </div>
  );
}

function GuidedExperiment({ onComplete, onBack }: { onComplete: () => void; onBack: () => void }) {
  const [station, setStation] = useState<ExperimentStation>(0);
  const [completedStations, setCompletedStations] = useState<Set<ExperimentStation>>(
    () => new Set()
  );

  const [directTool, setDirectTool] = useState('');
  const [directValue, setDirectValue] = useState('');
  const [directUnit, setDirectUnit] = useState<'cm' | 'mm' | ''>('');
  const [directReason, setDirectReason] = useState('');

  const [discTool, setDiscTool] = useState('');
  const [discValue, setDiscValue] = useState('');
  const [discUnit, setDiscUnit] = useState<'mm' | 'cm' | ''>('');
  const [discReason, setDiscReason] = useState('');
  const [ratchetUsed, setRatchetUsed] = useState(false);

  const [stackMethod, setStackMethod] = useState('');
  const [stackTotal, setStackTotal] = useState('');
  const [stackSingle, setStackSingle] = useState('');
  const [stackReason, setStackReason] = useState('');

  const [stoneMethod, setStoneMethod] = useState('');
  const [initialVolume, setInitialVolume] = useState('');
  const [finalVolume, setFinalVolume] = useState('');
  const [stoneVolumeMl, setStoneVolumeMl] = useState('');
  const [stoneVolume, setStoneVolume] = useState('');
  const [stoneReason, setStoneReason] = useState('');

  const [stationMessage, setStationMessage] = useState<string | null>(null);

  function markStationComplete(current: ExperimentStation) {
    setCompletedStations((previous) => new Set([...previous, current]));
    setStationMessage(null);
    if (current < 3) setStation((current + 1) as ExperimentStation);
  }

  function validateCurrentStation() {
    if (station === 0) {
      const value = parsePositive(directValue);
      const expected =
        directUnit === 'cm' ? DIRECT_LENGTH_CM : directUnit === 'mm' ? DIRECT_LENGTH_CM * 10 : null;
      const tolerance = directUnit === 'cm' ? 0.05 : 0.5;
      if (
        directTool !== 'ruler' ||
        value === null ||
        expected === null ||
        !almostEqual(value, expected, tolerance) ||
        directReason.trim().length < 8
      ) {
        setStationMessage(
          'اقرأ موضع البداية والنهاية على المسطرة، اطرح قراءة البداية من قراءة النهاية، ثم اختر الوحدة المناسبة وبرّر اختيار المسطرة.'
        );
        return;
      }
      markStationComplete(0);
      return;
    }

    if (station === 1) {
      const value = parsePositive(discValue);
      if (
        discTool !== 'micrometer' ||
        value === null ||
        discUnit !== 'mm' ||
        !almostEqual(value, DISC_EXPECTED_MM, 0.005) ||
        !ratchetUsed ||
        discReason.trim().length < 8
      ) {
        setStationMessage(
          'اقرأ آخر علامة كاملة على التدريج الرئيسي ثم أضف قراءة التدريج الكسري عند خط المرجع. سجّل الناتج بوحدة mm وأكد استخدام السقاطة برفق.'
        );
        return;
      }
      markStationComplete(1);
      return;
    }

    if (station === 2) {
      const total = parsePositive(stackTotal);
      const single = parsePositive(stackSingle);
      if (
        stackMethod !== 'stack-divide' ||
        total === null ||
        single === null ||
        !almostEqual(total, STACK_TOTAL_MM, 0.05) ||
        !almostEqual(single, STACK_SINGLE_MM, 0.005) ||
        !almostEqual(single, total / 25, 0.005) ||
        stackReason.trim().length < 8
      ) {
        setStationMessage(
          'اقرأ السمك الكلي للرزمة من تدريج المليمتر، ثم اقسمه على 25. يجب أن تتفق قراءة الرسم والحساب معًا.'
        );
        return;
      }
      markStationComplete(2);
      return;
    }

    const initial = Number(initialVolume.replace(',', '.'));
    const final = Number(finalVolume.replace(',', '.'));
    const displacedMl = Number(stoneVolumeMl.replace(',', '.'));
    const volumeCm3 = Number(stoneVolume.replace(',', '.'));
    if (
      !Number.isFinite(initial) ||
      !Number.isFinite(final) ||
      !Number.isFinite(displacedMl) ||
      !Number.isFinite(volumeCm3) ||
      !almostEqual(initial, STONE_INITIAL_ML, 0.05) ||
      !almostEqual(final, STONE_FINAL_ML, 0.05) ||
      !almostEqual(displacedMl, STONE_VOLUME_ML, 0.05) ||
      !almostEqual(displacedMl, final - initial, 0.05) ||
      !almostEqual(volumeCm3, displacedMl, 0.05) ||
      stoneMethod !== 'displacement' ||
      stoneReason.trim().length < 8
    ) {
      setStationMessage(
        'اقرأ أسفل المنيسكوس قبل الغمر وبعده، احسب فرق القراءتين بوحدة mL، ثم حوّل القيمة نفسها إلى cm³ باستخدام العلاقة 1 mL = 1 cm³.'
      );
      return;
    }
    markStationComplete(3);
  }

  const allComplete = completedStations.size === 4;

  return (
    <section className="rafiq-l12-activity-surface">
      <ActivityHeader eyebrow="التجربة الموجهة" title="محطة القياس">
        اقرأ الأدوات التعليمية كما تفعل في المختبر: حدّد التدريج، استخرج القراءة بنفسك، ثم استخدم
        الدفتر الرقمي لتسجيل القرار والحساب والوحدة.
      </ActivityHeader>

      <div className="rafiq-l12-safety-note" role="note">
        <strong>سلامة التنفيذ عند تطبيق النشاط عمليًا</strong>
        <span>
          تعامل مع الزجاج والأجسام الصلبة برفق، لا تُسقط الجسم داخل المخبار، وجفف أي ماء من سطح
          العمل فورًا.
        </span>
      </div>

      <nav className="rafiq-l12-station-nav" aria-label="محطات التجربة الموجهة">
        {(['بعد مباشر', 'قرص رقيق', '25 بطاقة', 'جسم غير منتظم'] as const).map((label, index) => (
          <button
            key={label}
            type="button"
            className={`${station === index ? 'is-current' : ''}${completedStations.has(index as ExperimentStation) ? ' is-done' : ''}`}
            onClick={() => {
              if (index <= completedStations.size) {
                setStation(index as ExperimentStation);
                setStationMessage(null);
              }
            }}
          >
            <span>{index + 1}</span>
            {label}
          </button>
        ))}
      </nav>

      <div className="rafiq-l12-experiment-station">
        {station === 0 ? (
          <>
            <ExperimentVisual kind="direct" />
            <div className="rafiq-l12-notebook">
              <h3>المحطة 1: قياس بعد مباشر</h3>
              <p>
                اقرأ موضع بداية الجسم ونهايته من المسطرة المرقمة، ثم احسب طوله وسجّل الأداة والوحدة
                والسبب.
              </p>
              <div className="rafiq-l12-instrument-key">
                <ScientificText text="أصغر تقسيم في المسطرة = 1 mm" />
              </div>
              <DecisionSelect
                label="الأداة التي استخدمتها"
                value={directTool}
                onChange={setDirectTool}
                options={[
                  ['ruler', 'المسطرة'],
                  ['micrometer', 'الميكرومتر'],
                  ['cylinder', 'المخبار المدرج'],
                ]}
              />
              <MeasurementEntry
                value={directValue}
                onValue={setDirectValue}
                unit={directUnit}
                onUnit={(value) => setDirectUnit(value as 'cm' | 'mm' | '')}
                units={['cm', 'mm']}
                label="قراءة الطول"
              />
              <label>
                لماذا كانت هذه الأداة مناسبة؟
                <textarea
                  aria-label="سبب اختيار أداة القياس المباشر"
                  value={directReason}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setDirectReason(event.currentTarget.value)
                  }
                />
              </label>
            </div>
          </>
        ) : null}

        {station === 1 ? (
          <>
            <ExperimentVisual kind="disc" />
            <div className="rafiq-l12-notebook">
              <h3>المحطة 2: سمك قرص معدني رقيق</h3>
              <p>
                اقرأ التدريج الرئيسي ثم التدريج الكسري عند خط المرجع، واجمعهما للحصول على سمك القرص.
              </p>
              <div className="rafiq-l12-instrument-key">
                <ScientificText text="كل تقسيم على التدريج الكسري = 0.01 mm" />
              </div>
              <DecisionSelect
                label="الأداة التي استخدمتها"
                value={discTool}
                onChange={setDiscTool}
                options={[
                  ['ruler', 'المسطرة'],
                  ['micrometer', 'الميكرومتر'],
                  ['cylinder', 'المخبار المدرج'],
                ]}
              />
              <MeasurementEntry
                value={discValue}
                onValue={setDiscValue}
                unit={discUnit}
                onUnit={(value) => setDiscUnit(value as 'mm' | 'cm' | '')}
                units={['mm', 'cm']}
                label="قراءة السمك"
              />
              <label className="rafiq-l12-checkline">
                <input
                  type="checkbox"
                  checked={ratchetUsed}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setRatchetUsed(event.currentTarget.checked)
                  }
                />
                استخدمت السقاطة برفق بدل الضغط على الجسم بقوة.
              </label>
              <label>
                لماذا كانت هذه الأداة مناسبة؟
                <textarea
                  aria-label="سبب اختيار أداة قياس القرص"
                  value={discReason}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setDiscReason(event.currentTarget.value)
                  }
                />
              </label>
            </div>
          </>
        ) : null}

        {station === 2 ? (
          <>
            <ExperimentVisual kind="cards" />
            <div className="rafiq-l12-notebook">
              <h3>المحطة 3: قياس غير مباشر</h3>
              <p>
                اقرأ السمك الكلي للرزمة من المسطرة الرأسية، ثم استخدم 25 بطاقة متماثلة لاستخراج سمك
                بطاقة واحدة.
              </p>
              <div className="rafiq-l12-instrument-key">
                <ScientificText text="التدريج الجانبي بوحدة mm" />
              </div>
              <DecisionSelect
                label="طريقة القياس التي استخدمتها"
                value={stackMethod}
                onChange={setStackMethod}
                options={[
                  ['single-ruler', 'أقيس بطاقة واحدة مباشرة بالمسطرة'],
                  ['stack-divide', 'أقيس الرزمة كاملة ثم أقسم على 25'],
                  ['displacement', 'أستخدم الإزاحة في الماء'],
                ]}
              />
              <label>
                السمك الكلي للرزمة
                <div className="rafiq-l12-inline-measurement">
                  <input
                    aria-label="السمك الكلي لخمس وعشرين بطاقة بالمليمتر"
                    inputMode="decimal"
                    value={stackTotal}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setStackTotal(event.currentTarget.value)
                    }
                  />
                  <ScientificText text="mm" />
                </div>
              </label>
              <label>
                سمك بطاقة واحدة
                <div className="rafiq-l12-inline-measurement">
                  <input
                    aria-label="سمك بطاقة واحدة بالمليمتر"
                    inputMode="decimal"
                    value={stackSingle}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setStackSingle(event.currentTarget.value)
                    }
                  />
                  <ScientificText text="mm" />
                </div>
              </label>
              <label>
                لماذا اخترت هذه الطريقة؟
                <textarea
                  aria-label="سبب اختيار القياس غير المباشر"
                  value={stackReason}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setStackReason(event.currentTarget.value)
                  }
                />
              </label>
            </div>
          </>
        ) : null}

        {station === 3 ? (
          <>
            <ExperimentVisual kind="stone" />
            <div className="rafiq-l12-notebook">
              <h3>المحطة 4: حجم حجر مصقول غير منتظم</h3>
              <p>
                اقرأ أسفل المنيسكوس في المخبارين قبل الغمر وبعده، احسب حجم الماء المزاح، ثم عبّر عن
                حجم الحجر بوحدة cm³.
              </p>
              <div className="rafiq-l12-instrument-key is-conversion">
                <ScientificText text="1 mL = 1 cm³" />
              </div>
              <DecisionSelect
                label="طريقة قياس الحجم التي استخدمتها"
                value={stoneMethod}
                onChange={setStoneMethod}
                options={[
                  ['dimensions', 'أقيس الطول والعرض والارتفاع وأضربها'],
                  ['displacement', 'أستخدم إزاحة الماء في مخبار مدرج'],
                  ['micrometer', 'أقيس السمك بالميكرومتر فقط'],
                ]}
              />
              <label>
                القراءة قبل الغمر
                <div className="rafiq-l12-inline-measurement">
                  <input
                    aria-label="القراءة قبل الغمر بالمليلتر"
                    inputMode="decimal"
                    value={initialVolume}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setInitialVolume(event.currentTarget.value)
                    }
                  />
                  <ScientificText text="mL" />
                </div>
              </label>
              <label>
                القراءة بعد الغمر
                <div className="rafiq-l12-inline-measurement">
                  <input
                    aria-label="القراءة بعد الغمر بالمليلتر"
                    inputMode="decimal"
                    value={finalVolume}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setFinalVolume(event.currentTarget.value)
                    }
                  />
                  <ScientificText text="mL" />
                </div>
              </label>
              <label>
                حجم الماء المزاح من فرق القراءتين
                <div className="rafiq-l12-inline-measurement">
                  <input
                    aria-label="حجم الماء المزاح بالمليلتر"
                    inputMode="decimal"
                    value={stoneVolumeMl}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setStoneVolumeMl(event.currentTarget.value)
                    }
                  />
                  <ScientificText text="mL" />
                </div>
              </label>
              <label>
                حجم الحجر بعد التحويل
                <div className="rafiq-l12-inline-measurement">
                  <input
                    aria-label="حجم الحجر بالسنتيمتر المكعب"
                    inputMode="decimal"
                    value={stoneVolume}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      setStoneVolume(event.currentTarget.value)
                    }
                  />
                  <ScientificText text="cm³" />
                </div>
              </label>
              <label>
                لماذا كانت هذه الطريقة مناسبة لجسم غير منتظم؟
                <textarea
                  aria-label="سبب اختيار طريقة الإزاحة"
                  value={stoneReason}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setStoneReason(event.currentTarget.value)
                  }
                />
              </label>
            </div>
          </>
        ) : null}
      </div>

      {stationMessage ? (
        <div className="rafiq-l12-feedback is-review" role="status">
          <strong>السجل غير مكتمل بعد</strong>
          <span>{stationMessage}</span>
        </div>
      ) : null}

      {!allComplete ? (
        <button type="button" className="rafiq-l12-primary" onClick={validateCurrentStation}>
          اعتمد سجل هذه المحطة
        </button>
      ) : (
        <div className="rafiq-l12-feedback is-correct" role="status">
          <strong>دفتر المختبر مكتمل</strong>
          <span>
            نفذت قياسًا مباشرًا، واستخدمت الميكرومتر، وطبقت قياسًا غير مباشر، واستخرجت حجم جسم غير
            منتظم من الإزاحة.
          </span>
          <button type="button" onClick={onComplete}>
            إنهاء التجربة الموجهة
          </button>
        </div>
      )}

      <BackToActivities onBack={onBack} />
    </section>
  );
}

function DecisionSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <label>
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.currentTarget.value)}
      >
        <option value="">اختر</option>
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
    </label>
  );
}

function MeasurementEntry({
  value,
  onValue,
  unit,
  onUnit,
  units,
  label,
}: {
  value: string;
  onValue: (value: string) => void;
  unit: string;
  onUnit: (value: string) => void;
  units: readonly string[];
  label: string;
}) {
  return (
    <label>
      {label}
      <div className="rafiq-l12-inline-measurement">
        <input
          inputMode="decimal"
          value={value}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onValue(event.currentTarget.value)}
        />
        <div className="rafiq-l12-unit-options" role="group" aria-label={`${label} - الوحدة`}>
          {units.map((candidate) => (
            <button
              key={candidate}
              type="button"
              aria-pressed={unit === candidate}
              className={unit === candidate ? 'is-selected' : ''}
              onClick={() => onUnit(candidate)}
            >
              <ScientificText text={candidate} />
            </button>
          ))}
        </div>
      </div>
    </label>
  );
}

function ExperimentVisual({ kind }: { kind: 'direct' | 'disc' | 'cards' | 'stone' }) {
  if (kind === 'direct') {
    const rulerX = 78;
    const cmWidth = 46;
    const objectStart = rulerX + DIRECT_START_CM * cmWidth;
    const objectEnd = rulerX + DIRECT_END_CM * cmWidth;
    return (
      <div
        className="rafiq-l12-station-visual is-readable"
        role="img"
        aria-label="مسطرة مرقمة بالسنتيمتر والمليمتر وجسم مستقيم بين علامتي بداية ونهاية"
      >
        <svg viewBox="0 0 620 340">
          <rect
            x="54"
            y="198"
            width="512"
            height="88"
            rx="12"
            fill="#f1d99f"
            stroke="#8b7243"
            strokeWidth="3"
          />
          {Array.from({ length: 101 }, (_, index) => {
            const x = rulerX + index * (cmWidth / 10);
            const isCm = index % 10 === 0;
            const isHalf = index % 5 === 0;
            return (
              <line
                key={index}
                x1={x}
                y1="198"
                x2={x}
                y2={isCm ? 238 : isHalf ? 228 : 216}
                stroke="#574b38"
                strokeWidth={isCm ? 2.1 : 1.05}
              />
            );
          })}
          {Array.from({ length: 11 }, (_, index) => (
            <text
              key={index}
              x={rulerX + index * cmWidth - (index === 10 ? 10 : 4)}
              y="268"
              fontSize="18"
              fontWeight="700"
              fill="#4f4533"
            >
              {index}
            </text>
          ))}
          <text x="528" y="306" fontSize="16" fontWeight="800" fill="#4f4533">
            cm
          </text>
          <rect
            x={objectStart}
            y="104"
            width={objectEnd - objectStart}
            height="34"
            rx="17"
            fill="#6e9aa5"
            stroke="#3f6d76"
            strokeWidth="3"
          />
          <circle cx={objectStart} cy="121" r="6" fill="#274d54" />
          <circle cx={objectEnd} cy="121" r="6" fill="#274d54" />
          <line
            x1={objectStart}
            y1="139"
            x2={objectStart}
            y2="198"
            stroke="#2b6e65"
            strokeWidth="2.5"
            strokeDasharray="7 6"
          />
          <line
            x1={objectEnd}
            y1="139"
            x2={objectEnd}
            y2="198"
            stroke="#2b6e65"
            strokeWidth="2.5"
            strokeDasharray="7 6"
          />
          <text x={objectStart - 22} y="88" fontSize="15" fontWeight="800" fill="#2b625c">
            البداية
          </text>
          <text x={objectEnd - 20} y="88" fontSize="15" fontWeight="800" fill="#2b625c">
            النهاية
          </text>
        </svg>
      </div>
    );
  }

  if (kind === 'disc') {
    const fractionTicks = [20, 21, 22, 23, 24, 25, 26];
    return (
      <div
        className="rafiq-l12-station-visual is-readable"
        role="img"
        aria-label="ميكرومتر مكبر يوضح التدريج الرئيسي والتدريج الكسري وخط المرجع"
      >
        <svg viewBox="0 0 720 380">
          <defs>
            <linearGradient id="l12-micro-metal-readable" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#e8eeee" />
              <stop offset="0.5" stopColor="#b0bfc1" />
              <stop offset="1" stopColor="#809397" />
            </linearGradient>
          </defs>
          <path
            d="M50 292 C27 157 93 63 211 68 C246 69 273 82 296 108 L258 147 C240 128 219 119 191 119 C124 119 92 169 106 270"
            fill="none"
            stroke="#64797c"
            strokeWidth="40"
            strokeLinecap="round"
          />
          <rect x="220" y="166" width="34" height="62" rx="7" fill="#64797c" />
          <line
            x1="254"
            y1="197"
            x2="305"
            y2="197"
            stroke="#40575b"
            strokeWidth="12"
            strokeLinecap="round"
          />
          <ellipse
            cx="279"
            cy="197"
            rx="13"
            ry="43"
            fill="#c78648"
            stroke="#7b4b24"
            strokeWidth="4"
          />
          <line
            x1="305"
            y1="197"
            x2="350"
            y2="197"
            stroke="#40575b"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <rect
            x="347"
            y="155"
            width="142"
            height="84"
            rx="14"
            fill="url(#l12-micro-metal-readable)"
            stroke="#657a7d"
            strokeWidth="4"
          />
          <rect
            x="487"
            y="140"
            width="84"
            height="114"
            rx="20"
            fill="#91a5a8"
            stroke="#657a7d"
            strokeWidth="4"
          />
          <rect
            x="570"
            y="155"
            width="38"
            height="84"
            rx="14"
            fill="#71868a"
            stroke="#586d71"
            strokeWidth="3"
          />

          <rect
            x="326"
            y="24"
            width="342"
            height="105"
            rx="18"
            fill="#fbfdfc"
            stroke="#c9dbd7"
            strokeWidth="3"
          />
          <text x="346" y="50" fontSize="15" fontWeight="800" fill="#315b56">
            التدريج الرئيسي
          </text>
          <line x1="350" y1="91" x2="510" y2="91" stroke="#314b4e" strokeWidth="3" />
          {[0, 0.5, 1, 1.5].map((value, index) => {
            const x = 360 + index * 37;
            return (
              <g key={value}>
                <line
                  x1={x}
                  y1="69"
                  x2={x}
                  y2="112"
                  stroke="#314b4e"
                  strokeWidth={index % 2 === 0 ? 2.4 : 1.7}
                />
                <text x={x - 9} y="124" fontSize="13" fill="#314b4e">
                  {value}
                </text>
              </g>
            );
          })}
          <rect x="494" y="58" width="16" height="68" fill="#8fa2a6" opacity="0.9" />

          <rect
            x="520"
            y="24"
            width="148"
            height="304"
            rx="18"
            fill="#f5f8f8"
            stroke="#bfcfcb"
            strokeWidth="3"
          />
          <text x="538" y="50" fontSize="15" fontWeight="800" fill="#315b56">
            التدريج الكسري
          </text>
          {fractionTicks.map((value, index) => {
            const y = 83 + index * 34;
            return (
              <g key={value}>
                <line
                  x1="558"
                  y1={y}
                  x2={value === 23 ? 638 : 620}
                  y2={y}
                  stroke={value === 23 ? '#00695c' : '#455e61'}
                  strokeWidth={value === 23 ? 4 : 2}
                />
                <text
                  x="532"
                  y={y + 6}
                  fontSize="15"
                  fontWeight={value === 23 ? 900 : 600}
                  fill={value === 23 ? '#00695c' : '#455e61'}
                >
                  {value}
                </text>
              </g>
            );
          })}
          <line
            x1="520"
            y1={83 + 3 * 34}
            x2="668"
            y2={83 + 3 * 34}
            stroke="#d19b27"
            strokeWidth="3"
            strokeDasharray="7 6"
          />
          <text x="531" y="350" fontSize="14" fontWeight="800" fill="#7b6500">
            خط المرجع
          </text>
        </svg>
      </div>
    );
  }

  if (kind === 'cards') {
    const rulerX = 430;
    const bottomY = 274;
    const pxPerMm = 10;
    return (
      <div
        className="rafiq-l12-station-visual is-readable"
        role="img"
        aria-label="رزمة من 25 بطاقة ملاصقة لمسطرة رأسية مدرجة بالمليمتر حتى 20 mm"
      >
        <svg viewBox="0 0 620 340">
          <rect
            x="90"
            y={bottomY - STACK_TOTAL_MM * pxPerMm}
            width="278"
            height={STACK_TOTAL_MM * pxPerMm}
            rx="10"
            fill="#d4e8e4"
            stroke="#6f9a91"
            strokeWidth="3"
          />
          {Array.from({ length: 25 }, (_, index) => {
            const y = bottomY - (index + 1) * ((STACK_TOTAL_MM * pxPerMm) / 25);
            return (
              <line
                key={index}
                x1="90"
                y1={y}
                x2="368"
                y2={y}
                stroke={index % 5 === 4 ? '#6f9a91' : '#a4c5be'}
                strokeWidth={index % 5 === 4 ? 1.8 : 1}
              />
            );
          })}
          <text x="165" y="308" fontSize="24" fontWeight="800" fill="#315d57">
            25 بطاقة متماثلة
          </text>
          <line x1={rulerX} y1="64" x2={rulerX} y2={bottomY} stroke="#65583e" strokeWidth="5" />
          {Array.from({ length: 21 }, (_, index) => {
            const y = bottomY - index * pxPerMm;
            const major = index % 5 === 0;
            return (
              <g key={index}>
                <line
                  x1={rulerX}
                  y1={y}
                  x2={rulerX + (major ? 48 : 28)}
                  y2={y}
                  stroke="#65583e"
                  strokeWidth={major ? 2.4 : 1.2}
                />
                {major ? (
                  <text x={rulerX + 58} y={y + 6} fontSize="16" fontWeight="700" fill="#514632">
                    {index}
                  </text>
                ) : null}
              </g>
            );
          })}
          <text x={rulerX + 60} y="50" fontSize="15" fontWeight="800" fill="#514632">
            mm
          </text>
          <line
            x1="74"
            y1={bottomY - STACK_TOTAL_MM * pxPerMm}
            x2={rulerX - 8}
            y2={bottomY - STACK_TOTAL_MM * pxPerMm}
            stroke="#2d7469"
            strokeWidth="2.5"
            strokeDasharray="7 6"
          />
          <line
            x1="74"
            y1={bottomY}
            x2={rulerX - 8}
            y2={bottomY}
            stroke="#2d7469"
            strokeWidth="2.5"
            strokeDasharray="7 6"
          />
        </svg>
      </div>
    );
  }

  const cylinder = (x: number, label: string, level: number, withStone: boolean) => {
    const topY = 54;
    const bottomY = 286;
    const yFor = (volume: number) => bottomY - ((volume - 25) / 25) * (bottomY - topY);
    const meniscusY = yFor(level);
    return (
      <g>
        <text x={x + 70} y="32" textAnchor="middle" fontSize="18" fontWeight="800" fill="#315b56">
          {label}
        </text>
        <rect
          x={x}
          y={topY}
          width="112"
          height={bottomY - topY}
          rx="18"
          fill="#f9fdff"
          stroke="#68818a"
          strokeWidth="4"
        />
        <path
          d={`M${x + 14} ${meniscusY - 12} Q${x + 56} ${meniscusY + 12} ${x + 98} ${meniscusY - 12} L${x + 98} ${bottomY - 16} L${x + 14} ${bottomY - 16} Z`}
          fill="#82cde0"
          opacity="0.82"
        />
        <path
          d={`M${x + 14} ${meniscusY - 12} Q${x + 56} ${meniscusY + 12} ${x + 98} ${meniscusY - 12}`}
          fill="none"
          stroke="#1e88a8"
          strokeWidth="3"
        />
        {Array.from({ length: 26 }, (_, index) => {
          const volume = 25 + index;
          const y = yFor(volume);
          const major = volume % 5 === 0;
          return (
            <g key={volume}>
              <line
                x1={x + 112}
                y1={y}
                x2={x + 112 + (major ? 38 : 22)}
                y2={y}
                stroke="#526d72"
                strokeWidth={major ? 2.2 : 1.1}
              />
              {major ? (
                <text x={x + 158} y={y + 5} fontSize="14" fontWeight="700" fill="#526d72">
                  {volume}
                </text>
              ) : null}
            </g>
          );
        })}
        {withStone ? (
          <ellipse
            cx={x + 56}
            cy={bottomY - 48}
            rx="28"
            ry="38"
            fill="#8a7d6c"
            stroke="#5e554a"
            strokeWidth="4"
          />
        ) : null}
      </g>
    );
  };

  return (
    <div
      className="rafiq-l12-station-visual is-readable"
      role="img"
      aria-label="مخباران مدرجان واضحان: قبل الغمر وبعد الغمر مع سطح ماء مقعر وقراءات بوحدة mL"
    >
      <svg viewBox="0 0 720 360">
        {cylinder(92, 'قبل الغمر', STONE_INITIAL_ML, false)}
        {cylinder(420, 'بعد الغمر', STONE_FINAL_ML, true)}
        <text x="360" y="338" textAnchor="middle" fontSize="16" fontWeight="800" fill="#315b56">
          اقرأ من أسفل السطح المقعر للماء
        </text>
      </svg>
    </div>
  );
}

export function Grade9LengthVolumeActivities({
  onBackToLesson,
}: Grade9LengthVolumeActivitiesProps) {
  const [mode, setMode] = useState<ActivityMode>('menu');
  const [completed, setCompleted] = useState<Set<Grade9Lesson12ActivityCategoryId>>(
    () => new Set()
  );

  function finish(id: Grade9Lesson12ActivityCategoryId) {
    setCompleted((current) => new Set([...current, id]));
    setMode('menu');
  }

  if (mode === 'inquiry') {
    return <InquiryActivity onComplete={() => finish('inquiry')} onBack={() => setMode('menu')} />;
  }
  if (mode === 'simulation') {
    return (
      <SimulationActivity onComplete={() => finish('simulation')} onBack={() => setMode('menu')} />
    );
  }
  if (mode === 'data') {
    return <DataActivity onComplete={() => finish('data')} onBack={() => setMode('menu')} />;
  }
  if (mode === 'experiment') {
    return (
      <GuidedExperiment onComplete={() => finish('experiment')} onBack={() => setMode('menu')} />
    );
  }

  return (
    <section className="rafiq-l12-activities">
      <div className="rafiq-l12-progress-pill" aria-label={`أكملت ${completed.size} من 4`}>
        <span>أنشطة متاحة أنجزت</span>
        <strong>
          <ScientificText text={`${completed.size}/4`} />
        </strong>
      </div>
      <header className="rafiq-l12-activities-hero">
        <div>
          <p>الأنشطة العلمية • 1-2 قياس الطول والحجم</p>
          <h2>استخدم القياس كعالم، لا كحافظٍ للأداة</h2>
          <span>
            أربع فئات ثابتة، وكل فئة تطلب من عقلك عملًا مختلفًا: استقصاء، محاكاة، تحليل بيانات،
            وتجربة موجهة.
          </span>
        </div>
      </header>

      <div className="rafiq-l12-activity-grid" aria-label="فئات الأنشطة العلمية الأربع">
        {grade9Lesson12ActivityCategories.map((category) => (
          <MenuCard
            key={category.id}
            {...category}
            complete={completed.has(category.id)}
            onOpen={(id) => setMode(id)}
          />
        ))}
      </div>

      {completed.size === 4 ? (
        <div className="rafiq-l12-all-complete" role="status">
          <strong>أنجزت الأنشطة العلمية الأربعة</strong>
          <span>
            فسّرت اختلاف القياسات، تحكمت في متغير محاكاة، حللت اتساق بيانات، ثم وثّقت قياسات عملية
            في دفتر مختبر.
          </span>
        </div>
      ) : null}

      <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
    </section>
  );
}
