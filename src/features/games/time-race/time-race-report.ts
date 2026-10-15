import type { TimeRaceErrorPattern } from './time-race-input';

export interface TimeRaceReportStats {
  readonly directWinnerCount: number;
  readonly independentDifferenceCount: number;
  readonly afterStepsCount: number;
  readonly errorPatternCounts: Readonly<Record<TimeRaceErrorPattern, number>>;
}

export interface TimeRaceReport {
  readonly mastered: readonly string[];
  readonly review: readonly string[];
  readonly finalNote: string;
  readonly visibleText: string;
}

const FINAL_NOTE =
  'تذكّر: عدد المنازل العشرية في شاشة القياس يصف تمييز العرض، ولا يحدد وحده دقة القياس.';

export function buildTimeRaceReport(stats: TimeRaceReportStats): TimeRaceReport {
  const mastered: string[] = [];
  const review: string[] = [];

  if (stats.directWinnerCount >= 2) {
    mastered.push('حدّدت السيارة الأسرع مباشرة في السباقين.');
  } else if (stats.directWinnerCount === 1) {
    review.push('أحيانًا تحدد السيارة الأسرع مباشرة؛ راجع اختيار الزمن الأقل.');
  } else {
    review.push('راجع مقارنة الزمنين: السيارة ذات الزمن الأقل تصل أولًا.');
  }

  if (stats.independentDifferenceCount >= 2) {
    mastered.push('حسبت الفرق بين الزمنين دون دعم في السباقين.');
  }

  if (stats.errorPatternCounts.no_borrow >= 1) {
    review.push('راجع الاستلاف عند طرح أجزاء من مئة.');
  }

  if (
    stats.errorPatternCounts.decimal_shift_right >= 1 ||
    stats.errorPatternCounts.decimal_shift_left >= 1
  ) {
    review.push('انتبه إلى موضع الفاصلة.');
  }

  if (stats.errorPatternCounts.negative_difference >= 1) {
    review.push('الفرق قيمة موجبة؛ اطرح الأصغر من الأكبر.');
  }

  if (stats.errorPatternCounts.integer_part_only >= 1) {
    review.push('اطرح الزمنين كاملين، لا الجزأين الصحيحين فقط.');
  }

  if (stats.afterStepsCount >= 1) {
    review.push('راجع خطوات طرح الأعداد العشرية ومحاذاة المنازل.');
  }

  if (mastered.length === 0) {
    mastered.push('استمر في التدريب؛ لم يظهر بعد نمط ثابت يمكن اعتباره متقنًا.');
  }

  if (review.length === 0) {
    review.push('أداؤك مستقر في المهارات المستهدفة في هذه المحاولة.');
  }

  return {
    mastered,
    review,
    finalNote: FINAL_NOTE,
    visibleText: [...mastered, ...review, FINAL_NOTE].join(' '),
  };
}
