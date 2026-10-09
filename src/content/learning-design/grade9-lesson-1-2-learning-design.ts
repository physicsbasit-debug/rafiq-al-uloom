export type Grade9Lesson12ReviewRole =
  'recall' | 'apply' | 'visual_read' | 'misconception' | 'concept_link';

export interface Grade9Lesson12ReviewDesignItem {
  readonly reviewRole: Grade9Lesson12ReviewRole;
  readonly stageLabel: string;
  readonly hint: string;
  readonly summarySkill: string;
  readonly sourceBasis: readonly string[];
}

/**
 * بيانات داخلية فقط لضبط مسار مراجعة درس 1-2 «قياس الطول والحجم».
 * لا تعرض المفاتيح أو أسماء المصادر للطالب.
 */
export const grade9Lesson12ReviewDesign: Readonly<Record<string, Grade9Lesson12ReviewDesignItem>> =
  {
    'g9-s1-u1-l2-rq1': {
      reviewRole: 'recall',
      stageLabel: 'استرجاع سريع',
      hint: 'قارن قطر السلك بأصغر تقسيم تستطيع الأداة قراءته بوضوح.',
      summarySkill: 'اختيار أداة لبعد صغير جدًا',
      sourceBasis: ['student_book_1_2_micrometer'],
    },
    'g9-s1-u1-l2-rq2': {
      reviewRole: 'apply',
      stageLabel: 'تطبيق حسابي',
      hint: 'القياس المعطى للرزمة كلها، والمطلوب سمك ورقة واحدة. فكّر في العملية التي تعيدك من المجموعة إلى الواحد.',
      summarySkill: 'القياس غير المباشر',
      sourceBasis: ['student_book_1_2_indirect_measurement'],
    },
    'g9-s1-u1-l2-rq3': {
      reviewRole: 'visual_read',
      stageLabel: 'قراءة أداة',
      hint: 'اقرأ أولًا آخر علامة رئيسية ظاهرة قبل حافة الأسطوانة، ثم طابق خط المرجع مع التدريج الكسري.',
      summarySkill: 'قراءة الميكرومتر',
      sourceBasis: ['student_book_1_2_micrometer'],
    },
    'g9-s1-u1-l2-rq4': {
      reviewRole: 'misconception',
      stageLabel: 'كشف خطأ',
      hint: 'انظر إلى أصغر تقسيم ظاهر: هل توجد علامة يمكن أن تمثل 6 mL مباشرة؟',
      summarySkill: 'اختيار مدى وتدرج مناسبين',
      sourceBasis: ['student_book_1_2_graduated_cylinder'],
    },
    'g9-s1-u1-l2-rq5': {
      reviewRole: 'concept_link',
      stageLabel: 'موقف جديد',
      hint: 'المسار مثبت ولا يمكن تقويمه. ابحث عن وسيط مرن يتبع المنحنى ثم يمكن فرده للقياس.',
      summarySkill: 'اختيار طريقة لقياس مسار منحني',
      sourceBasis: ['student_book_1_2_curved_line_string_method'],
    },
  } as const;

export type Grade9Lesson12MasteryCognitiveLevel = 'apply' | 'analyze' | 'transfer';

export interface Grade9Lesson12MasteryDesignItem {
  readonly stageLabel: string;
  readonly cognitiveLevel: Grade9Lesson12MasteryCognitiveLevel;
  readonly visualRole: 'reference' | 'evidence';
  readonly masteryDimension: string;
  readonly sourceBasis: readonly string[];
}

/**
 * عقد إتقان درس 1-2.
 * المواقف جديدة ولا تعيد أسئلة المراجعة حرفيًا، ولا تعرض تلميحات أثناء الحل.
 */
export const grade9Lesson12MasteryDesign: Readonly<
  Record<string, Grade9Lesson12MasteryDesignItem>
> = {
  'g9-s1-u1-l2-mq1': {
    stageLabel: 'موقف قياس جديد',
    cognitiveLevel: 'apply',
    visualRole: 'evidence',
    masteryDimension: 'القياس بالمسطرة وتصحيح نقطة البداية',
    sourceBasis: ['student_book_1_2_ruler_alignment'],
  },
  'g9-s1-u1-l2-mq2': {
    stageLabel: 'استدلال غير مباشر',
    cognitiveLevel: 'analyze',
    visualRole: 'evidence',
    masteryDimension: 'القياس غير المباشر للأبعاد الصغيرة',
    sourceBasis: ['student_book_1_2_indirect_measurement'],
  },
  'g9-s1-u1-l2-mq3': {
    stageLabel: 'قراءة أداة جديدة',
    cognitiveLevel: 'apply',
    visualRole: 'evidence',
    masteryDimension: 'قراءة الميكرومتر',
    sourceBasis: ['student_book_1_2_micrometer'],
  },
  'g9-s1-u1-l2-mq4': {
    stageLabel: 'استدلال إزاحة مركب',
    cognitiveLevel: 'analyze',
    visualRole: 'evidence',
    masteryDimension: 'استنتاج حجم مجهول من الإزاحة الكلية',
    sourceBasis: ['student_book_1_2_graduated_cylinder', 'student_book_1_2_displacement'],
  },
  'g9-s1-u1-l2-mq5': {
    stageLabel: 'استدلال هندسي عكسي',
    cognitiveLevel: 'transfer',
    visualRole: 'evidence',
    masteryDimension: 'استنتاج بعد مجهول من حجم معلوم',
    sourceBasis: ['student_book_1_2_regular_volume'],
  },
} as const;

export function getGrade9Lesson12MasteryDimension(questionId: string): string | undefined {
  return grade9Lesson12MasteryDesign[questionId]?.masteryDimension;
}

export function getGrade9Lesson12MasteryStageLabel(questionId: string): string | undefined {
  return grade9Lesson12MasteryDesign[questionId]?.stageLabel;
}
