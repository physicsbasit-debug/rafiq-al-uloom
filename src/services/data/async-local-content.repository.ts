import type { ContentRepository } from './content.repository';
import * as localContent from './local-content.repository';

function throwIfRequestAborted(signal?: AbortSignal): void {
  signal?.throwIfAborted();
}

/**
 * Async adapter فوق المستودع المحلي المتزامن الحالي.
 *
 * لا يكرر منطق الفلاتر أو الترتيب، ولا يلمس ملفات seed مباشرة.
 * فحص AbortSignal هنا يحدث مرة واحدة قبل التفويض لأن المسار المحلي
 * لا يحتوي أي حدود await فعلية. المزود الشبكي لاحقًا يجب أن يفحص
 * الإشارة بعد كل نقطة await وقبل إرجاع النتيجة.
 */
export const asyncLocalContentRepository: ContentRepository = {
  async getGrades(options) {
    throwIfRequestAborted(options?.signal);
    return localContent.getGrades();
  },

  async getSemestersByGrade(gradeId, options) {
    throwIfRequestAborted(options?.signal);
    return localContent.getSemestersByGrade(gradeId);
  },

  async getSubjectsBySemester(semesterId, options) {
    throwIfRequestAborted(options?.signal);
    return localContent.getSubjectsBySemester(semesterId);
  },

  async getUnitsBySubjectAndSemester(subjectId, semesterId, options) {
    throwIfRequestAborted(options?.signal);
    return localContent.getUnitsBySubjectAndSemester(subjectId, semesterId);
  },

  async getUnitsBySubject(subjectId, options) {
    throwIfRequestAborted(options?.signal);
    return localContent.getUnitsBySubject(subjectId);
  },

  async getLessonsByUnit(unitId, options) {
    throwIfRequestAborted(options?.signal);
    return localContent.getLessonsByUnit(unitId);
  },

  async getLessonById(lessonId, options) {
    throwIfRequestAborted(options?.signal);
    return localContent.getLessonById(lessonId);
  },

  async getObjectivesByLesson(lessonId, options) {
    throwIfRequestAborted(options?.signal);
    return localContent.getObjectivesByLesson(lessonId);
  },

  async getObjectivesByIds(objectiveIds, options) {
    throwIfRequestAborted(options?.signal);
    return localContent.getObjectivesByIds(objectiveIds);
  },

  async getExperimentsByLesson(lessonId, options) {
    throwIfRequestAborted(options?.signal);
    return localContent.getExperimentsByLesson(lessonId);
  },

  async getReviewQuestionsByLesson(lessonId, options) {
    throwIfRequestAborted(options?.signal);
    return localContent.getReviewQuestionsByLesson(lessonId);
  },

  async getMasteryQuestionsByLesson(lessonId, options) {
    throwIfRequestAborted(options?.signal);
    return localContent.getMasteryQuestionsByLesson(lessonId);
  },

  async getGamesByLesson(lessonId, options) {
    throwIfRequestAborted(options?.signal);
    return localContent.getGamesByLesson(lessonId);
  },

  async getSimulationsByLesson(lessonId, options) {
    throwIfRequestAborted(options?.signal);
    return localContent.getSimulationsByLesson(lessonId);
  },

  async getInquiriesByLesson(lessonId, options) {
    throwIfRequestAborted(options?.signal);
    return localContent.getInquiriesByLesson(lessonId);
  },
};
