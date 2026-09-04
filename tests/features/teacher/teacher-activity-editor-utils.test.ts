import { describe, expect, it } from 'vitest';

import {
  createTeacherActivityKey,
  linesToTrimmedArray,
  removeByKey,
  replaceByKey,
  toggleObjectiveKey,
  trimmedArrayToLines,
  validateExperimentDraft,
  validateMatchingGameDraft,
} from '@features/teacher/workspace/teacher-activity-editor-utils';

describe('Phase 5-5D2 activity editor utilities', () => {
  it('ينشئ مفتاح نشاط ثابتًا دون إعادة استخدام أعلى رقم سابق', () => {
    expect(createTeacherActivityKey('game', ['teacher-game-1', 'teacher-game-3'])).toBe(
      'teacher-game-4'
    );
  });

  it('يفصل نطاق المفاتيح بين عائلات الأنشطة', () => {
    expect(createTeacherActivityKey('experiment', ['teacher-game-1', 'teacher-experiment-2'])).toBe(
      'teacher-experiment-3'
    );
  });

  it('يضيف ويحذف مفتاح الهدف دون تكرار', () => {
    expect(toggleObjectiveKey(['objective-a'], 'objective-b')).toEqual([
      'objective-a',
      'objective-b',
    ]);

    expect(toggleObjectiveKey(['objective-a', 'objective-b'], 'objective-a')).toEqual([
      'objective-b',
    ]);
  });

  it('يطبع ويقرأ القوائم متعددة الأسطر بعد التنظيف', () => {
    expect(linesToTrimmedArray(' أداة 1 \n\nأداة 2 ')).toEqual(['أداة 1', 'أداة 2']);

    expect(trimmedArrayToLines(['أداة 1', 'أداة 2'])).toBe('أداة 1\nأداة 2');
  });

  it('يستبدل عنصرًا بالمفتاح دون تغيير بقية العناصر', () => {
    const result = replaceByKey(
      [
        { key: 'a', title: 'الأول' },
        { key: 'b', title: 'الثاني' },
      ],
      'a',
      { key: 'a', title: 'معدل' }
    );

    expect(result).toEqual([
      { key: 'a', title: 'معدل' },
      { key: 'b', title: 'الثاني' },
    ]);
  });

  it('يحذف العنصر المحدد فقط', () => {
    expect(
      removeByKey(
        [
          { key: 'a', title: 'الأول' },
          { key: 'b', title: 'الثاني' },
        ],
        'a'
      )
    ).toEqual([{ key: 'b', title: 'الثاني' }]);
  });

  it('يقبل لعبة مطابقة مكتملة وينظف النصوص', () => {
    const result = validateMatchingGameDraft({
      type: 'matching',
      title: '  لعبة الموجات ',
      instructions: ' طابق العناصر ',
      items: [
        { left: ' التردد ', right: ' Hz ' },
        { left: ' الطول الموجي ', right: ' m ' },
      ],
      objectiveKeys: [],
    });

    expect(result).toEqual({
      valid: true,
      game: {
        type: 'matching',
        title: 'لعبة الموجات',
        instructions: 'طابق العناصر',
        items: [
          { left: 'التردد', right: 'Hz' },
          { left: 'الطول الموجي', right: 'm' },
        ],
        objectiveKeys: [],
      },
    });
  });

  it('يرفض لعبة المطابقة إذا كان عدد الأزواج أقل من اثنين', () => {
    expect(
      validateMatchingGameDraft({
        type: 'matching',
        title: 'لعبة',
        instructions: 'طابق',
        items: [{ left: 'أ', right: 'ب' }],
        objectiveKeys: [],
      })
    ).toEqual({
      valid: false,
      reason: 'too_few_items',
    });
  });

  it('يقبل تجربة مكتملة مع السماح بروابط أهداف فارغة في المسودة', () => {
    const result = validateExperimentDraft({
      title: ' تجربة ',
      objective: ' ملاحظة الموجة ',
      objectiveKeys: [],
      tools: [' حبل '],
      steps: [' حرّك الحبل '],
      safetyNotes: [' انتبه للمساحة '],
      safetyLevel: 'teacher_supervised',
      observationPrompt: ' ماذا تلاحظ؟ ',
      conclusionPrompt: ' ماذا تستنتج؟ ',
      homeAlternative: ' ',
    });

    expect(result).toEqual({
      valid: true,
      experiment: {
        title: 'تجربة',
        objective: 'ملاحظة الموجة',
        objectiveKeys: [],
        tools: ['حبل'],
        steps: ['حرّك الحبل'],
        safetyNotes: ['انتبه للمساحة'],
        safetyLevel: 'teacher_supervised',
        observationPrompt: 'ماذا تلاحظ؟',
        conclusionPrompt: 'ماذا تستنتج؟',
        homeAlternative: null,
      },
    });
  });

  it('يرفض التجربة التي لا تحتوي خطوة واحدة صالحة', () => {
    expect(
      validateExperimentDraft({
        title: 'تجربة',
        objective: 'هدف',
        objectiveKeys: [],
        tools: [],
        steps: ['   '],
        safetyNotes: [],
        safetyLevel: 'safe_home',
        observationPrompt: 'ماذا تلاحظ؟',
        conclusionPrompt: 'ماذا تستنتج؟',
        homeAlternative: null,
      })
    ).toEqual({
      valid: false,
      reason: 'missing_step',
    });
  });
});
