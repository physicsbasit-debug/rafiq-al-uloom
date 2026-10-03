interface StudentQuestionVisual {
  readonly src: string;
  readonly alt: string;
}

const VISUALS: Readonly<Record<string, StudentQuestionVisual>> = {
  'g9-s1-u1-l1-rq3': {
    src: '/lesson-visuals/g9-review-lab-record.svg',
    alt: 'سجل قياس بصري يعرض قيمة طول بلا وحدة مع أداة قياس',
  },
  'g9-s1-u1-l1-mq1': {
    src: '/lesson-visuals/mastery/g9-importance-measurement/mechanical-blueprint.svg',
    alt: 'مخطط تقني لقطعة معدنية يتطلب قراءة القياس المسجل بعناية',
  },
  'g9-s1-u1-l1-mq2': {
    src: '/lesson-visuals/mastery/g9-importance-measurement/international-teams.svg',
    alt: 'فريقا تصنيع في موقعين مختلفين يعملان على جزأين يجب أن يتطابقا',
  },
  'g9-s1-u1-l1-mq3': {
    src: '/lesson-visuals/mastery/g9-importance-measurement/precision-tools.svg',
    alt: 'أداتا قياس رقمية وتناظرية معروضة للمقارنة دون إظهار أي حكم على الدقة',
  },
  'g9-s1-u1-l1-mq4': {
    src: '/lesson-visuals/mastery/g9-importance-measurement/two-measurement-reports.svg',
    alt: 'تقريران لقياس الجسم نفسه بوحدتين مختلفتين يحتاجان إلى المقارنة',
  },
  'g9-s1-u1-l1-mq5': {
    src: '/lesson-visuals/mastery/g9-importance-measurement/aircraft-component.svg',
    alt: 'مشهد تصنيع جزء لطائرة بين شركتين مع مخطط هندسي يحتاج إلى تسجيل قياس مكتمل',
  },
};

export function getStudentQuestionVisual(questionId: string): StudentQuestionVisual | undefined {
  return VISUALS[questionId];
}
