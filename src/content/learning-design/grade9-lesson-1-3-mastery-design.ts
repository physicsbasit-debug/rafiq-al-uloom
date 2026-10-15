export const MQ2_FINAL_OPTIONS = [
  {
    id: 'display-decimals-equal-accuracy',
    text: 'صحيح؛ لأن عرض منزلتين عشريتين يعني دقة القياس حتى 0.01 ثانية.',
  },
  {
    id: 'manual-reaction-limit',
    text: 'غير صحيح؛ لأن التشغيل اليدوي يضيف أثر زمن الاستجابة رغم عرض منزلتين عشريتين.',
  },
  {
    id: 'digital-unsuitable-short-times',
    text: 'غير صحيح؛ لأن المؤقت الرقمي لا يناسب قياس الفترات الزمنية القصيرة.',
  },
  {
    id: 'digital-removes-human-response',
    text: 'صحيح؛ لأن المؤقت الرقمي يلغي أثر استجابة الشخص عند التشغيل.',
  },
] as const;

export const GRADE9_L13_MASTERY_VARIANTS = {
  mq1: [
    {
      questionKey: 'mastery-analog-timer-water-fill-procedure',
      variantKey: 'water-vessel-target-mark',
      contextKey: 'mastery-water-fill-to-mark',
      visualKey: 'g9-l13-mastery-water-fill-analog-v2',
      cognitiveFunction: 'construct-assigned-analog-timing-procedure',
      physicsTeacherReviewed: false,
      kind: 'ordering',
      prompt:
        'أمامك ست خطوات محتملة لقياس الزمن الذي يستغرقه الماء منذ بدء خروجه من الصنبور حتى وصول سطحه إلى علامة المستوى في الإناء. يُغلق الصنبور بعد أن يصل الماء إلى العلامة. اختر أربع خطوات صحيحة فقط، ثم رتّبها بالترتيب الذي ينبغي تنفيذه.',
      correctStepIds: ['A', 'B', 'C', 'D'],
      steps: [
        {
          id: 'A',
          text: 'صفّر المؤقت وتأكد من أنه يبدأ من الصفر.',
          diagnostic: null,
        },
        {
          id: 'B',
          text: 'ابدأ تشغيل المؤقت عند أول ظهور للماء خارج الصنبور.',
          diagnostic: null,
        },
        {
          id: 'C',
          text: 'أوقف المؤقت عندما يصل سطح الماء إلى علامة المستوى المحددة على الإناء.',
          diagnostic: null,
        },
        {
          id: 'D',
          text: 'اقرأ الزمن الظاهر على المؤقت وسجله بوحدة ثانية.',
          diagnostic: null,
        },
        {
          id: 'E',
          text: 'ابدأ تشغيل المؤقت عندما يصل سطح الماء إلى علامة المستوى.',
          diagnostic: 'incorrect-start-boundary',
        },
        {
          id: 'F',
          text: 'أوقف المؤقت عندما يُغلق الصنبور.',
          diagnostic: 'incorrect-end-boundary',
        },
      ],
    },
    {
      questionKey: 'mastery-analog-timer-water-fill-procedure',
      variantKey: 'sand-funnel-target-mark',
      contextKey: 'mastery-sand-funnel-fill-to-mark',
      visualKey: 'g9-l13-mastery-sand-funnel-analog-v1',
      cognitiveFunction: 'construct-assigned-analog-timing-procedure',
      physicsTeacherReviewed: false,
      kind: 'ordering',
      prompt:
        'يسقط الرمل من قمع إلى وعاء يحمل علامة مستهدفة. تُغلق فتحة القمع بعد أن يصل الرمل إلى العلامة المستهدفة. اختر أربع خطوات صحيحة لقياس الزمن منذ بدء خروج الرمل حتى بلوغه العلامة، ثم رتّبها.',
      correctStepIds: ['A', 'B', 'C', 'D'],
      steps: [
        {
          id: 'A',
          text: 'صفّر المؤقت وتأكد من أنه يبدأ من الصفر.',
          diagnostic: null,
        },
        {
          id: 'B',
          text: 'ابدأ تشغيل المؤقت عند أول خروج للرمل من القمع.',
          diagnostic: null,
        },
        {
          id: 'C',
          text: 'أوقف المؤقت عندما يصل سطح الرمل إلى العلامة المستهدفة.',
          diagnostic: null,
        },
        {
          id: 'D',
          text: 'اقرأ الزمن الظاهر على المؤقت وسجله بوحدة ثانية.',
          diagnostic: null,
        },
        {
          id: 'E',
          text: 'ابدأ تشغيل المؤقت عندما يصل الرمل إلى العلامة المستهدفة.',
          diagnostic: 'incorrect-start-boundary',
        },
        {
          id: 'F',
          text: 'أوقف المؤقت عندما تُغلق فتحة القمع.',
          diagnostic: 'incorrect-end-boundary',
        },
      ],
    },
  ],

  mq2: [
    {
      questionKey: 'mastery-digital-display-accuracy-claim',
      variantKey: 'ramp-release-1_27',
      contextKey: 'mastery-toy-car-short-ramp',
      visualKey: 'g9-l13-mastery-toy-car-digital-timer-v1',
      cognitiveFunction: 'evaluate-digital-resolution-versus-measurement-accuracy',
      physicsTeacherReviewed: false,
      kind: 'single-choice',
      prompt:
        'شغّل طالب مؤقتًا رقميًا بيده عند انطلاق سيارة لعبة من أعلى منحدر قصير، وأوقفه بيده عند وصول السيارة إلى أسفل المنحدر، فعرض المؤقت 1.27 ثانية. قال الطالب: «ظهور منزلتين عشريتين يعني أن دقة القياس هي 0.01 ثانية». ما الحكم الصحيح على هذا القول؟',
      options: MQ2_FINAL_OPTIONS,
      correctOptionId: 'manual-reaction-limit',
    },
    {
      questionKey: 'mastery-digital-display-accuracy-claim',
      variantKey: 'ramp-two-marks-2_43',
      contextKey: 'mastery-toy-car-two-mark-ramp',
      visualKey: 'g9-l13-mastery-toy-car-two-mark-digital-v1',
      cognitiveFunction: 'evaluate-digital-resolution-versus-measurement-accuracy',
      physicsTeacherReviewed: false,
      kind: 'single-choice',
      prompt:
        'شغّل طالب مؤقتًا رقميًا بيده عندما عبرت سيارة لعبة العلامة العلوية على منحدر، وأوقفه بيده عندما عبرت العلامة السفلية، فعرض المؤقت 2.43 ثانية. قال الطالب: «هذه القراءة تعني أن القياس دقيق حتى جزء من مئة من الثانية». ما الحكم الصحيح على هذا القول؟',
      options: MQ2_FINAL_OPTIONS,
      correctOptionId: 'manual-reaction-limit',
    },
  ],

  mq3: [
    {
      questionKey: 'mastery-ball-drop-five-trial-mean',
      variantKey: 'ball-drop-1_8m',
      contextKey: 'mastery-ball-drop-five-trial-investigation',
      visualKey: 'g9-l13-mastery-ball-drop-notebook-v2',
      cognitiveFunction: 'calculate-mean-from-five-repeated-times',
      physicsTeacherReviewed: false,
      kind: 'generated-single-choice',
      heightLabel: '1.8 م',
      readingsHundredths: [55, 66, 58, 67, 59],
      sumHundredths: 305,
      meanHundredths: 61,
      medianHundredths: 59,
      displayRounding: 'half-up-to-hundredth',
    },
    {
      questionKey: 'mastery-ball-drop-five-trial-mean',
      variantKey: 'ball-drop-1_2m',
      contextKey: 'mastery-ball-drop-five-trial-1-2m',
      visualKey: 'g9-l13-mastery-ball-drop-notebook-v2b',
      cognitiveFunction: 'calculate-mean-from-five-repeated-times',
      physicsTeacherReviewed: false,
      kind: 'generated-single-choice',
      heightLabel: '1.2 م',
      readingsHundredths: [47, 58, 42, 54, 49],
      sumHundredths: 250,
      meanHundredths: 50,
      medianHundredths: 49,
      displayRounding: 'half-up-to-hundredth',
    },
    {
      questionKey: 'mastery-ball-drop-five-trial-mean',
      variantKey: 'ball-drop-0_8m',
      contextKey: 'mastery-ball-drop-five-trial-0-8m',
      visualKey: 'g9-l13-mastery-ball-drop-notebook-v2c',
      cognitiveFunction: 'calculate-mean-from-five-repeated-times',
      physicsTeacherReviewed: false,
      kind: 'generated-single-choice',
      heightLabel: '0.8 م',
      readingsHundredths: [36, 44, 38, 45, 37],
      sumHundredths: 200,
      meanHundredths: 40,
      medianHundredths: 38,
      displayRounding: 'half-up-to-hundredth',
    },
  ],

  mq4: [
    {
      questionKey: 'mastery-horizontal-spring-cart-period',
      variantKey: 'spring-cart-8-in-5_92',
      contextKey: 'mastery-horizontal-spring-cart-period',
      visualKey: 'g9-l13-mastery-horizontal-spring-cart-v1',
      cognitiveFunction: 'derive-period-from-repeated-cycles',
      physicsTeacherReviewed: false,
      kind: 'numeric',
      cycles: 8,
      totalHundredths: 592,
      correctHundredths: 74,
      multipliedHundredths: 4736,
      reversedTargetThousandths: 1351,
      reversedToleranceThousandths: 5,
      definition: 'الدورة الكاملة هي حركة العربة من موضع البداية ثم عودتها إلى موضع البداية نفسه.',
    },
    {
      questionKey: 'mastery-horizontal-spring-cart-period',
      variantKey: 'spring-cart-10-cycles-7_30',
      contextKey: 'mastery-horizontal-spring-cart-ten-cycles',
      visualKey: 'g9-l13-mastery-horizontal-spring-cart-v1b',
      cognitiveFunction: 'derive-period-from-repeated-cycles',
      physicsTeacherReviewed: false,
      kind: 'numeric',
      cycles: 10,
      totalHundredths: 730,
      correctHundredths: 73,
      multipliedHundredths: 7300,
      reversedTargetThousandths: 1370,
      reversedToleranceThousandths: 5,
      definition: 'الدورة الكاملة هي حركة العربة من موضع البداية ثم عودتها إلى موضع البداية نفسه.',
    },
  ],

  mq5: [
    {
      questionKey: 'mastery-flexible-platform-complete-cycle',
      variantKey: 'flex-platform-reference-up',
      contextKey: 'mastery-flexible-platform-vertical-cycle',
      visualKey: 'g9-l13-mastery-flex-platform-cycle-v1',
      cognitiveFunction: 'identify-complete-period-boundary-in-new-context',
      physicsTeacherReviewed: false,
      kind: 'single-choice',
      startDirection: 'up',
      prompt:
        'يقف طالب على منصة مرنة تتحرك رأسيًا. عند بداية الحركة كانت المنصة عند العلامة المرجعية وتتحرك إلى أعلى. أي حالة تعني أن المنصة أكملت دورة كاملة واحدة للمرة الأولى؟',
      options: [
        {
          id: 'highest-position',
          text: 'تكون المنصة عند أعلى موضع.',
          diagnostic: 'extreme-point-confusion',
        },
        {
          id: 'reference-moving-down',
          text: 'تكون المنصة عند العلامة المرجعية وتتحرك إلى أسفل.',
          diagnostic: 'correct-position-wrong-direction',
        },
        {
          id: 'lowest-position',
          text: 'تكون المنصة عند أدنى موضع.',
          diagnostic: 'opposite-extreme-point-confusion',
        },
        {
          id: 'reference-moving-up',
          text: 'تكون المنصة عند العلامة المرجعية وتتحرك إلى أعلى.',
          diagnostic: null,
        },
      ],
      correctOptionId: 'reference-moving-up',
    },
    {
      questionKey: 'mastery-flexible-platform-complete-cycle',
      variantKey: 'spring-seat-reference-down',
      contextKey: 'mastery-spring-seat-vertical-cycle',
      visualKey: 'g9-l13-mastery-spring-seat-cycle-v1',
      cognitiveFunction: 'identify-complete-period-boundary-in-new-context',
      physicsTeacherReviewed: false,
      kind: 'single-choice',
      startDirection: 'down',
      prompt:
        'يجلس طالب على مقعد زنبركي يتحرك رأسيًا. عند بداية الحركة كان المقعد عند العلامة المرجعية ويتحرك إلى أسفل. أي حالة تعني أن المقعد أكمل دورة كاملة واحدة للمرة الأولى؟',
      options: [
        {
          id: 'lowest-position',
          text: 'يكون المقعد عند أدنى موضع.',
          diagnostic: 'extreme-point-confusion',
        },
        {
          id: 'reference-moving-up',
          text: 'يكون المقعد عند العلامة المرجعية ويتحرك إلى أعلى.',
          diagnostic: 'correct-position-wrong-direction',
        },
        {
          id: 'highest-position',
          text: 'يكون المقعد عند أعلى موضع.',
          diagnostic: 'opposite-extreme-point-confusion',
        },
        {
          id: 'reference-moving-down',
          text: 'يكون المقعد عند العلامة المرجعية ويتحرك إلى أسفل.',
          diagnostic: null,
        },
      ],
      correctOptionId: 'reference-moving-down',
    },
  ],
} as const;
