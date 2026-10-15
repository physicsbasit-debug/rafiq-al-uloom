import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TIME_RACE_PAIRS } from '@features/games/time-race/time-race-bank';
import {
  classifyTimeDifferenceError,
  computeNoBorrowCentiseconds,
  normalizeTimeDifferenceInput,
} from '@features/games/time-race/time-race-input';

const MANUAL_NO_BORROW: Record<string, number | null> = {
  B01: 216,
  B02: null,
  B03: 173,
  B04: 1946,
  B05: 162,
  B06: null,
  B07: 1961,
  B08: 145,
  B09: null,
  B10: 1953,
  B11: 113,
  B12: null,
};

describe('L13 time race integer input contract', () => {
  it.each([
    ['1.84', 184],
    ['1.840', 184],
    ['1.8400', 184],
    ['١٫٨٤', 184],
    ['١,٨٤', 184],
    ['۱٫۸۴', 184],
  ])('يطبع %s إلى %i cs دون float', (raw, expected) => {
    expect(normalizeTimeDifferenceInput(raw)).toEqual({
      status: 'valid',
      centiseconds: expected,
    });
  });

  it.each(['1.83', '1.85', '1.841', '0.184', '1.8.4', '1,234.56', 'abc', '١٫٨٤٫٠'])(
    'يرفض الصيغة غير المطابقة أو غير الدقيقة كمصحح إجابة: %s',
    (raw) => {
      const result = normalizeTimeDifferenceInput(raw);
      if (raw === '1.83' || raw === '1.85') {
        expect(result).toEqual({
          status: 'valid',
          centiseconds: raw === '1.83' ? 183 : 185,
        });
      } else {
        expect(result.status).toBe('invalid');
      }
    }
  );

  it('الإدخال الفارغ لا يُحسب محاولة', () => {
    expect(normalizeTimeDifferenceInput('   ')).toEqual({ status: 'empty' });
  });

  it('يقبل الإشارة السالبة بصيغة centiseconds دقيقة حتى يمكن تشخيص negative_difference', () => {
    expect(normalizeTimeDifferenceInput('-1.84')).toEqual({
      status: 'valid',
      centiseconds: -184,
    });
    expect(normalizeTimeDifferenceInput('−١٫٨٤')).toEqual({
      status: 'valid',
      centiseconds: -184,
    });
  });

  it('خوارزمية no_borrow تطابق الجدول اليدوي الثابت لكل الأزواج', () => {
    for (const pair of TIME_RACE_PAIRS) {
      const computed = computeNoBorrowCentiseconds(pair.nissanCs, pair.lamborghiniCs);
      expect(computed).toBe(MANUAL_NO_BORROW[pair.id]);
    }
  });

  it('يشخص الأنماط المعتمدة على B01 من النص الخام دون تمرير float', () => {
    const pair = TIME_RACE_PAIRS.find((candidate) => candidate.id === 'B01');
    expect(pair).toBeDefined();
    if (!pair) return;

    expect(classifyTimeDifferenceError({ rawInput: '2.16', pair })).toBe('no_borrow');
    expect(classifyTimeDifferenceError({ rawInput: '-1.84', pair })).toBe('negative_difference');
    expect(classifyTimeDifferenceError({ rawInput: '184', pair })).toBe('decimal_shift_right');

    // 0.184 is intentionally invalid as a final answer (three decimal places),
    // but the diagnostic layer must still recognize it exactly from raw text.
    expect(normalizeTimeDifferenceInput('0.184').status).toBe('invalid');
    expect(classifyTimeDifferenceError({ rawInput: '0.184', pair })).toBe('decimal_shift_left');

    expect(classifyTimeDifferenceError({ rawInput: '2', pair })).toBe('integer_part_only');
  });

  it('مصحح الإجابة لا يستخدم parseFloat أو Number(', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/games/time-race/time-race-input.ts'),
      'utf8'
    );

    expect(source).not.toContain('parseFloat(');
    expect(source).not.toContain('Number(');
  });
});
