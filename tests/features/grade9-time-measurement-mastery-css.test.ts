import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync('src/features/mastery/Grade9TimeMeasurementMastery.css', 'utf8');

function cssRule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 'm'));

  if (!match) {
    throw new Error(`CSS rule not found: ${selector}`);
  }

  return match[1];
}

describe('L13 mastery primary button contrast', () => {
  it('لا يستخدم لون النص نفسه كخلفية للزر الأساسي', () => {
    const primary = cssRule('.rafiq-l13-primary');

    expect(primary).not.toMatch(/background(?:-color)?\s*:\s*currentColor\s*;/);
  });

  it('يحدد لون نص صريحًا للزر الأساسي ولا يستخدم inherit', () => {
    const primary = cssRule('.rafiq-l13-primary');

    const colorMatch = primary.match(/(?:^|[;\n])\s*color\s*:\s*([^;]+);/);

    expect(colorMatch).not.toBeNull();
    expect(colorMatch?.[1].trim()).not.toBe('inherit');
  });

  it('يستخدم هوية التعلم الخضراء المعتمدة بدل الأزرق العام', () => {
    const primary = cssRule('.rafiq-l13-primary');

    expect(primary).toContain('#004d40');
    expect(primary).toContain('#00695c');
    expect(primary).not.toContain('var(--color-primary');
  });
});
