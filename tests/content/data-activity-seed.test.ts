import { describe, expect, it } from 'vitest';

import { grade10PhysicsWavesDataActivities } from '@content/seed/grade10-physics-waves-data';
import { grade10PhysicsWavesLessons } from '@content/seed/grade10-physics-waves';
import { parseDataActivityConfig } from '@shared-types/data-activity.types';

describe('Phase 5-4B scientific data seed', () => {
  it('يوفر نشاطًا واحدًا للدرس الثاني مرتبطًا بهدف v = f λ', () => {
    expect(grade10PhysicsWavesDataActivities).toHaveLength(1);
    expect(grade10PhysicsWavesDataActivities[0]).toMatchObject({
      id: 'g10-phy-waves-l2-data-frequency-wavelength',
      lessonId: 'g10-phy-waves-l2',
      objectiveIds: ['l2-o2'],
      status: 'approved',
      source: 'curriculum_seed',
    });
  });

  it('يربط النشاط المعتمد بدرس معتمد حتى يكون قابلاً للقراءة عبر RLS', () => {
    const lesson = grade10PhysicsWavesLessons.find(
      (candidate) => candidate.id === 'g10-phy-waves-l2'
    );

    expect(lesson).toBeDefined();
    expect(lesson?.status).toBe('approved');
  });

  it('يمر config عبر parser المعتمد بلا استثناء', () => {
    const activity = grade10PhysicsWavesDataActivities[0];
    expect(activity).toBeDefined();
    expect(() => parseDataActivityConfig(activity!.config)).not.toThrow();
  });

  it('تعكس نقاط البيانات العلاقة v = f λ عند سرعة 340 م/ث', () => {
    const activity = grade10PhysicsWavesDataActivities[0]!;
    const frequencies = activity.config.dataset.x.values;
    const wavelengths = activity.config.dataset.series[0]!.values;

    expect(frequencies).toHaveLength(wavelengths.length);
    frequencies.forEach((frequency, index) => {
      expect(frequency * wavelengths[index]!).toBeCloseTo(340, 10);
    });
  });

  it('لا يزرع مفتاح إجابة مسبقًا داخل المحتوى القابل للطالب', () => {
    const serialized = JSON.stringify(grade10PhysicsWavesDataActivities);
    expect(serialized).not.toMatch(
      /expectedValue|expectedAnswer|correctValue|answerKey|modelAnswer|referenceAnswer|teacherAnswer/
    );
  });
});
