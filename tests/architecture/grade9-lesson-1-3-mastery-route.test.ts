import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('L13 specialized mastery route RED', () => {
  it('يوجه الدرس 1-3 إلى مكوّن إتقان متخصص مثل الدرس 1-2', () => {
    const source = readFileSync('src/features/mastery/MasteryTestView.tsx', 'utf8');

    expect(source).toContain(
      "import { Grade9TimeMeasurementMastery } from './Grade9TimeMeasurementMastery';"
    );

    expect(source).toMatch(
      /lessonId\s*===\s*['"]g9-phy-s1-u1-l3['"][\s\S]{0,220}<Grade9TimeMeasurementMastery/
    );
  });

  it('لا يوسّع Question العام قسرًا من أجل ordering/numeric الخاصين بـL13', () => {
    const source = readFileSync('src/types/quiz.types.ts', 'utf8');

    expect(source).toContain("export type QuestionType = 'multiple_choice';");
    expect(source).not.toMatch(/['"]ordering['"]/);
    expect(source).not.toMatch(/['"]numeric['"]/);
  });
});
