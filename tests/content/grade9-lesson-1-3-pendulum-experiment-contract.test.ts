import { describe, expect, it } from 'vitest';

import { grade9Lesson13GuidedPendulumExperiment } from '@content/learning-design/grade9-lesson-1-3-learning-design';

describe('lesson 1-3 guided pendulum experiment contract', () => {
  it('يثبت بنية التجربة وعدد القياسات', () => {
    expect(grade9Lesson13GuidedPendulumExperiment.oneOscillationMeasurements).toBe(10);
    expect(grade9Lesson13GuidedPendulumExperiment.multiOscillationMeasurement).toBe(20);
    expect(grade9Lesson13GuidedPendulumExperiment.timerStation.mustTry).toEqual([
      'analog',
      'digital',
    ]);
  });

  it('يمنع المرجع المصطنع وحذف القراءات والحساب المسبق للمدى', () => {
    expect(grade9Lesson13GuidedPendulumExperiment.artificialReferenceValue).toBe(false);
    expect(grade9Lesson13GuidedPendulumExperiment.automaticOutlierDeletion).toBe(false);
    expect(grade9Lesson13GuidedPendulumExperiment.automaticRangeCalculationShown).toBe(false);
  });

  it('يثبت بروتوكول النقطة نفسها والاتجاه نفسه', () => {
    expect(grade9Lesson13GuidedPendulumExperiment.operationalProtocol).toBe(
      'ابدأ وأوقف القياس عند النقطة نفسها وفي الاتجاه نفسه.'
    );
  });

  it('لا يضيف مهمة مستقلة لإعادة تصميم الإجراء', () => {
    expect(grade9Lesson13GuidedPendulumExperiment.standaloneProcedureRedesign).toBe(false);
  });

  it('يسجل سؤال المتغيرات وخياراته وتشخيصاته في العقد', () => {
    const question = grade9Lesson13GuidedPendulumExperiment.controlledVariableQuestion;

    expect(question.choices).toHaveLength(7);
    expect(question.choices.filter((choice) => choice.correct)).toHaveLength(3);

    expect(
      question.choices.filter((choice) => choice.correct).map((choice) => choice.text)
    ).toEqual(['طول الخيط', 'الكرة المستخدمة', 'زاوية الإزاحة الابتدائية']);

    expect(question.choices.find((choice) => choice.id === 'oscillation-count')).toMatchObject({
      text: 'عدد الاهتزازات المقاسة',
      correct: false,
      diagnosis: 'changed-variable',
    });
  });

  it('يثبت عقد محطة القياس التفاعلية بعد اختيار الساعة', () => {
    const experiment = grade9Lesson13GuidedPendulumExperiment;

    expect(experiment.timerStation).toMatchObject({
      independentClocks: true,
      analogHasMovingHands: true,
      learnerChoosesTool: true,
    });

    expect(experiment.embeddedPendulum).toEqual({
      appearsAfterTimerChoice: true,
      interactive: true,
      measurementReferencePoint: true,
      remainsInsideGuidedExperiment: true,
      simulationCardRemainsUnavailable: true,
    });

    expect(experiment.measurementCapture).toMatchObject({
      usesChosenTimer: true,
      recordsReadingOnStop: true,
      learnerMayEditBeforeAcceptance: true,
    });
  });

  it('يثبت أقل تقسيم التناظرية 0.1 ثانية وحدود التقريب', () => {
    const experiment = grade9Lesson13GuidedPendulumExperiment;

    expect(experiment.timerStation).toMatchObject({
      analogResolutionSeconds: 0.1,
      analogDisplayDecimals: 1,
      digitalKeepsCurrentResolution: true,
    });

    expect(experiment.measurementCapture).toMatchObject({
      calculationsUseRecordedValues: true,
      noPrematureCalculatedValueRounding: true,
    });
  });
});
