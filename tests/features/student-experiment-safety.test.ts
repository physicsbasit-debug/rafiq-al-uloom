import { describe, expect, it } from 'vitest';
import { getStudentExperimentSafetyDecision } from '@features/activities/student-experiment-safety';

describe('student experiment safety policy', () => {
  it('يسمح بالتنفيذ الكامل لـ safe_home', () => {
    expect(getStudentExperimentSafetyDecision('safe_home')).toMatchObject({
      mode: 'execute',
      hubActionLabel: 'فتح النشاط',
      allowHost: true,
      showTools: true,
      showSteps: true,
      showSafetyNotes: true,
      showObservationPrompt: true,
      showConclusionPrompt: true,
      showHomeAlternative: true,
    });
  });

  it('يقصر teacher_supervised على التحضير دون خطوات تنفيذ ذاتي', () => {
    expect(getStudentExperimentSafetyDecision('teacher_supervised')).toMatchObject({
      mode: 'supervised_preview',
      hubActionLabel: 'عرض متطلبات التجربة',
      allowHost: true,
      showTools: true,
      showSteps: false,
      showSafetyNotes: true,
      showObservationPrompt: true,
      showConclusionPrompt: true,
      showHomeAlternative: false,
    });
  });

  it('يقصر lab_only على المعلومات المختبرية غير الإجرائية', () => {
    expect(getStudentExperimentSafetyDecision('lab_only')).toMatchObject({
      mode: 'lab_preview',
      hubActionLabel: 'عرض معلومات التجربة',
      allowHost: true,
      showTools: false,
      showSteps: false,
      showSafetyNotes: true,
      showObservationPrompt: false,
      showConclusionPrompt: false,
      showHomeAlternative: false,
    });
  });

  it('يحجب not_allowed سلوكيًا بالكامل', () => {
    expect(getStudentExperimentSafetyDecision('not_allowed')).toMatchObject({
      mode: 'blocked',
      hubActionLabel: null,
      allowHost: false,
      showTools: false,
      showSteps: false,
      showSafetyNotes: false,
      showObservationPrompt: false,
      showConclusionPrompt: false,
      showHomeAlternative: false,
    });
  });
});
