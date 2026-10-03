import type { Lesson, Objective } from '@shared-types/content.types';
import type { Experiment } from '@shared-types/experiment.types';
import type { Game } from '@shared-types/game.types';
import type { Question } from '@shared-types/quiz.types';

/**
 * Phase 6-7C4b
 *
 * دليل المعلم الرسمي يجمع 1-1 "أهمية القياس" و1-2 "قياس الطول والحجم"
 * في كتلة واحدة من حصتين، وترد تحتهما أهداف تعليمية مشتركة.
 * لذلك لا تُنشأ هنا أهداف "رسمية" جديدة للدرس 1-1.
 */

export const grade9ImportanceMeasurementReferenceLesson: Lesson = {
  id: 'g9-phy-s1-u1-l1',
  unitId: 'g9-phy-s1-u1-length-time',
  title: '1-1 أهمية القياس',
  order: 1,
  objectiveIds: ['g9-s1-u1-l1-o1', 'g9-s1-u1-l1-o4'],
  summary:
    'اتُّفق دوليًا على تعريف وحدات القياس الأساسية وتوحيدها حتى تكون القياسات قابلة للمقارنة والفهم. وتوضح تطبيقات الملاحة بالأقمار الصناعية أن القياس الدقيق للزمن قد يكون حاسمًا في تحديد الموقع.',
  keyConcepts: [
    'وحدات القياس الأساسية يجب أن تكون معرّفة وموحّدة دوليًا.',
    'استخدام نظام وحدات متفق عليه يسهّل مقارنة القياسات ومشاركة البيانات وفهمها.',
    'الدقة في القياس قد تكون مهمة جدًا حتى عندما يكون مقدار الخطأ صغيرًا للغاية.',
    'في النظام الدولي للوحدات: وحدة الطول الأساسية هي المتر (m)، وألف متر يساوي كيلومترًا واحدًا (km)، وجزء من ألف من المتر يساوي مليمترًا واحدًا (mm).',
  ],
  examples: [
    'يعتمد جهاز الملاحة المتصل بالأقمار الصناعية على قياس زمن وصول الإشارات بدقة شديدة لتحديد الموقع.',
    'نستخدم القياس في المنزل والطهي والرياضة والطب والهندسة والملاحة وغيرها من مجالات الحياة.',
    'تظهر الحاجة إلى وحدات قياس مشتركة في مجالات مثل الطب والهندسة والعمارة ومسح الكميات والعقارات والملاحة.',
  ],
  misconceptions: [
    'الجهاز الرقمي ليس بالضرورة أكثر دقة من الجهاز التناظري؛ فكلاهما يعتمد على مبدأ القياس نفسه، بينما قد تسهّل الشاشة الرقمية عملية القراءة.',
  ],
  status: 'approved',
  source: 'curriculum_seed',
};

