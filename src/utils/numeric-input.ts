const ARABIC_INDIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const DECIMAL_SEPARATORS = /[.٫,]/g;

function toWesternDigits(value: string): string {
  return Array.from(value, (character) => {
    const arabicIndex = ARABIC_INDIC_DIGITS.indexOf(character);
    if (arabicIndex >= 0) return String(arabicIndex);

    const persianIndex = PERSIAN_DIGITS.indexOf(character);
    if (persianIndex >= 0) return String(persianIndex);

    return character;
  }).join('');
}

/**
 * Normalizes a student-entered decimal number without guessing through units or prose.
 * Accepted decimal separators: dot, Arabic decimal separator, comma.
 * Returns null for empty, mixed-text, signed, malformed, or multi-separator input.
 */
export function normalizeNumericInput(rawValue: string): number | null {
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  const western = toWesternDigits(trimmed);
  const separators = western.match(DECIMAL_SEPARATORS) ?? [];
  if (separators.length > 1) return null;

  const normalized = western.replace(/[٫,]/g, '.');
  if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return null;

  const numericValue = Number(normalized);
  return Number.isFinite(numericValue) ? numericValue : null;
}
