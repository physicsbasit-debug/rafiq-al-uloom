import { afterEach, describe, expect, it } from 'vitest';
import { raceWithAbort } from '@services/data/abort-utils';
import { asyncLocalContentRepository } from '@services/data/async-local-content.repository';
import * as localContent from '@services/data/local-content.repository';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
}

function createDeferred<T>(): Deferred<T> {
  let resolve!: Deferred<T>['resolve'];
  let reject!: Deferred<T>['reject'];

  const promise = new Promise<T>((internalResolve, internalReject) => {
    resolve = internalResolve;
    reject = internalReject;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

const unhandledRejections: unknown[] = [];

function handleUnhandledRejection(reason: unknown) {
  unhandledRejections.push(reason);
}

afterEach(() => {
  process.removeListener('unhandledRejection', handleUnhandledRejection);
  unhandledRejections.length = 0;
});

describe('async local content repository', () => {
  it('يطابق الدوال الثلاث عشرة في المستودع المحلي الحالي', async () => {
    const grades = localContent.getGrades();
    const gradeId = grades[0]?.id ?? 'missing-grade';

    const semesters = localContent.getSemestersByGrade(gradeId);
    const semesterId = semesters[0]?.id ?? 'missing-semester';

    const subjects = localContent.getSubjectsBySemester(semesterId);
    const subjectId = subjects[0]?.id ?? 'missing-subject';

    const units = localContent.getUnitsBySubjectAndSemester(subjectId, semesterId);
    const unitId = units[0]?.id ?? 'missing-unit';

    const lessons = localContent.getLessonsByUnit(unitId);
    const lessonId = lessons[0]?.id ?? 'missing-lesson';

    const objectives = localContent.getObjectivesByLesson(lessonId);
    const objectiveIds = objectives.map((objective) => objective.id);

    await expect(asyncLocalContentRepository.getGrades()).resolves.toEqual(grades);
    await expect(asyncLocalContentRepository.getSemestersByGrade(gradeId)).resolves.toEqual(
      semesters
    );
    await expect(asyncLocalContentRepository.getSubjectsBySemester(semesterId)).resolves.toEqual(
      subjects
    );
    await expect(
      asyncLocalContentRepository.getUnitsBySubjectAndSemester(subjectId, semesterId)
    ).resolves.toEqual(units);
    await expect(asyncLocalContentRepository.getUnitsBySubject(subjectId)).resolves.toEqual(
      localContent.getUnitsBySubject(subjectId)
    );
    await expect(asyncLocalContentRepository.getLessonsByUnit(unitId)).resolves.toEqual(lessons);
    await expect(asyncLocalContentRepository.getLessonById(lessonId)).resolves.toEqual(
      localContent.getLessonById(lessonId)
    );
    await expect(asyncLocalContentRepository.getObjectivesByLesson(lessonId)).resolves.toEqual(
      objectives
    );
    await expect(asyncLocalContentRepository.getObjectivesByIds(objectiveIds)).resolves.toEqual(
      localContent.getObjectivesByIds(objectiveIds)
    );
    const experiments = localContent.getExperimentsByLesson(lessonId);
    expect(experiments.every((experiment) => experiment.objectiveIds.length > 0)).toBe(true);
    await expect(asyncLocalContentRepository.getExperimentsByLesson(lessonId)).resolves.toEqual(
      experiments
    );
    await expect(asyncLocalContentRepository.getReviewQuestionsByLesson(lessonId)).resolves.toEqual(
      localContent.getReviewQuestionsByLesson(lessonId)
    );
    await expect(
      asyncLocalContentRepository.getMasteryQuestionsByLesson(lessonId)
    ).resolves.toEqual(localContent.getMasteryQuestionsByLesson(lessonId));
    await expect(asyncLocalContentRepository.getGamesByLesson(lessonId)).resolves.toEqual(
      localContent.getGamesByLesson(lessonId)
    );
  });

  it('يعيد القيم الفارغة نفسها للمعرفات غير الموجودة', async () => {
    await expect(asyncLocalContentRepository.getSemestersByGrade('missing-grade')).resolves.toEqual(
      []
    );
    await expect(
      asyncLocalContentRepository.getSubjectsBySemester('missing-semester')
    ).resolves.toEqual([]);
    await expect(
      asyncLocalContentRepository.getUnitsBySubjectAndSemester(
        'missing-subject',
        'missing-semester'
      )
    ).resolves.toEqual([]);
    await expect(asyncLocalContentRepository.getUnitsBySubject('missing-subject')).resolves.toEqual(
      []
    );
    await expect(asyncLocalContentRepository.getLessonsByUnit('missing-unit')).resolves.toEqual([]);
    await expect(asyncLocalContentRepository.getLessonById('missing-lesson')).resolves.toBe(
      undefined
    );
    await expect(
      asyncLocalContentRepository.getObjectivesByLesson('missing-lesson')
    ).resolves.toEqual([]);
    await expect(asyncLocalContentRepository.getObjectivesByIds([])).resolves.toEqual([]);
    await expect(
      asyncLocalContentRepository.getExperimentsByLesson('missing-lesson')
    ).resolves.toEqual([]);
    await expect(
      asyncLocalContentRepository.getReviewQuestionsByLesson('missing-lesson')
    ).resolves.toEqual([]);
    await expect(
      asyncLocalContentRepository.getMasteryQuestionsByLesson('missing-lesson')
    ).resolves.toEqual([]);
    await expect(asyncLocalContentRepository.getGamesByLesson('missing-lesson')).resolves.toEqual(
      []
    );
  });

  it('يرفض جميع الاستدعاءات عند وصول إشارة ملغاة مسبقًا', async () => {
    const controller = new AbortController();
    controller.abort(new DOMException('Aborted by test.', 'AbortError'));

    const options = { signal: controller.signal };

    await expect(asyncLocalContentRepository.getGrades(options)).rejects.toMatchObject({
      name: 'AbortError',
    });
    await expect(
      asyncLocalContentRepository.getSemestersByGrade('grade', options)
    ).rejects.toMatchObject({ name: 'AbortError' });
    await expect(
      asyncLocalContentRepository.getSubjectsBySemester('semester', options)
    ).rejects.toMatchObject({ name: 'AbortError' });
    await expect(
      asyncLocalContentRepository.getUnitsBySubjectAndSemester('subject', 'semester', options)
    ).rejects.toMatchObject({ name: 'AbortError' });
    await expect(
      asyncLocalContentRepository.getUnitsBySubject('subject', options)
    ).rejects.toMatchObject({ name: 'AbortError' });
    await expect(
      asyncLocalContentRepository.getLessonsByUnit('unit', options)
    ).rejects.toMatchObject({ name: 'AbortError' });
    await expect(
      asyncLocalContentRepository.getLessonById('lesson', options)
    ).rejects.toMatchObject({ name: 'AbortError' });
    await expect(
      asyncLocalContentRepository.getObjectivesByLesson('lesson', options)
    ).rejects.toMatchObject({ name: 'AbortError' });
    await expect(asyncLocalContentRepository.getObjectivesByIds([], options)).rejects.toMatchObject(
      { name: 'AbortError' }
    );
    await expect(
      asyncLocalContentRepository.getExperimentsByLesson('lesson', options)
    ).rejects.toMatchObject({ name: 'AbortError' });
    await expect(
      asyncLocalContentRepository.getReviewQuestionsByLesson('lesson', options)
    ).rejects.toMatchObject({ name: 'AbortError' });
    await expect(
      asyncLocalContentRepository.getMasteryQuestionsByLesson('lesson', options)
    ).rejects.toMatchObject({ name: 'AbortError' });
    await expect(
      asyncLocalContentRepository.getGamesByLesson('lesson', options)
    ).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('لا يغير بيانات المستودع المحلي عبر الاستدعاءات غير المتزامنة', async () => {
    const beforeGrades = localContent.getGrades();
    const firstAsyncResult = await asyncLocalContentRepository.getGrades();
    const secondAsyncResult = await asyncLocalContentRepository.getGrades();
    const afterGrades = localContent.getGrades();

    expect(firstAsyncResult).toEqual(beforeGrades);
    expect(secondAsyncResult).toEqual(beforeGrades);
    expect(afterGrades).toEqual(beforeGrades);
  });
});

describe('raceWithAbort', () => {
  it('يعيد النتيجة في المسار الطبيعي بلا إلغاء', async () => {
    await expect(raceWithAbort(Promise.resolve('ok'))).resolves.toBe('ok');
  });

  it('يرفض عند الإلغاء ثم يتجاهل النجاح المتأخر بلا رفض غير معالج', async () => {
    process.on('unhandledRejection', handleUnhandledRejection);

    const deferred = createDeferred<string>();
    const controller = new AbortController();
    const raced = raceWithAbort(deferred.promise, controller.signal);

    controller.abort(new DOMException('Aborted by test.', 'AbortError'));

    await expect(raced).rejects.toMatchObject({ name: 'AbortError' });

    deferred.resolve('late success');
    await deferred.promise;
    await Promise.resolve();

    expect(unhandledRejections).toEqual([]);
  });

  it('يرفض عند الإلغاء ثم يتجاهل الفشل المتأخر بلا رفض غير معالج', async () => {
    process.on('unhandledRejection', handleUnhandledRejection);

    const deferred = createDeferred<string>();
    const controller = new AbortController();
    const raced = raceWithAbort(deferred.promise, controller.signal);

    controller.abort(new DOMException('Aborted by test.', 'AbortError'));

    await expect(raced).rejects.toMatchObject({ name: 'AbortError' });

    deferred.reject(new Error('late failure'));
    await expect(deferred.promise).rejects.toThrow('late failure');
    await Promise.resolve();

    expect(unhandledRejections).toEqual([]);
  });
});