export const grade9LengthVolumeReferenceLesson: Lesson = {
  id: 'g9-phy-s1-u1-l2',
  unitId: 'g9-phy-s1-u1-length-time',
  title: '1-2 قياس الطول والحجم',
  order: 2,
  objectiveIds: ['g9-s1-u1-l2-o1', 'g9-s1-u1-l2-o4'],
  summary:
    'القياس الجيد لا يعتمد على الأداة وحدها؛ بل على اختيار أداة ومدى مناسبين، ومحاذاة الجسم والقراءة بطريقة صحيحة. تستخدم المسطرة للأطوال المناسبة، والميكرومتر للأبعاد الصغيرة جدًا، والمخبار المدرج لقياس حجم السوائل، ويمكن إيجاد حجم الجسم غير المنتظم بطريقة الإزاحة.',
  keyConcepts: [
    'عند القياس بالمسطرة يُحاذى الجسم مع التدريج وتوضع بداية القياس عند الصفر وتُقرأ النهاية بوضوح.',
    'يمكن قياس بعد صغير جدًا بصورة غير مباشرة بقياس مجموعة من الأجسام المتماثلة ثم القسمة على عددها.',
    'يستخدم الميكرومتر لقياس أبعاد صغيرة جدًا، وتجمع قراءة التدريج الرئيسي مع قراءة التدريج الكسري.',
    'حجم متوازي المستطيلات يساوي الطول × العرض × الارتفاع.',
    'يقاس حجم السائل بالمخبار المدرج المناسب، وتؤخذ قراءة الماء عند أسفل السطح المقعر وبمستوى نظر أفقي.',
    'يُقاس حجم الجسم غير المنتظم بطريقة الإزاحة، ويساوي قراءة مستوى الماء بعد الغمر ناقص قراءة مستوى الماء قبل الغمر.',
  ],
  examples: [
    'يمكن قياس سمك ورقة واحدة بقياس سمك رزمة من 500 ورقة ثم قسمة السمك الكلي على 500.',
    'قراءة ميكرومتر مقدارها 2.5 mm على التدريج الرئيسي و0.17 mm على التدريج الكسري تعطي 2.67 mm.',
    'إذا ارتفع الماء في المخبار من 42 mL إلى 57 mL بعد غمر جسم غير منتظم فإن حجم الجسم يساوي 15 mL، أي 15 cm³.',
  ],
  misconceptions: [
    'الاعتقاد أن المسطرة تكفي لقياس كل الأطوال مهما صغر البعد؛ والصحيح أن الأبعاد الصغيرة جدًا قد تحتاج إلى الميكرومتر أو إلى قياس غير مباشر.',
    'الاعتقاد أن المخبار الأكبر هو الأفضل دائمًا؛ والصحيح أن اختيار المدى والتدرج يجب أن يناسب مقدار السائل المراد قياسه.',
    'الاعتقاد أن قراءة السائل تؤخذ من أي زاوية؛ والصحيح أن قراءة الماء تؤخذ عند أسفل السطح المقعر وبمستوى نظر أفقي.',
  ],
  status: 'draft',
  source: 'curriculum_seed',
};

export const grade10StaticElectricityReferenceLesson: Lesson = {
  id: 'g10-phy-s1-u1-l1',
  unitId: 'g10-phy-s1-u1-electric-charge',
  title: '1-1 الكهرباء الساكنة',
  order: 1,
  objectiveIds: ['g10-s1-u1-l1-o1', 'g10-s1-u1-l1-o2', 'g10-s1-u1-l1-o3'],
  summary:
    'توجد شحنات كهربائية موجبة وأخرى سالبة. الشحنات المتشابهة تتنافر، أما الشحنات المختلفة فتتجاذب. ويمكن إنتاج تأثيرات الكهرباء الساكنة والكشف عنها في تجارب بسيطة عند احتكاك مواد مختلفة، مثل دلك بالون أو قضيب مناسب ثم ملاحظة التجاذب أو التنافر.',
  keyConcepts: [
    'هناك نوعان من الشحنة الكهربائية: موجبة وسالبة.',
    'الشحنات المتشابهة تتنافر.',
    'الشحنات المختلفة تتجاذب.',
    'يمكن إظهار آثار الكهرباء الساكنة والكشف عنها بتجارب تعتمد على الاحتكاك.',
  ],
  examples: [
    'ملاحظة تأثيرات كهرباء ساكنة عند تمشيط الشعر.',
    'الشعور بوخزة كهربائية صغيرة بعد الخروج من السيارة في بعض الظروف.',
    'دلك بالون ثم ملاحظة انجذابه إلى أجسام خفيفة.',
  ],
  misconceptions: [
    'الاعتقاد أن الشحنات المتشابهة تتجاذب؛ والصحيح أنها تتنافر.',
    'الاعتقاد أن وجود الشحنة لا يمكن كشفه إلا باللمس؛ بينما يمكن ملاحظة أثرها من التجاذب أو التنافر.',
  ],
  status: 'draft',
  source: 'curriculum_seed',
};

