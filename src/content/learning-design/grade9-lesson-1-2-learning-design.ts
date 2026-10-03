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
