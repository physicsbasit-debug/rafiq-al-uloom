import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { normalizeNumericInput, normalizeNumericLexeme } from '@utils/numeric-input';

describe('shared numeric normalizer unit policy RED', () => {
  it('يبقي الإتقان والمراجعة على unitPolicy=reject', () => {
    expect(
      normalizeNumericLexeme('١٫٨٤ ثانية', {
        unitPolicy: 'reject',
        allowNegative: false,
      })
    ).toBeNull();

    expect(normalizeNumericInput('1 ثانية')).toBeNull();
    expect(normalizeNumericInput('1s')).toBeNull();
  });

  it('يسمح للسباق بسياسة strip دون نسخ تطبيع الأرقام', () => {
    expect(
      normalizeNumericLexeme('١٫٨٤ ثانية', {
        unitPolicy: 'strip',
        allowNegative: true,
      })
    ).toBe('1.84');

    expect(
      normalizeNumericLexeme('−١٫٨٤ ث', {
        unitPolicy: 'strip',
        allowNegative: true,
      })
    ).toBe('-1.84');
  });

  it('يرفض الفواصل المتعددة في السياستين', () => {
    for (const unitPolicy of ['reject', 'strip'] as const) {
      expect(
        normalizeNumericLexeme('١٫٢,٣', {
          unitPolicy,
          allowNegative: true,
        })
      ).toBeNull();
    }
  });

  it('يبقي السالب مرفوضًا افتراضيًا خارج مسار التشخيص الذي يسمح به', () => {
    expect(
      normalizeNumericLexeme('-1.84', {
        unitPolicy: 'reject',
        allowNegative: false,
      })
    ).toBeNull();
  });

  it('يفرض على مصحح السباق إعادة استخدام الطبقة المشتركة', () => {
    const source = readFileSync('src/features/games/time-race/time-race-input.ts', 'utf8');

    expect(source).toContain('@utils/numeric-input');
    expect(source).toContain('normalizeNumericLexeme');

    expect(source).not.toContain('const ARABIC_INDIC_DIGITS');
    expect(source).not.toContain('const EASTERN_ARABIC_DIGITS');
  });
});