export const semester1ReferenceObjectives: Objective[] = [
  {
    id: 'g9-s1-u1-l1-o1',
    lessonId: 'g9-phy-s1-u1-l1',
    text: 'يستخدم المسطرة والمخبار المدرج لإيجاد الطول أو الحجم، ويصف استخدامهما.',
  },
  {
    id: 'g9-s1-u1-l1-o4',
    lessonId: 'g9-phy-s1-u1-l1',
    text: 'يفهم كيف يستخدم أداة الميكرومتر لقياس الأبعاد الصغيرة جدًا.',
  },
  {
    id: 'g9-s1-u1-l2-o1',
    lessonId: 'g9-phy-s1-u1-l2',
    text: 'يستخدم المسطرة والمخبار المدرج لإيجاد الطول أو الحجم، ويصف استخدامهما.',
  },
  {
    id: 'g9-s1-u1-l2-o4',
    lessonId: 'g9-phy-s1-u1-l2',
    text: 'يفهم كيف يستخدم أداة الميكرومتر لقياس الأبعاد الصغيرة جدًا.',
  },
  {
    id: 'g10-s1-u1-l1-o1',
    lessonId: 'g10-phy-s1-u1-l1',
    text: 'يذكر أن هناك شحنات كهربائية موجبة وأخرى سالبة.',
  },
  {
    id: 'g10-s1-u1-l1-o2',
    lessonId: 'g10-phy-s1-u1-l1',
    text: 'يذكر أن الشحنات الكهربائية المختلفة تتجاذب والشحنات الكهربائية المتشابهة تتنافر.',
  },
  {
    id: 'g10-s1-u1-l1-o3',
    lessonId: 'g10-phy-s1-u1-l1',
    text: 'يصف ويفسر تجارب بسيطة تُظهر إنتاج شحنات الكهرباء الساكنة والكشف عنها من خلال الاحتكاك.',
  },
];

