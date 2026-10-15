import { useMemo, useState } from 'react';

import { GRADE9_L13_MASTERY_VARIANTS } from '@content/learning-design/grade9-lesson-1-3-mastery-design';
import { ScientificText } from '@design-system/components/ScientificText';
import { StudentBackAction } from '@features/student/navigation/StudentBackAction';
import type { Question } from '@shared-types/quiz.types';

import {
  buildMasteryExperienceContext,
  buildMasteryPersistenceAnswers,
  buildMasteryReportSummary,
  buildMq3Choices,
  evaluateMq4NumericInput,
  orderMq1Candidates,
  selectMasteryVariant,
} from './grade9-time-measurement/mastery-engine';
import { MasteryResultSaveStatus } from './MasteryResultSaveStatus';
import { useMasteryResultPersistence } from './useMasteryResultPersistence';

import './Grade9TimeMeasurementMastery.css';

interface Grade9TimeMeasurementMasteryProps {
  readonly questions: Question[];
  readonly lessonId: string;
  readonly onBackToLesson: () => void;
  readonly initialSeed?: number;
}

type Mq1Variant = (typeof GRADE9_L13_MASTERY_VARIANTS.mq1)[number];
type Mq2Variant = (typeof GRADE9_L13_MASTERY_VARIANTS.mq2)[number];
type Mq3Variant = (typeof GRADE9_L13_MASTERY_VARIANTS.mq3)[number];
type Mq4Variant = (typeof GRADE9_L13_MASTERY_VARIANTS.mq4)[number];
type Mq5Variant = (typeof GRADE9_L13_MASTERY_VARIANTS.mq5)[number];

interface AttemptVariants {
  readonly mq1: Mq1Variant;
  readonly mq2: Mq2Variant;
  readonly mq3: Mq3Variant;
  readonly mq4: Mq4Variant;
  readonly mq5: Mq5Variant;
}

interface VariantHistory {
  readonly mq1: readonly string[];
  readonly mq2: readonly string[];
  readonly mq3: readonly string[];
  readonly mq4: readonly string[];
  readonly mq5: readonly string[];
}

interface Responses {
  readonly mq1: readonly string[];
  readonly mq2: string | null;
  readonly mq3: number | null;
  readonly mq4: string;
  readonly mq5: string | null;
}

interface AttemptState {
  readonly attemptNumber: number;
  readonly variants: AttemptVariants;
  readonly history: VariantHistory;
}

interface ItemOutcome {
  readonly correct: boolean;
  readonly reviewMessage: string | null;
  readonly diagnostic: string | null;
}

const EMPTY_HISTORY: VariantHistory = {
  mq1: [],
  mq2: [],
  mq3: [],
  mq4: [],
  mq5: [],
};

const EMPTY_RESPONSES: Responses = {
  mq1: [],
  mq2: null,
  mq3: null,
  mq4: '',
  mq5: null,
};

const SKILL_LABELS = [
  'تحديد حدود قياس الفترة الزمنية',
  'تفسير حدود دقة التوقيت اليدوي',
  'حساب متوسط قياسات زمنية متكررة',
  'حساب زمن دورة كاملة',
  'تحديد نهاية الدورة الكاملة',
] as const;

function reportStatusLabel(status: 'mastered' | 'needs_reinforcement' | 'needs_review'): string {
  if (status === 'mastered') return 'متقن';
  if (status === 'needs_reinforcement') return 'يحتاج تعزيزًا';
  return 'يحتاج مراجعة';
}

function seedOffset(base: number, attempt: number, questionIndex: number): number {
  return base + attempt * 101 + questionIndex * 29;
}

function appendVariantHistory(current: readonly string[], key: string): readonly string[] {
  return [...current, key];
}

