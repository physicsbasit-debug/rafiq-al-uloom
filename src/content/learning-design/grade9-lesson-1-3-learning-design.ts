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

export type Grade9Lesson13ReviewRole =
  'recall' | 'apply' | 'visual_read' | 'misconception' | 'concept_link';

export interface Grade9Lesson13ReviewDesignItem {
  readonly id: string;
  readonly role: Grade9Lesson13ReviewRole;
  readonly objectiveKey: 'g9-s1-u1-l3-o2' | 'g9-s1-u1-l3-o3';
  readonly visualKey: string;
  readonly hint: string;
  readonly summaryGroup: string;
  readonly sourceBasis: readonly string[];
}

export const grade9Lesson13ReviewDesign: readonly Grade9Lesson13ReviewDesignItem[] = [
  {
    id: 'g9-s1-u1-l3-rq1',
    role: 'recall',
    objectiveKey: 'g9-s1-u1-l3-o2',
    visualKey: 'g9-l13-review-period-timeline-v1',
    hint: 'تتبّع الخط الزمني من بداية الحدث إلى نهايته: ما الكمية التي تصف هذا الامتداد؟',
    summaryGroup: 'معنى الفترة الزمنية',
    sourceBasis: ['step0_02_review_l13_final', 'student_book_time_interval'],
  },
  {
    id: 'g9-s1-u1-l3-rq2',
    role: 'apply',
    objectiveKey: 'g9-s1-u1-l3-o2',
    visualKey: 'g9-l13-review-tv-25-frames-v1',
    hint: 'إذا عُرضت 25 صورة خلال ثانية واحدة، فقسّم الثانية الواحدة على عدد الصور.',
    summaryGroup: 'تطبيق قياس الزمن',
    sourceBasis: ['student_book_question_5_1', '5-1-review-only'],
  },
  {
    id: 'g9-s1-u1-l3-rq3',
    role: 'visual_read',
    objectiveKey: 'g9-s1-u1-l3-o3',
    visualKey: 'g9-l13-review-repeated-readings-v1',
    hint: 'القيمة المتوسطة = مجموع القراءات ÷ عددها. لا تكتفِ باختيار القيمة الواقعة في المنتصف.',
    summaryGroup: 'القيمة المتوسطة',
    sourceBasis: ['student_book_repeated_timing', 'objective_3_1_mean'],
  },
  {
    id: 'g9-s1-u1-l3-rq4',
    role: 'misconception',
    objectiveKey: 'g9-s1-u1-l3-o3',
    visualKey: 'g9-l13-review-pendulum-path-v1',
    hint: 'تتبّع الحركة حتى يعود البندول إلى حالة البداية نفسها؛ عندها فقط تكتمل الدورة.',
    summaryGroup: 'التأرجح الكامل',
    sourceBasis: ['teacher_guide_pendulum_counting_misconception'],
  },
  {
    id: 'g9-s1-u1-l3-rq5',
    role: 'concept_link',
    objectiveKey: 'g9-s1-u1-l3-o3',
    visualKey: 'g9-l13-review-pendulum-data-table-v1',
    hint: 'قسّم الزمن الكلي على عدد التأرجحات أولًا، ثم قارن الطريقتين ومصادر الخطأ.',
    summaryGroup: 'دقة قياس الزمن الدوري',
    sourceBasis: ['student_book_question_6_1', '6-1-review-only'],
  },
] as const;

export interface Grade9Lesson13ReviewStep {
  readonly id: 'calculation' | 'accuracy' | 'errors';
  readonly title: string;
  readonly prompt: string;
  readonly choices: readonly string[];
  readonly correctAnswerIndex: number;
  readonly correctAnswer: string;
  readonly hint: string;
  readonly explanation: string;
}

