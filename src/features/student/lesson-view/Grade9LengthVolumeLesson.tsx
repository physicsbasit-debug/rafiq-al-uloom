import { useState, type CSSProperties, type ReactNode } from 'react';
import { ScientificText } from '@design-system/components/ScientificText';
import type { Objective } from '@shared-types/content.types';
import { LessonActionGrid } from './LessonActionGrid';
import './Grade9LengthVolumeLesson.css';

interface Grade9LengthVolumeLessonProps {
  readonly objectives: Objective[];
  readonly onBackToLessons: () => void;
  readonly onOpenReviewQuestions: () => void;
  readonly onOpenActivities: () => void;
  readonly onOpenMatchingGame: () => void;
  readonly onOpenVirtualLabs: () => void;
  readonly onOpenMasteryTest: () => void;
}

type RulerFix = 'straight' | 'zero' | 'sight';
type EyeLevel = 'above' | 'level' | 'below';
type CylinderChoice = '10' | '100' | '1000' | null;
type ToolChoice = 'ruler' | 'micrometer' | 'cylinder' | null;

const RULER_FIXES: Array<{ id: RulerFix; label: string }> = [
  { id: 'straight', label: 'استقامة الجسم' },
  { id: 'zero', label: 'بداية القياس' },
  { id: 'sight', label: 'موضع القراءة' },
];

function SectionHeader({
  number,
  eyebrow,
  title,
  copy,
}: {
  readonly number: string;
  readonly eyebrow: string;
  readonly title: string;
  readonly copy: string;
}) {
  return (
    <header className="rafiq-measurement-section-header">
      <span className="rafiq-measurement-step">{number}</span>
      <div>
        <p>{eyebrow}</p>
        <h3>{title}</h3>
        <span>{copy}</span>
      </div>
    </header>
  );
}

function RulerDiagram({ fixes }: { readonly fixes: ReadonlySet<RulerFix> }) {
  const isStraight = fixes.has('straight');
  const atZero = fixes.has('zero');
  const sight = fixes.has('sight');
  const wireX = atZero ? 76 : 128;
  const wireY2 = isStraight ? 76 : 52;
  return (
    <svg
      viewBox="0 0 720 220"
      role="img"
      aria-label="سلك فوق مسطرة لتوضيح شروط القياس الجيد"
      className="rafiq-measurement-svg"
    >
      <defs>
        <linearGradient id="ruler-body" x1="0" x2="1">
          <stop offset="0" stopColor="#f8d978" />
          <stop offset="1" stopColor="#e8bd45" />
        </linearGradient>
      </defs>
      <rect
        x="64"
        y="108"
        width="592"
        height="70"
        rx="14"
        fill="url(#ruler-body)"
        stroke="#7b6329"
        strokeWidth="3"
      />
      {Array.from({ length: 31 }, (_, index) => {
        const x = 76 + index * 18.8;
        const major = index % 5 === 0;
        return (
          <line
            key={index}
            x1={x}
            y1="108"
            x2={x}
            y2={major ? 142 : 130}
            stroke="#293b3b"
            strokeWidth={major ? 2.6 : 1.3}
          />
        );
      })}
      {[0, 1, 2, 3, 4, 5, 6].map((label, index) => (
        <text
          key={label}
          x={76 + index * 94}
          y="164"
          textAnchor="middle"
          fontSize="18"
          fill="#243536"
        >
          {label}
        </text>
      ))}
      <text x="632" y="164" fontSize="17" fill="#243536">
        cm
      </text>
      <line
        x1={wireX}
        y1="72"
        x2="548"
        y2={wireY2}
        stroke="#9b5728"
        strokeWidth="16"
        strokeLinecap="round"
      />
      <circle cx={wireX} cy="72" r="8" fill="#c47945" />
      <circle cx="548" cy={wireY2} r="8" fill="#c47945" />
      {sight ? (
        <line
          x1="548"
          y1="36"
          x2="548"
          y2="186"
          stroke="#c64848"
          strokeWidth="3"
          strokeDasharray="8 6"
        />
      ) : null}
      <g transform="translate(48 18)">
        <rect width="190" height="36" rx="18" fill="#0c4f49" opacity="0.96" />
        <text x="95" y="24" textAnchor="middle" fontSize="15" fill="white">
          صحّح طريقة القياس
        </text>
      </g>
    </svg>
  );
}

