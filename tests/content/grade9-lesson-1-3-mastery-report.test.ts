import { describe, expect, it } from 'vitest';

import { buildMasteryReportSummary } from '@features/mastery/grade9-time-measurement/mastery-engine';

describe('L13 mastery report contract', () => {
  it('يبني تقرير 5/5 بالمستوى والمحاور والهدفين', () => {
    const report = buildMasteryReportSummary([true, true, true, true, true]);

    expect(report).toMatchObject({
      scoreNof5: '5/5',
      descriptor: 'إتقان مرحلي متقدم',
      lessonMasteryLevel: 'advanced_mastery',
      skillAxes: {
        timingDevices: 'mastered',
        repeatedMean: 'mastered',
        periodicTime: 'mastered',
      },
      objective2_1Status: 'mastered',
      objective3_1Status: 'mastered',
      allObjectivesMastered: true,
    });

    expect(report.nextAction.trim().length).toBeGreaterThan(0);
  });

  it('يبني 4/5 = جيد ويحدد حاجة محور التوقيت إلى التعزيز', () => {
    const report = buildMasteryReportSummary([true, false, true, true, true]);

    expect(report).toMatchObject({
      scoreNof5: '4/5',
      descriptor: 'جيد',
      lessonMasteryLevel: 'good',
      skillAxes: {
        timingDevices: 'needs_reinforcement',
        repeatedMean: 'mastered',
        periodicTime: 'mastered',
      },
      objective2_1Status: 'needs_reinforcement',
      objective3_1Status: 'mastered',
      allObjectivesMastered: false,
    });

    expect(report.nextAction).toMatch(/المنازل العشرية|زمن الاستجابة|المؤقت الرقمي/);
  });

  it('يبني 3/5 = قيد التثبيت ويطبق حالة التعزيز للهدف 3-1', () => {
    const report = buildMasteryReportSummary([true, false, true, true, false]);

    expect(report).toMatchObject({
      scoreNof5: '3/5',
      descriptor: 'قيد التثبيت',
      lessonMasteryLevel: 'consolidating',
      skillAxes: {
        timingDevices: 'needs_reinforcement',
        repeatedMean: 'mastered',
        periodicTime: 'needs_reinforcement',
      },
      objective2_1Status: 'needs_reinforcement',
      objective3_1Status: 'needs_reinforcement',
      allObjectivesMastered: false,
    });
  });

  it('يبني 0-2/5 = يحتاج مراجعة مركزة', () => {
    const report = buildMasteryReportSummary([true, false, false, false, true]);

    expect(report).toMatchObject({
      scoreNof5: '2/5',
      descriptor: 'يحتاج مراجعة مركزة',
      lessonMasteryLevel: 'focused_review',
      skillAxes: {
        timingDevices: 'needs_reinforcement',
        repeatedMean: 'needs_review',
        periodicTime: 'needs_reinforcement',
      },
      objective2_1Status: 'needs_reinforcement',
      objective3_1Status: 'needs_review',
      allObjectivesMastered: false,
    });
  });

  it('يصنف المحاور الثلاثة needs_review عندما تكون الإجابات كلها خاطئة', () => {
    const report = buildMasteryReportSummary([false, false, false, false, false]);

    expect(report).toMatchObject({
      scoreNof5: '0/5',
      descriptor: 'يحتاج مراجعة مركزة',
      lessonMasteryLevel: 'focused_review',
      skillAxes: {
        timingDevices: 'needs_review',
        repeatedMean: 'needs_review',
        periodicTime: 'needs_review',
      },
      objective2_1Status: 'needs_review',
      objective3_1Status: 'needs_review',
      allObjectivesMastered: false,
    });

    expect(report.nextAction.trim().length).toBeGreaterThan(0);
  });

  it('يرفض أي عدد نتائج غير خمسة بدل إنتاج تقرير مضلل', () => {
    expect(() =>
      buildMasteryReportSummary([true, true, true, true] as unknown as readonly boolean[])
    ).toThrow();
  });
});
