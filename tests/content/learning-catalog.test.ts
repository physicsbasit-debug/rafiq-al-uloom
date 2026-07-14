import { describe, expect, it } from 'vitest';
import {
  learningCatalogGrades,
  learningCatalogSemesters,
  learningCatalogSubjects,
  learningCatalogUnits,
} from '@content/seed/learning-catalog.seed';
import {
  grade10PhysicsWavesGames,
  grade10PhysicsWavesLessons,
  grade10PhysicsWavesMasteryQuestions,
  grade10PhysicsWavesReviewQuestions,
} from '@content/seed/grade10-physics-waves';
import {
  getExperimentsByLesson,
  getGamesByLesson,
  getGrades,
  getLessonById,
  getLessonsByUnit,
  getMasteryQuestionsByLesson,
  getObjectivesByIds,
  getObjectivesByLesson,
  getReviewQuestionsByLesson,
  getSemestersByGrade,
  getSubjectsBySemester,
  getUnitsBySubject,
  getUnitsBySubjectAndSemester,
} from '@services/data/local-content.repository';

const gradeIds = new Set(learningCatalogGrades.map((grade) => grade.id));
const semesterIds = new Set(learningCatalogSemesters.map((semester) => semester.id));
const subjectIds = new Set(learningCatalogSubjects.map((subject) => subject.id));

describe('catalog: وجود بيانات أساسية', () => {
  it('صف واحد على الأقل', () => {
    expect(learningCatalogGrades.length).toBeGreaterThan(0);
  });

  it('فصلان دراسيان على الأقل', () => {
    expect(learningCatalogSemesters.length).toBeGreaterThanOrEqual(2);
  });

  it('مادة واحدة على الأقل', () => {
    expect(learningCatalogSubjects.length).toBeGreaterThan(0);
  });

  it('وحدة واحدة على الأقل', () => {
    expect(learningCatalogUnits.length).toBeGreaterThan(0);
  });
});

describe('catalog: سلامة مفاتيح الربط', () => {
  it('كل فصل يشير إلى صف موجود', () => {
    for (const semester of learningCatalogSemesters) {
      expect(gradeIds.has(semester.gradeId)).toBe(true);
    }
  });

  it('كل مادة تشير إلى صف موجود', () => {
    for (const subject of learningCatalogSubjects) {
      expect(gradeIds.has(subject.gradeId)).toBe(true);
    }
  });

  it('كل وحدة تشير إلى مادة موجودة', () => {
    for (const unit of learningCatalogUnits) {
      expect(subjectIds.has(unit.subjectId)).toBe(true);
    }
  });

  it('كل وحدة تشير إلى فصل دراسي موجود', () => {
    for (const unit of learningCatalogUnits) {
      expect(semesterIds.has(unit.semesterId)).toBe(true);
    }
  });
});

describe('catalog: تطابق الكتالوج مع محتوى 1-A', () => {
  it('كل unitId مستخدم في الدروس له وحدة مطابقة في الكتالوج', () => {
    const catalogUnitIds = new Set(learningCatalogUnits.map((unit) => unit.id));
    const lessonUnitIds = new Set(grade10PhysicsWavesLessons.map((lesson) => lesson.unitId));

    for (const unitId of lessonUnitIds) {
      expect(catalogUnitIds.has(unitId)).toBe(true);
    }
  });
});

