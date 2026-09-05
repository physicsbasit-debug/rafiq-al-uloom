import { describe, expect, it } from 'vitest';

import {
  validateInquiryDraft,
  validateSimulationDraft,
} from '@features/teacher/workspace/teacher-activity-editor-utils';

describe('Phase 5-5D2-B specialized activity editor utilities', () => {
  it('يقبل إعداد محاكاة موجة مستعرضة صحيحًا ويطبّع النصوص', () => {
    const result = validateSimulationDraft({
      title: ' محاكاة خصائص الموجة ',
      instructions: ' غيّر التردد والسعة ولاحظ النتيجة ',
      objectiveKeys: [],
      config: {
        engineKind: 'transverse_wave_v1',
        mediumSpeedMps: 12,
        frequencyHz: {
          min: 0.5,
          max: 4,
          step: 0.5,
          initial: 1,
        },
        amplitudeM: {
          min: 0.2,
          max: 1,
          step: 0.1,
          initial: 0.5,
        },
      },
    });

    expect(result).toEqual({
      valid: true,
      simulation: {
        title: 'محاكاة خصائص الموجة',
        instructions: 'غيّر التردد والسعة ولاحظ النتيجة',
        objectiveKeys: [],
        config: {
          engineKind: 'transverse_wave_v1',
          mediumSpeedMps: 12,
          frequencyHz: {
            min: 0.5,
            max: 4,
            step: 0.5,
            initial: 1,
          },
          amplitudeM: {
            min: 0.2,
            max: 1,
            step: 0.1,
            initial: 0.5,
          },
        },
      },
    });
  });

  it('يرفض إعداد محاكاة لا يطابق parser الإنتاجي', () => {
    expect(
      validateSimulationDraft({
        title: 'محاكاة',
        instructions: 'غيّر القيم.',
        objectiveKeys: [],
        config: {
          engineKind: 'transverse_wave_v1',
          mediumSpeedMps: 12,
          frequencyHz: {
            min: 0,
            max: 4,
            step: 0.5,
            initial: 1,
          },
          amplitudeM: {
            min: 0.2,
            max: 1,
            step: 0.1,
            initial: 0.5,
          },
        },
      })
    ).toEqual({
      valid: false,
      reason: 'invalid_config',
    });
  });

  it('يقبل نشاط استقصاء مكتملًا ويطبّع الحقول النصية', () => {
    const result = validateInquiryDraft({
      title: ' استقصاء انعكاس الموجات ',
      instructions: ' اقرأ الموقف ثم أجب ',
      objectiveKeys: [],
      context: ' موجة تتحرك نحو حاجز ',
      drivingQuestion: ' ماذا يحدث للموجة؟ ',
      hypothesisPrompt: ' اكتب فرضيتك ',
      observationPrompt: ' دوّن ما تلاحظه ',
      conclusionPrompt: ' اكتب استنتاجك ',
    });

    expect(result).toEqual({
      valid: true,
      inquiry: {
        title: 'استقصاء انعكاس الموجات',
        instructions: 'اقرأ الموقف ثم أجب',
        objectiveKeys: [],
        context: 'موجة تتحرك نحو حاجز',
        drivingQuestion: 'ماذا يحدث للموجة؟',
        hypothesisPrompt: 'اكتب فرضيتك',
        observationPrompt: 'دوّن ما تلاحظه',
        conclusionPrompt: 'اكتب استنتاجك',
      },
    });
  });

  it('يرفض الاستقصاء الذي لا يحتوي سؤالًا محوريًا', () => {
    expect(
      validateInquiryDraft({
        title: 'استقصاء',
        instructions: 'نفذ المهمة',
        objectiveKeys: [],
        context: 'سياق علمي',
        drivingQuestion: '   ',
        hypothesisPrompt: 'اكتب فرضيتك',
        observationPrompt: 'دوّن ملاحظتك',
        conclusionPrompt: 'اكتب استنتاجك',
      })
    ).toEqual({
      valid: false,
      reason: 'empty_driving_question',
    });
  });
});
