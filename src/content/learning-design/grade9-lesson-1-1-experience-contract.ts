import type { GoldenLearningMoment } from './learning-experience-guard';

const OBJECTIVE = 'g9-s1-u1-l1-o1';

/**
 * عقد الخبرة الكامل للدرس الذهبي «أهمية القياس».
 *
 * هذه البيانات داخلية فقط. وظيفتها أن تجعل اختلاف المسارات قابلاً للاختبار آليًا بدل
 * الاعتماد على ذاكرة المصمم عند إضافة سؤال أو نشاط جديد لاحقًا.
 */
export const grade9Lesson11GoldenExperience: readonly GoldenLearningMoment[] = [
  // المراجعة: تثبيت الفهم وتصحيح الخطأ مباشرة بعد الدرس.
  {
    id: 'g9-s1-u1-l1-rq1',
    path: 'review',
    questionKey: 'si-length-unit-recall',
    cognitiveFunction: 'retrieve-si-base-unit',
    objectiveKey: OBJECTIVE,
    skill: 'استرجاع وحدة SI الأساسية للطول',
  },
  {
    id: 'g9-s1-u1-l1-rq2',
    path: 'review',
    questionKey: 'meters-to-kilometers-application',
    cognitiveFunction: 'convert-equivalent-length',
    objectiveKey: OBJECTIVE,
    skill: 'تحويل طول إلى وحدة مكافئة',
  },
  {
    id: 'g9-s1-u1-l1-rq3',
    path: 'review',
    questionKey: 'complete-pencil-measurement-from-record',
    visualKey: '/lesson-visuals/g9-review-lab-record.svg',
    cognitiveFunction: 'complete-visual-measurement-record',
    objectiveKey: OBJECTIVE,
    skill: 'إكمال سجل قياس مرئي بوحدة مناسبة',
  },
  {
    id: 'g9-s1-u1-l1-rq4',
    path: 'review',
    questionKey: 'digital-vs-analog-precision-misconception',
    cognitiveFunction: 'evaluate-precision-claim',
    objectiveKey: OBJECTIVE,
    skill: 'كشف التصور الخاطئ حول الدقة',
  },
  {
    id: 'g9-s1-u1-l1-rq5',
    path: 'review',
    questionKey: 'shared-unit-before-comparison',
    cognitiveFunction: 'prepare-measurements-for-comparison',
    objectiveKey: OBJECTIVE,
    skill: 'ربط الوحدة المشتركة بإمكان المقارنة',
  },

  // الأنشطة العلمية: استخدام العلم وفحص الأدلة والبيانات والمتغيرات.
  {
    id: 'g9-s1-u1-l1-activity-inquiry',
    path: 'activity',
    questionKey: 'thin-sheet-reliability-evidence',
    visualKey:
      '/lesson-visuals/activities/g9-importance-measurement/inquiry-paper-measurement.svg',
    cognitiveFunction: 'evaluate-measurement-reliability-from-evidence',
    objectiveKey: OBJECTIVE,
    skill: 'الحكم على موثوقية طريقة القياس من الأدلة',
  },
  {
    id: 'g9-s1-u1-l1-activity-simulation',
    path: 'activity',
    questionKey: 'gps-timing-error-position-effect',
    visualKey: '/lesson-visuals/activities/g9-importance-measurement/gps-timing-simulation.svg',
    cognitiveFunction: 'manipulate-variable-observe-position-error',
    objectiveKey: OBJECTIVE,
    skill: 'استقصاء أثر خطأ الزمن على الموقع بتغيير متغير',
  },
  {
    id: 'g9-s1-u1-l1-activity-data',
    path: 'activity',
    questionKey: 'normalize-and-rank-mixed-length-data',
    visualKey:
      '/lesson-visuals/activities/g9-importance-measurement/measurement-data-notebook.svg',
    cognitiveFunction: 'normalize-sort-and-infer-from-data',
    objectiveKey: OBJECTIVE,
    skill: 'توحيد بيانات القياس وترتيبها واستخراج نتيجة',
  },

  // اللعبة: تدريب قرارات سريعة عبر أربع ميكانيكيات مختلفة.
  {
    id: 'g9-s1-u1-l1-game-spot',
    path: 'game',
    questionKey: 'detect-unit-mismatch-in-measurement-record',
    visualKey: '/lesson-visuals/games/g9-importance-measurement/pencil-measurement.svg',
    cognitiveFunction: 'spot-unit-type-mismatch',
    objectiveKey: OBJECTIVE,
    skill: 'اكتشاف الجزء الخاطئ في سجل القياس',
  },
  {
    id: 'g9-s1-u1-l1-game-judge',
    path: 'game',
    questionKey: 'classify-measurement-record-validity',
    visualKey: '/lesson-visuals/games/g9-importance-measurement/measurement-objects.svg',
    cognitiveFunction: 'rapid-validity-classification',
    objectiveKey: OBJECTIVE,
    skill: 'التمييز السريع بين القياس السليم والذي يحتاج إصلاحًا',
  },
  {
    id: 'g9-s1-u1-l1-game-repair',
    path: 'game',
    questionKey: 'repair-unit-for-quantity',
    visualKey: '/lesson-visuals/games/g9-importance-measurement/road-measurement.svg',
    cognitiveFunction: 'replace-invalid-unit',
    objectiveKey: OBJECTIVE,
    skill: 'استبدال وحدة غير مناسبة بوحدة تطابق الكمية',
  },
  {
    id: 'g9-s1-u1-l1-game-report',
    path: 'game',
    questionKey: 'audit-lab-report-unit-consistency',
    visualKey: '/lesson-visuals/games/g9-importance-measurement/lab-report.svg',
    cognitiveFunction: 'audit-record-before-approval',
    objectiveKey: OBJECTIVE,
    skill: 'تدقيق تقرير قياس قبل اعتماده',
  },

  // الإتقان: نقل الفهم إلى خمسة سياقات جديدة بلا تلميحات أثناء الحل.
  {
    id: 'g9-s1-u1-l1-mq1',
    path: 'mastery',
    questionKey: 'engineering-record-missing-unit-transfer',
    visualKey:
      '/lesson-visuals/mastery/g9-importance-measurement/mechanical-blueprint.svg',
    cognitiveFunction: 'transfer-diagnose-incomplete-engineering-measurement',
    objectiveKey: OBJECTIVE,
    skill: 'تشخيص قياس هندسي غير مكتمل في سياق جديد',
  },
  {
    id: 'g9-s1-u1-l1-mq2',
    path: 'mastery',
    questionKey: 'international-manufacturing-shared-units-transfer',
    visualKey:
      '/lesson-visuals/mastery/g9-importance-measurement/international-teams.svg',
    cognitiveFunction: 'transfer-justify-shared-unit-system',
    objectiveKey: OBJECTIVE,
    skill: 'تبرير دور الوحدات المشتركة في التواصل العلمي',
  },
  {
    id: 'g9-s1-u1-l1-mq3',
    path: 'mastery',
    questionKey: 'instrument-precision-claim-transfer',
    visualKey: '/lesson-visuals/mastery/g9-importance-measurement/precision-tools.svg',
    cognitiveFunction: 'transfer-judge-instrument-precision',
    objectiveKey: OBJECTIVE,
    skill: 'الحكم على ادعاء الدقة في موقف جديد',
  },
  {
    id: 'g9-s1-u1-l1-mq4',
    path: 'mastery',
    questionKey: 'cross-unit-equivalence-transfer',
    visualKey:
      '/lesson-visuals/mastery/g9-importance-measurement/two-measurement-reports.svg',
    cognitiveFunction: 'transfer-establish-equivalence-after-conversion',
    objectiveKey: OBJECTIVE,
    skill: 'إثبات تكافؤ قياسين بعد توحيد الوحدة',
  },
  {
    id: 'g9-s1-u1-l1-mq5',
    path: 'mastery',
    questionKey: 'aircraft-component-communication-transfer',
    visualKey: '/lesson-visuals/mastery/g9-importance-measurement/aircraft-component.svg',
    cognitiveFunction: 'transfer-prevent-cross-team-measurement-ambiguity',
    objectiveKey: OBJECTIVE,
    skill: 'منع غموض القياس بين فريقين في سياق تصنيع جديد',
  },
] as const;