export const grade9Lesson13ReviewQuestion5Steps: readonly Grade9Lesson13ReviewStep[] = [
  {
    id: 'calculation',
    title: 'احسب الزمن الدوري',
    prompt:
      'احسب الزمن الدوري في القياسين إلى أقرب 0.001 ثانية: 20 تأرجحًا في 17.4 ثانية، و50 تأرجحًا في 43.2 ثانية.',
    choices: [
      '0.870 ثانية و0.864 ثانية',
      '0.870 ثانية و0.432 ثانية',
      '0.348 ثانية و0.864 ثانية',
      '17.400 ثانية و43.200 ثانية',
    ],
    correctAnswerIndex: 0,
    correctAnswer: '0.870 ثانية و0.864 ثانية',
    hint: 'الزمن الدوري = الزمن الكلي ÷ عدد التأرجحات الكاملة.',
    explanation: '17.4 ÷ 20 = 0.870 ثانية، و43.2 ÷ 50 = 0.864 ثانية، بعد التقريب إلى 0.001 ثانية.',
  },
  {
    id: 'accuracy',
    title: 'قيّم القياسين',
    prompt: 'أي القياسين أدق وفق طريقة القياس المستخدمة؟',
    choices: [
      'قياس 50 تأرجحًا أدق',
      'قياس 20 تأرجحًا أدق',
      'القياسان متساويان في الدقة لأنهما استخدما البندول نفسه',
      'لا يمكن المقارنة لأن عدد التأرجحات مختلف',
    ],
    correctAnswerIndex: 0,
    correctAnswer: 'قياس 50 تأرجحًا أدق',
    hint: 'فكّر في أثر خطأ بدء الساعة وإيقافها عندما توزعه على زمن كلي أطول وعدد أكبر من التأرجحات.',
    explanation:
      'قياس 50 تأرجحًا أدق؛ لأن قياس مدة أطول ثم القسمة يجعل أثر زمن الاستجابة النسبي أصغر.',
  },
  {
    id: 'errors',
    title: 'حدّد مصادر الخطأ',
    prompt: 'أي مجموعة تمثل أسبابًا واقعية للخطأ في هذه التجربة؟',
    choices: [
      'زمن الاستجابة عند بدء أو إيقاف الساعة، وخطأ عد التأرجحات الكاملة',
      'لون كرة البندول، ولون شاشة ساعة الإيقاف',
      'اسم الطالب، وترتيب كتابة النتائج في الدفتر',
      'وجود وحدة الثانية، واستخدام أرقام عشرية',
    ],
    correctAnswerIndex: 0,
    correctAnswer: 'زمن الاستجابة عند بدء أو إيقاف الساعة، وخطأ عد التأرجحات الكاملة',
    hint: 'ابحث عن عوامل تغير لحظة بدء القياس أو إيقافه، أو تجعل عدد الدورات المسجلة غير صحيح.',
    explanation:
      'من مصادر الخطأ الواقعية زمن الاستجابة عند بدء أو إيقاف الساعة، وكذلك خطأ عد التأرجحات الكاملة.',
  },
] as const;

/**
 * تعديل عرض خيارات المراجعة - 2026-10-10.
 * الخلط يغيّر موضع العرض فقط ولا يغيّر هوية الخيار أو تشخيصه.
 */
export const grade9Lesson13ReviewChoiceDisplayPolicy = {
  shuffleDisplayOnly: true,
  preserveChoiceIdentity: true,
  preserveDiagnosisBinding: true,
  reshuffleOnRetry: true,
  preserveOrderWhenMeaningDependsOnOrder: true,
  correctPositionMaxOccurrencesAcrossFiveQuestions: 2,
} as const;

/**
 * هوية الأنشطة العلمية للدرس 1-3.
 * الشكل يعيد استخدام هوية الأنشطة المعتمدة في الدروس السابقة بلا CSS موازٍ.
 */
export const grade9Lesson13ActivitiesVisualPolicy = {
  reusePreviousLessonActivityComponents: true,
  reuseExistingVisualTokens: true,
  reuseScienceHubCardIdentity: true,
  useDedicatedLessonVisualAssets: true,
  allowParallelLesson13ActivityCss: false,
  fixedCategories: ['inquiry', 'simulation', 'data', 'experiment'],
  plannedActivityStatusBeforeImplementation: 'قيد التجهيز',
  simulationAvailabilityText: 'غير متوفر في هذا الدرس',
  preparedDataLabel: 'بيانات توضيحية معدّة للنشاط',
} as const;

/**
 * Activities B - body clock inquiry.
 * Approved implementation contract for lesson 1-3.
 */
export const grade9Lesson13BodyClockActivity = {
  category: 'inquiry',
  title: 'ساعة الجسم',
  predictionBeforeMeasurement: true,
  predictionOptions: 3,
  tenPulseTrials: 2,
  pulseCounts: [10, 10, 50],
  tenPulseSuggestedWindowSeconds: [6, 12],
  tenPulseWindowIsWarningOnly: true,
  meanOfTenPulseTrialsRequired: true,
  compareFiftyPulseMethod: true,
  feedbackPolicy: {
    firstWrong: 'hint',
    secondWrong: 'reveal',
  },
  coreIdea: 'عند قياس عدد أكبر من النبضات يتوزع أثر تشغيل وإيقاف الساعة على عدد أكبر من النبضات.',
  rawMeasurementsPersistence: 'session-local-only',
  serverPersistenceAllowed: false,
} as const;

/**
 * Activities B - pulse data activity.
 * Prepared illustrative data only. No new average calculation is required.
 */
