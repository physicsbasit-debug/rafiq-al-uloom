import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(
  'src/features/activities/time-measurement/Grade9TimeMeasurementActivities.tsx',
  'utf8'
);

describe('Lesson 1-3 activities visual identity contract', () => {
  it('يبقى على هوية science hub المعتمدة دون CSS موازي', () => {
    expect(source).toContain('rafiq-science-hub');
    expect(source).toContain('rafiq-learning-hub-hero');
    expect(source).toContain('rafiq-science-card-grid');
    expect(source).toContain('rafiq-science-card');
    expect(source).toContain('rafiq-science-card-visual');
    expect(source).not.toMatch(/Grade9TimeMeasurementActivities\.css/);
    expect(source).not.toContain('rafiq-l12-');
  });

  it('يستخدم الرسومات المخصصة لقياس الزمن', () => {
    expect(source).toContain('/lesson-visuals/activities/g9-time-measurement');
    expect(source).toContain('body-clock-inquiry.svg');
    expect(source).toContain('simulation-unavailable.svg');
    expect(source).toContain('pulse-data.svg');
    expect(source).toContain('pendulum-experiment.svg');
  });

  it('يجعل الأنشطة الثلاثة المنفذة متاحة ويبقي المحاكاة غير متوفرة', () => {
    expect(source.match(/state: 'available'/g)?.length).toBe(3);
    expect(source.match(/state: 'preparing'/g)?.length ?? 0).toBe(0);
    expect(source.match(/state: 'unavailable'/g)?.length).toBe(1);
  });
});
