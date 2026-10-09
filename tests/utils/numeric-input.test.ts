import { describe, expect, it } from 'vitest';
import { normalizeNumericInput } from '@utils/numeric-input';

describe('normalizeNumericInput', () => {
  it.each([
    ['1.23', 1.23],
    ['١٫٢٣', 1.23],
    ['۱,۲۳', 1.23],
    ['.5', 0.5],
    ['٫٥', 0.5],
    ['۰.۵۰', 0.5],
    ['  0.50  ', 0.5],
  ])('يطبّع %s إلى %s', (raw, expected) => {
    expect(normalizeNumericInput(raw)).toBe(expected);
  });

  it.each(['', '   ', '1.2.3', '١٫٢,٣', '1 ثانية', '1s', 'abc', '١ ٢', '1.', '+1.2', '-1.2'])(
    'يرفض الإدخال غير العددي الصرف: %s',
    (raw) => {
      expect(normalizeNumericInput(raw)).toBeNull();
    }
  );
});
