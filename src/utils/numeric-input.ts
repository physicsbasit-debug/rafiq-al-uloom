const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const DECIMAL_SEPARATORS = /[.٫,]/g;

export type NumericUnitPolicy = 'reject' | 'strip';

export interface NormalizeNumericLexemeOptions {
  readonly unitPolicy: NumericUnitPolicy;
  readonly allowNegative: boolean;
}

const STRIPPABLE_TIME_UNITS = ['ثانية', 'ث', 's'] as const;

function toWesternDigits(value: string): string {
  return Array.from(value, (character) => {
    const arabicIndex = ARABIC_INDIC_DIGITS.indexOf(character);
    if (arabicIndex >= 0) return String(arabicIndex);

    const persianIndex = PERSIAN_DIGITS.indexOf(character);
    if (persianIndex >= 0) return String(persianIndex);

    return character;
  }).join('');
}

function stripKnownTrailingUnit(value: string): string | null {
  const trimmed = value.trim();

  for (const unit of STRIPPABLE_TIME_UNITS) {
    if (!trimmed.endsWith(unit)) continue;

    const numericPart = trimmed.slice(0, -unit.length).trim();
    return numericPart.length > 0 ? numericPart : null;
  }

  return trimmed;
}

/**
 * Normalizes only the lexical representation of a student-entered decimal.
 *
 * - Western / Arabic-Indic / Persian digits become Western digits.
 * - Dot, comma, and Arabic decimal separator become ".".
 * - unitPolicy="reject" rejects any unit/prose.
 * - unitPolicy="strip" strips only a known trailing time unit.
 * - Negative input is accepted only when allowNegative=true.
 * - Positive signs are intentionally rejected.
 *
 * Returns a canonical decimal string, not a floating-point value.
 */
export function normalizeNumericLexeme(
  rawValue: string,
  options: NormalizeNumericLexemeOptions
): string | null {
  let trimmed = rawValue.trim();
  if (!trimmed) return null;

  if (options.unitPolicy === 'strip') {
    const stripped = stripKnownTrailingUnit(trimmed);
    if (stripped === null) return null;
    trimmed = stripped;
  }

  const western = toWesternDigits(trimmed).replaceAll('−', '-');

  const separators = western.match(DECIMAL_SEPARATORS) ?? [];
  if (separators.length > 1) return null;

  const normalized = western.replace(/[٫,]/g, '.');

  const pattern = options.allowNegative
    ? /^-?(?:\d+(?:\.\d+)?|\.\d+)$/
    : /^(?:\d+(?:\.\d+)?|\.\d+)$/;

  if (!pattern.test(normalized)) return null;

  if (!options.allowNegative && normalized.startsWith('-')) return null;

  const unsigned = normalized.startsWith('-') ? normalized.slice(1) : normalized;

  const canonicalUnsigned = unsigned.startsWith('.') ? `0${unsigned}` : unsigned;

  return normalized.startsWith('-') ? `-${canonicalUnsigned}` : canonicalUnsigned;
}

/**
 * Existing strict student numeric field.
 *
 * Units/prose are rejected, signs are rejected.
 * Kept backward-compatible for review/activity callers.
 */
export function normalizeNumericInput(rawValue: string): number | null {
  const normalized = normalizeNumericLexeme(rawValue, {
    unitPolicy: 'reject',
    allowNegative: false,
  });

  if (normalized === null) return null;

  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : null;
}