export const semester1ReferenceReviewQuestions: Question[] = [
  {
    id: 'g9-s1-u1-l1-rq1',
    lessonId: 'g9-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'في نظام وحدات متفق عليه بين العلماء، ما وحدة SI الأساسية لقياس الطول؟',
    choices: ['المتر (m)', 'اللتر (L)', 'الثانية (s)', 'الكيلوغرام (kg)'],
    correctAnswerIndex: 0,
    explanation: 'المتر (m) هو وحدة النظام الدولي الأساسية للطول.',
    objectiveId: 'g9-s1-u1-l1-o1',
    difficulty: 'easy',
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l1-rq2',
    lessonId: 'g9-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'قاس طالب مسافة مقدارها 3000 m. ما القيمة المكافئة لها؟',
    choices: ['3 km', '30 km', '300 km', '0.3 km'],
    correctAnswerIndex: 0,
    explanation: 'كل 1000 m تساوي 1 km، لذلك 3000 m تساوي 3 km.',
    objectiveId: 'g9-s1-u1-l1-o1',
    difficulty: 'medium',
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l1-rq3',
    lessonId: 'g9-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt:
      'انظر إلى سجل القياس المصور: طول قلم = 25 من دون وحدة. أي وحدة تكمل التسجيل بصورة مناسبة؟',
    choices: ['cm', 'L', 's', 'kg'],
    correctAnswerIndex: 0,
    explanation: 'تسجيل الطول يحتاج قيمة عددية ووحدة طول مناسبة؛ 25 cm تسجيل مكتمل وواضح.',
    objectiveId: 'g9-s1-u1-l1-o1',
    difficulty: 'medium',
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l1-rq4',
    lessonId: 'g9-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'عرض جهاز رقمي قراءة 12.345 cm، بينما عرض جهاز تناظري 12.3 cm. أي حكم أدق؟',
    choices: [
      'لا يمكن الحكم على الدقة من عدد الأرقام المعروضة وحده',
      'الجهاز الرقمي أدق دائمًا لأنه يعرض أرقامًا أكثر',
      'الجهاز التناظري أدق دائمًا لأنه لا يستخدم شاشة',
      'القراءتان غير قابلتين للمقارنة لأن شكل الجهازين مختلف',
    ],
    correctAnswerIndex: 0,
    explanation:
      'عدد الخانات الظاهرة لا يكفي للحكم على الدقة؛ تتأثر جودة القياس بالأداة وطريقة الاستخدام وحدود القياس.',
    objectiveId: 'g9-s1-u1-l1-o1',
    difficulty: 'hard',
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l1-rq5',
    lessonId: 'g9-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt:
      'يريد مختبران في بلدين مختلفين مقارنة قياسات طول للجسم نفسه. ما الإجراء الأهم قبل مقارنة النتائج؟',
    choices: [
      'استخدام نظام وحدات متفق عليه أو تحويل القياسات إلى وحدة مشتركة',
      'جمع جميع القيم حتى لو كانت بوحدات مختلفة',
      'اختيار أكبر قيمة فقط',
      'إهمال الوحدات والاكتفاء بالأرقام',
    ],
    correctAnswerIndex: 0,
    explanation:
      'توحيد الوحدة أو استخدام نظام قياس مشترك يجعل البيانات قابلة للفهم والمقارنة بين الفرق المختلفة.',
    objectiveId: 'g9-s1-u1-l1-o1',
    difficulty: 'hard',
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l2-rq1',
    lessonId: 'g9-phy-s1-u1-l2',
    type: 'multiple_choice',
    prompt: 'أي أداة تختار لقياس قطر سلك نحاسي رفيع جدًا؟',
    choices: ['مسطرة', 'ميكرومتر', 'مخبار مدرج'],
    correctAnswerIndex: 1,
    explanation:
      'الميكرومتر مناسب لقياس قطر السلك لأن هذا البعد صغير جدًا مقارنة بما يمكن قراءته بوضوح على المسطرة.',
    objectiveId: 'g9-s1-u1-l2-o4',
    difficulty: 'easy',
    status: 'draft',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l2-rq2',
    lessonId: 'g9-phy-s1-u1-l2',
    type: 'multiple_choice',
    prompt: 'قِيس سمك 100 ورقة متماثلة معًا فكان 8.0 mm. ما سمك ورقة واحدة؟',
    choices: ['0.08 mm', '0.8 mm', '8 mm', '80 mm'],
    correctAnswerIndex: 0,
    explanation:
      'القياس 8.0 mm يخص 100 ورقة؛ لذلك نقسمه على 100 فنحصل على 0.08 mm لسمك ورقة واحدة.',
    objectiveId: 'g9-s1-u1-l2-o1',
    difficulty: 'medium',
    status: 'draft',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l2-rq3',
    lessonId: 'g9-phy-s1-u1-l2',
    type: 'multiple_choice',
    prompt:
      'اقرأ الميكرومتر: التدريج الرئيسي يصل إلى 3.00 mm، وخط المرجع يطابق 28 تقسيمًا من 0.01 mm. ما القراءة النهائية؟',
    choices: ['3.28 mm', '3.028 mm', '3.00 mm', '0.28 mm'],
    correctAnswerIndex: 0,
    explanation:
      'التدريج الرئيسي 3.00 mm، والتدريج الكسري 28 × 0.01 mm = 0.28 mm؛ إذن القراءة الكلية 3.28 mm.',
    objectiveId: 'g9-s1-u1-l2-o4',
    difficulty: 'medium',
    status: 'draft',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l2-rq4',
    lessonId: 'g9-phy-s1-u1-l2',
    type: 'multiple_choice',
    prompt:
      'يريد طالب قياس 6 mL بمخبار سعته 1000 mL وأصغر تقسيم فيه 10 mL. ما المشكلة في خطة القياس؟',
    choices: [
      'التدرج لا يسمح بقراءة 6 mL مباشرة، ونحتاج مدى وتدرجًا أنسب للكمية',
      'موضع النظر وحده هو المشكلة، والمخبار مناسب كما هو',
      'وحدة mL غير مناسبة لقياس حجم السوائل',
    ],
    correctAnswerIndex: 0,
    explanation:
      'عندما يكون أصغر تقسيم 10 mL فإن 6 mL تقع بين علامتين ولا يمكن قراءتها مباشرة من التدريج؛ نختار مخبارًا بمدى وتدرج يناسبان الكمية الصغيرة.',
    objectiveId: 'g9-s1-u1-l2-o1',
    difficulty: 'hard',
    status: 'draft',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l2-rq5',
    lessonId: 'g9-phy-s1-u1-l2',
    type: 'multiple_choice',
    prompt:
      'مسار سلكي منحني مثبّت على لوحة ولا يمكن فرده أو تغيير شكله. كيف تقيس طول المسار من بدايته إلى نهايته؟',
    choices: [
      'أتتبع المسار بخيط مرن ثم أفرد الجزء المحدد من الخيط على المسطرة',
      'أحاول فرد المسار المثبّت بالقوة ثم أقيسه بالمسطرة',
      'أستخدم الميكرومتر لقياس طول المسار كله',
    ],
    correctAnswerIndex: 0,
    explanation:
      'لأن المسار مثبت ولا يمكن تقويمه، نتتبعه بخيط مرن من البداية إلى النهاية، نحدد هذا الجزء من الخيط، ثم نفرده على المسطرة لقياس طوله.',
    objectiveId: 'g9-s1-u1-l2-o1',
    difficulty: 'hard',
    status: 'draft',
    source: 'curriculum_seed',
  },
  {
    id: 'g10-s1-u1-l1-rq1',
    lessonId: 'g10-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'ما نوعا الشحنة الكهربائية؟',
    choices: ['قوية وضعيفة', 'موجبة وسالبة', 'ساكنة ومتحركة فقط', 'كبيرة وصغيرة'],
    correctAnswerIndex: 1,
    explanation: 'للشحنة الكهربائية نوعان: موجبة وسالبة.',
    objectiveId: 'g10-s1-u1-l1-o1',
    difficulty: 'easy',
    status: 'draft',
    source: 'curriculum_seed',
  },
  {
    id: 'g10-s1-u1-l1-rq2',
    lessonId: 'g10-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'ماذا يحدث عندما تقترب شحنتان موجبتان من بعضهما؟',
    choices: ['تتجاذبان', 'تتنافران', 'تختفيان', 'لا يحدث أي تأثير'],
    correctAnswerIndex: 1,
    explanation: 'الشحنات المتشابهة تتنافر.',
    objectiveId: 'g10-s1-u1-l1-o2',
    difficulty: 'easy',
    status: 'draft',
    source: 'curriculum_seed',
  },
  {
    id: 'g10-s1-u1-l1-rq3',
    lessonId: 'g10-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'أي زوج من الشحنات يتجاذب؟',
    choices: ['موجبة وموجبة', 'سالبة وسالبة', 'موجبة وسالبة', 'كل الأزواج تتنافر'],
    correctAnswerIndex: 2,
    explanation: 'الشحنات المختلفة تتجاذب.',
    objectiveId: 'g10-s1-u1-l1-o2',
    difficulty: 'easy',
    status: 'draft',
    source: 'curriculum_seed',
  },
  {
    id: 'g10-s1-u1-l1-rq4',
    lessonId: 'g10-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'أي موقف يمكن أن يُظهر أثر الكهرباء الساكنة؟',
    choices: [
      'دلك بالون ثم تقريبُه من قصاصات خفيفة',
      'ترك جسم ساكنًا دون تفاعل',
      'قياس طول قلم بالمسطرة',
      'تسخين ماء في إناء',
    ],
    correctAnswerIndex: 0,
    explanation: 'الاحتكاك قد ينتج تأثيرات كهرباء ساكنة يمكن ملاحظتها بالتجاذب أو التنافر.',
    objectiveId: 'g10-s1-u1-l1-o3',
    difficulty: 'medium',
    status: 'draft',
    source: 'curriculum_seed',
  },
];