function createAttempt(
  baseSeed: number,
  attemptNumber: number,
  history: VariantHistory
): AttemptState {
  const mq1 = selectMasteryVariant({
    variants: GRADE9_L13_MASTERY_VARIANTS.mq1,
    seed: seedOffset(baseSeed, attemptNumber, 1),
    seenVariantKeys: history.mq1,
    lastVariantKey: history.mq1.at(-1) ?? null,
  });

  const mq2 = selectMasteryVariant({
    variants: GRADE9_L13_MASTERY_VARIANTS.mq2,
    seed: seedOffset(baseSeed, attemptNumber, 2),
    seenVariantKeys: history.mq2,
    lastVariantKey: history.mq2.at(-1) ?? null,
  });

  const mq3 = selectMasteryVariant({
    variants: GRADE9_L13_MASTERY_VARIANTS.mq3,
    seed: seedOffset(baseSeed, attemptNumber, 3),
    seenVariantKeys: history.mq3,
    lastVariantKey: history.mq3.at(-1) ?? null,
  });

  const mq4 = selectMasteryVariant({
    variants: GRADE9_L13_MASTERY_VARIANTS.mq4,
    seed: seedOffset(baseSeed, attemptNumber, 4),
    seenVariantKeys: history.mq4,
    lastVariantKey: history.mq4.at(-1) ?? null,
  });

  const mq5 = selectMasteryVariant({
    variants: GRADE9_L13_MASTERY_VARIANTS.mq5,
    seed: seedOffset(baseSeed, attemptNumber, 5),
    seenVariantKeys: history.mq5,
    lastVariantKey: history.mq5.at(-1) ?? null,
  });

  return {
    attemptNumber,
    variants: { mq1, mq2, mq3, mq4, mq5 },
    history: {
      mq1: appendVariantHistory(history.mq1, mq1.variantKey),
      mq2: appendVariantHistory(history.mq2, mq2.variantKey),
      mq3: appendVariantHistory(history.mq3, mq3.variantKey),
      mq4: appendVariantHistory(history.mq4, mq4.variantKey),
      mq5: appendVariantHistory(history.mq5, mq5.variantKey),
    },
  };
}

function deterministicShuffle<T>(values: readonly T[], seed: number): readonly T[] {
  const result = [...values];
  let state = Math.abs(Math.trunc(seed)) || 1;

  function random(): number {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  }

  for (let index = result.length - 1; index > 0; index -= 1) {
    const selected = Math.floor(random() * (index + 1));
    [result[index], result[selected]] = [result[selected], result[index]];
  }

  return result;
}

function formatHundredths(value: number): string {
  return (value / 100).toFixed(2);
}

function formatMsAsSeconds(ms: number): string {
  return (ms / 1000).toFixed(2);
}

function firstMismatch(actual: readonly string[], expected: readonly string[]): number | null {
  const length = Math.min(actual.length, expected.length);

  for (let index = 0; index < length; index += 1) {
    if (actual[index] !== expected[index]) return index;
  }

  return actual.length === expected.length ? null : length;
}

function evaluateMq1(variant: Mq1Variant, selected: readonly string[]): ItemOutcome {
  const expected = [...variant.correctStepIds];
  const exact =
    selected.length === expected.length && selected.every((id, index) => id === expected[index]);

  if (exact) {
    return {
      correct: true,
      reviewMessage: null,
      diagnostic: null,
    };
  }

  if (selected.includes('E')) {
    return {
      correct: false,
      reviewMessage: 'راجع حد بداية القياس: يبدأ التوقيت عند بدء الحدث المراد قياسه.',
      diagnostic: 'incorrect-start-boundary',
    };
  }

  if (selected.includes('F')) {
    return {
      correct: false,
      reviewMessage: 'راجع حد نهاية القياس: ينتهي التوقيت عند بلوغ العلامة المستهدفة.',
      diagnostic: 'incorrect-end-boundary',
    };
  }

  const mismatch = firstMismatch(selected, expected);

  return {
    correct: false,
    reviewMessage:
      mismatch === null
        ? 'راجع ترتيب إجراء القياس.'
        : `راجع ترتيب الإجراء بدءًا من الخطوة ${mismatch + 1}.`,
    diagnostic: 'procedural-order-error',
  };
}

function getMq2Review(optionId: string | null): string | null {
  if (optionId === 'manual-reaction-limit') return null;

  if (optionId === 'display-decimals-equal-accuracy') {
    return 'راجع الفرق بين تمييز العرض ودقة القياس الفعلية.';
  }

  if (optionId === 'digital-unsuitable-short-times') {
    return 'راجع استخدام المؤقت الرقمي في قياس الفترات القصيرة وحدود الطريقة اليدوية.';
  }

  return 'راجع أثر زمن استجابة الشخص عند تشغيل المؤقت وإيقافه يدويًا.';
}

function getMq3Review(
  choice: ReturnType<typeof buildMq3Choices>[number] | undefined
): string | null {
  if (!choice || choice.correct) return null;

  switch (choice.diagnostic) {
    case 'used-total-instead-of-mean':
      return 'راجع أن المتوسط يساوي مجموع القياسات مقسومًا على عددها.';
    case 'used-median-instead-of-mean':
      return 'راجع الفرق بين المتوسط الحسابي والوسيط.';
    case 'divided-by-too-few-trials':
      return 'راجع عدد المحاولات: القياسات هنا خمس وليست أربعًا.';
    case 'divided-by-too-many-trials':
      return 'راجع عدد المحاولات: لا تقسّم المجموع على عدد أكبر من القياسات.';
    default:
      return 'راجع حساب متوسط القياسات المتكررة.';
  }
}