function MicrometerDiagram({ step }: { readonly step: number }) {
  const highlightMain = step >= 3;
  const highlightFraction = step >= 4;

  return (
    <div className="rafiq-micrometer-visual">
      <svg
        viewBox="0 0 760 330"
        role="img"
        aria-label="ميكرومتر خارجي يوضح موضع الجسم والتدريج الرئيسي والتدريج الكسري"
        className="rafiq-measurement-svg is-micrometer"
      >
        <defs>
          <linearGradient id="metal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f4f7f8" />
            <stop offset="0.45" stopColor="#aebbc0" />
            <stop offset="1" stopColor="#eef3f4" />
          </linearGradient>
        </defs>
        <path
          d="M158 75 C75 95, 62 245, 156 273 L205 273 L205 228 L164 228 C121 213, 123 132, 166 118 L205 118 L205 75 Z"
          fill="#225c5b"
          stroke="#153f40"
          strokeWidth="5"
        />
        <rect
          x="202"
          y="119"
          width="62"
          height="109"
          rx="7"
          fill="url(#metal)"
          stroke="#42575b"
          strokeWidth="4"
        />
        <rect
          x="248"
          y="142"
          width="126"
          height="64"
          rx="8"
          fill="#fbfdfd"
          stroke="#52676a"
          strokeWidth="4"
        />
        <line x1="264" y1="176" x2="366" y2="176" stroke="#1f3436" strokeWidth="4" />
        {Array.from({ length: 7 }, (_, index) => {
          const x = 273 + index * 14;
          const upper = index % 2 === 0;
          return (
            <line
              key={`main-${index}`}
              x1={x}
              y1={upper ? 151 : 176}
              x2={x}
              y2={upper ? 176 : 194}
              stroke={highlightMain ? '#b8780e' : '#263d3f'}
              strokeWidth={upper ? 4 : 3}
              strokeLinecap="round"
            />
          );
        })}
        <rect
          x="374"
          y="126"
          width="184"
          height="101"
          rx="12"
          fill="#f9fbfb"
          stroke="#52686b"
          strokeWidth="4"
        />
        <line x1="387" y1="176" x2="544" y2="176" stroke="#1f3436" strokeWidth="4" />
        {Array.from({ length: 13 }, (_, index) => {
          const x = 392 + index * 12;
          const major = index % 3 === 0;
          return (
            <line
              key={`fraction-${index}`}
              x1={x}
              y1="138"
              x2={x}
              y2={major ? 169 : 158}
              stroke={highlightFraction ? '#08796c' : '#425d5f'}
              strokeWidth={major ? 3.5 : 2.5}
              strokeLinecap="round"
            />
          );
        })}
        <rect
          x="558"
          y="139"
          width="82"
          height="70"
          rx="15"
          fill="#bbc7c9"
          stroke="#4f6366"
          strokeWidth="4"
        />
        <line
          x1="640"
          y1="174"
          x2="684"
          y2="174"
          stroke="#3a4f52"
          strokeWidth="11"
          strokeLinecap="round"
        />
        <line
          x1="205"
          y1="174"
          x2="245"
          y2="174"
          stroke="#34484b"
          strokeWidth="10"
          strokeLinecap="round"
        />
        {step >= 1 ? (
          <line
            x1="222"
            y1="128"
            x2="222"
            y2="219"
            stroke="#b36b35"
            strokeWidth="12"
            strokeLinecap="round"
          />
        ) : null}
        <text x="106" y="310" fontSize="15" fill="#456260">
          فكا الأداة
        </text>
        <text x="572" y="270" fontSize="15" fill="#456260">
          أسطوانة القياس
        </text>
      </svg>

      <div className="rafiq-micrometer-scale-readouts">
        <section
          className={
            highlightMain
              ? 'rafiq-micrometer-scale-panel is-highlighted'
              : 'rafiq-micrometer-scale-panel'
          }
          role="group"
          aria-label="تكبير التدريج الرئيسي للميكرومتر"
        >
          <header>
            <span>1</span>
            <div>
              <small>التدريج الرئيسي</small>
              <strong>اقرأ آخر علامة ظاهرة قبل حافة الأسطوانة</strong>
            </div>
          </header>
          <div className="rafiq-micrometer-main-scale" aria-hidden="true">
            <span className="datum-line" />
            {[0, 0.5, 1, 1.5, 2, 2.5, 3].map((value, index) => (
              <i
                key={value}
                className={value === 2.5 ? 'is-reading' : ''}
                style={{ '--scale-x': `${8 + index * 14}%` } as CSSProperties}
              />
            ))}
            <span className="thimble-edge" />
          </div>
          <div className="rafiq-micrometer-scale-labels">
            <ScientificText text="0 mm" />
            <ScientificText text="1 mm" />
            <ScientificText text="2 mm" />
            <ScientificText text="2.5 mm" />
          </div>
          {highlightMain ? (
            <p>
              آخر علامة مرئية قبل الحافة هي <ScientificText text="2.5 mm" />.
            </p>
          ) : (
            <p>افتح خطوة «اقرأ الرئيسي» لتثبيت القراءة.</p>
          )}
        </section>

        <section
          className={
            highlightFraction
              ? 'rafiq-micrometer-scale-panel is-highlighted'
              : 'rafiq-micrometer-scale-panel'
          }
          role="group"
          aria-label="تكبير التدريج الكسري للميكرومتر"
        >
          <header>
            <span>2</span>
            <div>
              <small>التدريج الكسري</small>
              <strong>ابحث عن الخط الذي يطابق خط المرجع</strong>
            </div>
          </header>
          <div className="rafiq-micrometer-fraction-scale" aria-hidden="true">
            <span className="fraction-datum" />
            {[15, 16, 17, 18, 19].map((value, index) => (
              <i
                key={value}
                data-value={value}
                className={value === 17 ? 'is-reading' : ''}
                style={{ '--fraction-y': `${12 + index * 19}%` } as CSSProperties}
              />
            ))}
          </div>
          <div className="rafiq-micrometer-division-note">
            <span>كل تقسيم =</span>
            <ScientificText text="0.01 mm" />
          </div>
          {highlightFraction ? (
            <p>
              الخط الموافق هو 17، لذلك القراءة الكسرية <ScientificText text="0.17 mm" />.
            </p>
          ) : (
            <p>افتح خطوة «اقرأ الكسري» لتثبيت القراءة.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function RectangularPrismDiagram() {
  return (
    <div
      className="rafiq-prism-diagram"
      role="img"
      aria-label="متوازي مستطيلات ثلاثي الأوجه مع أبعاد الطول والعرض والارتفاع"
    >
      <svg viewBox="0 0 280 210" role="img" aria-hidden="true">
        <defs>
          <marker
            id="prism-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="4"
            refY="4"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="#6b7e7f" />
          </marker>
        </defs>
        <polygon
          points="48,70 174,70 174,154 48,154"
          fill="#6cb7bc"
          stroke="#275e61"
          strokeWidth="3"
        />
        <polygon
          points="48,70 92,35 218,35 174,70"
          fill="#9fd4d5"
          stroke="#275e61"
          strokeWidth="3"
        />
        <polygon
          points="174,70 218,35 218,119 174,154"
          fill="#438c91"
          stroke="#275e61"
          strokeWidth="3"
        />
        <line
          x1="48"
          y1="174"
          x2="174"
          y2="174"
          stroke="#6b7e7f"
          strokeWidth="2.5"
          markerStart="url(#prism-arrow)"
          markerEnd="url(#prism-arrow)"
        />
        <line
          x1="28"
          y1="70"
          x2="28"
          y2="154"
          stroke="#6b7e7f"
          strokeWidth="2.5"
          markerStart="url(#prism-arrow)"
          markerEnd="url(#prism-arrow)"
        />
        <line
          x1="185"
          y1="62"
          x2="229"
          y2="27"
          stroke="#6b7e7f"
          strokeWidth="2.5"
          markerStart="url(#prism-arrow)"
          markerEnd="url(#prism-arrow)"
        />
      </svg>
      <span className="rafiq-prism-dimension is-length">
        <ScientificText text="4 cm" />
      </span>
      <span className="rafiq-prism-dimension is-height">
        <ScientificText text="2 cm" />
      </span>
      <span className="rafiq-prism-dimension is-depth">
        <ScientificText text="3 cm" />
      </span>
    </div>
  );
}

function CylinderChoiceVisual({ value }: { readonly value: Exclude<CylinderChoice, null> }) {
  const ticks = value === '10' ? 18 : value === '100' ? 9 : 5;
  return (
    <svg
      viewBox="0 0 90 150"
      role="img"
      aria-label={`تدريج مخبار ${value} mL`}
      className="rafiq-cylinder-choice-visual"
    >
      <path
        d="M24 12 H66 L61 134 Q45 143 29 134 Z"
        fill="#f9fcfc"
        stroke="#637c7e"
        strokeWidth="3"
      />
      {Array.from({ length: ticks }, (_, index) => {
        const y = 24 + (index / Math.max(ticks - 1, 1)) * 96;
        const major = index === 0 || index === ticks - 1 || index % 3 === 0;
        return (
          <line
            key={index}
            x1={major ? 45 : 51}
            y1={y}
            x2="64"
            y2={y}
            stroke="#405e60"
            strokeWidth={major ? 2.4 : 1.7}
            strokeLinecap="round"
          />
        );
      })}
      <line
        x1="45"
        y1="24"
        x2="45"
        y2="120"
        stroke="#c7d6d5"
        strokeWidth="1"
        strokeDasharray="3 4"
      />
    </svg>
  );
}

function Cylinder({
  fill = 0.56,
  rock = false,
  label,
}: {
  readonly fill?: number;
  readonly rock?: boolean;
  readonly label: ReactNode;
}) {
  const y = 248 - fill * 156;
  return (
    <div className="rafiq-cylinder-figure">
      <svg viewBox="0 0 180 280" role="img" aria-label="مخبار مدرج" className="rafiq-cylinder-svg">
        <path
          d="M48 28 H132 L123 258 Q90 276 57 258 Z"
          fill="#f6fbfb"
          stroke="#5e777a"
          strokeWidth="4"
        />
        {Array.from({ length: 9 }, (_, index) => {
          const tickY = 58 + index * 20;
          return (
            <line
              key={index}
              x1="101"
              y1={tickY}
              x2={index % 2 === 0 ? 132 : 122}
              y2={tickY}
              stroke="#647b7d"
              strokeWidth="2"
            />
          );
        })}
        <path
          d={`M54 ${y} Q90 ${y + 9} 126 ${y} L123 258 Q90 274 57 258 Z`}
          fill="#8fd1df"
          opacity="0.88"
        />
        <path d={`M54 ${y} Q90 ${y + 9} 126 ${y}`} fill="none" stroke="#267e8e" strokeWidth="3" />
        {rock ? (
          <path
            d="M69 212 L83 176 L113 183 L124 222 L104 246 L77 240 Z"
            fill="#7f786d"
            stroke="#5f5951"
            strokeWidth="3"
          />
        ) : null}
      </svg>
      <span className="rafiq-cylinder-caption">{label}</span>
    </div>
  );
}

function CylinderScaleZoom({ choice }: { readonly choice: Exclude<CylinderChoice, null> }) {
  const config = {
    '10': {
      rangeLabel: 'مدى صغير',
      ticks: 18,
      targetPosition: 60,
      observation:
        'تشغل الكمية المطلوبة جزءًا واضحًا من مدى الأداة، فتظهر حولها علامات قراءة أكثر للمقارنة.',
    },
    '100': {
      rangeLabel: 'مدى متوسط',
      ticks: 9,
      targetPosition: 6,
      observation:
        'تشغل الكمية المطلوبة جزءًا صغيرًا من مدى الأداة، فتقل التفاصيل البصرية حول موضع القراءة.',
    },
    '1000': {
      rangeLabel: 'مدى واسع',
      ticks: 5,
      targetPosition: 0.6,
      observation:
        'تكاد الكمية المطلوبة تقع عند بداية المدى، لذلك تصبح مقارنة العلامات حولها أصعب بصريًا.',
    },
  }[choice];

  return (
    <div className="rafiq-cylinder-zoom" aria-live="polite">
      <div
        className="rafiq-cylinder-zoom-visual"
        aria-label={`تكبير بصري لتدرج مخبار ${choice} mL`}
      >
        <div className="rafiq-cylinder-zoom-scale" aria-hidden="true">
          {Array.from({ length: config.ticks }, (_, index) => (
            <i key={index} style={{ top: `${(index / Math.max(config.ticks - 1, 1)) * 100}%` }} />
          ))}
          <span
            className="rafiq-cylinder-target-line"
            style={{ '--target-position': `${config.targetPosition}%` } as CSSProperties}
          />
        </div>
        <span className="rafiq-cylinder-zoom-label">
          <ScientificText text="6 mL" />
        </span>
      </div>
      <div className="rafiq-cylinder-zoom-copy">
        <small>تكبير بصري للمقارنة</small>
        <strong>{config.rangeLabel}</strong>
        <p>{config.observation}</p>
        <span>
          جرّب مخبارًا آخر وقارن موضع <ScientificText text="6 mL" /> وكثافة العلامات قبل أن تعتمد
          قرارك.
        </span>
      </div>
    </div>
  );
}

export function Grade9LengthVolumeLesson({
  objectives,
  onBackToLessons,
  onOpenReviewQuestions,
  onOpenActivities,
  onOpenMatchingGame,
  onOpenVirtualLabs,
  onOpenMasteryTest,
}: Grade9LengthVolumeLessonProps) {
  const [rulerFixes, setRulerFixes] = useState<ReadonlySet<RulerFix>>(new Set());
  const [paperStage, setPaperStage] = useState(0);
  const [micrometerStep, setMicrometerStep] = useState(0);
  const [eyeLevel, setEyeLevel] = useState<EyeLevel>('above');
  const [isDisplaced, setIsDisplaced] = useState(false);
  const [cylinderChoice, setCylinderChoice] = useState<CylinderChoice>(null);
  const [toolChoice, setToolChoice] = useState<ToolChoice>(null);

  const paperCount = [1, 10, 100, 500][paperStage];
  const rulerComplete = rulerFixes.size === RULER_FIXES.length;
  function toggleRulerFix(id: RulerFix) {
    setRulerFixes((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <article className="rafiq-measurement-lesson">
      <header className="rafiq-measurement-hero">
        <div className="rafiq-measurement-hero-copy">
          <p>الفيزياء • الصف التاسع • الوحدة الأولى</p>
          <h2>1-2 قياس الطول والحجم</h2>
          <span>كيف تختار الأداة والطريقة التي تعطيك قياسًا تستطيع الوثوق به؟</span>
          <div className="rafiq-measurement-hero-question">
            هل تستطيع قياس كل شيء بالطريقة نفسها؟
          </div>
        </div>
        <div className="rafiq-measurement-workbench" aria-label="منضدة القياس الذكية">
          <article>
            <span className="is-ruler">📏</span>
            <b>سلك مستقيم</b>
            <small>طول واضح على تدريج</small>
          </article>
          <article>
            <span className="is-paper">▤</span>
            <b>ورقة رقيقة</b>
            <small>بعد أصغر من قراءة مباشرة</small>
          </article>
          <article>
            <span className="is-micro">◉</span>
            <b>سلك رفيع جدًا</b>
            <small>يحتاج أداة أنسب للأبعاد الصغيرة</small>
          </article>
          <article>
            <span className="is-rock">◆</span>
            <b>جسم غير منتظم</b>
            <small>لا يملك أبعادًا هندسية بسيطة</small>
          </article>
        </div>
      </header>

      <section
        className="rafiq-measurement-objectives"
        aria-labelledby="g9-length-volume-objectives"
      >
        <div>
          <p>ماذا ستتعلم؟</p>
          <h3 id="g9-length-volume-objectives">الأهداف التعليمية</h3>
        </div>
        <ol>
          {objectives.map((objective) => (
            <li key={objective.id}>{objective.text}</li>
          ))}
        </ol>
      </section>

      <section className="rafiq-measurement-card">
        <SectionHeader
          number="1"
          eyebrow="ابدأ بالطريقة"
          title="المسطرة ليست المشكلة دائمًا"
          copy="صحّح وضع السلك قبل أن تثق في الرقم الذي تقرؤه."
        />
        <div className="rafiq-measurement-split">
          <RulerDiagram fixes={rulerFixes} />
          <div className="rafiq-measurement-controls">
            <p>اضغط على كل عنصر لتصحح طريقة القياس:</p>
            <div className="rafiq-measurement-chip-grid">
              {RULER_FIXES.map((fix) => (
                <button
                  key={fix.id}
                  type="button"
                  className={rulerFixes.has(fix.id) ? 'is-active' : ''}
                  onClick={() => toggleRulerFix(fix.id)}
                >
                  {fix.label}
                </button>
              ))}
            </div>
            <div
              className={
                rulerComplete ? 'rafiq-measurement-insight is-success' : 'rafiq-measurement-insight'
              }
            >
              {rulerComplete
                ? 'الآن أصبحت الأداة والطريقة تعملان معًا.'
                : 'الأداة الجيدة لا تعوّض طريقة استخدام سيئة.'}
            </div>
          </div>
        </div>
      </section>

      <section className="rafiq-measurement-card is-warm">
        <SectionHeader
          number="2"
          eyebrow="قس ما لا يبدو قابلًا للقياس"
          title="ماذا لو كان الجسم أصغر من أن تقيسه مباشرة؟"
          copy="كبّر البعد الذي تريد قياسه بطريقة علمية، ثم ارجع إلى قيمة الواحد."
        />
        <div className="rafiq-paper-lab">
          <div
            className="rafiq-paper-stack"
            style={{ '--paper-count': Math.min(paperStage + 1, 4) } as CSSProperties}
          >
            {Array.from({ length: Math.min(paperStage + 1, 4) }, (_, index) => (
              <span
                key={index}
                style={{ transform: `translate(${index * 7}px, ${index * -7}px)` }}
              />
            ))}
            <strong>{paperCount === 1 ? 'ورقة واحدة' : `${paperCount} ورقة`}</strong>
          </div>
          <div className="rafiq-paper-controls">
            <button
              type="button"
              onClick={() => setPaperStage((stage) => Math.min(stage + 1, 3))}
              disabled={paperStage === 3}
            >
              كبّر العينة
            </button>
            <div className="rafiq-equation-box">
              <ScientificText
                text={
                  paperStage === 3
                    ? 'سمك 500 ورقة = 45 mm'
                    : 'نحتاج إلى مجموعة أكبر قبل أن تصبح القراءة واضحة.'
                }
              />
              {paperStage === 3 ? <ScientificText text="45 mm ÷ 500 = 0.09 mm" /> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="rafiq-measurement-card is-deep">
        <SectionHeader
          number="3"
          eyebrow="أداة للأبعاد الصغيرة جدًا"
          title="الميكرومتر: عندما تصبح المسطرة كبيرة جدًا"
          copy="تعلم القراءة على مرحلتين ثم اجمعهما للحصول على القياس النهائي."
        />
        <MicrometerDiagram step={micrometerStep} />
        <div className="rafiq-micrometer-steps" aria-label="خطوات قراءة الميكرومتر">
          {['ضع السلك', 'أغلق برفق', 'اقرأ الرئيسي', 'اقرأ الكسري', 'اجمع القراءتين'].map(
            (label, index) => (
              <button
                key={label}
                type="button"
                className={
                  micrometerStep === index + 1
                    ? 'is-active'
                    : micrometerStep > index + 1
                      ? 'is-done'
                      : ''
                }
                disabled={index > micrometerStep}
                onClick={() => setMicrometerStep((step) => Math.max(step, index + 1))}
              >
                <span>{index + 1}</span>
                {label}
              </button>
            )
          )}
        </div>
        <div className="rafiq-measurement-result">
          {micrometerStep >= 3 ? (
            <ScientificText text="التدريج الرئيسي = 2.5 mm" />
          ) : (
            <span>ابدأ بوضع الجسم وإغلاق الفكين برفق.</span>
          )}
          {micrometerStep >= 4 ? <ScientificText text="التدريج الكسري = 0.17 mm" /> : null}
          {micrometerStep >= 5 ? (
            <strong>
              <ScientificText text="2.5 mm + 0.17 mm = 2.67 mm" />
            </strong>
          ) : null}
        </div>
      </section>

      <section className="rafiq-measurement-card">
        <SectionHeader
          number="4"
          eyebrow="غيّر طريقة التفكير مع شكل الجسم"
          title="الحجم ليس نوعًا واحدًا من المشكلات"
          copy="الجسم المنتظم والسائل والجسم غير المنتظم يحتاج كل منها إلى طريقته المناسبة."
        />
        <div className="rafiq-volume-types">
          <article>
            <RectangularPrismDiagram />
            <h4>جسم منتظم</h4>
            <p>قس الأبعاد واستخدم العلاقة الهندسية.</p>
            <strong>حجم متوازي المستطيلات = الطول × العرض × الارتفاع</strong>
            <ScientificText text="4 cm × 3 cm × 2 cm = 24 cm³" />
          </article>
          <article>
            <Cylinder label="سائل" fill={0.5} />
            <h4>سائل</h4>
            <p>اقرأ الحجم مباشرة في مخبار مدرج مناسب.</p>
          </article>
          <article>
            <div className="rafiq-rock-art" aria-hidden="true" />
            <h4>جسم غير منتظم</h4>
            <p>لا تكفي أبعاده الخارجية وحدها. نحتاج إلى الإزاحة.</p>
          </article>
        </div>
      </section>

      <section className="rafiq-measurement-card is-aqua">
        <SectionHeader
          number="5"
          eyebrow="اقرأ الماء بعينك"
          title="السطح المقعر وخط النظر"
          copy="حرّك مستوى العين ولاحظ لماذا تتغير القراءة الظاهرية."
        />
        <div className="rafiq-meniscus-lab">
          <div className="rafiq-meniscus-cylinder">
            <div className="rafiq-meniscus-water" />
            <span className={`rafiq-eye-line is-${eyeLevel}`} />
            <span className="rafiq-meniscus-reading">
              <ScientificText text="50 mL" />
            </span>
          </div>
          <div className="rafiq-eye-options">
            {(['above', 'level', 'below'] as const).map((level) => {
              const label =
                level === 'above'
                  ? 'أعلى من المستوى'
                  : level === 'level'
                    ? 'بمستوى أفقي'
                    : 'أسفل من المستوى';
              return (
                <button
                  key={level}
                  type="button"
                  className={eyeLevel === level ? 'is-active' : ''}
                  onClick={() => setEyeLevel(level)}
                >
                  <span aria-hidden="true">◉</span>
                  {label}
                </button>
              );
            })}
          </div>
          <div
            className={
              eyeLevel === 'level'
                ? 'rafiq-measurement-insight is-success'
                : 'rafiq-measurement-insight'
            }
          >
            {eyeLevel === 'level'
              ? 'القراءة الصحيحة للماء تؤخذ عند أسفل السطح المقعر وبمستوى نظر أفقي.'
              : 'هذه الزاوية تغيّر القراءة الظاهرية. حرّك عينك إلى مستوى السائل.'}
          </div>
        </div>
      </section>

      <section className="rafiq-measurement-card">
        <SectionHeader
          number="6"
          eyebrow="اجعل الماء يخبرك بالحجم"
          title="الحجم الذي لا تستطيع حسابه من الأبعاد"
          copy="قارن مستوى الماء قبل الغمر وبعده لتجد حجم الجسم غير المنتظم."
        />
        <div className="rafiq-displacement-lab">
          <div>
            <Cylinder label={<ScientificText text="قبل الغمر: 42 mL" />} fill={0.42} />
          </div>
          <button type="button" onClick={() => setIsDisplaced(true)} disabled={isDisplaced}>
            {isDisplaced ? 'تم الغمر' : 'اغمر الجسم'}
          </button>
          <div>
            <Cylinder
              label={isDisplaced ? <ScientificText text="بعد الغمر: 57 mL" /> : 'بعد الغمر'}
              fill={isDisplaced ? 0.57 : 0.42}
              rock={isDisplaced}
            />
          </div>
          <div className="rafiq-equation-box is-large">
            {isDisplaced ? (
              <>
                <ScientificText text="57 mL - 42 mL = 15 mL" />
                <ScientificText text="15 mL = 15 cm³" />
              </>
            ) : (
              <span>راقب مقدار ارتفاع الماء بعد غمر الجسم بالكامل.</span>
            )}
          </div>
        </div>
      </section>

      <section className="rafiq-measurement-card is-warm">
        <SectionHeader
          number="7"
          eyebrow="اختيار الأداة قرار"
          title="المخبار الأكبر ليس الأفضل دائمًا"
          copy="قارن المدى والتدرج قبل أن تختار أداة قياس كمية صغيرة."
        />
        <p className="rafiq-measurement-prompt">
          نريد قياس <ScientificText text="6 mL" /> من الماء. أي مخبار يساعدك على القراءة بصورة أوضح؟
        </p>
        <div className="rafiq-cylinder-choices">
          {(['10', '100', '1000'] as const).map((value) => (
            <button
              key={value}
              type="button"
              className={cylinderChoice === value ? 'is-active' : ''}
              onClick={() => setCylinderChoice(value)}
            >
              <CylinderChoiceVisual value={value} />
              <span className="rafiq-scientific-choice-value">
                <ScientificText text={`${value} mL`} />
              </span>
              <small>افتح عدسة التدريج</small>
            </button>
          ))}
        </div>
        {cylinderChoice ? (
          <CylinderScaleZoom choice={cylinderChoice} />
        ) : (
          <div className="rafiq-measurement-insight">
            اختر أي مخبار لفتح عدسة التدريج، ثم جرّب الخيارات الأخرى وقارن بصريًا.
          </div>
        )}
      </section>

      <section className="rafiq-measurement-card is-decision">
        <SectionHeader
          number="8"
          eyebrow="تحدٍ تكاملي قصير"
          title="قرار القياس"
          copy="ادمج ما تعلمته قبل أن تصل إلى بوصلة القياس."
        />
        <div className="rafiq-tool-decision">
          <div className="rafiq-thin-plate">
            <span aria-hidden="true" />
            <b>صفيحة معدنية رقيقة</b>
            <small>المطلوب: قياس السمك</small>
          </div>
          <div className="rafiq-tool-options">
            <button
              type="button"
              className={toolChoice === 'ruler' ? 'is-active' : ''}
              onClick={() => setToolChoice('ruler')}
            >
              <span aria-hidden="true">📏</span>
              <b>مسطرة</b>
            </button>
            <button
              type="button"
              className={toolChoice === 'micrometer' ? 'is-active' : ''}
              onClick={() => setToolChoice('micrometer')}
            >
              <span aria-hidden="true">◉</span>
              <b>ميكرومتر</b>
            </button>
            <button
              type="button"
              className={toolChoice === 'cylinder' ? 'is-active' : ''}
              onClick={() => setToolChoice('cylinder')}
            >
              <span aria-hidden="true">▥</span>
              <b>مخبار مدرج</b>
            </button>
          </div>
          {toolChoice ? (
            <div className="rafiq-measurement-insight">
              {toolChoice === 'micrometer'
                ? 'اختيار مناسب: البعد صغير جدًا ويحتاج أداة مصممة لقياس أبعاد صغيرة جدًا.'
                : toolChoice === 'ruler'
                  ? 'قارن سمك الصفيحة بأصغر تدريج تستطيع المسطرة قراءته بوضوح.'
                  : 'المخبار المدرج يقيس الحجم، وليس سمك الصفيحة.'}
            </div>
          ) : null}
        </div>
      </section>

      <section className="rafiq-measurement-compass">
        <SectionHeader
          number="9"
          eyebrow="الخلاصة البصرية"
          title="بوصلة القياس"
          copy="ابدأ بالكمية، ثم طبيعة الجسم، ثم الأداة والطريقة، ثم سجّل القراءة بوحدتها."
        />
        <div className="rafiq-compass-map">
          <div className="rafiq-compass-center">
            ماذا تريد
            <br />
            أن تقيس؟
          </div>
          <div className="rafiq-compass-branch is-length">
            <h4>طول</h4>
            <span>مستقيم → مسطرة</span>
            <span>منحني → خيط + مسطرة</span>
            <span>صغير جدًا → ميكرومتر / قياس غير مباشر</span>
          </div>
          <div className="rafiq-compass-branch is-volume">
            <h4>حجم</h4>
            <span>سائل → مخبار مدرج</span>
            <span>جسم منتظم → أبعاد + علاقة رياضية</span>
            <span>جسم غير منتظم → الإزاحة</span>
          </div>
        </div>
        <div className="rafiq-compass-rules">
          <span>اختر الأداة المناسبة</span>
          <span>اقرأ بالطريقة الصحيحة</span>
          <span>سجّل القيمة مع الوحدة</span>
        </div>
      </section>

      <section className="rafiq-measurement-finale">
        <p>الخلاصة</p>
        <h3>القياس الجيد ليس حفظ اسم أداة، بل اختيار الطريقة الصحيحة واستخدامها بدقة.</h3>
        <span>
          اسأل دائمًا: ماذا أقيس؟ ما طبيعة الجسم؟ ما الأداة المناسبة؟ وكيف أسجل القراءة بوحدتها؟
        </span>
      </section>

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
