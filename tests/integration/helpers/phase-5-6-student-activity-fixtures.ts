import { psqlAdmin } from './supabase-auth-fixtures';

export interface Phase56StudentActivityFixture {
  readonly runId: string;
  readonly gradeId: string;
  readonly semesterId: string;
  readonly subjectId: string;
  readonly unitId: string;
  readonly lessonId: string;
  readonly wrongLessonId: string;
  readonly objectiveAId: string;
  readonly objectiveBId: string;
  readonly wrongObjectiveId: string;
  readonly matchingGameId: string;
  readonly experimentId: string;
  readonly simulationId: string;
  readonly inquiryId: string;
  readonly dataActivityId: string;
  readonly draftGameId: string;
  readonly wrongLessonGameId: string;
  readonly lessonTitle: string;
  readonly objectiveAText: string;
  readonly objectiveBText: string;
  readonly matchingTitle: string;
  readonly experimentTitle: string;
  readonly simulationTitle: string;
  readonly inquiryTitle: string;
  readonly dataTitle: string;
  readonly draftTitle: string;
  readonly wrongLessonTitle: string;
  readonly matchingLeft: string;
  readonly matchingRight: string;
  readonly experimentTool: string;
  readonly experimentStep: string;
  readonly inquiryContext: string;
  readonly dataTaskPrompt: string;
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlJson(value: unknown): string {
  return `${sqlLiteral(JSON.stringify(value))}::jsonb`;
}

function sqlTextArray(values: readonly string[]): string {
  return `ARRAY[${values.map(sqlLiteral).join(', ')}]::text[]`;
}

function makeRunId(): string {
  return `phase56b-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createPhase56StudentActivityFixture(): Phase56StudentActivityFixture {
  const runId = makeRunId();

  const fixture: Phase56StudentActivityFixture = {
    runId,
    gradeId: `${runId}-grade`,
    semesterId: `${runId}-semester`,
    subjectId: `${runId}-subject`,
    unitId: `${runId}-unit`,
    lessonId: `${runId}-lesson`,
    wrongLessonId: `${runId}-wrong-lesson`,
    objectiveAId: `${runId}-objective-a`,
    objectiveBId: `${runId}-objective-b`,
    wrongObjectiveId: `${runId}-wrong-objective`,
    matchingGameId: `${runId}-matching`,
    experimentId: `${runId}-experiment`,
    simulationId: `${runId}-simulation`,
    inquiryId: `${runId}-inquiry`,
    dataActivityId: `${runId}-data`,
    draftGameId: `${runId}-draft-game`,
    wrongLessonGameId: `${runId}-wrong-game`,
    lessonTitle: `درس التركيب الحقيقي ${runId}`,
    objectiveAText: `يحلل خصائص الموجة ${runId}`,
    objectiveBText: `يفسر سلوك الموجة ${runId}`,
    matchingTitle: `مطابقة حقيقية ${runId}`,
    experimentTitle: `تجربة آمنة حقيقية ${runId}`,
    simulationTitle: `محاكاة حقيقية ${runId}`,
    inquiryTitle: `استقصاء حقيقي ${runId}`,
    dataTitle: `نشاط بيانات حقيقي ${runId}`,
    draftTitle: `نشاط مسودة يجب ألا يظهر ${runId}`,
    wrongLessonTitle: `نشاط من درس آخر يجب ألا يظهر ${runId}`,
    matchingLeft: `التردد ${runId}`,
    matchingRight: `عدد الاهتزازات في الثانية ${runId}`,
    experimentTool: `حبل آمن ${runId}`,
    experimentStep: `حرّك الحبل ببطء ${runId}`,
    inquiryContext: `سياق استقصائي فريد ${runId}`,
    dataTaskPrompt: `اقرأ القيمة الثانية ${runId}`,
  };

  const simulationConfig = {
    engineKind: 'transverse_wave_v1',
    mediumSpeedMps: 12,
    frequencyHz: { min: 0.5, max: 4, step: 0.5, initial: 1 },
    amplitudeM: { min: 0.2, max: 1, step: 0.1, initial: 0.5 },
  };

  const dataSeriesId = `${runId}-series`;
  const dataConfig = {
    engineKind: 'data_graph_v1',
    context: `سياق بيانات فريد ${runId}`,
    presentation: {
      mode: 'table_and_line_graph',
      xAxisLabel: 'الزمن (s)',
      yAxisLabel: 'المسافة (m)',
    },
    dataset: {
      x: {
        label: 'الزمن',
        unit: 's',
        values: [1, 2, 4],
      },
      series: [
        {
          id: dataSeriesId,
          label: 'المسافة',
          unit: 'm',
          values: [10, 20, 40],
        },
      ],
    },
    tasks: [
      {
        id: `${runId}-read-task`,
        prompt: fixture.dataTaskPrompt,
        unit: 'm',
        rule: {
          kind: 'read_value',
          seriesId: dataSeriesId,
          pointIndex: 1,
        },
      },
    ],
  };

  const matchingItems = [
    {
      left: fixture.matchingLeft,
      right: fixture.matchingRight,
    },
  ];

  psqlAdmin(`
    BEGIN;

    INSERT INTO public.grades (id, name, display_order)
    VALUES (
      ${sqlLiteral(fixture.gradeId)},
      ${sqlLiteral(`الصف التجريبي ${runId}`)},
      560001
    );

    INSERT INTO public.semesters (id, grade_id, name, display_order)
    VALUES (
      ${sqlLiteral(fixture.semesterId)},
      ${sqlLiteral(fixture.gradeId)},
      ${sqlLiteral(`الفصل التجريبي ${runId}`)},
      1
    );

    INSERT INTO public.subjects (id, grade_id, name, theme_color)
    VALUES (
      ${sqlLiteral(fixture.subjectId)},
      ${sqlLiteral(fixture.gradeId)},
      ${sqlLiteral(`فيزياء تركيب ${runId}`)},
      '#1f4f78'
    );

    INSERT INTO public.units (id, subject_id, semester_id, title, display_order)
    VALUES (
      ${sqlLiteral(fixture.unitId)},
      ${sqlLiteral(fixture.subjectId)},
      ${sqlLiteral(fixture.semesterId)},
      ${sqlLiteral(`وحدة تركيب ${runId}`)},
      1
    );

    INSERT INTO public.lessons (
      id,
      unit_id,
      title,
      display_order,
      summary,
      key_concepts,
      examples,
      misconceptions,
      status,
      source
    )
    VALUES
      (
        ${sqlLiteral(fixture.lessonId)},
        ${sqlLiteral(fixture.unitId)},
        ${sqlLiteral(fixture.lessonTitle)},
        1,
        ${sqlLiteral(`ملخص فريد ${runId}`)},
        ${sqlTextArray([`مفهوم فريد ${runId}`])},
        ${sqlTextArray([`مثال فريد ${runId}`])},
        ${sqlTextArray([`تصور بديل فريد ${runId}`])},
        'approved',
        'teacher_authored'
      ),
      (
        ${sqlLiteral(fixture.wrongLessonId)},
        ${sqlLiteral(fixture.unitId)},
        ${sqlLiteral(`درس آخر ${runId}`)},
        2,
        ${sqlLiteral(`ملخص درس آخر ${runId}`)},
        ${sqlTextArray([`مفهوم آخر ${runId}`])},
        ${sqlTextArray([`مثال آخر ${runId}`])},
        ${sqlTextArray([`تصور آخر ${runId}`])},
        'approved',
        'teacher_authored'
      );

    INSERT INTO public.objectives (id, lesson_id, text)
    VALUES
      (
        ${sqlLiteral(fixture.objectiveAId)},
        ${sqlLiteral(fixture.lessonId)},
        ${sqlLiteral(fixture.objectiveAText)}
      ),
      (
        ${sqlLiteral(fixture.objectiveBId)},
        ${sqlLiteral(fixture.lessonId)},
        ${sqlLiteral(fixture.objectiveBText)}
      ),
      (
        ${sqlLiteral(fixture.wrongObjectiveId)},
        ${sqlLiteral(fixture.wrongLessonId)},
        ${sqlLiteral(`هدف الدرس الآخر ${runId}`)}
      );

    INSERT INTO public.games (
      id,
      lesson_id,
      type,
      title,
      instructions,
      items,
      status,
      source
    )
    VALUES
      (
        ${sqlLiteral(fixture.matchingGameId)},
        ${sqlLiteral(fixture.lessonId)},
        'matching',
        ${sqlLiteral(fixture.matchingTitle)},
        ${sqlLiteral(`طابق العنصرين ${runId}`)},
        ${sqlJson(matchingItems)},
        'approved',
        'teacher_authored'
      ),
      (
        ${sqlLiteral(fixture.draftGameId)},
        ${sqlLiteral(fixture.lessonId)},
        'matching',
        ${sqlLiteral(fixture.draftTitle)},
        ${sqlLiteral(`تعليمات مسودة ${runId}`)},
        ${sqlJson([{ left: `مسودة يسار ${runId}`, right: `مسودة يمين ${runId}` }])},
        'draft',
        'teacher_authored'
      ),
      (
        ${sqlLiteral(fixture.wrongLessonGameId)},
        ${sqlLiteral(fixture.wrongLessonId)},
        'matching',
        ${sqlLiteral(fixture.wrongLessonTitle)},
        ${sqlLiteral(`تعليمات الدرس الآخر ${runId}`)},
        ${sqlJson([{ left: `آخر يسار ${runId}`, right: `آخر يمين ${runId}` }])},
        'approved',
        'teacher_authored'
      );

    INSERT INTO public.game_objectives (game_id, objective_id, position)
    VALUES
      (
        ${sqlLiteral(fixture.matchingGameId)},
        ${sqlLiteral(fixture.objectiveAId)},
        0
      ),
      (
        ${sqlLiteral(fixture.matchingGameId)},
        ${sqlLiteral(fixture.objectiveBId)},
        1
      ),
      (
        ${sqlLiteral(fixture.draftGameId)},
        ${sqlLiteral(fixture.objectiveAId)},
        0
      ),
      (
        ${sqlLiteral(fixture.wrongLessonGameId)},
        ${sqlLiteral(fixture.wrongObjectiveId)},
        0
      );

    INSERT INTO public.experiments (
      id,
      lesson_id,
      title,
      objective,
      tools,
      steps,
      safety_notes,
      safety_level,
      observation_prompt,
      conclusion_prompt,
      home_alternative,
      status,
      source
    )
    VALUES (
      ${sqlLiteral(fixture.experimentId)},
      ${sqlLiteral(fixture.lessonId)},
      ${sqlLiteral(fixture.experimentTitle)},
      ${sqlLiteral(`تمييز خصائص الموجة ${runId}`)},
      ${sqlTextArray([fixture.experimentTool])},
      ${sqlTextArray([fixture.experimentStep])},
      ${sqlTextArray([`حافظ على مساحة آمنة ${runId}`])},
      'safe_home',
      ${sqlLiteral(`سجل ملاحظتك ${runId}`)},
      ${sqlLiteral(`اكتب استنتاجك ${runId}`)},
      ${sqlLiteral(`بديل منزلي ${runId}`)},
      'approved',
      'teacher_authored'
    );

    INSERT INTO public.experiment_objectives (
      experiment_id,
      objective_id,
      lesson_id,
      position
    )
    VALUES (
      ${sqlLiteral(fixture.experimentId)},
      ${sqlLiteral(fixture.objectiveAId)},
      ${sqlLiteral(fixture.lessonId)},
      0
    );

    INSERT INTO public.simulations (
      id,
      lesson_id,
      title,
      instructions,
      engine_kind,
      config,
      status,
      source
    )
    VALUES (
      ${sqlLiteral(fixture.simulationId)},
      ${sqlLiteral(fixture.lessonId)},
      ${sqlLiteral(fixture.simulationTitle)},
      ${sqlLiteral(`غيّر التردد والسعة ${runId}`)},
      'transverse_wave_v1',
      ${sqlJson(simulationConfig)},
      'approved',
      'teacher_authored'
    );

    INSERT INTO public.simulation_objectives (
      simulation_id,
      objective_id,
      lesson_id,
      position
    )
    VALUES (
      ${sqlLiteral(fixture.simulationId)},
      ${sqlLiteral(fixture.objectiveAId)},
      ${sqlLiteral(fixture.lessonId)},
      0
    );

    INSERT INTO public.inquiries (
      id,
      lesson_id,
      title,
      instructions,
      context,
      driving_question,
      hypothesis_prompt,
      observation_prompt,
      conclusion_prompt,
      status,
      source
    )
    VALUES (
      ${sqlLiteral(fixture.inquiryId)},
      ${sqlLiteral(fixture.lessonId)},
      ${sqlLiteral(fixture.inquiryTitle)},
      ${sqlLiteral(`حلل الحالة العلمية ${runId}`)},
      ${sqlLiteral(fixture.inquiryContext)},
      ${sqlLiteral(`ماذا تتوقع؟ ${runId}`)},
      ${sqlLiteral(`اكتب فرضيتك ${runId}`)},
      ${sqlLiteral(`اكتب دليلك ${runId}`)},
      ${sqlLiteral(`اكتب استنتاجك ${runId}`)},
      'approved',
      'teacher_authored'
    );

    INSERT INTO public.inquiry_objectives (
      inquiry_id,
      objective_id,
      lesson_id,
      position
    )
    VALUES (
      ${sqlLiteral(fixture.inquiryId)},
      ${sqlLiteral(fixture.objectiveBId)},
      ${sqlLiteral(fixture.lessonId)},
      0
    );

    INSERT INTO public.data_activities (
      id,
      lesson_id,
      title,
      instructions,
      engine_kind,
      config,
      status,
      source
    )
    VALUES (
      ${sqlLiteral(fixture.dataActivityId)},
      ${sqlLiteral(fixture.lessonId)},
      ${sqlLiteral(fixture.dataTitle)},
      ${sqlLiteral(`اقرأ الجدول والرسم ${runId}`)},
      'data_graph_v1',
      ${sqlJson(dataConfig)},
      'approved',
      'teacher_authored'
    );

    INSERT INTO public.data_activity_objectives (
      data_activity_id,
      objective_id,
      lesson_id,
      position
    )
    VALUES
      (
        ${sqlLiteral(fixture.dataActivityId)},
        ${sqlLiteral(fixture.objectiveAId)},
        ${sqlLiteral(fixture.lessonId)},
        0
      ),
      (
        ${sqlLiteral(fixture.dataActivityId)},
        ${sqlLiteral(fixture.objectiveBId)},
        ${sqlLiteral(fixture.lessonId)},
        1
      );

    COMMIT;
  `);

  return fixture;
}

export function cleanupPhase56StudentActivityFixture(fixture: Phase56StudentActivityFixture): void {
  psqlAdmin(`
    BEGIN;

    DELETE FROM public.data_activity_objectives
    WHERE lesson_id IN (
      ${sqlLiteral(fixture.lessonId)},
      ${sqlLiteral(fixture.wrongLessonId)}
    );

    DELETE FROM public.inquiry_objectives
    WHERE lesson_id IN (
      ${sqlLiteral(fixture.lessonId)},
      ${sqlLiteral(fixture.wrongLessonId)}
    );

    DELETE FROM public.simulation_objectives
    WHERE lesson_id IN (
      ${sqlLiteral(fixture.lessonId)},
      ${sqlLiteral(fixture.wrongLessonId)}
    );

    DELETE FROM public.experiment_objectives
    WHERE lesson_id IN (
      ${sqlLiteral(fixture.lessonId)},
      ${sqlLiteral(fixture.wrongLessonId)}
    );

    DELETE FROM public.game_objectives
    WHERE game_id IN (
      ${sqlLiteral(fixture.matchingGameId)},
      ${sqlLiteral(fixture.draftGameId)},
      ${sqlLiteral(fixture.wrongLessonGameId)}
    );

    DELETE FROM public.data_activities
    WHERE lesson_id IN (
      ${sqlLiteral(fixture.lessonId)},
      ${sqlLiteral(fixture.wrongLessonId)}
    );

    DELETE FROM public.inquiries
    WHERE lesson_id IN (
      ${sqlLiteral(fixture.lessonId)},
      ${sqlLiteral(fixture.wrongLessonId)}
    );

    DELETE FROM public.simulations
    WHERE lesson_id IN (
      ${sqlLiteral(fixture.lessonId)},
      ${sqlLiteral(fixture.wrongLessonId)}
    );

    DELETE FROM public.experiments
    WHERE lesson_id IN (
      ${sqlLiteral(fixture.lessonId)},
      ${sqlLiteral(fixture.wrongLessonId)}
    );

    DELETE FROM public.games
    WHERE lesson_id IN (
      ${sqlLiteral(fixture.lessonId)},
      ${sqlLiteral(fixture.wrongLessonId)}
    );

    DELETE FROM public.objectives
    WHERE lesson_id IN (
      ${sqlLiteral(fixture.lessonId)},
      ${sqlLiteral(fixture.wrongLessonId)}
    );

    DELETE FROM public.lessons
    WHERE id IN (
      ${sqlLiteral(fixture.lessonId)},
      ${sqlLiteral(fixture.wrongLessonId)}
    );

    DELETE FROM public.units
    WHERE id = ${sqlLiteral(fixture.unitId)};

    DELETE FROM public.subjects
    WHERE id = ${sqlLiteral(fixture.subjectId)};

    DELETE FROM public.semesters
    WHERE id = ${sqlLiteral(fixture.semesterId)};

    DELETE FROM public.grades
    WHERE id = ${sqlLiteral(fixture.gradeId)};

    COMMIT;
  `);
}
