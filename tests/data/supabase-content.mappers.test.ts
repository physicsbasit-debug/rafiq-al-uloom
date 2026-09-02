import { describe, expect, it } from 'vitest';

import {
  mapExperimentObjectiveRow,
  mapExperimentRow,
  mapGameObjectiveRow,
  mapGameRow,
  mapGradeRow,
  mapInquiryObjectiveRow,
  mapInquiryRow,
  mapLessonRow,
  mapObjectiveRow,
  mapQuestionRow,
  mapSemesterRow,
  mapSubjectRow,
  mapUnitRow,
} from '@services/data/supabase-content.mappers';

const lessonRow = {
  id: 'lesson-1',
  unit_id: 'unit-1',
  title: 'خصائص الموجات',
  display_order: 2,
  summary: 'ملخص',
  key_concepts: ['التردد', 'الطول الموجي'],
  examples: ['مثال 1'],
  misconceptions: ['فكرة خاطئة'],
  status: 'draft',
  source: 'curriculum_seed',
};

const questionRow = {
  id: 'question-1',
  lesson_id: 'lesson-1',
  purpose: 'review',
  type: 'multiple_choice',
  prompt: 'ما وحدة قياس التردد؟',
  choices: ['هرتز', 'ثانية'],
  correct_answer_index: 0,
  explanation: 'يقاس التردد بالهرتز.',
  objective_id: 'objective-1',
  difficulty: 'easy',
  status: 'draft',
  source: 'curriculum_seed',
};

const gameRow = {
  id: 'game-1',
  lesson_id: 'lesson-1',
  type: 'matching',
  title: 'طابق المفهوم',
  instructions: 'صل كل مفهوم بتعريفه.',
  items: [
    { left: 'التردد', right: 'عدد الاهتزازات في الثانية' },
    { left: 'الزمن الدوري', right: 'زمن اهتزازة كاملة' },
  ],
  status: 'draft',
  source: 'curriculum_seed',
};

const experimentRow = {
  id: 'experiment-1',
  lesson_id: 'lesson-1',
  title: 'مشاهدة موجة',
  objective: 'ملاحظة خصائص الموجة',
  tools: ['حبل'],
  steps: ['حرّك الحبل'],
  safety_notes: ['اترك مسافة آمنة'],
  safety_level: 'safe_home',
  observation_prompt: 'ماذا لاحظت؟',
  conclusion_prompt: 'ماذا تستنتج؟',
  home_alternative: null,
  status: 'draft',
  source: 'curriculum_seed',
};

const inquiryRow = {
  id: 'inquiry-1',
  lesson_id: 'lesson-1',
  title: 'استقصاء',
  instructions: 'سجّل استدلالك.',
  context: 'حالة علمية.',
  driving_question: 'ماذا تستنتج؟',
  hypothesis_prompt: 'اكتب فرضيتك.',
  observation_prompt: 'اكتب دليلك.',
  conclusion_prompt: 'اكتب استنتاجك.',
  status: 'draft',
  source: 'curriculum_seed',
};