export const semester1ReferenceMasteryQuestions: Question[] = [
  {
    id: 'g9-s1-u1-l1-mq1',
    lessonId: 'g9-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt:
      'أُرسل إلى مصنع آخر مخطط لقطعة معدنية كتب فيه الفني: «طول القطعة = 25» من دون وحدة. ما المشكلة في هذا التسجيل؟',
    choices: [
      'لم تُذكر وحدة قياس الطول، لذلك القياس غير مكتمل',
      'العدد 25 كبير جدًا ولا يصلح لقياس قطعة معدنية',
      'يجب أن يكون القياس مأخوذًا بأداة رقمية فقط',
      'يجب تغيير مادة القطعة قبل تسجيل القياس',
    ],
    correctAnswerIndex: 0,
    explanation:
      'القياس المكتمل يحتاج قيمة عددية ووحدة؛ فالعدد وحده لا يحدد مقدار الطول المقصود بصورة يمكن تنفيذها بثقة.',
    objectiveId: 'g9-s1-u1-l1-o1',
    difficulty: 'medium',
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l1-mq2',
    lessonId: 'g9-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt:
      'فريقان في بلدين مختلفين يصنعان جزأين سيُركبان معًا، لكن كل فريق يسجل الأطوال بوحدة مختلفة. لماذا يساعد استخدام نظام وحدات متفق عليه؟',
    choices: [
      'لضمان أن القياسات تُفهم ويمكن مطابقتها بين الفريقين',
      'لأن القياس يصبح أسرع دائمًا مهما كانت الأداة',
      'لأن النظام المشترك يلغي الحاجة إلى أدوات القياس',
      'لأن كل فريق يستطيع عندها إهمال كتابة الوحدة',
    ],
    correctAnswerIndex: 0,
    explanation:
      'الوحدات المشتركة تجعل القياسات قابلة للفهم والمقارنة بين أشخاص وفرق تعمل في أماكن مختلفة.',
    objectiveId: 'g9-s1-u1-l1-o1',
    difficulty: 'medium',
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l1-mq3',
    lessonId: 'g9-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt:
      'قاس طالبان سُمك قطعة بأداتين مختلفتين؛ الأولى رقمية والثانية ذات تدريج دقيق. قال أحدهما: «الأداة الرقمية هي الأدق دائمًا». أي استنتاج علمي أكثر صحة؟',
    choices: [
      'الدقة تعتمد على خصائص الأداة وتدرجها وطريقة القياس، لا على كونها رقمية فقط',
      'الأداة الرقمية أدق دائمًا لأنها تعرض أرقامًا على شاشة',
      'الأداة التناظرية أدق دائمًا مهما كان تدريجها',
      'لا يمكن مقارنة دقة أداتين تقيسان الكمية نفسها',
    ],
    correctAnswerIndex: 0,
    explanation:
      'شكل العرض لا يكفي للحكم على الدقة؛ يجب النظر إلى تدريج الأداة وقدرتها على القياس وطريقة استخدامها.',
    objectiveId: 'g9-s1-u1-l1-o1',
    difficulty: 'hard',
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l1-mq4',
    lessonId: 'g9-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt:
      'سجّل فريق أ طول سلك بأنه 0.8 m، وسجّل فريق ب للسلك نفسه 800 mm. ماذا تستنتج بعد توحيد الوحدة؟',
    choices: [
      'القياسان متساويان',
      'قياس الفريق أ أكبر',
      'قياس الفريق ب أكبر',
      'لا يمكن المقارنة بين القياسين',
    ],
    correctAnswerIndex: 0,
    explanation: '0.8 m تساوي 800 mm، لذلك القياسان متساويان بعد توحيد الوحدة.',
    objectiveId: 'g9-s1-u1-l1-o1',
    difficulty: 'hard',
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'g9-s1-u1-l1-mq5',
    lessonId: 'g9-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt:
      'شركة تصنع جزءًا لطائرة في بلد، وستصنع شركة أخرى الجزء المكمل في بلد آخر. أرسل الفريق الأول قياسًا مقداره 12 من دون وحدة. ما المشكلة التي قد تحدث، وما الممارسة التي تمنعها؟',
    choices: [
      'قد يُصنع الجزء بحجم غير مطابق؛ وتمنع ذلك كتابة القيمة مع وحدة مشتركة واضحة',
      'لن تحدث مشكلة لأن الرقم وحده يكفي إذا كان واضحًا',
      'المشكلة الوحيدة هي بطء التصنيع؛ وتمنعها زيادة سرعة القياس',
      'تمنع المشكلة باستخدام أداة رقمية مهما كانت الوحدة المسجلة',
    ],
    correctAnswerIndex: 0,
    explanation:
      'القياس بلا وحدة قد يُفسر بمقادير مختلفة؛ تسجيل القيمة مع وحدة واضحة ومتفق عليها يمنع سوء الفهم بين فرق التصنيع.',
    objectiveId: 'g9-s1-u1-l1-o1',
    difficulty: 'hard',
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'g10-s1-u1-l1-mq1',
    lessonId: 'g10-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'شحنتان سالبتان متقاربتان، ما السلوك المتوقع؟',
    choices: ['التجاذب', 'التنافر', 'عدم التأثير', 'تحول إحداهما إلى موجبة'],
    correctAnswerIndex: 1,
    explanation: 'الشحنات المتشابهة تتنافر.',
    objectiveId: 'g10-s1-u1-l1-o2',
    difficulty: 'medium',
    status: 'draft',
    source: 'curriculum_seed',
  },
  {
    id: 'g10-s1-u1-l1-mq2',
    lessonId: 'g10-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'شحنتان إحداهما موجبة والأخرى سالبة، ما السلوك المتوقع؟',
    choices: ['التنافر', 'التجاذب', 'اختفاء الشحنتين فورًا', 'لا توجد قوة'],
    correctAnswerIndex: 1,
    explanation: 'الشحنات المختلفة تتجاذب.',
    objectiveId: 'g10-s1-u1-l1-o2',
    difficulty: 'easy',
    status: 'draft',
    source: 'curriculum_seed',
  },
  {
    id: 'g10-s1-u1-l1-mq3',
    lessonId: 'g10-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'أي ملاحظة تعد دليلًا على وجود تأثير كهرباء ساكنة بعد الدلك؟',
    choices: [
      'انجذاب جسم خفيف',
      'تغير لون المسطرة',
      'زيادة كتلة الجسم',
      'انخفاض درجة حرارة الغرفة',
    ],
    correctAnswerIndex: 0,
    explanation: 'التجاذب أو التنافر من الملاحظات التي تكشف أثر الشحنة الكهربائية.',
    objectiveId: 'g10-s1-u1-l1-o3',
    difficulty: 'medium',
    status: 'draft',
    source: 'curriculum_seed',
  },
  {
    id: 'g10-s1-u1-l1-mq4',
    lessonId: 'g10-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'أي عبارة صحيحة؟',
    choices: [
      'الموجبة مع الموجبة تتجاذب',
      'السالبة مع السالبة تتجاذب',
      'الموجبة مع السالبة تتجاذب',
      'كل الشحنات تتجاذب',
    ],
    correctAnswerIndex: 2,
    explanation: 'الشحنات المختلفة تتجاذب، والمتشابهة تتنافر.',
    objectiveId: 'g10-s1-u1-l1-o2',
    difficulty: 'easy',
    status: 'draft',
    source: 'curriculum_seed',
  },
  {
    id: 'g10-s1-u1-l1-mq5',
    lessonId: 'g10-phy-s1-u1-l1',
    type: 'multiple_choice',
    prompt: 'ما الفكرة التي يمكن اختبارها عمليًا بدلك مادتين مناسبَتين؟',
    choices: [
      'إنتاج تأثير كهرباء ساكنة والكشف عنه',
      'قياس الكتلة الذرية',
      'قياس سرعة الضوء',
      'تغيير نوع المادة كيميائيًا',
    ],
    correctAnswerIndex: 0,
    explanation: 'يمكن استخدام الاحتكاك في تجارب بسيطة لإظهار آثار الكهرباء الساكنة والكشف عنها.',
    objectiveId: 'g10-s1-u1-l1-o3',
    difficulty: 'medium',
    status: 'draft',
    source: 'curriculum_seed',
  },
];

