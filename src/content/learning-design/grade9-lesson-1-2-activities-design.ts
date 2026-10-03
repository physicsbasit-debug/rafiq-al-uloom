export type Grade9Lesson12ActivityCategoryId = 'inquiry' | 'simulation' | 'data' | 'experiment';

export interface Grade9Lesson12ActivityCategoryDesign {
  readonly id: Grade9Lesson12ActivityCategoryId;
  readonly label: string;
  readonly title: string;
  readonly description: string;
}

/**
 * The student hub for lesson 1-2 is locked to exactly four categories by the Golden charter.
 * Multiple rounds may live inside one category, but no fifth peer card is allowed.
 */
export const grade9Lesson12ActivityCategories: readonly Grade9Lesson12ActivityCategoryDesign[] = [
  {
    id: 'inquiry',
    label: 'الاستقصاء العلمي',
    title: 'لماذا تختلف القياسات؟',
    description: 'تنبأ، افحص الدليل، اعزل سبب الاختلاف، ثم صمّم إجراء قياس أفضل.',
  },
  {
    id: 'simulation',
    label: 'المحاكاة',
    title: 'عينك جزء من القياس',
    description:
      'ابدأ باختلاف المنظر في المخبار، ثم غيّر أبعاد نموذج شفاف واستكشف كيف يتغير الحجم.',
  },
  {
    id: 'data',
    label: 'نشاط البيانات',
    title: 'أي القياسات أكثر اتساقًا؟',
    description: 'حوّل جدول القياسات إلى نمط بصري، ثم ميّز الاتساق عن الدقة.',
  },
  {
    id: 'experiment',
    label: 'التجربة الموجهة',
    title: 'محطة القياس',
    description:
      'اقرأ أربع محطات قياس موجهة وسجّل الأداة والقراءة والوحدة والحساب وسبب اختيار الطريقة.',
  },
] as const;
