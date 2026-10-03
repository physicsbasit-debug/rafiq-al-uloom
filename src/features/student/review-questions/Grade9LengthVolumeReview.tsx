import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { ScientificText } from '@design-system/components/ScientificText';
import { StudentBackAction } from '@features/student/navigation/StudentBackAction';
import type { Question } from '@shared-types/quiz.types';
import { grade9Lesson12ReviewDesign } from '@content/learning-design/grade9-lesson-1-2-learning-design';
import './Grade9LengthVolumeReview.css';

interface Grade9LengthVolumeReviewProps {
  readonly questions: Question[];
  readonly onBackToLesson: () => void;
}

interface ReviewOutcome {
  readonly attempts: number;
  readonly resolved: boolean;
  readonly mastered: boolean;
  readonly feedback: 'success' | 'hint' | 'explanation' | null;
}

type ActiveMicrometerStage = 0 | 1 | 2;

interface MicrometerState {
  readonly stage: ActiveMicrometerStage | 3;
  readonly stageAttempts: readonly [number, number, number];
  readonly needsReview: boolean;
  readonly feedback: 'hint' | 'explanation' | null;
  readonly input: string;
}

const QUESTION_IDS = [
  'g9-s1-u1-l2-rq1',
  'g9-s1-u1-l2-rq2',
  'g9-s1-u1-l2-rq3',
  'g9-s1-u1-l2-rq4',
  'g9-s1-u1-l2-rq5',
] as const;

type QuestionId = (typeof QUESTION_IDS)[number];

const MICROMETER_EXPECTED = [3, 0.28, 3.28] as const;
const MICROMETER_HINTS = [
  'ابحث عن آخر علامة رئيسية ظاهرة قبل حافة الأسطوانة المتحركة.',
  'اتبع خط المرجع الأفقي وحدد رقم التدريج الكسري الذي يلتقي به.',
  'اجمع قراءة التدريج الرئيسي مع القراءة الكسرية.',
] as const;
const MICROMETER_EXPLANATIONS = [
  'آخر علامة رئيسية كاملة ظاهرة قبل حافة الأسطوانة هي 3.00 mm.',
  'خط المرجع يطابق التدريج 28، وكل تقسيم يساوي 0.01 mm؛ لذلك القراءة الكسرية 0.28 mm.',
  'القراءة النهائية تساوي 3.00 mm + 0.28 mm = 3.28 mm.',
] as const;

function isActiveMicrometerStage(stage: MicrometerState['stage']): stage is ActiveMicrometerStage {
  return stage === 0 || stage === 1 || stage === 2;
}