export const semester1ReferenceGames: Game[] = [
  {
    id: 'g9-s1-u1-l1-game',
    lessonId: 'g9-phy-s1-u1-l1',
    type: 'matching',
    title: 'صائد أخطاء القياس',
    instructions: 'اكتشف السجل أو العلاقة أو الوحدة التي لا تصمد علميًا.',
    items: [
      { left: '75 بلا وحدة', right: 'سجل غير مكتمل' },
      { left: '300 cm = 30 m', right: 'تحويل خاطئ' },
      { left: 'قطر مسمار = km', right: 'وحدة غير مناسبة' },
      { left: 'نتائج بوحدات مختلفة', right: 'تُوحَّد قبل المقارنة' },
    ],
    objectiveIds: ['g9-s1-u1-l1-o1'],
    status: 'approved',
    source: 'curriculum_seed',
  },
  {
    id: 'g10-s1-u1-l1-game',
    lessonId: 'g10-phy-s1-u1-l1',
    type: 'matching',
    title: 'طابق زوج الشحنات بالسلوك المتوقع',
    instructions: 'صِل كل حالة بما يحدث بين الشحنات.',
    items: [
      { left: 'موجبة + موجبة', right: 'تنافر' },
      { left: 'سالبة + سالبة', right: 'تنافر' },
      { left: 'موجبة + سالبة', right: 'تجاذب' },
      { left: 'بالون مدلوك + قصاصات خفيفة', right: 'ظهور أثر كهرباء ساكنة' },
    ],
    objectiveIds: ['g10-s1-u1-l1-o2', 'g10-s1-u1-l1-o3'],
    status: 'draft',
    source: 'curriculum_seed',
  },
];