describe('repository: القراءة', () => {
  it('getGrades يعيد الصفوف مرتبة', () => {
    const grades = getGrades();

    expect(grades.length).toBe(learningCatalogGrades.length);

    for (let i = 1; i < grades.length; i += 1) {
      expect(grades[i].order).toBeGreaterThanOrEqual(grades[i - 1].order);
    }
  });

  it('getSemestersByGrade يصفّي حسب الصف ويرتب', () => {
    const firstGradeId = learningCatalogGrades[0].id;
    const semesters = getSemestersByGrade(firstGradeId);

    expect(semesters.length).toBeGreaterThanOrEqual(2);

    for (const semester of semesters) {
      expect(semester.gradeId).toBe(firstGradeId);
    }

    for (let i = 1; i < semesters.length; i += 1) {
      expect(semesters[i].order).toBeGreaterThan(semesters[i - 1].order);
    }
  });

  it('getSubjectsBySemester يعيد المواد التي لها وحدات في الفصل فقط', () => {
    const subjectsInSemester = getSubjectsBySemester('g10-sem2');

    expect(subjectsInSemester.length).toBeGreaterThan(0);

    const unitSubjectIds = new Set(
      learningCatalogUnits
        .filter((unit) => unit.semesterId === 'g10-sem2')
        .map((unit) => unit.subjectId),
    );

    for (const subject of subjectsInSemester) {
      expect(unitSubjectIds.has(subject.id)).toBe(true);
    }
  });

  it('getSubjectsBySemester لفصل بلا وحدات يعيد فارغًا', () => {
    expect(getSubjectsBySemester('g10-sem1').length).toBe(0);
  });

  it('getUnitsBySubject يصفّي حسب المادة', () => {
    const subjectId = learningCatalogSubjects[0].id;
    const units = getUnitsBySubject(subjectId);

    expect(units.length).toBeGreaterThan(0);

    for (const unit of units) {
      expect(unit.subjectId).toBe(subjectId);
    }
  });

  it('getUnitsBySubjectAndSemester يصفّي حسب المادة والفصل', () => {
    const units = getUnitsBySubjectAndSemester('g10-physics', 'g10-sem2');

    expect(units.length).toBeGreaterThan(0);

    for (const unit of units) {
      expect(unit.subjectId).toBe('g10-physics');
      expect(unit.semesterId).toBe('g10-sem2');
    }
  });

  it('getLessonsByUnit يعيد دروس الوحدة الأربعة مرتبة', () => {
    const lessons = getLessonsByUnit('g10-phy-waves-unit');

    expect(lessons.length).toBe(4);

    for (let i = 1; i < lessons.length; i += 1) {
      expect(lessons[i].order).toBeGreaterThan(lessons[i - 1].order);
    }
  });

  it('getLessonsByUnit لوحدة غير موجودة يعيد فارغًا', () => {
    expect(getLessonsByUnit('no-such-unit').length).toBe(0);
  });

  it('getLessonById يعيد الدرس الصحيح أو undefined', () => {
    const lesson = getLessonById('g10-phy-waves-l1');

    expect(lesson?.id).toBe('g10-phy-waves-l1');
    expect(getLessonById('no-such-lesson')).toBe(undefined);
  });

  it('getObjectivesByLesson يعيد هدفي الدرس الأول', () => {
    const objectives = getObjectivesByLesson('g10-phy-waves-l1');

    expect(objectives.length).toBe(2);
    expect(objectives.every((objective) => objective.lessonId === 'g10-phy-waves-l1')).toBe(true);
  });

  it('getObjectivesByIds يعيد الأهداف المطلوبة فقط', () => {
    const objectives = getObjectivesByIds(['l1-o1', 'l1-o2']);

    expect(objectives.length).toBe(2);
    expect(objectives.map((objective) => objective.id)).toEqual(['l1-o1', 'l1-o2']);
  });

  it('getExperimentsByLesson يعيد تجربة الدرس الأول', () => {
    const experiments = getExperimentsByLesson('g10-phy-waves-l1');

    expect(experiments.length).toBe(1);
    expect(experiments[0]?.lessonId).toBe('g10-phy-waves-l1');
  });

  it('getReviewQuestionsByLesson يعيد أسئلة مراجعة الدرس الأول فقط', () => {
    const questions = getReviewQuestionsByLesson('g10-phy-waves-l1');

    expect(questions.length).toBe(6);
    expect(questions.every((question) => question.lessonId === 'g10-phy-waves-l1')).toBe(true);
    expect(questions.every((question) => question.id.includes('-rq'))).toBe(true);
  });

  it('أسئلة المراجعة لا تتقاطع مع أسئلة الإتقان', () => {
    const reviewIds = new Set(grade10PhysicsWavesReviewQuestions.map((question) => question.id));
    const masteryIds = new Set(grade10PhysicsWavesMasteryQuestions.map((question) => question.id));

    for (const reviewId of reviewIds) {
      expect(masteryIds.has(reviewId)).toBe(false);
    }
  });

  it('getGamesByLesson يعيد لعبة الدرس الأول فقط', () => {
    const games = getGamesByLesson('g10-phy-waves-l1');

    expect(games.length).toBe(1);
    expect(games[0]?.lessonId).toBe('g10-phy-waves-l1');
  });

  it('كل لعبة مرتبطة بأهداف موجودة', () => {
    for (const game of grade10PhysicsWavesGames) {
      const objectives = getObjectivesByIds(game.objectiveIds);

      expect(objectives.length).toBe(game.objectiveIds.length);
    }
  });

  it('getMasteryQuestionsByLesson يعيد أسئلة إتقان الدرس الأول فقط', () => {
    const questions = getMasteryQuestionsByLesson('g10-phy-waves-l1');

    expect(questions.length).toBe(5);
    expect(questions.every((question) => question.lessonId === 'g10-phy-waves-l1')).toBe(true);
    expect(questions.every((question) => question.id.includes('-mq'))).toBe(true);
  });

  it('أسئلة الإتقان لا تتسرّب من أسئلة المراجعة في كل الدروس', () => {
    const reviewIds = new Set(grade10PhysicsWavesReviewQuestions.map((question) => question.id));
    const lessonIds = new Set(grade10PhysicsWavesLessons.map((lesson) => lesson.id));

    for (const lessonId of lessonIds) {
      const masteryQuestions = getMasteryQuestionsByLesson(lessonId);

      expect(masteryQuestions.length).toBe(5);
      expect(masteryQuestions.every((question) => !reviewIds.has(question.id))).toBe(true);
    }
  });
});
