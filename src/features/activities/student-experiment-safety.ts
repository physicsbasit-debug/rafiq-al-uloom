import type { SafetyLevel } from '@shared-types/experiment.types';

export type StudentExperimentSafetyMode =
  'execute' | 'supervised_preview' | 'lab_preview' | 'blocked';

export interface StudentExperimentSafetyDecision {
  readonly mode: StudentExperimentSafetyMode;
  readonly safetyLabel: string;
  readonly hubActionLabel: string | null;
  readonly notice: string | null;
  readonly allowHost: boolean;
  readonly showTools: boolean;
  readonly showSteps: boolean;
  readonly showSafetyNotes: boolean;
  readonly showObservationPrompt: boolean;
  readonly showConclusionPrompt: boolean;
  readonly showHomeAlternative: boolean;
}

const STUDENT_EXPERIMENT_SAFETY_DECISIONS: Readonly<
  Record<SafetyLevel, StudentExperimentSafetyDecision>
> = {
  safe_home: {
    mode: 'execute',
    safetyLabel: 'يمكن تنفيذها في المنزل',
    hubActionLabel: 'فتح النشاط',
    notice: null,
    allowHost: true,
    showTools: true,
    showSteps: true,
    showSafetyNotes: true,
    showObservationPrompt: true,
    showConclusionPrompt: true,
    showHomeAlternative: true,
  },
  teacher_supervised: {
    mode: 'supervised_preview',
    safetyLabel: 'بإشراف المعلم',
    hubActionLabel: 'عرض متطلبات التجربة',
    notice: 'هذه التجربة تُنفذ بإشراف المعلم فقط. المعروض هنا للتحضير والمناقشة.',
    allowHost: true,
    showTools: true,
    showSteps: false,
    showSafetyNotes: true,
    showObservationPrompt: true,
    showConclusionPrompt: true,
    showHomeAlternative: false,
  },
  lab_only: {
    mode: 'lab_preview',
    safetyLabel: 'في المختبر فقط',
    hubActionLabel: 'عرض معلومات التجربة',
    notice: 'تنفيذ هذه التجربة محصور في المختبر وتحت الإشراف المناسب.',
    allowHost: true,
    showTools: false,
    showSteps: false,
    showSafetyNotes: true,
    showObservationPrompt: false,
    showConclusionPrompt: false,
    showHomeAlternative: false,
  },
  not_allowed: {
    mode: 'blocked',
    safetyLabel: 'غير متاح للتنفيذ',
    hubActionLabel: null,
    notice: 'هذه التجربة غير متاحة للتنفيذ للطالب.',
    allowHost: false,
    showTools: false,
    showSteps: false,
    showSafetyNotes: false,
    showObservationPrompt: false,
    showConclusionPrompt: false,
    showHomeAlternative: false,
  },
};

export function getStudentExperimentSafetyDecision(
  safetyLevel: SafetyLevel
): StudentExperimentSafetyDecision {
  return STUDENT_EXPERIMENT_SAFETY_DECISIONS[safetyLevel];
}
