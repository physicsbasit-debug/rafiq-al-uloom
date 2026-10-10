import type { GoldenLearningMoment } from './learning-experience-guard';

const OBJECTIVE_TIME_DEVICES = 'g9-s1-u1-l3-o2';
const OBJECTIVE_REPEATED_TIME = 'g9-s1-u1-l3-o3';

export const grade9Lesson13GoldenExplanation: readonly GoldenLearningMoment[] = [
  {
    id: 'g9-s1-u1-l3-ex1',
    path: 'explanation',
    questionKey: 'judge-required-time-resolution-by-event-context',
    visualKey: 'g9-l13-sprint-marathon-time-resolution-v1',
    cognitiveFunction: 'infer-required-time-resolution-from-context',
    contextKey: 'sprint-versus-marathon-timing',
    objectiveKey: OBJECTIVE_TIME_DEVICES,
    skill: 'تحديد مستوى التفصيل المناسب لقياس الزمن',
  },
  {
    id: 'g9-s1-u1-l3-ex2',
    path: 'explanation',
    questionKey: 'read-analog-and-digital-stopwatch-displays',
    visualKey: 'g9-l13-analog-digital-independent-readings-v2',
    cognitiveFunction: 'decode-analog-and-digital-time-representations',
    contextKey: 'independent-analog-and-digital-readings',
    objectiveKey: OBJECTIVE_TIME_DEVICES,
    skill: 'قراءة الزمن من أجهزة تناظرية ورقمية ومقارنة طريقة العرض',
  },
  {
    id: 'g9-s1-u1-l3-ex3',
    path: 'explanation',
    questionKey: 'distinguish-display-resolution-from-human-timing-limit',
    visualKey: 'g9-l13-human-reaction-time-trials-v1',
    cognitiveFunction: 'identify-human-response-as-measurement-limiter',
    contextKey: 'visual-reaction-stopwatch-trials',
    objectiveKey: OBJECTIVE_TIME_DEVICES,
    skill: 'تفسير أثر زمن الاستجابة في قياس الفترات القصيرة',
  },
  {
    id: 'g9-s1-u1-l3-ex4',
    path: 'explanation',
    questionKey: 'improve-periodic-event-timing-by-anticipation',
    visualKey: 'g9-l13-pendulum-countdown-start-v1',
    cognitiveFunction: 'improve-measurement-procedure-after-error-source',
    contextKey: 'pendulum-reactive-versus-predictive-start',
    objectiveKey: OBJECTIVE_REPEATED_TIME,
    skill: 'تحسين طريقة بدء قياس الزمن الدوري',
  },
  {
    id: 'g9-s1-u1-l3-ex5',
    path: 'explanation',
    questionKey: 'infer-single-pendulum-period-from-multiple-oscillations',
    visualKey: 'g9-l13-twelve-oscillation-period-v1',
    cognitiveFunction: 'derive-single-event-time-from-multiple-events',
    contextKey: 'twelve-pendulum-oscillations',
    objectiveKey: OBJECTIVE_REPEATED_TIME,
    skill: 'حساب الزمن الدوري من زمن عدة تأرجحات',
  },
  {
    id: 'g9-s1-u1-l3-ex6',
    path: 'explanation',
    questionKey: 'evaluate-single-event-versus-multiple-event-timing',
    visualKey: 'g9-l13-measurement-strategy-comparison-v1',
    cognitiveFunction: 'evaluate-measurement-strategy-from-results',
    contextKey: 'reference-period-protocol-comparison',
    objectiveKey: OBJECTIVE_REPEATED_TIME,
    skill: 'تقييم وتحسين طريقة قياس فترة زمنية قصيرة',
  },
] as const;

export const grade9Lesson13GoldenReview: readonly GoldenLearningMoment[] = [
  {
    id: 'g9-s1-u1-l3-rq1',
    path: 'review',
    questionKey: 'period-meaning-review-only',
    visualKey: 'g9-l13-review-period-timeline-v1',
    cognitiveFunction: 'recall-meaning-of-time-interval',
    contextKey: 'numberless-start-end-timeline',
    objectiveKey: OBJECTIVE_TIME_DEVICES,
    skill: 'استرجاع معنى الفترة الزمنية دون تحويلها إلى مسألة فرق عددي',
  },
  {
    id: 'g9-s1-u1-l3-rq2',
    path: 'review',
    questionKey: '5-1-review-only',
    visualKey: 'g9-l13-review-tv-25-frames-v1',
    cognitiveFunction: 'calculate-single-frame-time-from-images-per-second',
    contextKey: 'television-25-images-per-second',
    objectiveKey: OBJECTIVE_TIME_DEVICES,
    skill: 'حساب زمن الصورة الواحدة من عدد الصور في الثانية',
  },
  {
    id: 'g9-s1-u1-l3-rq3',
    path: 'review',
    questionKey: 'repeated-time-mean-review-only',
    visualKey: 'g9-l13-review-repeated-readings-v1',
    cognitiveFunction: 'calculate-mean-of-repeated-time-readings',
    contextKey: 'three-repeated-time-readings',
    objectiveKey: OBJECTIVE_REPEATED_TIME,
    skill: 'إيجاد القيمة المتوسطة لقياسات زمنية متكررة',
  },
  {
    id: 'g9-s1-u1-l3-rq4',
    path: 'review',
    questionKey: 'pendulum-full-cycle-misconception-review-only',
    visualKey: 'g9-l13-review-pendulum-path-v1',
    cognitiveFunction: 'detect-half-cycle-counting-error',
    contextKey: 'start-opposite-return-pendulum-path',
    objectiveKey: OBJECTIVE_REPEATED_TIME,
    skill: 'كشف خطأ عد نصف التأرجح على أنه تأرجح كامل',
  },
  {
    id: 'g9-s1-u1-l3-rq5',
    path: 'review',
    questionKey: '6-1-review-only',
    visualKey: 'g9-l13-review-pendulum-data-table-v1',
    cognitiveFunction: 'calculate-evaluate-and-diagnose-period-timing',
    contextKey: 'twenty-versus-fifty-pendulum-oscillations',
    objectiveKey: OBJECTIVE_REPEATED_TIME,
    skill: 'حساب الزمن الدوري وتقييم القياس الأدق وتحديد أسباب الخطأ',
  },
] as const;

/**
 * تعديل رسمي بطلب المستخدم - 2026-10-10.
 *
 * الوصول إلى مسارات الدرس 1-3 أصبح مباشرًا، بينما يبقى الإنجاز منفصلًا
 * عن مجرد فتح المسار. المختبر الافتراضي D مستثنى حتى مراجعته العلمية.
 */
export const grade9Lesson13DirectAccessPolicy = {
  requestedByUserOn: '2026-10-10',
  review: 'direct',
  activities: 'direct',
  game: 'direct',
  mastery: 'direct',
  virtualLab: 'unavailable_pending_scientific_review',
  accessDoesNotImplyCompletion: true,
  suggestedOrderIsGuidanceOnly: true,
} as const;