describe('supabase content mappers', () => {
  it('يحوّل صفوف الفهرس الأساسية من snake_case إلى أنواع المجال', () => {
    expect(mapGradeRow({ id: 'g10', name: 'الصف العاشر', display_order: 10 })).toEqual({
      id: 'g10',
      name: 'الصف العاشر',
      order: 10,
    });

    expect(
      mapSemesterRow({ id: 's1', grade_id: 'g10', name: 'الفصل الأول', display_order: 1 })
    ).toEqual({ id: 's1', gradeId: 'g10', name: 'الفصل الأول', order: 1 });

    expect(
      mapSubjectRow({ id: 'physics', grade_id: 'g10', name: 'الفيزياء', theme_color: '#fff' })
    ).toEqual({ id: 'physics', gradeId: 'g10', name: 'الفيزياء', themeColor: '#fff' });

    expect(
      mapUnitRow({
        id: 'u1',
        subject_id: 'physics',
        semester_id: 's1',
        title: 'الموجات',
        display_order: 1,
      })
    ).toEqual({
      id: 'u1',
      subjectId: 'physics',
      semesterId: 's1',
      title: 'الموجات',
      order: 1,
    });
  });

  it('يحوّل الهدف إلى نوع المجال', () => {
    expect(mapObjectiveRow({ id: 'o1', lesson_id: 'lesson-1', text: 'يفسر التردد' })).toEqual({
      id: 'o1',
      lessonId: 'lesson-1',
      text: 'يفسر التردد',
    });
  });

  it('يبني الدرس من الصف ومعرّفات الأهداف المنفصلة ويحافظ على ترتيبها', () => {
    const objectiveIds = ['objective-2', 'objective-1'];
    const lesson = mapLessonRow(lessonRow, objectiveIds);

    expect(lesson.objectiveIds).toEqual(objectiveIds);
    expect(lesson.objectiveIds).not.toBe(objectiveIds);
    expect(lesson).toMatchObject({
      id: 'lesson-1',
      unitId: 'unit-1',
      order: 2,
      status: 'draft',
      source: 'curriculum_seed',
    });
  });

  it('يحوّل السؤال ويتحقق من purpose والنوع والصعوبة والفهرس الصحيح', () => {
    expect(mapQuestionRow(questionRow)).toEqual({
      id: 'question-1',
      lessonId: 'lesson-1',
      type: 'multiple_choice',
      prompt: 'ما وحدة قياس التردد؟',
      choices: ['هرتز', 'ثانية'],
      correctAnswerIndex: 0,
      explanation: 'يقاس التردد بالهرتز.',
      objectiveId: 'objective-1',
      difficulty: 'easy',
      status: 'draft',
      source: 'curriculum_seed',
    });
  });

  it('يحوّل games.items الصالحة ويحافظ على ترتيب objectiveIds كما وصله', () => {
    const objectiveIds = ['objective-3', 'objective-1', 'objective-2'];
    const game = mapGameRow(gameRow, objectiveIds);

    expect(game.items).toEqual(gameRow.items);
    expect(game.objectiveIds).toEqual(objectiveIds);
    expect(game.objectiveIds).not.toBe(objectiveIds);
  });

  it('يرفض games.items عندما لا تكون مصفوفة', () => {
    expect(() => mapGameRow({ ...gameRow, items: {} }, [])).toThrow(
      'Invalid games.items for game "game-1": expected an array'
    );
  });

  it('يرفض عنصر لعبة ناقصًا أو ذا حقول مجهولة', () => {
    expect(() => mapGameRow({ ...gameRow, items: [{ left: 'أ' }] }, [])).toThrow(
      'must contain only left and right'
    );
    expect(() =>
      mapGameRow({ ...gameRow, items: [{ left: 'أ', right: 'ب', extra: true }] }, [])
    ).toThrow('must contain only left and right');
  });

  it('يرفض عنصر لعبة إذا لم تكن left وright نصوصًا', () => {
    expect(() => mapGameRow({ ...gameRow, items: [{ left: 1, right: 'ب' }] }, [])).toThrow(
      'left and right must be strings'
    );
  });

  it('يرفض enum غير معروف برسالة تحمل معرّف الكيان', () => {
    expect(() => mapLessonRow({ ...lessonRow, status: 'published' }, [])).toThrow(
      'Invalid lesson row "lesson-1": status has unsupported value "published"'
    );
  });

  it('يبني التجربة من الصف وروابط الأهداف ويحافظ على ترتيبها', () => {
    const objectiveIds = ['objective-2', 'objective-1'];
    const experiment = mapExperimentRow(experimentRow, objectiveIds);

    expect(experiment.objectiveIds).toEqual(objectiveIds);
    expect(experiment.objectiveIds).not.toBe(objectiveIds);
  });

  it('يرفض تجربة بلا objectiveIds أو ذات روابط مكررة', () => {
    expect(() => mapExperimentRow(experimentRow, [])).toThrow(
      'objectiveIds must contain at least one objective'
    );
    expect(() => mapExperimentRow(experimentRow, ['objective-1', 'objective-1'])).toThrow(
      'objectiveIds must not contain duplicates'
    );
  });

  it('يحوّل صف experiment_objectives ويتحقق من lesson_id وposition', () => {
    expect(
      mapExperimentObjectiveRow({
        experiment_id: 'experiment-1',
        objective_id: 'objective-1',
        lesson_id: 'lesson-1',
        position: 0,
      })
    ).toEqual({
      experiment_id: 'experiment-1',
      objective_id: 'objective-1',
      lesson_id: 'lesson-1',
      position: 0,
    });

    expect(() =>
      mapExperimentObjectiveRow({
        experiment_id: 'experiment-1',
        objective_id: 'objective-1',
        lesson_id: 'lesson-1',
        position: -1,
      })
    ).toThrow('position must be non-negative');
  });

  it('يدعم homeAlternative بقيمة null', () => {
    expect(mapExperimentRow(experimentRow, ['objective-1']).homeAlternative).toBeNull();
  });

  it('يرفض null في homeAlternative إذا كانت القيمة ليست نصًا أو null', () => {
    expect(() =>
      mapExperimentRow({ ...experimentRow, home_alternative: 42 }, ['objective-1'])
    ).toThrow('home_alternative must be a string or null');
  });

  it('يرفض مصفوفة نصية غير صالحة', () => {
    expect(() => mapLessonRow({ ...lessonRow, key_concepts: ['صحيح', 3] }, [])).toThrow(
      'key_concepts must be an array of strings'
    );
  });

  it('يرفض فهرس إجابة خارج حدود choices', () => {
    expect(() => mapQuestionRow({ ...questionRow, correct_answer_index: 2 })).toThrow(
      'correct_answer_index must reference an existing choice'
    );
  });

  it('يبني Inquiry من الصف وروابط الأهداف ويتحقق من الحقول البنيوية', () => {
    const inquiry = mapInquiryRow(inquiryRow, ['objective-2', 'objective-1']);
    expect(inquiry).toMatchObject({
      id: 'inquiry-1',
      lessonId: 'lesson-1',
      objectiveIds: ['objective-2', 'objective-1'],
    });

    expect(() => mapInquiryRow(inquiryRow, [])).toThrow('objectiveIds must not be empty');
    expect(() => mapInquiryRow({ ...inquiryRow, driving_question: '' }, ['objective-1'])).toThrow(
      'drivingQuestion must not be blank'
    );
  });

  it('يحوّل inquiry_objectives ويتحقق من lesson_id وposition', () => {
    expect(
      mapInquiryObjectiveRow({
        inquiry_id: 'inquiry-1',
        objective_id: 'objective-1',
        lesson_id: 'lesson-1',
        position: 0,
      })
    ).toEqual({
      inquiry_id: 'inquiry-1',
      objective_id: 'objective-1',
      lesson_id: 'lesson-1',
      position: 0,
    });

    expect(() =>
      mapInquiryObjectiveRow({
        inquiry_id: 'inquiry-1',
        objective_id: 'objective-1',
        lesson_id: 'lesson-1',
        position: -1,
      })
    ).toThrow('position must be non-negative');
  });

  it('يحوّل صف game_objectives ويتحقق من position', () => {
    expect(mapGameObjectiveRow({ game_id: 'g1', objective_id: 'o1', position: 0 })).toEqual({
      game_id: 'g1',
      objective_id: 'o1',
      position: 0,
    });

    expect(() => mapGameObjectiveRow({ game_id: 'g1', objective_id: 'o1', position: -1 })).toThrow(
      'position must be non-negative'
    );
  });
});
