import { normalizeNumericLexeme } from '@utils/numeric-input';

interface VariantLike {
  readonly variantKey: string;
}

interface SelectMasteryVariantOptions<T extends VariantLike> {
  readonly variants: readonly T[];
  readonly seed: number;
  readonly seenVariantKeys: readonly string[];
  readonly lastVariantKey: string | null;
}

interface Mq1Step {
  readonly id: string;
  readonly text: string;
  readonly diagnostic: string | null;
}

interface Mq1Variant {
  readonly steps: readonly Mq1Step[];
}

interface Mq3Variant {
  readonly sumHundredths: number;
  readonly meanHundredths: number;
  readonly medianHundredths: number;
}

interface Mq4Variant {
  readonly totalHundredths: number;
  readonly correctHundredths: number;
  readonly multipliedHundredths: number;
  readonly reversedTargetThousandths: number;
  readonly reversedToleranceThousandths: number;
}

export type Mq3Diagnostic =
  | 'used-total-instead-of-mean'
  | 'used-median-instead-of-mean'
  | 'divided-by-too-few-trials'
  | 'divided-by-too-many-trials';

export interface Mq3Choice {
  readonly displayMs: number;
  readonly correct: boolean;
  readonly diagnostic: Mq3Diagnostic | null;
}

export type Mq4Evaluation =
  | { readonly status: 'empty' }
  | { readonly status: 'invalid' }
  | { readonly status: 'correct' }
  | {
      readonly status: 'wrong';
      readonly diagnostic:
        | 'used-total-time'
        | 'multiplied-instead-of-divided'
        | 'reversed-division'
        | 'generic-period-calculation-error';
    };

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) return 1;
  const value = Math.abs(Math.trunc(seed));
  return value === 0 ? 1 : value;
}

function createPrng(seed: number): () => number {
  let state = normalizeSeed(seed) >>> 0;

  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

export function selectMasteryVariant<T extends VariantLike>({
  variants,
  seed,
  seenVariantKeys,
  lastVariantKey,
}: SelectMasteryVariantOptions<T>): T {
  if (variants.length === 0) {
    throw new Error('At least one mastery variant is required.');
  }

  const seen = new Set(seenVariantKeys);

  const unseen = variants.filter((variant) => !seen.has(variant.variantKey));

  let candidates = unseen.length > 0 ? unseen : [...variants];

  if (candidates.length > 1 && lastVariantKey !== null) {
    const withoutLast = candidates.filter((variant) => variant.variantKey !== lastVariantKey);

    if (withoutLast.length > 0) {
      candidates = withoutLast;
    }
  }

  if (unseen.length === 0) {
    const oldestLastSeenIndex = Math.min(
      ...candidates.map((variant) => seenVariantKeys.lastIndexOf(variant.variantKey))
    );

    candidates = candidates.filter(
      (variant) => seenVariantKeys.lastIndexOf(variant.variantKey) === oldestLastSeenIndex
    );
  }

  const random = createPrng(seed);
  const index = Math.floor(random() * candidates.length);

  return candidates[index];
}

function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [Array.from(items)];

  const result: T[][] = [];

  items.forEach((item, index) => {
    const remaining = [...items.slice(0, index), ...items.slice(index + 1)];

    for (const tail of permutations(remaining)) {
      result.push([item, ...tail]);
    }
  });

  return result;
}

function hasCorrectRelativeAbcdOrder(ids: readonly string[]): boolean {
  const positions = ['A', 'B', 'C', 'D'].map((id) => ids.indexOf(id));

  return positions[0] < positions[1] && positions[1] < positions[2] && positions[2] < positions[3];
}

function startsWithBothDistractors(ids: readonly string[]): boolean {
  if (ids.length < 2) return false;
  return (
    new Set(ids.slice(0, 2)).size === 2 && ids.slice(0, 2).every((id) => id === 'E' || id === 'F')
  );
}

export function orderMq1Candidates(variant: Mq1Variant, seed: number): readonly Mq1Step[] {
  const valid = permutations(variant.steps).filter((candidate) => {
    const ids = candidate.map((step) => step.id);

    return !hasCorrectRelativeAbcdOrder(ids) && !startsWithBothDistractors(ids);
  });

  if (valid.length === 0) {
    throw new Error('No valid MQ1 candidate ordering exists.');
  }

  const random = createPrng(seed);
  return valid[Math.floor(random() * valid.length)];
}

