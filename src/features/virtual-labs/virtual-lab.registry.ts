export interface VirtualLabDefinition {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly gradeId: 'g9' | 'g10';
  readonly gradeLabel: string;
  readonly semesterLabel: string;
  readonly unitLabel: string;
  readonly lessonLabel: string;
  readonly relatedLessonIds: readonly string[];
  readonly url: string;
}

export const VIRTUAL_LABS: readonly VirtualLabDefinition[] = [
  {
    id: 'measurement-lab-grade9',
    title: 'قياس الطول والحجم والزمن',
    description: 'تدرّب على القياس بالأدوات المناسبة وقراءة التدريجات وتسجيل النتائج.',
    gradeId: 'g9',
    gradeLabel: 'الصف التاسع',
    semesterLabel: 'الفصل الدراسي الأول',
    unitLabel: 'الوحدة الأولى: الطول والزمن',
    lessonLabel: '1-1 أهمية القياس • 1-2 قياس الطول والحجم • 1-3 قياس الزمن',
    relatedLessonIds: ['g9-phy-s1-u1-l1', 'g9-phy-s1-u1-l2', 'g9-phy-s1-u1-l3'],
    url: 'https://measurement-lab-grade9.physicsbasit.chatgpt.site',
  },
  {
    id: 'static-electricity-lab-g10',
    title: 'الكهرباء الساكنة',
    description: 'استكشف الشحنات الكهربائية والدلك والتجاذب والتنافر بصورة تفاعلية.',
    gradeId: 'g10',
    gradeLabel: 'الصف العاشر',
    semesterLabel: 'الفصل الدراسي الأول',
    unitLabel: 'الوحدة الأولى: الشحنة الكهربائية',
    lessonLabel: '1-1 الكهرباء الساكنة',
    relatedLessonIds: ['g10-phy-s1-u1-l1'],
    url: 'https://static-electricity-lab-g10.physicsbasit.chatgpt.site',
  },
  {
    id: 'circuit-components-lab-grade10',
    title: 'مكونات الدائرة الكهربائية',
    description: 'كوّن دائرة كهربائية وتعرّف المكونات وأجهزة القياس وتطبيقاتها.',
    gradeId: 'g10',
    gradeLabel: 'الصف العاشر',
    semesterLabel: 'الفصل الدراسي الأول',
    unitLabel: 'الوحدة الثانية: مخططات الدوائر الكهربائية',
    lessonLabel: '2-1 مكونات الدائرة الكهربائية',
    relatedLessonIds: ['g10-phy-s1-u2-l1'],
    url: 'https://circuit-components-lab-grade10.physicsbasit.chatgpt.site',
  },
];

export function getVirtualLabsForLesson(lessonId: string): VirtualLabDefinition[] {
  return VIRTUAL_LABS.filter((lab) => lab.relatedLessonIds.includes(lessonId));
}

export function groupVirtualLabsByGrade() {
  return [
    {
      gradeId: 'g9' as const,
      gradeLabel: 'الصف التاسع',
      labs: VIRTUAL_LABS.filter((lab) => lab.gradeId === 'g9'),
    },
    {
      gradeId: 'g10' as const,
      gradeLabel: 'الصف العاشر',
      labs: VIRTUAL_LABS.filter((lab) => lab.gradeId === 'g10'),
    },
  ].filter((group) => group.labs.length > 0);
}
