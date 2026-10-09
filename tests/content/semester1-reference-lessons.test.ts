import { describe, expect, it } from 'vitest';
import {
  grade9ImportanceMeasurementReferenceLesson,
  grade9LengthVolumeReferenceLesson,
  grade9TimeMeasurementReferenceLesson,
  grade10StaticElectricityReferenceLesson,
  semester1ReferenceExperiments,
  semester1ReferenceGames,
  semester1ReferenceMasteryQuestions,
  semester1ReferenceObjectives,
  semester1ReferenceReviewQuestions,
} from '@content/seed/semester1-reference-lessons.seed';
import { isStudentReferencePreviewLesson } from '@content/student-reference-preview';
import { publicContentVisibility } from '@content/seed/public-content-visibility.seed';

describe('Phase 6-7C4 reference lessons', () => {
  it('يعتمد درسي أهمية القياس وقياس الطول والحجم رسميًا ويبقي الكهرباء الساكنة في المعاينة المؤقتة', () => {
    expect(grade9ImportanceMeasurementReferenceLesson.status).toBe('approved');
    expect(grade9LengthVolumeReferenceLesson.status).toBe('approved');
    expect(grade9TimeMeasurementReferenceLesson.status).toBe('draft');
    expect(grade10StaticElectricityReferenceLesson.status).toBe('draft');
    expect(isStudentReferencePreviewLesson('g9-phy-s1-u1-l1')).toBe(false);
    expect(isStudentReferencePreviewLesson('g10-phy-s1-u1-l1')).toBe(true);
    expect(isStudentReferencePreviewLesson('g9-phy-s1-u1-l3')).toBe(true);
    expect(isStudentReferencePreviewLesson('g9-phy-s1-u1-l2')).toBe(false);
    expect(publicContentVisibility.lessonIds).toContain('g9-phy-s1-u1-l1');
    expect(publicContentVisibility.lessonIds).toContain('g9-phy-s1-u1-l2');
    expect(publicContentVisibility.lessonIds).not.toContain('g10-phy-s1-u1-l1');
  });

  it('يعتمد عناصر الطالب المرتبطة بدرس أهمية القياس مع بقاء محتوى الكهرباء الساكنة مسودة', () => {
    const grade9Review = semester1ReferenceReviewQuestions.filter(
      ({ lessonId }) => lessonId === 'g9-phy-s1-u1-l1'
    );
    const grade9Mastery = semester1ReferenceMasteryQuestions.filter(
      ({ lessonId }) => lessonId === 'g9-phy-s1-u1-l1'
    );
    const grade9Games = semester1ReferenceGames.filter(
      ({ lessonId }) => lessonId === 'g9-phy-s1-u1-l1'
    );

    expect(grade9Review).toHaveLength(5);
    expect(grade9Mastery).toHaveLength(5);
    expect(grade9Games).toHaveLength(1);
    expect(grade9Review.every(({ status }) => status === 'approved')).toBe(true);
    expect(grade9Mastery.every(({ status }) => status === 'approved')).toBe(true);
    expect(grade9Games.every(({ status }) => status === 'approved')).toBe(true);

    expect(
      semester1ReferenceReviewQuestions
        .filter(({ lessonId }) => lessonId === 'g10-phy-s1-u1-l1')
        .every(({ status }) => status === 'draft')
    ).toBe(true);
    expect(
      semester1ReferenceMasteryQuestions
        .filter(({ lessonId }) => lessonId === 'g10-phy-s1-u1-l1')
        .every(({ status }) => status === 'draft')
    ).toBe(true);
  });

  it('يربط الأهداف بكل درس دون مراجع عابرة', () => {
    expect(
      semester1ReferenceObjectives.filter(({ lessonId }) => lessonId === 'g9-phy-s1-u1-l1')
    ).toHaveLength(2);
    expect(
      semester1ReferenceObjectives.filter(({ lessonId }) => lessonId === 'g9-phy-s1-u1-l2')
    ).toHaveLength(2);
    expect(
      semester1ReferenceObjectives.filter(({ lessonId }) => lessonId === 'g9-phy-s1-u1-l3')
    ).toHaveLength(2);
    expect(
      semester1ReferenceObjectives.filter(({ lessonId }) => lessonId === 'g10-phy-s1-u1-l1')
    ).toHaveLength(3);
  });

  it('يبني مراجعة وإتقانًا مستقلين لكل نموذج', () => {
    expect(
      semester1ReferenceReviewQuestions.filter(({ lessonId }) => lessonId === 'g9-phy-s1-u1-l1')
    ).toHaveLength(5);
    expect(
      semester1ReferenceReviewQuestions.filter(({ lessonId }) => lessonId === 'g10-phy-s1-u1-l1')
    ).toHaveLength(4);

    expect(
      semester1ReferenceMasteryQuestions.filter(({ lessonId }) => lessonId === 'g9-phy-s1-u1-l1')
    ).toHaveLength(5);
    expect(
      semester1ReferenceMasteryQuestions.filter(({ lessonId }) => lessonId === 'g10-phy-s1-u1-l1')
    ).toHaveLength(5);
  });

  it('يضيف لعبة ونشاطًا عمليًا واحدًا لكل درس دون استبدال المختبر الافتراضي', () => {
    expect(semester1ReferenceGames).toHaveLength(2);

    expect(
      semester1ReferenceExperiments.filter(({ lessonId }) => lessonId === 'g9-phy-s1-u1-l1')
    ).toHaveLength(0);

    expect(
      semester1ReferenceExperiments.filter(({ lessonId }) => lessonId === 'g10-phy-s1-u1-l1')
    ).toHaveLength(1);
  });
});
