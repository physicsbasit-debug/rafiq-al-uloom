import { normalizeNumericLexeme } from '@utils/numeric-input';

import type { TimeRacePair } from './time-race-bank';

export type NormalizedTimeDifferenceInput =
  | { readonly status: 'empty' }
  | { readonly status: 'invalid' }
  | { readonly status: 'valid'; readonly centiseconds: number };

export type TimeRaceErrorPattern =
  | 'no_borrow'
  | 'negative_difference'
  | 'decimal_shift_right'
  | 'decimal_shift_left'
  | 'integer_part_only';

const WESTERN_DIGITS = '0123456789';

function digitsToInteger(digits: string): number | null {
  if (digits.length === 0) return null;

  let value = 0;
  for (const digit of digits) {
    const digitValue = WESTERN_DIGITS.indexOf(digit);
    if (digitValue < 0) return null;
    value = value * 10 + digitValue;
    if (!Number.isSafeInteger(value)) return null;
  }

  return value;
}

function parseSignedParts(normalized: string): {
  readonly negative: boolean;
  readonly wholeDigits: string;
  readonly fractionDigits: string;
} | null {
  if (normalized.length === 0) return null;

  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;

  if (unsigned.length === 0 || unsigned.includes('-')) return null;

  const parts = unsigned.split('.');
  if (parts.length > 2) return null;

  const [wholeDigits, fractionDigits = ''] = parts;
  if (wholeDigits.length === 0) return null;
  if (fractionDigits.length === 0 && parts.length === 2) return null;

  if (![...wholeDigits, ...fractionDigits].every((digit) => WESTERN_DIGITS.includes(digit))) {
    return null;
  }

  return { negative, wholeDigits, fractionDigits };
}

function partsToCentiseconds(parts: {
  readonly negative: boolean;
  readonly wholeDigits: string;
  readonly fractionDigits: string;
}): number | null {
  const whole = digitsToInteger(parts.wholeDigits);
  if (whole === null) return null;

  const fraction = parts.fractionDigits;
  if (fraction.length > 2) {
    const extraDigits = fraction.slice(2);
    if ([...extraDigits].some((digit) => digit !== '0')) return null;
  }

  const hundredthsDigits =
    fraction.length === 0 ? '00' : fraction.length === 1 ? `${fraction}0` : fraction.slice(0, 2);
  const hundredths = digitsToInteger(hundredthsDigits);
  if (hundredths === null) return null;

  const absolute = whole * 100 + hundredths;
  if (!Number.isSafeInteger(absolute)) return null;

  return parts.negative ? -absolute : absolute;
}

export function normalizeTimeDifferenceInput(raw: string): NormalizedTimeDifferenceInput {
  if (raw.trim().length === 0) return { status: 'empty' };

  const normalized = normalizeNumericLexeme(raw, {
    unitPolicy: 'strip',
    allowNegative: true,
  });
  if (normalized === null) return { status: 'invalid' };

  const parts = parseSignedParts(normalized);
  if (parts === null) return { status: 'invalid' };

  const centiseconds = partsToCentiseconds(parts);
  if (centiseconds === null) return { status: 'invalid' };

  return { status: 'valid', centiseconds };
}

function padToEqualWidth(first: number, second: number): readonly [string, string] {
  const firstDigits = Math.abs(Math.trunc(first)).toString();
  const secondDigits = Math.abs(Math.trunc(second)).toString();
  const width = Math.max(firstDigits.length, secondDigits.length);
  return [firstDigits.padStart(width, '0'), secondDigits.padStart(width, '0')];
}

export function computeNoBorrowCentiseconds(firstCs: number, secondCs: number): number | null {
  const [first, second] = padToEqualWidth(firstCs, secondCs);
  let rawResult = '';

  for (let index = 0; index < first.length; index += 1) {
    const firstDigit = WESTERN_DIGITS.indexOf(first[index]);
    const secondDigit = WESTERN_DIGITS.indexOf(second[index]);
    rawResult += Math.abs(firstDigit - secondDigit).toString();
  }

  const computed = digitsToInteger(rawResult);
  if (computed === null) return null;

  const correct = Math.abs(firstCs - secondCs);
  return computed === correct ? null : computed;
}

function canonicalDifferenceText(differenceCs: number): string {
  const whole = Math.floor(differenceCs / 100);
  const fraction = (differenceCs % 100).toString().padStart(2, '0');
  return `${whole}.${fraction}`;
}

function normalizeRawForDiagnostic(raw: string): string | null {
  const normalized = normalizeNumericLexeme(raw, {
    unitPolicy: 'strip',
    allowNegative: true,
  });
  if (normalized === null) return null;

  const parts = parseSignedParts(normalized);
  if (parts === null) return null;

  const sign = parts.negative ? '-' : '';
  return `${sign}${parts.wholeDigits}${parts.fractionDigits.length > 0 ? `.${parts.fractionDigits}` : ''}`;
}

function shiftedLeftCanonical(differenceCs: number): string {
  const canonical = canonicalDifferenceText(differenceCs);
  const [whole, fraction] = canonical.split('.');
  const digits = `${whole}${fraction}`.replace(/^0+(?=\d)/, '');

  if (whole === '0') return `0.0${fraction}`;
  if (digits.length <= 3) return `0.${digits.padStart(3, '0')}`;

  const splitIndex = digits.length - 3;
  return `${digits.slice(0, splitIndex)}.${digits.slice(splitIndex)}`;
}

export function classifyTimeDifferenceError({
  rawInput,
  pair,
}: {
  readonly rawInput: string;
  readonly pair: TimeRacePair;
}): TimeRaceErrorPattern | null {
  const normalizedRaw = normalizeRawForDiagnostic(rawInput);
  if (normalizedRaw === null) return null;

  const parsed = normalizeTimeDifferenceInput(rawInput);
  const validCs = parsed.status === 'valid' ? parsed.centiseconds : null;
  const correct = pair.differenceCs;

  const noBorrow = computeNoBorrowCentiseconds(pair.nissanCs, pair.lamborghiniCs);
  if (noBorrow !== null && validCs === noBorrow) return 'no_borrow';
  if (validCs === -correct) return 'negative_difference';
  if (validCs === correct * 100) return 'decimal_shift_right';
  if (normalizedRaw === shiftedLeftCanonical(correct)) return 'decimal_shift_left';

  const integerPartOnly =
    Math.abs(Math.floor(pair.nissanCs / 100) - Math.floor(pair.lamborghiniCs / 100)) * 100;
  if (validCs === integerPartOnly) return 'integer_part_only';

  return null;
}