function getMq4Review(result: ReturnType<typeof evaluateMq4NumericInput>): string | null {
  if (result.status === 'correct') return null;

  if (result.status === 'empty' || result.status === 'invalid') {
    return 'راجع إدخال القيمة العددية فقط من دون وحدة داخل الحقل.';
  }

  switch (result.diagnostic) {
    case 'used-total-time':
      return 'راجع أن المطلوب زمن دورة واحدة لا الزمن الكلي.';
    case 'multiplied-instead-of-divided':
      return 'راجع العملية: زمن الدورة الواحدة ينتج من القسمة لا الضرب.';
    case 'reversed-division':
      return 'راجع اتجاه القسمة: الزمن الكلي ÷ عدد الدورات.';
    default:
      return 'راجع حساب زمن الدورة الواحدة.';
  }
}

function getMq5Review(selected: string | null, correct: string): string | null {
  if (selected === correct) return null;

  if (selected === 'reference-moving-up' || selected === 'reference-moving-down') {
    return 'راجِع اتجاه الحركة عند العودة إلى العلامة المرجعية.';
  }

  return 'راجِع أن الطرف الأعلى أو الأدنى لا يمثل وحده اكتمال دورة كاملة.';
}

function MasteryVisual({
  index,
  attempt,
}: {
  readonly index: number;
  readonly attempt: AttemptState;
}) {
  const common = {
    viewBox: '0 0 520 230',
    role: 'img' as const,
    className: 'rafiq-l13-mastery-visual',
  };

  if (index === 0) {
    const sand = attempt.variants.mq1.variantKey === 'sand-funnel-target-mark';

    const analogTimerAtZero = (
      <g aria-hidden="true">
        <circle cx="390" cy="118" r="52" className="timer-face" />

        {Array.from({ length: 12 }, (_, tickIndex) => {
          const angle = (tickIndex * Math.PI) / 6 - Math.PI / 2;
          const innerRadius = 39;
          const outerRadius = 46;

          return (
            <line
              key={tickIndex}
              x1={390 + Math.cos(angle) * innerRadius}
              y1={118 + Math.sin(angle) * innerRadius}
              x2={390 + Math.cos(angle) * outerRadius}
              y2={118 + Math.sin(angle) * outerRadius}
              className="timer-tick"
            />
          );
        })}

        <line x1="390" y1="118" x2="390" y2="82" className="timer-hand" />
        <circle cx="390" cy="118" r="4" className="timer-pin" />
      </g>
    );

    return sand ? (
      <svg {...common} aria-label="قمع رمل ووعاء بعلامة مستهدفة ومؤقت تناظري">
        <path d="M75 34h110l-37 61v32h-36V95z" className="shape-fill" />
        <path d="M130 128v35" className="sand-stream" />

        <rect x="70" y="160" width="125" height="48" rx="8" className="vessel" />

        <line x1="72" y1="183" x2="193" y2="183" className="target-line" />

        <text x="207" y="165" className="target-label">
          العلامة المستهدفة
        </text>

        {analogTimerAtZero}
      </svg>
    ) : (
      <svg {...common} aria-label="صنبور وإناء بعلامة مستوى ومؤقت تناظري">
        <path
          d="M68 47h84v18h-30v18h37c17 0 29 12 29 29v6h-20v-6c0-6-3-9-9-9h-57V65H68z"
          className="shape-fill"
        />
        <rect x="91" y="31" width="38" height="10" rx="5" className="shape-fill" />
        <rect x="106" y="39" width="8" height="11" className="shape-fill" />

        <path d="M178 120v20" className="water-stream" />

        <rect x="55" y="145" width="135" height="64" rx="8" className="vessel" />

        <line x1="58" y1="177" x2="187" y2="177" className="target-line" />

        <text x="202" y="158" className="target-label">
          علامة المستوى
        </text>

        {analogTimerAtZero}
      </svg>
    );
  }

  if (index === 1) {
    const reading = attempt.variants.mq2.variantKey === 'ramp-release-1_27' ? '1.27' : '2.43';

    return (
      <svg
        {...common}
        aria-label={`سيارة لعبة واحدة على منحدر ومؤقت رقمي يدوي يعرض ${reading} ثانية`}
      >
        <line x1="55" y1="185" x2="290" y2="80" className="ramp" />

        <g className="toy-car-group" transform="rotate(-24 180 94)">
          <rect x="142" y="78" width="74" height="30" rx="8" className="toy-car" />
          <circle cx="158" cy="117" r="9" className="wheel" />
          <circle cx="201" cy="117" r="9" className="wheel" />
        </g>

        <rect x="340" y="76" width="135" height="82" rx="12" className="digital-timer" />
        <rect x="397" y="68" width="20" height="9" rx="4" className="timer-button" />

        <text x="407" y="124" textAnchor="middle" className="digital-number">
          {reading}
        </text>

        <text x="407" y="148" textAnchor="middle">
          ثانية
        </text>

        <path
          d="M319 194c8-23 19-42 35-55 5-4 11 2 7 7l-11 14 23 12c7 4 5 14-3 15l-29 4z"
          className="manual-timing-hand"
        />
      </svg>
    );
  }

  if (index === 2) {
    const variant = attempt.variants.mq3;

    return (
      <svg
        {...common}
        aria-label={`تجربة سقوط كرة من ارتفاع ${variant.heightLabel} وصفحة دفتر بخمس قراءات`}
      >
        <circle cx="130" cy="55" r="14" className="ball" />
        <line x1="130" y1="73" x2="130" y2="193" className="drop-path" />

        <g className="height-measure-group" aria-hidden="true">
          <line x1="88" y1="55" x2="88" y2="196" className="height-measure" />

          <polygon points="88,49 82,60 94,60" className="height-arrowhead" />

          <polygon points="88,202 82,191 94,191" className="height-arrowhead" />

          <line x1="88" y1="55" x2="116" y2="55" className="height-guide" />

          <line x1="88" y1="196" x2="116" y2="196" className="height-guide" />

          <rect x="47" y="112" width="82" height="29" rx="7" className="height-label-bg" />

          <text x="88" y="132" textAnchor="middle" className="height-label">
            {variant.heightLabel}
          </text>
        </g>

        <line x1="45" y1="196" x2="190" y2="196" className="ground-line" />

        <rect x="245" y="32" width="230" height="178" rx="12" className="notebook" />

        <text x="360" y="58" textAnchor="middle">
          دفتر المختبر
        </text>

        {variant.readingsHundredths.map((value, itemIndex) => (
          <text key={`${value}-${itemIndex}`} x="360" y={86 + itemIndex * 25} textAnchor="middle">
            {formatHundredths(value)} ثانية
          </text>
        ))}
      </svg>
    );
  }

  if (index === 3) {
    return (
      <svg
        {...common}
        aria-label="عربة صغيرة متصلة بنابض أفقي تبدأ من طرف الحركة مع علامة مستقلة لموضع الاتزان"
      >
        <g className="spring-wall-anchor" aria-hidden="true">
          <line x1="38" y1="76" x2="38" y2="174" className="anchor-wall" />
          <line x1="38" y1="86" x2="52" y2="76" className="anchor-hatch" />
          <line x1="38" y1="106" x2="52" y2="96" className="anchor-hatch" />
          <line x1="38" y1="126" x2="52" y2="116" className="anchor-hatch" />
          <line x1="38" y1="146" x2="52" y2="136" className="anchor-hatch" />
          <line x1="38" y1="166" x2="52" y2="156" className="anchor-hatch" />
          <line x1="38" y1="122" x2="52" y2="122" className="spring-link" />
        </g>

        <path d="M52 122l18-18 18 36 18-36 18 36 18-36 18 18" className="spring" />

        <rect x="157" y="94" width="96" height="55" rx="8" className="cart" />
        <circle cx="178" cy="158" r="11" className="wheel" />
        <circle cx="231" cy="158" r="11" className="wheel" />
        <line x1="330" y1="52" x2="330" y2="190" className="equilibrium-line" />
        <text x="330" y="42" textAnchor="middle">
          موضع الاتزان
        </text>
        <line x1="157" y1="179" x2="157" y2="205" className="start-line" />
        <text x="157" y="222" textAnchor="middle">
          موضع البداية
        </text>
      </svg>
    );
  }

  const seat = attempt.variants.mq5.variantKey === 'spring-seat-reference-down';
  const down = attempt.variants.mq5.startDirection === 'down';

  return (
    <svg
      {...common}
      aria-label={
        seat
          ? 'طالب على مقعد زنبركي رأسي عند العلامة المرجعية ويتحرك إلى أسفل'
          : 'طالب على منصة مرنة عند العلامة المرجعية ويتحرك إلى أعلى'
      }
    >
      <line x1="65" y1="120" x2="235" y2="120" className="reference-line" />
      <line x1="315" y1="120" x2="455" y2="120" className="reference-line" />

      <text x="438" y="103" textAnchor="end" className="reference-label">
        العلامة المرجعية
      </text>

      {seat ? (
        <>
          <path d="M245 172l15-16 15 32 15-32 15 32 15-16" className="spring" />
          <rect x="218" y="127" width="112" height="28" rx="8" className="seat" />
          <line x1="235" y1="195" x2="325" y2="195" className="platform-base" />
        </>
      ) : (
        <>
          <rect x="205" y="126" width="140" height="24" rx="8" className="platform" />

          <path d="M248 154l13 13 13-26 13 26 13-26 13 26 13-13" className="platform-flex-spring" />

          <line x1="235" y1="184" x2="315" y2="184" className="platform-base" />
        </>
      )}

      <circle cx="274" cy="71" r="17" className="person-head" />
      <line x1="274" y1="88" x2="274" y2="126" className="person-line" />
      <line x1="274" y1="100" x2="250" y2="113" className="person-line" />
      <line x1="274" y1="100" x2="298" y2="113" className="person-line" />

      <line x1="375" y1={down ? 83 : 157} x2="375" y2={down ? 157 : 83} className="velocity-line" />

      <polygon
        points={down ? '375,170 365,151 385,151' : '375,70 365,89 385,89'}
        className="velocity-arrow"
      />

      <text x="405" y={down ? 181 : 60} className="velocity-label">
        السرعة
      </text>
    </svg>
  );
}

