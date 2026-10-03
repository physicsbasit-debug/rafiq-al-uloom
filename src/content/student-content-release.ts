export const STUDENT_VISIBLE_GRADE_IDS = ['g9', 'g10'] as const;

export const STUDENT_VISIBLE_SEMESTER_IDS = ['g9-sem1', 'g10-sem1'] as const;

const visibleGradeIds = new Set<string>(STUDENT_VISIBLE_GRADE_IDS);
const visibleSemesterIds = new Set<string>(STUDENT_VISIBLE_SEMESTER_IDS);

export function isStudentGradeVisible(gradeId: string): boolean {
  return visibleGradeIds.has(gradeId);
}

export function isStudentSemesterVisible(semesterId: string): boolean {
  return visibleSemesterIds.has(semesterId);
}
