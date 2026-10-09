export type GoldenLearningPath = 'review' | 'activity' | 'game' | 'lab' | 'mastery' | 'explanation';

export interface GoldenLearningMoment {
  readonly id: string;
  readonly path: GoldenLearningPath;
  /**
   * مفتاح دلالي للموقف/السؤال نفسه، لا نص السؤال المعروض للطالب.
   * يجب أن يختلف إذا اختلف السياق التعليمي فعلاً، لا لمجرد تغيير رقم.
   */
  readonly questionKey: string;
  /**
   * مفتاح المرئي التعليمي الذي يحمل الدليل أو المهمة. الصور الزخرفية لا تدخل هنا.
   */
  readonly visualKey?: string;
  /**
   * الفعل العقلي الدقيق الذي يقوم به الطالب في هذه اللحظة التعليمية.
   */
  readonly cognitiveFunction: string;
  readonly contextKey?: string;
  readonly objectiveKey: string;
  readonly skill: string;
}

export type GoldenConflictKind = 'question' | 'visual' | 'cognitive' | 'context';

export interface GoldenLearningConflict {
  readonly kind: GoldenConflictKind;
  readonly key: string;
  readonly firstId: string;
  readonly secondId: string;
  readonly firstPath: GoldenLearningPath;
  readonly secondPath: GoldenLearningPath;
}

function normalizeKey(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized || undefined;
}

function findCrossPathDuplicates(
  moments: readonly GoldenLearningMoment[],
  kind: GoldenConflictKind,
  selectKey: (moment: GoldenLearningMoment) => string | undefined
): GoldenLearningConflict[] {
  const firstByKey = new Map<string, GoldenLearningMoment>();
  const conflicts: GoldenLearningConflict[] = [];

  moments.forEach((moment) => {
    const key = normalizeKey(selectKey(moment));
    if (!key) return;

    const first = firstByKey.get(key);
    if (!first) {
      firstByKey.set(key, moment);
      return;
    }

    // المقصود بالحارس هو منع إعادة تدوير المهمة بين المسارات المختلفة.
    // التكرار المقصود داخل المسار نفسه قد يكون جزءًا من إعادة المحاولة أو تنويع السيناريو.
    if (first.path === moment.path) return;

    conflicts.push({
      kind,
      key,
      firstId: first.id,
      secondId: moment.id,
      firstPath: first.path,
      secondPath: moment.path,
    });
  });

  return conflicts;
}

/**
 * حارس «ميثاق رفيق الذهبي» ضد إعادة تدوير التعلم بين المسارات.
 *
 * يفحص ثلاثة أنواع من التكرار عبر المسارات المختلفة:
 * 1) نفس الموقف/السؤال الدلالي.
 * 2) نفس المرئي التعليمي.
 * 3) نفس الوظيفة المعرفية الدقيقة.
 */
export function findGoldenLearningConflicts(
  moments: readonly GoldenLearningMoment[]
): GoldenLearningConflict[] {
  return [
    ...findCrossPathDuplicates(moments, 'question', (moment) => moment.questionKey),
    ...findCrossPathDuplicates(moments, 'visual', (moment) => moment.visualKey),
    ...findCrossPathDuplicates(moments, 'cognitive', (moment) => moment.cognitiveFunction),
    ...findCrossPathDuplicates(moments, 'context', (moment) => moment.contextKey),
  ];
}

export function hasGoldenLearningConflicts(moments: readonly GoldenLearningMoment[]): boolean {
  return findGoldenLearningConflicts(moments).length > 0;
}