function parseMeasurement(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function almostEqual(actual: number | null, expected: number): boolean {
  return actual !== null && Math.abs(actual - expected) < 0.0001;
}

function ReviewHero() {
  return (
    <header className="rafiq-l12-review-hero">
      <div className="rafiq-l12-review-hero-mark" aria-hidden="true">
        1-2
      </div>
      <div>
        <p>مراجعة فهمك • قياس الطول والحجم</p>
        <h2>خمسة مواقف، وخمسة قرارات قياس</h2>
        <span>
          استرجع الفكرة، طبّقها، اقرأ الأداة، اكشف الخطأ، ثم استخدم طريقة قياس في موقف جديد.
        </span>
      </div>
    </header>
  );
}

function ToolIcon({ kind }: { readonly kind: 'ruler' | 'micrometer' | 'cylinder' }) {
  if (kind === 'ruler') {
    return (
      <svg viewBox="0 0 180 92" role="img" aria-label="مسطرة مدرجة" className="rafiq-l12-tool-svg">
        <defs>
          <linearGradient id="review-ruler-fill" x1="0" x2="1">
            <stop offset="0" stopColor="#f9dc78" />
            <stop offset="1" stopColor="#e8b94d" />
          </linearGradient>
        </defs>
        <rect
          x="14"
          y="28"
          width="152"
          height="40"
          rx="9"
          fill="url(#review-ruler-fill)"
          stroke="#8a6a2d"
          strokeWidth="2.5"
        />
        {Array.from({ length: 16 }, (_, index) => {
          const x = 24 + index * 8.8;
          const major = index % 5 === 0;
          return (
            <line
              key={index}
              x1={x}
              y1="28"
              x2={x}
              y2={major ? 49 : 41}
              stroke="#2f3d3e"
              strokeWidth={major ? 2 : 1.2}
            />
          );
        })}
        <text x="25" y="63" fontSize="9" fill="#344">
          0
        </text>
        <text x="68" y="63" fontSize="9" fill="#344">
          5
        </text>
        <text x="111" y="63" fontSize="9" fill="#344">
          10
        </text>
      </svg>
    );
  }

  if (kind === 'micrometer') {
    return (
      <svg
        viewBox="0 0 190 100"
        role="img"
        aria-label="ميكرومتر خارجي"
        className="rafiq-l12-tool-svg"
      >
        <defs>
          <linearGradient id="review-micro-metal" x1="0" x2="1">
            <stop offset="0" stopColor="#f5f8f8" />
            <stop offset="0.48" stopColor="#aab8bc" />
            <stop offset="1" stopColor="#edf2f3" />
          </linearGradient>
        </defs>
        <path
          d="M52 18 C17 24 10 78 49 86 L66 86 L66 69 L53 69 C36 64 36 40 53 35 L66 35 L66 18 Z"
          fill="#245f5d"
          stroke="#163f40"
          strokeWidth="3"
        />
        <rect
          x="64"
          y="36"
          width="37"
          height="32"
          rx="5"
          fill="url(#review-micro-metal)"
          stroke="#52666a"
          strokeWidth="2.5"
        />
        <rect
          x="98"
          y="38"
          width="52"
          height="28"
          rx="5"
          fill="#f9fbfb"
          stroke="#52666a"
          strokeWidth="2.5"
        />
        <line x1="105" y1="52" x2="145" y2="52" stroke="#314446" strokeWidth="2" />
        {Array.from({ length: 7 }, (_, index) => (
          <line
            key={index}
            x1={108 + index * 5.5}
            y1="42"
            x2={108 + index * 5.5}
            y2={index % 2 === 0 ? 52 : 48}
            stroke="#314446"
            strokeWidth="1.5"
          />
        ))}
        <rect
          x="149"
          y="35"
          width="24"
          height="34"
          rx="6"
          fill="#bdc9cb"
          stroke="#52666a"
          strokeWidth="2.5"
        />
        <line
          x1="173"
          y1="52"
          x2="184"
          y2="52"
          stroke="#42575a"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 120 120"
      role="img"
      aria-label="مخبار مدرج"
      className="rafiq-l12-tool-svg is-cylinder"
    >
      <path
        d="M39 12 H81 L77 96 Q76 108 60 108 Q44 108 43 96 Z"
        fill="#edf9fb"
        stroke="#5d7e84"
        strokeWidth="3"
      />
      {Array.from({ length: 9 }, (_, index) => (
        <line
          key={index}
          x1="62"
          y1={25 + index * 8}
          x2={index % 2 === 0 ? 76 : 71}
          y2={25 + index * 8}
          stroke="#527378"
          strokeWidth="2"
        />
      ))}
      <ellipse cx="60" cy="108" rx="25" ry="5" fill="#dbeaec" stroke="#5d7e84" strokeWidth="2" />
    </svg>
  );
}

function CopperWireVisual() {
  return (
    <div
      className="rafiq-l12-wire-visual"
      role="img"
      aria-label="سلك نحاسي رفيع جدًا مع تكبير لقطره"
    >
      <svg viewBox="0 0 720 300" aria-hidden="true">
        <defs>
          <linearGradient id="copper" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6b16d" />
            <stop offset="0.45" stopColor="#b75a28" />
            <stop offset="1" stopColor="#7f351a" />
          </linearGradient>
          <filter id="wire-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="5" stdDeviation="6" floodOpacity="0.18" />
          </filter>
        </defs>
        <ellipse
          cx="208"
          cy="158"
          rx="126"
          ry="88"
          fill="none"
          stroke="url(#copper)"
          strokeWidth="18"
          filter="url(#wire-shadow)"
        />
        <ellipse
          cx="208"
          cy="158"
          rx="96"
          ry="62"
          fill="none"
          stroke="url(#copper)"
          strokeWidth="16"
        />
        <ellipse
          cx="208"
          cy="158"
          rx="66"
          ry="38"
          fill="none"
          stroke="url(#copper)"
          strokeWidth="14"
        />
        <path
          d="M308 104 C382 98 411 111 462 141 C496 161 520 160 560 154"
          fill="none"
          stroke="url(#copper)"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <circle cx="548" cy="150" r="58" fill="#ffffff" stroke="#315f64" strokeWidth="4" />
        <line
          x1="505"
          y1="129"
          x2="587"
          y2="171"
          stroke="url(#copper)"
          strokeWidth="22"
          strokeLinecap="round"
        />
        <line
          x1="464"
          y1="127"
          x2="503"
          y2="135"
          stroke="#315f64"
          strokeWidth="2.5"
          strokeDasharray="6 5"
        />
      </svg>
      <div className="rafiq-l12-wire-label">قطر صغير جدًا</div>
    </div>
  );
}

function PaperStackVisual() {
  return (
    <div
      className="rafiq-l12-paper-scene"
      role="img"
      aria-label="كومة من 100 ورقة يقاس سمكها الكلي"
    >
      <svg viewBox="0 0 720 300" aria-hidden="true">
        <defs>
          <linearGradient id="paper-top" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#fffef9" />
            <stop offset="1" stopColor="#ece9df" />
          </linearGradient>
          <marker
            id="paper-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="4"
            refY="4"
            orient="auto-start-reverse"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="#335e60" />
          </marker>
        </defs>
        <polygon
          points="115,78 467,78 574,129 221,129"
          fill="url(#paper-top)"
          stroke="#c9c6bd"
          strokeWidth="2"
        />
        <polygon
          points="221,129 574,129 574,210 221,210"
          fill="#f3f1ea"
          stroke="#c9c6bd"
          strokeWidth="2"
        />
        <polygon
          points="115,78 221,129 221,210 115,159"
          fill="#e6e2d8"
          stroke="#c9c6bd"
          strokeWidth="2"
        />
        {Array.from({ length: 13 }, (_, index) => (
          <line
            key={index}
            x1="221"
            y1={137 + index * 5.6}
            x2="574"
            y2={137 + index * 5.6}
            stroke={index % 3 === 0 ? '#c5c2b9' : '#d8d5cd'}
            strokeWidth="1.2"
          />
        ))}
        <line
          x1="621"
          y1="129"
          x2="621"
          y2="210"
          stroke="#335e60"
          strokeWidth="3"
          markerStart="url(#paper-arrow)"
          markerEnd="url(#paper-arrow)"
        />
        <line x1="591" y1="129" x2="642" y2="129" stroke="#688789" strokeWidth="2" />
        <line x1="591" y1="210" x2="642" y2="210" stroke="#688789" strokeWidth="2" />
      </svg>
      <div className="rafiq-l12-paper-measure">
        <ScientificText text="8.0 mm" />
      </div>
      <div className="rafiq-l12-paper-count">100 ورقة متماثلة</div>
    </div>
  );
}

function MicrometerReviewVisual() {
  return (
    <div
      className="rafiq-l12-micro-review"
      role="img"
      aria-label="ميكرومتر بقراءة جديدة على التدريج الرئيسي والكسري"
    >
      <svg viewBox="0 0 920 380" aria-hidden="true">
        <defs>
          <linearGradient id="review-micro-body" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#f8fbfb" />
            <stop offset="0.42" stopColor="#c0cbcd" />
            <stop offset="1" stopColor="#eef3f4" />
          </linearGradient>
        </defs>
        <path
          d="M155 67 C55 92 53 292 158 317 L236 317 L236 264 L174 264 C122 246 122 135 176 118 L236 118 L236 67 Z"
          fill="#1d5c59"
          stroke="#143f3e"
          strokeWidth="6"
        />
        <rect
          x="230"
          y="119"
          width="86"
          height="143"
          rx="8"
          fill="url(#review-micro-body)"
          stroke="#4d6468"
          strokeWidth="5"
        />
        <line x1="266" y1="190" x2="482" y2="190" stroke="#20383b" strokeWidth="5" />
        {[0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5].map((value, index) => {
          const x = 284 + index * 27;
          const half = value % 1 !== 0;
          return (
            <g key={value}>
              <line
                x1={x}
                y1={half ? 190 : 139}
                x2={x}
                y2={half ? 224 : 190}
                stroke="#263f42"
                strokeWidth={half ? 3.2 : 4.2}
              />
              {!half && value <= 3 ? (
                <text
                  x={x}
                  y="133"
                  textAnchor="middle"
                  fontSize="22"
                  fontWeight="700"
                  fill="#21383b"
                >
                  {value}
                </text>
              ) : null}
            </g>
          );
        })}
        <rect
          x="474"
          y="99"
          width="218"
          height="184"
          rx="18"
          fill="#f7fafb"
          stroke="#4f6669"
          strokeWidth="5"
        />
        <line x1="474" y1="190" x2="692" y2="190" stroke="#1e5d59" strokeWidth="4" />
        {[24, 25, 26, 27, 28, 29, 30, 31, 32].map((value, index) => {
          const y = 112 + index * 19.5;
          return (
            <g key={value}>
              <line
                x1="474"
                y1={y}
                x2={value === 28 ? 550 : 529}
                y2={y}
                stroke={value === 28 ? '#b87511' : '#425c5e'}
                strokeWidth={value === 28 ? 4 : 2.6}
              />
              <text
                x="564"
                y={y + 6}
                fontSize="18"
                fontWeight={value === 28 ? 900 : 600}
                fill={value === 28 ? '#9a5f08' : '#435d5f'}
              >
                {value}
              </text>
            </g>
          );
        })}
        <rect
          x="692"
          y="123"
          width="94"
          height="135"
          rx="16"
          fill="#bdc9cb"
          stroke="#4f6568"
          strokeWidth="5"
        />
        <line
          x1="786"
          y1="190"
          x2="850"
          y2="190"
          stroke="#41565a"
          strokeWidth="13"
          strokeLinecap="round"
        />
        <line
          x1="236"
          y1="190"
          x2="271"
          y2="190"
          stroke="#344a4d"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <line
          x1="254"
          y1="125"
          x2="254"
          y2="255"
          stroke="#c16b35"
          strokeWidth="13"
          strokeLinecap="round"
        />
      </svg>
      <div className="rafiq-l12-micro-labels">
        <span>التدريج الرئيسي</span>
        <span>التدريج الكسري</span>
      </div>
      <div className="rafiq-l12-micro-note">
        <span>كل تقسيم في التدريج الكسري =</span>
        <ScientificText text="0.01 mm" />
      </div>
    </div>
  );
}

function CylinderMismatchVisual({ placed }: { readonly placed: boolean }) {
  return (
    <div
      className="rafiq-l12-cylinder-mismatch"
      role="img"
      aria-label="مخبار سعته 1000 mL وأصغر تقسيم فيه 10 mL"
    >
      <div className="rafiq-l12-cylinder-full">
        <svg viewBox="0 0 250 360" aria-hidden="true">
          <path
            d="M78 24 H172 L164 294 Q162 322 125 322 Q88 322 86 294 Z"
            fill="#f0fbfd"
            stroke="#5e7d82"
            strokeWidth="5"
          />
          {Array.from({ length: 11 }, (_, index) => {
            const y = 48 + index * 23;
            return (
              <line
                key={index}
                x1="132"
                y1={y}
                x2={index % 2 === 0 ? 164 : 153}
                y2={y}
                stroke="#55757a"
                strokeWidth="3"
              />
            );
          })}
          <ellipse
            cx="125"
            cy="326"
            rx="55"
            ry="10"
            fill="#dcebed"
            stroke="#5e7d82"
            strokeWidth="4"
          />
        </svg>
        <strong>
          <ScientificText text="1000 mL" />
        </strong>
      </div>
      <div className="rafiq-l12-cylinder-zoom">
        <div className="rafiq-l12-cylinder-axis" aria-hidden="true">
          <span className="tick is-zero" />
          <span className="tick is-ten" />
          <span className="tick is-twenty" />
          {placed ? (
            <span className="target-six" style={{ '--target-y': '30%' } as CSSProperties} />
          ) : null}
        </div>
        <div className="rafiq-l12-cylinder-labels">
          <ScientificText text="20 mL" />
          <ScientificText text="10 mL" />
          <ScientificText text="0 mL" />
        </div>
        {placed ? (
          <div className="rafiq-l12-six-label">
            <ScientificText text="6 mL" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FixedCurvedPathVisual({ resolved }: { readonly resolved: boolean }) {
  return (
    <div
      className="rafiq-l12-fixed-path"
      role="img"
      aria-label="مسار سلكي منحني مثبت على لوحة ولا يمكن فرده"
    >
      <svg viewBox="0 0 760 300" aria-hidden="true">
        <defs>
          <linearGradient id="board" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#d8b083" />
            <stop offset="1" stopColor="#b8824e" />
          </linearGradient>
          <linearGradient id="fixed-copper" x1="0" x2="1">
            <stop offset="0" stopColor="#d8793b" />
            <stop offset="0.5" stopColor="#9d4423" />
            <stop offset="1" stopColor="#e1904c" />
          </linearGradient>
        </defs>
        <rect
          x="45"
          y="42"
          width="670"
          height="184"
          rx="22"
          fill="url(#board)"
          stroke="#8b6039"
          strokeWidth="4"
        />
        <path
          d="M110 142 C184 55 252 210 330 129 C393 63 450 211 533 129 C581 83 620 98 655 136"
          fill="none"
          stroke="url(#fixed-copper)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {[110, 655].map((x) => (
          <g key={x}>
            <circle
              cx={x}
              cy={x === 110 ? 142 : 136}
              r="15"
              fill="#d9dee0"
              stroke="#5d6d70"
              strokeWidth="4"
            />
            <circle cx={x} cy={x === 110 ? 142 : 136} r="5" fill="#76878a" />
          </g>
        ))}
        {resolved ? (
          <path
            d="M110 142 C184 55 252 210 330 129 C393 63 450 211 533 129 C581 83 620 98 655 136"
            fill="none"
            stroke="#2d86a0"
            strokeWidth="5"
            strokeDasharray="10 8"
            strokeLinecap="round"
          />
        ) : null}
        {resolved ? (
          <g transform="translate(135 242)">
            <rect
              x="0"
              y="0"
              width="490"
              height="38"
              rx="9"
              fill="#f1cf67"
              stroke="#80662b"
              strokeWidth="2.5"
            />
            {Array.from({ length: 29 }, (_, index) => (
              <line
                key={index}
                x1={14 + index * 16}
                y1="0"
                x2={14 + index * 16}
                y2={index % 5 === 0 ? 22 : 13}
                stroke="#2f3f40"
                strokeWidth={index % 5 === 0 ? 2 : 1.2}
              />
            ))}
            <line
              x1="14"
              y1="-12"
              x2="438"
              y2="-12"
              stroke="#2d86a0"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </g>
        ) : null}
      </svg>
      <div className="rafiq-l12-fixed-note">
        المسار مثبت في موضعه، لذلك لا يمكن تقويمه كما نفعل مع سلك حر.
      </div>
    </div>
  );
}

function FeedbackPanel({
  outcome,
  hint,
  explanation,
}: {
  readonly outcome: ReviewOutcome | undefined;
  readonly hint: string;
  readonly explanation: ReactNode;
}) {
  if (!outcome?.feedback) return null;
  const isSuccess = outcome.feedback === 'success';
  const isHint = outcome.feedback === 'hint';
  return (
    <div
      className={`rafiq-l12-feedback ${isSuccess ? 'is-success' : isHint ? 'is-hint' : 'is-explanation'}`}
      role="status"
    >
      <strong>
        {isSuccess ? 'قرار صحيح' : isHint ? 'تلميح للمحاولة الثانية' : 'التفسير التعليمي'}
      </strong>
      <div>{isSuccess || outcome.feedback === 'explanation' ? explanation : hint}</div>
    </div>
  );
}

export function Grade9LengthVolumeReview({
  questions,
  onBackToLesson,
}: Grade9LengthVolumeReviewProps) {
  const questionById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions]
  );
  const orderedQuestions = QUESTION_IDS.map((id) => questionById.get(id));
  const missingQuestionIds = QUESTION_IDS.filter((id) => !questionById.has(id));

  const [sequence, setSequence] = useState<number[]>([0, 1, 2, 3, 4]);
  const [position, setPosition] = useState(0);
  const [outcomes, setOutcomes] = useState<Record<string, ReviewOutcome>>({});
  const [choiceSelections, setChoiceSelections] = useState<Record<string, number | null>>({});
  const [numericAnswer, setNumericAnswer] = useState('');
  const [cylinderPlaced, setCylinderPlaced] = useState(false);
  const [micrometer, setMicrometer] = useState<MicrometerState>({
    stage: 0,
    stageAttempts: [0, 0, 0],
    needsReview: false,
    feedback: null,
    input: '',
  });
  const [complete, setComplete] = useState(false);

  if (missingQuestionIds.length > 0) {
    return (
      <section className="rafiq-l12-review">
        <ReviewHero />
        <div className="rafiq-l12-review-error" role="alert">
          <strong>تعذر تجهيز مراجعة الدرس كاملة.</strong>
          <span>بعض عناصر المراجعة لم تُحمّل من مصدر المحتوى، لذلك لن نعرض تجربة ناقصة.</span>
        </div>
        <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
      </section>
    );
  }

  const currentQuestionIndex = sequence[position];
  const currentQuestion = orderedQuestions[currentQuestionIndex] as Question;
  const currentId = currentQuestion.id as QuestionId;
  const currentDesign = grade9Lesson12ReviewDesign[currentId];
  const currentOutcome = outcomes[currentId];
  const progress = Math.round(((position + 1) / sequence.length) * 100);

  const summary = QUESTION_IDS.map((id) => ({
    id,
    label: grade9Lesson12ReviewDesign[id].summarySkill,
    mastered: outcomes[id]?.mastered === true,
  }));
  const weakIndices = summary.flatMap((entry, index) => (entry.mastered ? [] : [index]));

  function setOutcome(id: QuestionId, outcome: ReviewOutcome) {
    setOutcomes((current) => ({ ...current, [id]: outcome }));
  }

  function evaluateChoice(id: QuestionId, choiceIndex: number) {
    const question = questionById.get(id);
    if (!question) return;
    const previous = outcomes[id];
    if (previous?.resolved || (choiceSelections[id] !== null && choiceSelections[id] !== undefined))
      return;

    const attempts = (previous?.attempts ?? 0) + 1;
    const correct = choiceIndex === question.correctAnswerIndex;
    setChoiceSelections((current) => ({ ...current, [id]: choiceIndex }));
    setOutcome(id, {
      attempts,
      resolved: correct || attempts >= 2,
      mastered: correct,
      feedback: correct ? 'success' : attempts >= 2 ? 'explanation' : 'hint',
    });
  }

  function retryChoice(id: QuestionId) {
    const outcome = outcomes[id];
    if (!outcome || outcome.resolved) return;
    setChoiceSelections((current) => ({ ...current, [id]: null }));
    setOutcome(id, { ...outcome, feedback: null });
  }

  function evaluateNumeric() {
    const previous = outcomes['g9-s1-u1-l2-rq2'];
    if (previous?.resolved) return;
    const attempts = (previous?.attempts ?? 0) + 1;
    const correct = almostEqual(parseMeasurement(numericAnswer), 0.08);
    setOutcome('g9-s1-u1-l2-rq2', {
      attempts,
      resolved: correct || attempts >= 2,
      mastered: correct,
      feedback: correct ? 'success' : attempts >= 2 ? 'explanation' : 'hint',
    });
  }

  function resetNumericRetry() {
    const outcome = outcomes['g9-s1-u1-l2-rq2'];
    if (!outcome || outcome.resolved) return;
    setNumericAnswer('');
    setOutcome('g9-s1-u1-l2-rq2', { ...outcome, feedback: null });
  }

  function evaluateMicrometerStage() {
    const stage = micrometer.stage;
    if (!isActiveMicrometerStage(stage)) return;

    const correct = almostEqual(parseMeasurement(micrometer.input), MICROMETER_EXPECTED[stage]);
    const stageAttempts: [number, number, number] = [...micrometer.stageAttempts];
    stageAttempts[stage] = stageAttempts[stage] + 1;

    if (correct) {
      if (stage === 2) {
        setOutcome('g9-s1-u1-l2-rq3', {
          attempts: stageAttempts.reduce((sum, value) => sum + value, 0),
          resolved: true,
          mastered: !micrometer.needsReview,
          feedback: 'success',
        });
        setMicrometer({ ...micrometer, stage: 3, stageAttempts, feedback: null, input: '' });
      } else {
        const nextStage: ActiveMicrometerStage = stage === 0 ? 1 : 2;
        setMicrometer({
          ...micrometer,
          stage: nextStage,
          stageAttempts,
          feedback: null,
          input: '',
        });
      }
      return;
    }

    if (stageAttempts[stage] >= 2) {
      setMicrometer({
        ...micrometer,
        stageAttempts,
        needsReview: true,
        feedback: 'explanation',
      });
    } else {
      setMicrometer({ ...micrometer, stageAttempts, feedback: 'hint', input: '' });
    }
  }

  function continueMicrometerAfterExplanation() {
    const stage = micrometer.stage;
    if (micrometer.feedback !== 'explanation' || !isActiveMicrometerStage(stage)) return;

    if (stage === 2) {
      setOutcome('g9-s1-u1-l2-rq3', {
        attempts: micrometer.stageAttempts.reduce((sum, value) => sum + value, 0),
        resolved: true,
        mastered: false,
        feedback: 'explanation',
      });
      setMicrometer({ ...micrometer, stage: 3, feedback: null, input: '' });
      return;
    }

    const nextStage: ActiveMicrometerStage = stage === 0 ? 1 : 2;
    setMicrometer({ ...micrometer, stage: nextStage, feedback: null, input: '' });
  }

  function nextQuestion() {
    if (!currentOutcome?.resolved) return;
    if (position === sequence.length - 1) {
      setComplete(true);
      return;
    }
    setPosition((current) => current + 1);
  }

  function previousQuestion() {
    setPosition((current) => Math.max(0, current - 1));
  }

  function resetQuestion(index: number) {
    const id = QUESTION_IDS[index];
    setOutcomes((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setChoiceSelections((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (id === 'g9-s1-u1-l2-rq2') setNumericAnswer('');
    if (id === 'g9-s1-u1-l2-rq3') {
      setMicrometer({
        stage: 0,
        stageAttempts: [0, 0, 0],
        needsReview: false,
        feedback: null,
        input: '',
      });
    }
    if (id === 'g9-s1-u1-l2-rq4') setCylinderPlaced(false);
  }

  function restart(indices: number[]) {
    indices.forEach(resetQuestion);
    setSequence(indices);
    setPosition(0);
    setComplete(false);
  }

  if (complete) {
    return (
      <section className="rafiq-l12-review">
        <ReviewHero />
        <section className="rafiq-l12-summary" aria-labelledby="g9-l12-review-summary-title">
          <div className="rafiq-l12-summary-head">
            <span aria-hidden="true">✓</span>
            <div>
              <p>اكتملت المراجعة</p>
              <h3 id="g9-l12-review-summary-title">مراجعة فهمك</h3>
              <small>
                هذه الخلاصة تشخّص المهارات التي ثبتت والتي تحتاج مرورًا آخر، من دون تحويل المراجعة
                إلى درجة رقمية.
              </small>
            </div>
          </div>
          <div className="rafiq-l12-summary-grid">
            {summary.map((entry) => (
              <div key={entry.id} className={entry.mastered ? 'is-mastered' : 'is-review'}>
                <strong>{entry.label}</strong>
                <span>{entry.mastered ? 'أتقنت' : 'راجع'}</span>
              </div>
            ))}
          </div>
          <div className="rafiq-l12-summary-message">
            <strong>أنهيت مراجعة قياس الطول والحجم.</strong>
            <span>
              قرارات القياس الجيدة تبدأ بطبيعة الكمية وحجمها وشكل الجسم وتدرج الأداة، لا باسم الأداة
              وحده.
            </span>
          </div>
          <div className="rafiq-l12-summary-actions">
            <button type="button" className="is-secondary" onClick={onBackToLesson}>
              العودة إلى الدرس
            </button>
            <button
              type="button"
              className="is-primary"
              onClick={() => restart(weakIndices.length > 0 ? weakIndices : [0, 1, 2, 3, 4])}
            >
              {weakIndices.length > 0 ? 'إعادة المهارات التي تحتاج مراجعة' : 'أعد المراجعة كاملة'}
            </button>
          </div>
        </section>
      </section>
    );
  }

  return (
    <section className="rafiq-l12-review">
      <ReviewHero />
      <div className="rafiq-l12-progress-block">
        <div>
          <strong>
            السؤال {position + 1} من {sequence.length}
          </strong>
          <span>{currentDesign.stageLabel}</span>
        </div>
        <div
          className="rafiq-l12-progress"
          role="progressbar"
          aria-label="تقدم مراجعة قياس الطول والحجم"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
        >
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>

      <article className="rafiq-l12-review-card">
        <header className="rafiq-l12-question-head">
          <span>{currentQuestionIndex + 1}</span>
          <div>
            <small>{currentDesign.stageLabel}</small>
            <h3>
              <ScientificText text={currentQuestion.prompt} />
            </h3>
          </div>
        </header>

        {currentId === 'g9-s1-u1-l2-rq1' ? (
          <>
            <CopperWireVisual />
            <div className="rafiq-l12-tool-grid" aria-label="أدوات القياس">
              {currentQuestion.choices.map((choice, index) => {
                const kind = index === 0 ? 'ruler' : index === 1 ? 'micrometer' : 'cylinder';
                const selected = choiceSelections[currentId] === index;
                return (
                  <button
                    key={choice}
                    type="button"
                    className={selected ? 'is-selected' : ''}
                    aria-pressed={selected}
                    disabled={
                      choiceSelections[currentId] !== null &&
                      choiceSelections[currentId] !== undefined
                    }
                    onClick={() => evaluateChoice(currentId, index)}
                  >
                    <ToolIcon kind={kind} />
                    <strong>{choice}</strong>
                  </button>
                );
              })}
            </div>
            <FeedbackPanel
              outcome={currentOutcome}
              hint={currentDesign.hint}
              explanation={<ScientificText text={currentQuestion.explanation} />}
            />
            {currentOutcome?.feedback === 'hint' ? (
              <button
                type="button"
                className="rafiq-l12-retry"
                onClick={() => retryChoice(currentId)}
              >
                حاول مرة أخرى
              </button>
            ) : null}
          </>
        ) : null}

        {currentId === 'g9-s1-u1-l2-rq2' ? (
          <>
            <PaperStackVisual />
            <div className="rafiq-l12-numeric-task">
              <label htmlFor="g9-l12-sheet-answer">سمك الورقة الواحدة</label>
              <div>
                <input
                  id="g9-l12-sheet-answer"
                  inputMode="decimal"
                  value={numericAnswer}
                  disabled={currentOutcome?.resolved}
                  onChange={(event) => setNumericAnswer(event.target.value)}
                  aria-label="سمك الورقة الواحدة بالمليمتر"
                />
                <ScientificText text="mm" />
                <button
                  type="button"
                  disabled={!numericAnswer.trim() || currentOutcome?.resolved}
                  onClick={evaluateNumeric}
                >
                  تحقق من الحساب
                </button>
              </div>
            </div>
            <FeedbackPanel
              outcome={currentOutcome}
              hint={currentDesign.hint}
              explanation={<ScientificText text={currentQuestion.explanation} />}
            />
            {currentOutcome?.feedback === 'hint' ? (
              <button type="button" className="rafiq-l12-retry" onClick={resetNumericRetry}>
                حاول مرة أخرى
              </button>
            ) : null}
          </>
        ) : null}

        {currentId === 'g9-s1-u1-l2-rq3' ? (
          <>
            <MicrometerReviewVisual />
            <div className="rafiq-l12-micro-answer">
              <div className="rafiq-l12-micro-progress" aria-label="خطوات قراءة الميكرومتر">
                {['الرئيسي', 'الكسري', 'القراءة الكلية'].map((label, index) => (
                  <span
                    key={label}
                    className={
                      micrometer.stage > index
                        ? 'is-done'
                        : micrometer.stage === index
                          ? 'is-current'
                          : ''
                    }
                  >
                    {index + 1}. {label}
                  </span>
                ))}
              </div>
              {micrometer.stage < 3 ? (
                <div className="rafiq-l12-micro-input-row">
                  <label htmlFor="g9-l12-micro-answer">
                    {micrometer.stage === 0
                      ? 'قراءة التدريج الرئيسي'
                      : micrometer.stage === 1
                        ? 'قراءة التدريج الكسري'
                        : 'القراءة النهائية'}
                  </label>
                  <div>
                    <input
                      id="g9-l12-micro-answer"
                      inputMode="decimal"
                      value={micrometer.input}
                      disabled={micrometer.feedback === 'explanation'}
                      onChange={(event) =>
                        setMicrometer({ ...micrometer, input: event.target.value, feedback: null })
                      }
                      aria-label="إجابة قراءة الميكرومتر بالمليمتر"
                    />
                    <ScientificText text="mm" />
                    <button
                      type="button"
                      disabled={!micrometer.input.trim() || micrometer.feedback === 'explanation'}
                      onClick={evaluateMicrometerStage}
                    >
                      تحقق
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rafiq-l12-micro-complete">
                  <ScientificText text="3.00 mm + 0.28 mm = 3.28 mm" />
                </div>
              )}
              {micrometer.feedback ? (
                <div
                  className={`rafiq-l12-feedback ${micrometer.feedback === 'hint' ? 'is-hint' : 'is-explanation'}`}
                  role="status"
                >
                  <strong>
                    {micrometer.feedback === 'hint' ? 'تلميح للمحاولة الثانية' : 'التفسير التعليمي'}
                  </strong>
                  <ScientificText
                    text={
                      micrometer.feedback === 'hint'
                        ? MICROMETER_HINTS[micrometer.stage as 0 | 1 | 2]
                        : MICROMETER_EXPLANATIONS[micrometer.stage as 0 | 1 | 2]
                    }
                  />
                  {micrometer.feedback === 'explanation' ? (
                    <button type="button" onClick={continueMicrometerAfterExplanation}>
                      تابع بعد الشرح
                    </button>
                  ) : null}
                </div>
              ) : null}
              {currentOutcome?.feedback === 'success' ? (
                <div className="rafiq-l12-feedback is-success" role="status">
                  <strong>قراءة صحيحة</strong>
                  <ScientificText text={currentQuestion.explanation} />
                </div>
              ) : null}
            </div>
          </>
        ) : null}

        {currentId === 'g9-s1-u1-l2-rq4' ? (
          <>
            <CylinderMismatchVisual placed={cylinderPlaced} />
            {!cylinderPlaced ? (
              <button
                type="button"
                className="rafiq-l12-place-six"
                onClick={() => setCylinderPlaced(true)}
              >
                ضع علامة <ScientificText text="6 mL" /> على التدريج
              </button>
            ) : (
              <div className="rafiq-l12-cylinder-discovery">
                العلامة المطلوبة تقع بين <ScientificText text="0 mL" /> وأول تقسيم عند{' '}
                <ScientificText text="10 mL" />. ما المشكلة في خطة القياس؟
              </div>
            )}
            {cylinderPlaced ? (
              <div className="rafiq-l12-concept-choices" aria-label="تفسير مشكلة المخبار">
                {currentQuestion.choices.map((choice, index) => {
                  const selected = choiceSelections[currentId] === index;
                  return (
                    <button
                      key={choice}
                      type="button"
                      className={selected ? 'is-selected' : ''}
                      aria-pressed={selected}
                      disabled={
                        choiceSelections[currentId] !== null &&
                        choiceSelections[currentId] !== undefined
                      }
                      onClick={() => evaluateChoice(currentId, index)}
                    >
                      <ScientificText text={choice} />
                    </button>
                  );
                })}
              </div>
            ) : null}
            <FeedbackPanel
              outcome={currentOutcome}
              hint={currentDesign.hint}
              explanation={<ScientificText text={currentQuestion.explanation} />}
            />
            {currentOutcome?.feedback === 'hint' ? (
              <button
                type="button"
                className="rafiq-l12-retry"
                onClick={() => retryChoice(currentId)}
              >
                حاول مرة أخرى
              </button>
            ) : null}
          </>
        ) : null}

        {currentId === 'g9-s1-u1-l2-rq5' ? (
          <>
            <FixedCurvedPathVisual resolved={Boolean(currentOutcome?.resolved)} />
            <div className="rafiq-l12-method-choices" aria-label="طرق قياس المسار المنحني">
              {currentQuestion.choices.map((choice, index) => {
                const selected = choiceSelections[currentId] === index;
                return (
                  <button
                    key={choice}
                    type="button"
                    className={selected ? 'is-selected' : ''}
                    aria-pressed={selected}
                    disabled={
                      choiceSelections[currentId] !== null &&
                      choiceSelections[currentId] !== undefined
                    }
                    onClick={() => evaluateChoice(currentId, index)}
                  >
                    <span>{index + 1}</span>
                    <ScientificText text={choice} />
                  </button>
                );
              })}
            </div>
            <FeedbackPanel
              outcome={currentOutcome}
              hint={currentDesign.hint}
              explanation={<ScientificText text={currentQuestion.explanation} />}
            />
            {currentOutcome?.feedback === 'hint' ? (
              <button
                type="button"
                className="rafiq-l12-retry"
                onClick={() => retryChoice(currentId)}
              >
                حاول مرة أخرى
              </button>
            ) : null}
          </>
        ) : null}

        <nav className="rafiq-l12-review-nav" aria-label="التنقل بين أسئلة المراجعة">
          <button
            type="button"
            className="is-secondary"
            disabled={position === 0}
            onClick={previousQuestion}
          >
            السؤال السابق
          </button>
          <button
            type="button"
            className="is-primary"
            disabled={!currentOutcome?.resolved}
            onClick={nextQuestion}
          >
            {position === sequence.length - 1 ? 'إنهاء المراجعة' : 'السؤال التالي'}
          </button>
        </nav>
      </article>

      <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
    </section>
  );
}
