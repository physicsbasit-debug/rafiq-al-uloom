import { describe, expect, it } from 'vitest';
import { buildTimeRaceReport } from '@features/games/time-race/time-race-report';

function baseStats() {
  return {
    directWinnerCount: 1,
    independentDifferenceCount: 0,
    afterStepsCount: 0,
    errorPatternCounts: {
      no_borrow: 0,
      negative_difference: 0,
      decimal_shift_right: 0,
      decimal_shift_left: 0,
      integer_part_only: 0,
    },
  };
}

describe('L13 time-race diagnostic report — two-race contract', () => {
  it('إتقان تحديد الأسرع يعني النجاح المباشر في السباقين', () => {
    const report = buildTimeRaceReport({
      ...baseStats(),
      directWinnerCount: 2,
    });

    expect(report.mastered).toContain('حدّدت السيارة الأسرع مباشرة في السباقين.');
  });

  it('نجاح مباشر واحد فقط ينتج مراجعة خفيفة', () => {
    const report = buildTimeRaceReport(baseStats());

    expect(report.review).toContain('أحيانًا تحدد السيارة الأسرع مباشرة؛ راجع اختيار الزمن الأقل.');
  });

  it('عدم تحديد الأسرع مباشرة في أي سباق يطلب مراجعة المقارنة', () => {
    const report = buildTimeRaceReport({
      ...baseStats(),
      directWinnerCount: 0,
    });

    expect(report.review).toContain('راجع مقارنة الزمنين: السيارة ذات الزمن الأقل تصل أولًا.');
  });

  it('إتقان حساب الفرق يعني الحساب المستقل في السباقين', () => {
    const report = buildTimeRaceReport({
      ...baseStats(),
      directWinnerCount: 2,
      independentDifferenceCount: 2,
    });

    expect(report.mastered).toContain('حسبت الفرق بين الزمنين دون دعم في السباقين.');
  });

  it('احتياج خطوات الطرح في سباق واحد يكفي لإظهار توصية المراجعة', () => {
    const report = buildTimeRaceReport({
      ...baseStats(),
      afterStepsCount: 1,
    });

    expect(report.review).toContain('راجع خطوات طرح الأعداد العشرية ومحاذاة المنازل.');
  });

  it('يربط no_borrow بمراجعة الاستلاف', () => {
    const report = buildTimeRaceReport({
      ...baseStats(),
      errorPatternCounts: {
        ...baseStats().errorPatternCounts,
        no_borrow: 1,
      },
    });

    expect(report.review.join(' ')).toContain('راجع الاستلاف');
  });

  it('يربط إزاحة الفاصلة بالتنبيه إلى موضعها', () => {
    const report = buildTimeRaceReport({
      ...baseStats(),
      errorPatternCounts: {
        ...baseStats().errorPatternCounts,
        decimal_shift_left: 1,
      },
    });

    expect(report.review).toContain('انتبه إلى موضع الفاصلة.');
  });

  it('يربط الفرق السالب بأن الفرق قيمة موجبة', () => {
    const report = buildTimeRaceReport({
      ...baseStats(),
      errorPatternCounts: {
        ...baseStats().errorPatternCounts,
        negative_difference: 1,
      },
    });

    expect(report.review.join(' ')).toContain('الفرق قيمة موجبة');
  });

  it('يربط integer_part_only بالعبارة المعتمدة', () => {
    const report = buildTimeRaceReport({
      ...baseStats(),
      errorPatternCounts: {
        ...baseStats().errorPatternCounts,
        integer_part_only: 1,
      },
    });

    expect(report.review).toContain('اطرح الزمنين كاملين، لا الجزأين الصحيحين فقط.');
  });

  it('يوفر عبارة افتراضية لقسم الإتقان', () => {
    const report = buildTimeRaceReport(baseStats());

    expect(report.mastered).toContain(
      'استمر في التدريب؛ لم يظهر بعد نمط ثابت يمكن اعتباره متقنًا.'
    );
  });

  it('يوفر عبارة افتراضية لقسم المراجعة عندما لا توجد ملاحظة', () => {
    const report = buildTimeRaceReport({
      ...baseStats(),
      directWinnerCount: 2,
    });

    expect(report.review).toContain('أداؤك مستقر في المهارات المستهدفة في هذه المحاولة.');
  });

  it('يعرض ملاحظة التمييز والدقة مرة واحدة فقط', () => {
    const report = buildTimeRaceReport({
      ...baseStats(),
      directWinnerCount: 2,
    });

    const phrase = 'عدد المنازل العشرية في شاشة القياس';
    expect(report.visibleText.split(phrase)).toHaveLength(2);
  });

  it('لا يعرض درجة رقمية أو نسبة أو نجوم', () => {
    const report = buildTimeRaceReport(baseStats());

    expect(report.visibleText).not.toMatch(/%|★|⭐|درجة\s*\d/i);
  });
});
