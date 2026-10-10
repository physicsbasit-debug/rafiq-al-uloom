import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync('src/features/student/student-experience.css', 'utf8');

function channel(value: number): number {
  const normalized = value / 255;

  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string): number {
  const value = hex.replace('#', '');

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return 0.2126 * channel(red) + 0.7152 * channel(green) + 0.0722 * channel(blue);
}

function contrast(first: string, second: string): number {
  const one = luminance(first);
  const two = luminance(second);

  return (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05);
}

describe('lesson 1-3 pendulum visual contract', () => {
  it('يعطي هيدر التجربة الخلفية المعتمدة', () => {
    expect(css).toMatch(
      /\.rafiq-science-activity-header\.is-experiment\s*\{[\s\S]*?background:\s*linear-gradient\(135deg,\s*#005c50,\s*#0d7f6d\)/
    );
  });

  it('يحقق النص الأبيض 4.5:1 على طرفي التدرج', () => {
    expect(contrast('#ffffff', '#005c50')).toBeGreaterThanOrEqual(4.5);

    expect(contrast('#ffffff', '#0d7f6d')).toBeGreaterThanOrEqual(4.5);
  });

  it('يعطي الخيار المحدد حالة بصرية مستقلة', () => {
    expect(css).toContain('.rafiq-pendulum-control-choice.is-selected');

    expect(css).toContain('background: #e4f5f0;');

    expect(css).toContain('border-color: var(--student-green-2);');
  });
});