function renderQuestionPrompt(index: number, attempt: AttemptState): string {
  if (index === 0) return attempt.variants.mq1.prompt;
  if (index === 1) return attempt.variants.mq2.prompt;

  if (index === 2) {
    const variant = attempt.variants.mq3;
    const readings = variant.readingsHundredths.map((value) => formatHundredths(value)).join('، ');

    return `أسقط طالب كرة من ارتفاع ${variant.heightLabel}، وقاس زمن سقوطها يدويًا خمس مرات. سجّل في صفحة دفتر المختبر الأزمنة: ${readings} ثانية. ما متوسط زمن السقوط؟`;
  }

  if (index === 3) {
    const variant = attempt.variants.mq4;

    return `${variant.definition} أُزيحت العربة إلى أحد طرفي الحركة ثم أُطلقت منه. أكملت العربة ${variant.cycles} دورات كاملة خلال ${formatHundredths(variant.totalHundredths)} ثانية. ما زمن دورة كاملة واحدة؟`;
  }

  return attempt.variants.mq5.prompt;
}

export function Grade9TimeMeasurementMastery({
  questions,
  lessonId,
  onBackToLesson,
  initialSeed = 31,
}: Grade9TimeMeasurementMasteryProps) {
  const persistence = useMasteryResultPersistence(lessonId);

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<Responses>(EMPTY_RESPONSES);
  const [outcomes, setOutcomes] = useState<readonly ItemOutcome[] | null>(null);

  const [attempt, setAttempt] = useState<AttemptState>(() =>
    createAttempt(initialSeed, 0, EMPTY_HISTORY)
  );

  const mq1Candidates = useMemo(
    () =>
      orderMq1Candidates(attempt.variants.mq1, seedOffset(initialSeed, attempt.attemptNumber, 11)),
    [attempt, initialSeed]
  );

  const mq2Options = useMemo(
    () =>
      deterministicShuffle(
        attempt.variants.mq2.options,
        seedOffset(initialSeed, attempt.attemptNumber, 12)
      ),
    [attempt, initialSeed]
  );

  const mq3Choices = useMemo(
    () =>
      deterministicShuffle(
        buildMq3Choices(attempt.variants.mq3, attempt.attemptNumber % 3),
        seedOffset(initialSeed, attempt.attemptNumber, 13)
      ),
    [attempt, initialSeed]
  );

  const mq5Options = useMemo(
    () =>
      deterministicShuffle<{
        readonly id: string;
        readonly text: string;
        readonly diagnostic: string | null;
      }>(attempt.variants.mq5.options, seedOffset(initialSeed, attempt.attemptNumber, 15)),
    [attempt, initialSeed]
  );

  const currentComplete =
    currentIndex === 0
      ? responses.mq1.length === 4
      : currentIndex === 1
        ? responses.mq2 !== null
        : currentIndex === 2
          ? responses.mq3 !== null
          : currentIndex === 3
            ? responses.mq4.trim().length > 0
            : responses.mq5 !== null;

  function toggleMq1(stepId: string) {
    if (outcomes) return;

    setResponses((current) => {
      if (current.mq1.includes(stepId)) {
        return {
          ...current,
          mq1: current.mq1.filter((id) => id !== stepId),
        };
      }

      if (current.mq1.length >= 4) return current;

      return {
        ...current,
        mq1: [...current.mq1, stepId],
      };
    });
  }

  function moveMq1(index: number, delta: -1 | 1) {
    setResponses((current) => {
      const nextIndex = index + delta;
      if (nextIndex < 0 || nextIndex >= current.mq1.length) {
        return current;
      }

      const next = [...current.mq1];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];

      return { ...current, mq1: next };
    });
  }

  function finish() {
    if (
      outcomes ||
      responses.mq1.length !== 4 ||
      responses.mq2 === null ||
      responses.mq3 === null ||
      responses.mq4.trim().length === 0 ||
      responses.mq5 === null
    ) {
      return;
    }

    const mq1 = evaluateMq1(attempt.variants.mq1, responses.mq1);

    const mq2Review = getMq2Review(responses.mq2);
    const mq2Correct = mq2Review === null;

    const mq2: ItemOutcome = {
      correct: mq2Correct,
      reviewMessage: mq2Review,
      diagnostic: mq2Correct ? null : responses.mq2,
    };

    const selectedMq3 = mq3Choices.find((choice) => choice.displayMs === responses.mq3);

    if (!selectedMq3) {
      throw new Error('Selected MQ3 choice contract mismatch.');
    }

    const mq3Review = getMq3Review(selectedMq3);

    const mq3: ItemOutcome = {
      correct: selectedMq3.correct,
      reviewMessage: mq3Review,
      diagnostic: selectedMq3.correct
        ? null
        : (selectedMq3.diagnostic ?? 'generic-mean-calculation-error'),
    };

    const mq4Result = evaluateMq4NumericInput(responses.mq4, attempt.variants.mq4);

    const mq4Correct = mq4Result.status === 'correct';

    const mq4: ItemOutcome = {
      correct: mq4Correct,
      reviewMessage: getMq4Review(mq4Result),
      diagnostic: mq4Correct
        ? null
        : mq4Result.status === 'wrong'
          ? mq4Result.diagnostic
          : 'generic-period-calculation-error',
    };

    const selectedMq5 = attempt.variants.mq5.options.find((option) => option.id === responses.mq5);

    if (!selectedMq5) {
      throw new Error('Selected MQ5 option contract mismatch.');
    }

    const mq5Review = getMq5Review(responses.mq5, attempt.variants.mq5.correctOptionId);

    const mq5Correct = mq5Review === null;

    const mq5: ItemOutcome = {
      correct: mq5Correct,
      reviewMessage: mq5Review,
      diagnostic: mq5Correct ? null : selectedMq5.diagnostic,
    };

    const nextOutcomes = [mq1, mq2, mq3, mq4, mq5];

    setOutcomes(nextOutcomes);

    if (
      questions.length === 5 &&
      questions.every(
        (question) =>
          question.choices.length >= 2 &&
          Number.isInteger(question.correctAnswerIndex) &&
          question.correctAnswerIndex >= 0 &&
          question.correctAnswerIndex < question.choices.length
      )
    ) {
      const correctness = nextOutcomes.map((outcome) => outcome.correct);

      const answersByQuestionId = buildMasteryPersistenceAnswers(questions, correctness);

      const experienceContext = buildMasteryExperienceContext({
        correctness,
        diagnosticCodes: nextOutcomes.map((outcome) => outcome.diagnostic),
        attemptCount: attempt.attemptNumber + 1,
        variantHistory: attempt.history,
      });

      persistence.submitAttempt({
        questions,
        answersByQuestionId,
        experienceContext,
      });
    }
  }

  function retake() {
    const nextAttemptNumber = attempt.attemptNumber + 1;

    setAttempt(createAttempt(initialSeed, nextAttemptNumber, attempt.history));
    setResponses(EMPTY_RESPONSES);
    setOutcomes(null);
    setCurrentIndex(0);
    setStarted(true);
  }

  if (!started) {
    return (
      <section className="rafiq-l13-mastery-shell">
        <div className="rafiq-l13-mastery-intro">
          <span className="rafiq-l13-mastery-eyebrow">اختبار الإتقان</span>
          <h2>إتقان قياس الزمن</h2>
          <p>
            خمسة مواقف جديدة للتحقق من قدرتك على استخدام مفاهيم قياس الزمن في سياقات مختلفة. يمكنك
            مراجعة إجاباتك قبل التسليم النهائي.
          </p>
          <div className="rafiq-l13-mastery-intro-facts">
            <strong>5 مواقف</strong>
            <span>لا تلميحات أثناء المحاولة</span>
            <span>التغذية الراجعة بعد التسليم</span>
          </div>
          <button type="button" className="rafiq-l13-primary" onClick={() => setStarted(true)}>
            ابدأ اختبار الإتقان
          </button>
        </div>
        <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
      </section>
    );
  }

  if (outcomes) {
    const reportSummary = buildMasteryReportSummary(outcomes.map((outcome) => outcome.correct));

    const mastered = outcomes
      .map((outcome, index) => ({
        outcome,
        label: SKILL_LABELS[index],
      }))
      .filter((item) => item.outcome.correct);

    const review = outcomes
      .map((outcome, index) => ({
        outcome,
        label: SKILL_LABELS[index],
      }))
      .filter((item) => !item.outcome.correct);

    return (
      <section className="rafiq-l13-mastery-shell">
        <div className="rafiq-l13-report">
          <header>
            <span className="rafiq-l13-mastery-eyebrow">تقرير الإتقان</span>
            <h2>نتيجة التحقق</h2>
            <p>تظهر الملاحظات الآن بعد انتهاء المحاولة.</p>
          </header>

          <div className="rafiq-l13-report-summary">
            <section aria-label="الدرجة والمستوى">
              <strong>{reportSummary.scoreNof5}</strong>
              <p>{reportSummary.descriptor}</p>
            </section>

            <section aria-label="تحليل محاور الإتقان">
              <h3>تحليل المهارات</h3>
              <ul>
                <li>
                  <strong>استخدام أدوات التوقيت: </strong>
                  {reportStatusLabel(reportSummary.skillAxes.timingDevices)}
                </li>
                <li>
                  <strong>متوسط القياسات المتكررة: </strong>
                  {reportStatusLabel(reportSummary.skillAxes.repeatedMean)}
                </li>
                <li>
                  <strong>الزمن الدوري: </strong>
                  {reportStatusLabel(reportSummary.skillAxes.periodicTime)}
                </li>
              </ul>
            </section>

            <section aria-label="حالة أهداف التعلم">
              <h3>حالة الأهداف</h3>
              <p>
                <strong>الهدف 2-1: </strong>
                {reportStatusLabel(reportSummary.objective2_1Status)}
              </p>
              <p>
                <strong>الهدف 3-1: </strong>
                {reportStatusLabel(reportSummary.objective3_1Status)}
              </p>
              <p>
                <strong>تحقق جميع الأهداف: </strong>
                {reportSummary.allObjectivesMastered ? 'نعم' : 'ليس بعد'}
              </p>
            </section>

            <section aria-label="الإجراء التالي">
              <h3>الإجراء التالي</h3>
              <p>{reportSummary.nextAction}</p>
            </section>
          </div>

          <div className="rafiq-l13-report-grid">
            <section>
              <h3>ما أتقنته</h3>
              {mastered.length ? (
                <ul>
                  {mastered.map((item) => (
                    <li key={item.label}>{item.label}</li>
                  ))}
                </ul>
              ) : (
                <p>تحتاج المهارات الخمس إلى مراجعة.</p>
              )}
            </section>

            <section>
              <h3>ما يحتاج مراجعة</h3>
              {review.length ? (
                <ul>
                  {review.map((item) => (
                    <li key={item.label}>
                      <strong>{item.label}: </strong>
                      {item.outcome.reviewMessage}
                    </li>
                  ))}
                </ul>
              ) : (
                <p>لا توجد نقطة تحتاج مراجعة في هذه المحاولة.</p>
              )}
            </section>
          </div>

          <MasteryResultSaveStatus state={persistence.state} onRetry={persistence.retry} />

          <div className="rafiq-l13-report-actions">
            <button type="button" className="rafiq-l13-primary" onClick={retake}>
              إعادة التحقق بمواقف جديدة
            </button>
            <button type="button" className="rafiq-l13-secondary" onClick={onBackToLesson}>
              العودة إلى الدرس
            </button>
          </div>
        </div>
      </section>
    );
  }

  const prompt = renderQuestionPrompt(currentIndex, attempt);

  return (
    <section className="rafiq-l13-mastery-shell">
      <header className="rafiq-l13-progress-header">
        <div>
          <span>اختبار الإتقان</span>
          <strong>السؤال {currentIndex + 1} من 5</strong>
        </div>
        <div
          className="rafiq-l13-progress"
          role="progressbar"
          aria-label="تقدم اختبار الإتقان"
          aria-valuemin={1}
          aria-valuemax={5}
          aria-valuenow={currentIndex + 1}
        >
          <span
            style={{
              width: `${((currentIndex + 1) / 5) * 100}%`,
            }}
          />
        </div>
      </header>

      <article className="rafiq-l13-question-card">
        <MasteryVisual index={currentIndex} attempt={attempt} />

        <h2>
          <ScientificText text={prompt} />
        </h2>

        {currentIndex === 0 ? (
          <>
            <div className="rafiq-l13-step-grid" role="group" aria-label="الخطوات المتاحة">
              {mq1Candidates.map((step) => {
                const selected = responses.mq1.includes(step.id);

                return (
                  <button
                    key={step.id}
                    type="button"
                    className={selected ? 'rafiq-l13-step is-selected' : 'rafiq-l13-step'}
                    aria-pressed={selected}
                    onClick={() => toggleMq1(step.id)}
                  >
                    <ScientificText text={step.text} />
                  </button>
                );
              })}
            </div>

            <div className="rafiq-l13-selected-order" aria-label="الخطوات المختارة وترتيبها">
              <h3>الخطوات المختارة: {responses.mq1.length} من 4</h3>

              {responses.mq1.map((id, index) => {
                const step = attempt.variants.mq1.steps.find((item) => item.id === id);

                if (!step) return null;

                return (
                  <div key={id} className="rafiq-l13-order-row">
                    <span>
                      <ScientificText text={step.text} />
                    </span>
                    <div>
                      <button
                        type="button"
                        disabled={index === 0}
                        aria-label={`تحريك الخطوة ${index + 1} لأعلى`}
                        onClick={() => moveMq1(index, -1)}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={index === responses.mq1.length - 1}
                        aria-label={`تحريك الخطوة ${index + 1} لأسفل`}
                        onClick={() => moveMq1(index, 1)}
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : null}

        {currentIndex === 1 ? (
          <div className="rafiq-l13-choice-grid" role="group" aria-label="خيارات السؤال">
            {mq2Options.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={responses.mq2 === option.id}
                className={
                  responses.mq2 === option.id ? 'rafiq-l13-choice is-selected' : 'rafiq-l13-choice'
                }
                onClick={() =>
                  setResponses((current) => ({
                    ...current,
                    mq2: option.id,
                  }))
                }
              >
                <ScientificText text={option.text} />
              </button>
            ))}
          </div>
        ) : null}

        {currentIndex === 2 ? (
          <div className="rafiq-l13-choice-grid" role="group" aria-label="خيارات المتوسط">
            {mq3Choices.map((choice) => {
              const text = `${formatMsAsSeconds(choice.displayMs)} ثانية`;

              return (
                <button
                  key={`${choice.displayMs}-${choice.diagnostic ?? 'answer'}`}
                  type="button"
                  aria-pressed={responses.mq3 === choice.displayMs}
                  className={
                    responses.mq3 === choice.displayMs
                      ? 'rafiq-l13-choice is-selected'
                      : 'rafiq-l13-choice'
                  }
                  onClick={() =>
                    setResponses((current) => ({
                      ...current,
                      mq3: choice.displayMs,
                    }))
                  }
                >
                  {text}
                </button>
              );
            })}
          </div>
        ) : null}

        {currentIndex === 3 ? (
          <div className="rafiq-l13-numeric-field">
            <label htmlFor="l13-period-answer">زمن الدورة الواحدة</label>
            <div>
              <input
                id="l13-period-answer"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={responses.mq4}
                onChange={(event) =>
                  setResponses((current) => ({
                    ...current,
                    mq4: event.target.value,
                  }))
                }
              />
              <span>ثانية</span>
            </div>
          </div>
        ) : null}

        {currentIndex === 4 ? (
          <div className="rafiq-l13-choice-grid" role="group" aria-label="حالات نهاية الدورة">
            {mq5Options.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={responses.mq5 === option.id}
                className={
                  responses.mq5 === option.id ? 'rafiq-l13-choice is-selected' : 'rafiq-l13-choice'
                }
                onClick={() =>
                  setResponses((current) => ({
                    ...current,
                    mq5: option.id,
                  }))
                }
              >
                <ScientificText text={option.text} />
              </button>
            ))}
          </div>
        ) : null}

        <p className="rafiq-l13-silent-note">
          يمكنك تعديل إجابتك قبل التسليم النهائي. لن تظهر صحة الإجابة أثناء المحاولة.
        </p>
      </article>

      <div className="rafiq-l13-navigation">
        <button
          type="button"
          className="rafiq-l13-secondary"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))}
        >
          السؤال السابق
        </button>

        {currentIndex < 4 ? (
          <button
            type="button"
            className="rafiq-l13-primary"
            disabled={!currentComplete}
            onClick={() => setCurrentIndex((current) => Math.min(4, current + 1))}
          >
            السؤال التالي
          </button>
        ) : (
          <button
            type="button"
            className="rafiq-l13-primary"
            disabled={!currentComplete}
            onClick={finish}
          >
            تسليم الإجابات
          </button>
        )}
      </div>

      <StudentBackAction label="العودة إلى الدرس" onClick={onBackToLesson} />
    </section>
  );
}
