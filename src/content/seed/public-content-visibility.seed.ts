import {
  STUDENT_VISIBLE_GRADE_IDS,
  STUDENT_VISIBLE_SEMESTER_IDS,
} from '../student-content-release';

import { learningCatalogUnits } from './learning-catalog.seed';

/**
 * Student-facing visibility seed for the accountless learner experience.
 *
 * Catalog availability is separated from lesson publication:
 * - الصفان التاسع والعاشر مرئيان.
 * - الفصل الدراسي الأول فقط مرئي حاليًا.
 * - وحدات الفصل الأول مرئية.
 * - لا يظهر أي درس للطالب إلا بعد اعتماده صراحة وإضافته إلى lessonIds.
 */
const visibleSemesterIds = new Set<string>(STUDENT_VISIBLE_SEMESTER_IDS);

export const publicContentVisibility = {
  gradeIds: [...STUDENT_VISIBLE_GRADE_IDS] as readonly string[],
  semesterIds: [...STUDENT_VISIBLE_SEMESTER_IDS] as readonly string[],
  unitIds: learningCatalogUnits
    .filter((unit) => visibleSemesterIds.has(unit.semesterId))
    .map((unit) => unit.id) as readonly string[],
  lessonIds: ['g9-phy-s1-u1-l1'] as readonly string[],
};