function roundPositiveRationalHalfUp(numerator: number, denominator: number): number {
  if (
    !Number.isSafeInteger(numerator) ||
    !Number.isSafeInteger(denominator) ||
    numerator < 0 ||
    denominator <= 0
  ) {
    throw new Error('Positive safe integers are required.');
  }

  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

function hundredthsToMs(hundredths: number): number {
  return hundredths * 10;
}

export function buildMq3Choices(variant: Mq3Variant, rotation: number): readonly Mq3Choice[] {
  const correct: Mq3Choice = {
    displayMs: hundredthsToMs(variant.meanHundredths),
    correct: true,
    diagnostic: null,
  };

  const median: Mq3Choice = {
    displayMs: hundredthsToMs(variant.medianHundredths),
    correct: false,
    diagnostic: 'used-median-instead-of-mean',
  };

  const rotatingPool: readonly Mq3Choice[] = [
    {
      displayMs: hundredthsToMs(variant.sumHundredths),
      correct: false,
      diagnostic: 'used-total-instead-of-mean',
    },
    {
      displayMs: hundredthsToMs(roundPositiveRationalHalfUp(variant.sumHundredths, 4)),
      correct: false,
      diagnostic: 'divided-by-too-few-trials',
    },
    {
      displayMs: hundredthsToMs(roundPositiveRationalHalfUp(variant.sumHundredths, 6)),
      correct: false,
      diagnostic: 'divided-by-too-many-trials',
    },
  ];

  const normalizedRotation = ((Math.trunc(rotation) % 3) + 3) % 3;

  const rotatingPairs = [
    [rotatingPool[0], rotatingPool[1]],
    [rotatingPool[0], rotatingPool[2]],
    [rotatingPool[1], rotatingPool[2]],
  ] as const;

  return [correct, median, ...rotatingPairs[normalizedRotation]];
}

interface DecimalParts {
  readonly negative: boolean;
  readonly whole: string;
  readonly fraction: string;
}

function parseNormalizedDecimal(normalized: string): DecimalParts | null {
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;

  const pieces = unsigned.split('.');
  if (pieces.length > 2) return null;

  const whole = pieces[0];
  const fraction = pieces[1] ?? '';

  if (!/^\d+$/.test(whole)) return null;
  if (fraction && !/^\d+$/.test(fraction)) return null;

  return { negative, whole, fraction };
}

function digitsToSafeInteger(digits: string): number | null {
  let result = 0;

  for (const character of digits) {
    const digit = character.charCodeAt(0) - 48;
    if (digit < 0 || digit > 9) return null;

    result = result * 10 + digit;
    if (!Number.isSafeInteger(result)) return null;
  }

  return result;
}

function decimalToScaledInteger(normalized: string, scaleDigits: number): number | null {
  const parts = parseNormalizedDecimal(normalized);
  if (!parts || parts.negative) return null;

  const extra = parts.fraction.slice(scaleDigits);
  if ([...extra].some((digit) => digit !== '0')) return null;

  const fraction = parts.fraction.slice(0, scaleDigits).padEnd(scaleDigits, '0');

  const wholeValue = digitsToSafeInteger(parts.whole);
  const fractionValue = digitsToSafeInteger(fraction || '0');

  if (wholeValue === null || fractionValue === null) return null;

  const scale = 10 ** scaleDigits;
  const value = wholeValue * scale + fractionValue;

  return Number.isSafeInteger(value) ? value : null;
}

export function evaluateMq4NumericInput(raw: string, variant: Mq4Variant): Mq4Evaluation {
  if (raw.trim().length === 0) {
    return { status: 'empty' };
  }

  const normalized = normalizeNumericLexeme(raw, {
    unitPolicy: 'reject',
    allowNegative: false,
  });

  if (normalized === null) {
    return { status: 'invalid' };
  }

  const hundredths = decimalToScaledInteger(normalized, 2);

  if (hundredths === variant.correctHundredths) {
    return { status: 'correct' };
  }

  if (hundredths === variant.totalHundredths) {
    return {
      status: 'wrong',
      diagnostic: 'used-total-time',
    };
  }

  if (hundredths === variant.multipliedHundredths) {
    return {
      status: 'wrong',
      diagnostic: 'multiplied-instead-of-divided',
    };
  }

  const thousandths = decimalToScaledInteger(normalized, 3);

  if (
    thousandths !== null &&
    Math.abs(thousandths - variant.reversedTargetThousandths) <=
      variant.reversedToleranceThousandths
  ) {
    return {
      status: 'wrong',
      diagnostic: 'reversed-division',
    };
  }

  return {
    status: 'wrong',
    diagnostic: 'generic-period-calculation-error',
  };
}

export type MasteryReportStatus = 'mastered' | 'needs_reinforcement' | 'needs_review';

export type MasteryLessonLevel = 'advanced_mastery' | 'good' | 'consolidating' | 'focused_review';

export interface MasteryReportSummary {
  readonly scoreNof5: string;
  readonly descriptor: 'إتقان مرحلي متقدم' | 'جيد' | 'قيد التثبيت' | 'يحتاج مراجعة مركزة';
  readonly lessonMasteryLevel: MasteryLessonLevel;
  readonly skillAxes: {
    readonly timingDevices: MasteryReportStatus;
    readonly repeatedMean: MasteryReportStatus;
    readonly periodicTime: MasteryReportStatus;
  };
  readonly objective2_1Status: MasteryReportStatus;
  readonly objective3_1Status: MasteryReportStatus;
  readonly allObjectivesMastered: boolean;
  readonly nextAction: string;
}

function twoQuestionAxisStatus(firstCorrect: boolean, secondCorrect: boolean): MasteryReportStatus {
  if (firstCorrect && secondCorrect) return 'mastered';
  if (firstCorrect || secondCorrect) return 'needs_reinforcement';
  return 'needs_review';
}

function reportLevelFromScore(score: number): {
  readonly descriptor: MasteryReportSummary['descriptor'];
  readonly lessonMasteryLevel: MasteryLessonLevel;
} {
  if (score === 5) {
    return {
      descriptor: 'إتقان مرحلي متقدم',
      lessonMasteryLevel: 'advanced_mastery',
    };
  }

  if (score === 4) {
    return {
      descriptor: 'جيد',
      lessonMasteryLevel: 'good',
    };
  }

  if (score === 3) {
    return {
      descriptor: 'قيد التثبيت',
      lessonMasteryLevel: 'consolidating',
    };
  }

  return {
    descriptor: 'يحتاج مراجعة مركزة',
    lessonMasteryLevel: 'focused_review',
  };
}

function nextActionFromCorrectness(correctness: readonly boolean[]): string {
  if (!correctness[0]) {
    return 'راجع خطوات تشغيل المؤقت وحدود بداية القياس ونهايته.';
  }

  if (!correctness[1]) {
    return 'راجع الفرق بين عدد المنازل العشرية ودقة القياس وأثر زمن الاستجابة في التشغيل اليدوي للمؤقت الرقمي.';
  }

  if (!correctness[2]) {
    return 'راجع حساب متوسط القياسات المتكررة بجمع القياسات ثم القسمة على عددها.';
  }

  if (!correctness[3]) {
    return 'راجع حساب زمن الدورة الواحدة بقسمة الزمن الكلي على عدد الدورات.';
  }

  if (!correctness[4]) {
    return 'راجع معنى الدورة الكاملة والعودة إلى موضع البداية نفسه وباتجاه الحركة نفسه.';
  }

  return 'حافظ على هذا الإتقان وطبّق مهارات قياس الزمن في مواقف جديدة.';
}

export function buildMasteryReportSummary(correctness: readonly boolean[]): MasteryReportSummary {
  if (correctness.length !== 5 || correctness.some((value) => typeof value !== 'boolean')) {
    throw new Error('L13 mastery report requires exactly five boolean outcomes.');
  }

  const score = correctness.filter(Boolean).length;

  const timingDevices = twoQuestionAxisStatus(correctness[0], correctness[1]);

  const repeatedMean: MasteryReportStatus = correctness[2] ? 'mastered' : 'needs_review';

  const periodicTime = twoQuestionAxisStatus(correctness[3], correctness[4]);

  const objective2_1Status = timingDevices;

  let objective3_1Status: MasteryReportStatus;

  if (repeatedMean === 'needs_review' || periodicTime === 'needs_review') {
    objective3_1Status = 'needs_review';
  } else if (periodicTime === 'needs_reinforcement') {
    objective3_1Status = 'needs_reinforcement';
  } else {
    objective3_1Status = 'mastered';
  }

  const level = reportLevelFromScore(score);

  return {
    scoreNof5: `${score}/5`,
    descriptor: level.descriptor,
    lessonMasteryLevel: level.lessonMasteryLevel,
    skillAxes: {
      timingDevices,
      repeatedMean,
      periodicTime,
    },
    objective2_1Status,
    objective3_1Status,
    allObjectivesMastered: objective2_1Status === 'mastered' && objective3_1Status === 'mastered',
    nextAction: nextActionFromCorrectness(correctness),
  };
}

export type MasteryVariantHistory = Readonly<{
  readonly mq1: readonly string[];
  readonly mq2: readonly string[];
  readonly mq3: readonly string[];
  readonly mq4: readonly string[];
  readonly mq5: readonly string[];
}>;

export interface BuildMasteryExperienceContextInput {
  readonly correctness: readonly boolean[];
  readonly diagnosticCodes: readonly (string | null)[];
  readonly attemptCount: number;
  readonly variantHistory: MasteryVariantHistory;
}

export type Grade9L13MasteryExperienceContext = Readonly<{
  readonly schema: 'g9-l13-time-mastery-v1';
  readonly scoreNof5: string;
  readonly lessonMasteryLevel: MasteryLessonLevel;
  readonly objective2_1Status: MasteryReportStatus;
  readonly objective3_1Status: MasteryReportStatus;
  readonly allObjectivesMastered: boolean;
  readonly diagnosticCodes: readonly (string | null)[];
  readonly attemptCount: number;
  readonly variantHistory: MasteryVariantHistory;
}>;

function isValidVariantHistory(history: MasteryVariantHistory): boolean {
  return [history.mq1, history.mq2, history.mq3, history.mq4, history.mq5].every(
    (items) =>
      Array.isArray(items) &&
      items.every((item) => typeof item === 'string' && item.trim().length > 0)
  );
}

export function buildMasteryExperienceContext(
  input: BuildMasteryExperienceContextInput
): Grade9L13MasteryExperienceContext {
  if (
    input.correctness.length !== 5 ||
    input.correctness.some((value) => typeof value !== 'boolean')
  ) {
    throw new Error('L13 mastery experience context requires exactly five boolean outcomes.');
  }

  if (
    input.diagnosticCodes.length !== 5 ||
    input.diagnosticCodes.some((value) => value !== null && typeof value !== 'string')
  ) {
    throw new Error('L13 mastery experience context requires exactly five diagnostics.');
  }

  if (!Number.isInteger(input.attemptCount) || input.attemptCount < 1) {
    throw new Error('L13 mastery attemptCount must be a positive integer.');
  }

  if (!isValidVariantHistory(input.variantHistory)) {
    throw new Error('L13 mastery variant history is invalid.');
  }

  const report = buildMasteryReportSummary(input.correctness);

  return {
    schema: 'g9-l13-time-mastery-v1',
    scoreNof5: report.scoreNof5,
    lessonMasteryLevel: report.lessonMasteryLevel,
    objective2_1Status: report.objective2_1Status,
    objective3_1Status: report.objective3_1Status,
    allObjectivesMastered: report.allObjectivesMastered,
    diagnosticCodes: [...input.diagnosticCodes],
    attemptCount: input.attemptCount,
    variantHistory: {
      mq1: [...input.variantHistory.mq1],
      mq2: [...input.variantHistory.mq2],
      mq3: [...input.variantHistory.mq3],
      mq4: [...input.variantHistory.mq4],
      mq5: [...input.variantHistory.mq5],
    },
  };
}

export interface ScoreCarrierQuestion {
  readonly id: string;
  readonly choices: readonly string[];
  readonly correctAnswerIndex: number;
}

/**
 * Converts specialized L13 correctness to the existing multiple-choice
 * persistence contract without changing the seed question scoring fingerprint.
 *
 * Correct specialized response -> original correctAnswerIndex.
 * Wrong specialized response   -> any valid original non-correct index.
 */
export function buildMasteryPersistenceAnswers(
  questions: readonly ScoreCarrierQuestion[],
  correctness: readonly boolean[]
): Record<string, number> {
  if (questions.length !== correctness.length) {
    throw new Error('Mastery score-carrier question count mismatch.');
  }

  const answers: Record<string, number> = {};

  questions.forEach((question, index) => {
    if (
      question.choices.length < 2 ||
      !Number.isInteger(question.correctAnswerIndex) ||
      question.correctAnswerIndex < 0 ||
      question.correctAnswerIndex >= question.choices.length
    ) {
      throw new Error('Invalid mastery score-carrier question contract.');
    }

    const wrongIndex = question.correctAnswerIndex === 0 ? 1 : 0;

    answers[question.id] = correctness[index] ? question.correctAnswerIndex : wrongIndex;
  });

  return answers;
}