export const semester1ReferenceExperiments: Experiment[] = [
  {
    id: 'g10-s1-u1-l1-exp',
    lessonId: 'g10-phy-s1-u1-l1',
    title: 'كشف أثر الكهرباء الساكنة بالبالون',
    objective: 'ملاحظة أثر شحنة كهرباء ساكنة ناتجة عن الاحتكاك.',
    objectiveIds: ['g10-s1-u1-l1-o2', 'g10-s1-u1-l1-o3'],
    tools: ['بالون', 'قطعة قماش صوفية جافة', 'قصاصات ورق صغيرة'],
    steps: [
      'انفخ البالون وثبته جيدًا.',
      'قرّب البالون من قصاصات الورق قبل الدلك وسجّل ما تلاحظه.',
      'ادلك البالون بقطعة الصوف عدة مرات.',
      'قرّب البالون من القصاصات مرة أخرى وقارن الملاحظة بما حدث قبل الدلك.',
    ],
    safetyNotes: ['أبعد البالون عن الوجه أثناء الدلك ولا تستخدمه قرب مصدر حرارة.'],
    safetyLevel: 'safe_home',
    observationPrompt: 'ما التغير الذي لاحظته في سلوك قصاصات الورق بعد دلك البالون؟',
    conclusionPrompt: 'ما الذي تشير إليه الملاحظة حول إنتاج أثر الكهرباء الساكنة بالاحتكاك؟',
    homeAlternative: 'يمكن تقريب بالون مدلوك من شعر جاف وملاحظة التجاذب دون لمس العينين أو الوجه.',
    status: 'draft',
    source: 'curriculum_seed',
  },
];
