export type InternalDifficulty = 'foundational' | 'medium' | 'high';
export type InternalCognitiveLevel = 'recognize' | 'apply' | 'analyze' | 'transfer';
export type InternalVisualRole = 'none' | 'reference' | 'evidence';
export type InternalReviewRole =
  | 'recall'
  | 'apply'
  | 'visual_read'
  | 'misconception'
  | 'concept_link';

interface InternalQuestionDesign {
  readonly difficulty: InternalDifficulty;
  readonly cognitiveLevel: InternalCognitiveLevel;
  readonly visualRole: InternalVisualRole;
  readonly sourceBasis: readonly string[];
  readonly masteryDimension: string;
  readonly reviewRole?: InternalReviewRole;
  readonly reviewHint?: string;
  readonly reviewSummaryGroup?: string;
}

/**
 * بيانات تصميم داخلية لضبط جودة الدرس. لا تعرض هذه الحقول في واجهة الطالب.
 */
export const grade9Lesson11QuestionDesign: Readonly<Record<string, InternalQuestionDesign>> = {
  'g9-s1-u1-l1-rq1': {
    difficulty: 'foundational',
    cognitiveLevel: 'recognize',
    visualRole: 'none',
    sourceBasis: ['activity_book_1_1_si'],
    masteryDimension: 'الوحدات الأساسية',
    reviewRole: 'recall',
    reviewHint: 'حدد أولًا نوع الكمية: المطلوب هنا طول، لا حجم أو زمن أو كتلة.',
    reviewSummaryGroup: 'النظام الدولي والوحدات',
  },
  'g9-s1-u1-l1-rq2': {
    difficulty: 'medium',
    cognitiveLevel: 'apply',
    visualRole: 'none',
    sourceBasis: ['activity_book_1_1_si'],
    masteryDimension: 'التحويل بين الوحدات',
    reviewRole: 'apply',
    reviewHint: 'اربط الوحدتين بالعلاقة 1 km = 1000 m ثم أعد التحويل.',
    reviewSummaryGroup: 'المقارنة والتحويل',
  },
  'g9-s1-u1-l1-rq3': {
    difficulty: 'medium',
    cognitiveLevel: 'apply',
    visualRole: 'evidence',
    sourceBasis: ['activity_book_1_1_si', 'teacher_guide_measurement_recording'],
    masteryDimension: 'اكتمال القياس',
    reviewRole: 'visual_read',
    reviewHint: 'اقرأ السجل المصور وحدد نوع الكمية أولًا: أي وحدة تصلح لطول جسم صغير؟',
    reviewSummaryGroup: 'النظام الدولي والوحدات',
  },
  'g9-s1-u1-l1-rq4': {
    difficulty: 'high',
    cognitiveLevel: 'analyze',
    visualRole: 'none',
    sourceBasis: ['teacher_guide_digital_analog_misconception'],
    masteryDimension: 'الحكم على الدقة',
    reviewRole: 'misconception',
    reviewHint: 'لا تحكم من شكل الشاشة أو عدد الخانات فقط؛ فكّر في خصائص أداة القياس وقدرتها.',
    reviewSummaryGroup: 'الدقة وأهمية القياس',
  },
  'g9-s1-u1-l1-rq5': {
    difficulty: 'high',
    cognitiveLevel: 'analyze',
    visualRole: 'none',
    sourceBasis: ['activity_book_1_1_si', 'teacher_guide_shared_units'],
    masteryDimension: 'المعيار المشترك',
    reviewRole: 'concept_link',
    reviewHint: 'قبل مقارنة رقمين، تحقق من أن القياسين يستخدمان وحدة مشتركة أو يمكن تحويلهما إليها.',
    reviewSummaryGroup: 'المقارنة والتحويل',
  },
  'g9-s1-u1-l1-mq1': {
    difficulty: 'medium',
    cognitiveLevel: 'transfer',
    visualRole: 'evidence',
    sourceBasis: ['activity_book_1_1_si', 'teacher_guide_measurement_recording'],
    masteryDimension: 'فهم القياس المكتمل',
  },
  'g9-s1-u1-l1-mq2': {
    difficulty: 'medium',
    cognitiveLevel: 'transfer',
    visualRole: 'evidence',
    sourceBasis: ['activity_book_1_1_si', 'teacher_guide_shared_units'],
    masteryDimension: 'استخدام الوحدات المشتركة والتواصل العلمي',
  },
  'g9-s1-u1-l1-mq3': {
    difficulty: 'high',
    cognitiveLevel: 'analyze',
    visualRole: 'evidence',
    sourceBasis: ['teacher_guide_digital_analog_misconception'],
    masteryDimension: 'الدقة والموثوقية في القياس',
  },
  'g9-s1-u1-l1-mq4': {
    difficulty: 'high',
    cognitiveLevel: 'apply',
    visualRole: 'evidence',
    sourceBasis: ['activity_book_1_1_si'],
    masteryDimension: 'استخدام الوحدات المشتركة والتواصل العلمي',
  },
  'g9-s1-u1-l1-mq5': {
    difficulty: 'high',
    cognitiveLevel: 'transfer',
    visualRole: 'evidence',
    sourceBasis: ['activity_book_1_1_si', 'teacher_guide_measurement_recording', 'teacher_guide_shared_units'],
    masteryDimension: 'تطبيق المفهوم في موقف جديد',
  },
};

export function getGrade9Lesson11MasteryDimension(questionId: string): string | undefined {
  return grade9Lesson11QuestionDesign[questionId]?.masteryDimension;
}