export const grade9Lesson13PulseDataActivity = {
  category: 'data',
  title: 'بيانات النبض: الراحة وبعد نشاط خفيف',
  preparedDataLabel: 'بيانات توضيحية معدّة للنشاط',
  measuredQuantity: 'زمن 10 نبضات بالثواني',
  datasets: {
    rest: [8.4, 8.7, 8.2, 8.5, 8.6],
    afterLightActivity: [6.3, 6.1, 5.9, 6.2, 6.0],
  },
  calculateNewAverage: false,
  studentTasks: [
    'compare-two-datasets',
    'identify-shorter-times',
    'infer-faster-pulse',
    'select-direct-evidence',
  ],
  feedbackPolicy: {
    firstWrong: 'hint',
    secondWrong: 'reveal',
  },
} as const;

/**
 * Activities B - guided pendulum experiment.
 *
 * The experiment uses the learner's own measurements.
 * It does not inject an artificial reference value or remove readings.
 */
export const grade9Lesson13GuidedPendulumExperiment = {
  category: 'guided-experiment',
  title: 'قياس الزمن الدوري للبندول',
  controlledVariables: ['طول الخيط', 'الكرة المستخدمة', 'زاوية الإزاحة الابتدائية'],
  controlledVariableQuestion: {
    prompt: 'اختر المتغيرات التي يجب إبقاؤها ثابتة عند مقارنة طريقتي القياس.',
    changedVariableId: 'oscillation-count',
    choices: [
      {
        id: 'string-length',
        text: 'طول الخيط',
        correct: true,
        diagnosis: 'fixed-comparison-condition',
      },
      {
        id: 'same-ball',
        text: 'الكرة المستخدمة',
        correct: true,
        diagnosis: 'fixed-comparison-condition',
      },
      {
        id: 'release-angle',
        text: 'زاوية الإزاحة الابتدائية',
        correct: true,
        diagnosis: 'fixed-comparison-condition',
      },
      {
        id: 'oscillation-count',
        text: 'عدد الاهتزازات المقاسة',
        correct: false,
        diagnosis: 'changed-variable',
      },
      {
        id: 'ball-color',
        text: 'لون الكرة',
        correct: false,
        diagnosis: 'irrelevant-condition',
      },
      {
        id: 'student-name',
        text: 'اسم الطالب',
        correct: false,
        diagnosis: 'irrelevant-condition',
      },
      {
        id: 'experiment-day',
        text: 'يوم التجربة',
        correct: false,
        diagnosis: 'irrelevant-condition',
      },
    ],
    feedback: {
      success:
        'صحيح. ثبّت طول الخيط والكرة المستخدمة وزاوية الإزاحة الابتدائية حتى تكون المقارنة عادلة.',
      missingFixed: 'نسيت متغيرًا يجب إبقاؤه ثابتًا حتى تكون المقارنة بين طريقتي القياس عادلة.',
      selectedChanged:
        'عدد الاهتزازات المقاسة هو المتغير الذي نغيّره بين الطريقتين، لذلك لا نعدّه متغيرًا مضبوطًا.',
      selectedIrrelevant: 'اختر فقط الشروط التي يجب تثبيتها حتى نقارن طريقتي القياس مقارنة عادلة.',
      reveal: 'المتغيرات المضبوطة هي: طول الخيط، الكرة المستخدمة، وزاوية الإزاحة الابتدائية.',
    },
  },
  timerStation: {
    mustTry: ['analog', 'digital'],
    learnerChoosesTool: true,
    independentClocks: true,
    analogHasMovingHands: true,
    analogResolutionSeconds: 0.1,
    analogDisplayDecimals: 1,
    digitalKeepsCurrentResolution: true,
  },
  embeddedPendulum: {
    appearsAfterTimerChoice: true,
    interactive: true,
    measurementReferencePoint: true,
    remainsInsideGuidedExperiment: true,
    simulationCardRemainsUnavailable: true,
  },
  measurementCapture: {
    usesChosenTimer: true,
    recordsReadingOnStop: true,
    learnerMayEditBeforeAcceptance: true,
    calculationsUseRecordedValues: true,
    noPrematureCalculatedValueRounding: true,
  },
  oneOscillationMeasurements: 10,
  learnerDetermines: ['minimum', 'maximum', 'range'],
  automaticRangeCalculationShown: false,
  automaticOutlierDeletion: false,
  artificialReferenceValue: false,
  multiOscillationMeasurement: 20,
  operationalProtocol: 'ابدأ وأوقف القياس عند النقطة نفسها وفي الاتجاه نفسه.',
  feedbackPolicy: {
    firstWrong: 'hint',
    secondWrong: 'reveal',
  },
  standaloneProcedureRedesign: false,
} as const;
