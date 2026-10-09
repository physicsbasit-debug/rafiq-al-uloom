export type Grade9Lesson13FeedbackMode =
  'guided_retry' | 'collect_then_explain' | 'compare_then_explain';

export interface Grade9Lesson13ExplanationStage {
  readonly id: string;
  readonly title: string;
  readonly objectiveKey: 'g9-s1-u1-l3-o2' | 'g9-s1-u1-l3-o3';
  readonly skill: string;
  readonly sourceBasis: readonly string[];
  readonly feedbackMode: Grade9Lesson13FeedbackMode;
  readonly reservedFor: 'explanation';
}

export const grade9Lesson13ExplanationStages: readonly Grade9Lesson13ExplanationStage[] = [
  {
    id: 'g9-s1-u1-l3-ex1',
    title: 'هل كل ثانية متساوية الأهمية؟',
    objectiveKey: 'g9-s1-u1-l3-o2',
    skill: 'تحديد مستوى التفصيل المناسب لقياس الزمن من سياق الحدث',
    sourceBasis: ['student_book_sprint_vs_marathon', 'teacher_guide_sports_timing'],
    feedbackMode: 'guided_retry',
    reservedFor: 'explanation',
  },
  {
    id: 'g9-s1-u1-l3-ex2',
    title: 'الزمن له لغتان',
    objectiveKey: 'g9-s1-u1-l3-o2',
    skill: 'قراءة الزمن من ساعة تناظرية ورقمية ومقارنة طريقة العرض بينهما',
    sourceBasis: ['student_book_analog_stopwatch', 'student_book_digital_stopwatch'],
    feedbackMode: 'guided_retry',
    reservedFor: 'explanation',
  },
  {
    id: 'g9-s1-u1-l3-ex3',
    title: 'شاشتك أسرع من يدك',
    objectiveKey: 'g9-s1-u1-l3-o2',
    skill: 'تفسير أثر زمن الاستجابة البشري في قياس فترة زمنية قصيرة',
    sourceBasis: [
      'student_book_human_response_time',
      'teacher_guide_digital_precision_misconception',
    ],
    feedbackMode: 'collect_then_explain',
    reservedFor: 'explanation',
  },
  {
    id: 'g9-s1-u1-l3-ex4',
    title: 'لا تنتظر الحدث… توقّعه',
    objectiveKey: 'g9-s1-u1-l3-o3',
    skill: 'تحسين بدء قياس حدث دوري باستخدام التوقع والعد التنازلي',
    sourceBasis: ['student_book_pendulum_countdown', 'teacher_guide_repeated_timing'],
    feedbackMode: 'compare_then_explain',
    reservedFor: 'explanation',
  },
  {
    id: 'g9-s1-u1-l3-ex5',
    title: 'لماذا لا نقيس تأرجحًا واحدًا؟',
    objectiveKey: 'g9-s1-u1-l3-o3',
    skill: 'حساب الزمن الدوري من زمن مجموعة من التأرجحات الكاملة',
    sourceBasis: ['student_book_pendulum_period', 'student_book_activity_1_2_pendulum_period'],
    feedbackMode: 'guided_retry',
    reservedFor: 'explanation',
  },
  {
    id: 'g9-s1-u1-l3-ex6',
    title: 'أي طريقة قياس تثق بها أكثر؟',
    objectiveKey: 'g9-s1-u1-l3-o3',
    skill: 'تقييم وتحسين طريقة قياس فترة زمنية قصيرة من نتائج متعددة',
    sourceBasis: ['teacher_guide_repeated_timing'],
    feedbackMode: 'compare_then_explain',
    reservedFor: 'explanation',
  },
] as const;

export const grade9Lesson13ExplanationNumbers = {
  stopwatchReadings: {
    analogMinutes: 2,
    analogSeconds: 14,
    analogDisplay: '2:14',
    digitalDisplay: '00:02:14.37',
  },
  pendulumMultiple: {
    oscillations: 12,
    totalSeconds: 14.76,
    periodSeconds: 1.23,
  },
  strategyComparison: {
    referencePeriodSeconds: 1.36,
    singleCycleTrialsSeconds: [1.08, 1.58, 1.16] as const,
    manyCycleCount: 16,
    manyCycleReferenceTotalSeconds: 21.76,
    manyCycleObservedTotalSeconds: 21.99,
  },
} as const;

export const grade9Lesson13PathReservations = {
  reviewOnly: {
    framesPerSecond: 25,
    frameIntervalSeconds: 0.04,
    twentyOscillationsSeconds: 17.4,
    fiftyOscillationsSeconds: 43.2,
    oscillationCounts: [20, 50] as const,
  },
  activityOnly: {
    bodyClockPulseCounts: [10, 50] as const,
    context: 'body-clock-pulse-multiples',
  },
} as const;
