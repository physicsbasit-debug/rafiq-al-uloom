import type { MasteryClassification } from '@shared-types/mastery.types';

export function getMasteryRecommendation(classification: MasteryClassification): string {
  switch (classification) {
    case 'متقن':
      return 'واصل التعلم بأنشطة إثرائية وتحديات أعمق لتثبيت الإتقان وتوسيعه.';
    case 'قريب من الإتقان':
      return 'راجع النقاط التي أخطأت فيها، ثم أعد حل تدريب قصير قبل الانتقال إلى درس جديد.';
    case 'يحتاج مراجعة':
      return 'ارجع إلى شرح الدرس والأمثلة الأساسية، ثم حل أسئلة المراجعة قبل إعادة اختبار الإتقان.';
    default:
      return 'راجع نتيجة الاختبار وحدد خطوة تعلم مناسبة قبل المتابعة.';
  }
}
