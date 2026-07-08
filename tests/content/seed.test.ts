import { describe, it, expect } from 'vitest';
import {
  grade10PhysicsWavesObjectives,
  grade10PhysicsWavesLessons,
  grade10PhysicsWavesReviewQuestions,
  grade10PhysicsWavesMasteryQuestions,
  grade10PhysicsWavesGames,
  grade10PhysicsWavesExperiments,
} from '../../src/content/seed/grade10-physics-waves';
import type { SafetyLevel } from '../../src/types/experiment.types';

const objectiveIds = new Set(grade10PhysicsWavesObjectives.map((o) => o.id));
const lessonIds = new Set(grade10PhysicsWavesLessons.map((l) => l.id));

describe('seed: الأهداف كيانات مستقلة', () => {
  it('توجد أهداف معرّفة', () => {
    expect(grade10PhysicsWavesObjectives.length).toBeGreaterThan(0);
  });

  it('لكل هدف معرّف فريد', () => {
    expect(objectiveIds.size).toBe(grade10PhysicsWavesObjectives.length);
  });

  it('كل هدف يشير إلى درس موجود', () => {
    for (const o of grade10PhysicsWavesObjectives) {
      expect(lessonIds.has(o.lessonId)).toBe(true);
    }
  });
});

describe('seed: الدروس', () => {
  it('توجد أربعة دروس', () => {
    expect(grade10PhysicsWavesLessons.length).toBe(4);
  });

  it('كل objectiveIds في كل درس يشير إلى هدف موجود', () => {
    for (const lesson of grade10PhysicsWavesLessons) {
      expect(lesson.objectiveIds.length).toBeGreaterThan(0);
      for (const oid of lesson.objectiveIds) {
        expect(objectiveIds.has(oid)).toBe(true);
      }
    }
  });

  it('كل درس يحمل ملخصًا ومفاهيم وأمثلة وأخطاء شائعة غير فارغة', () => {
    for (const lesson of grade10PhysicsWavesLessons) {
      expect(lesson.summary.trim().length).toBeGreaterThan(0);
      expect(lesson.keyConcepts.length).toBeGreaterThan(0);
      expect(lesson.examples.length).toBeGreaterThan(0);
      expect(lesson.misconceptions.length).toBeGreaterThan(0);
    }
  });
});

describe('seed: أسئلة المراجعة', () => {
  it('ست أسئلة مراجعة لكل درس', () => {
    for (const lesson of grade10PhysicsWavesLessons) {
      const count = grade10PhysicsWavesReviewQuestions.filter(
        (q) => q.lessonId === lesson.id
      ).length;
      expect(count).toBe(6);
    }
  });

  it('كل سؤال مراجعة يشير إلى هدف موجود', () => {
    for (const q of grade10PhysicsWavesReviewQuestions) {
      expect(objectiveIds.has(q.objectiveId)).toBe(true);
    }
  });

  it('correctAnswerIndex ضمن نطاق الخيارات', () => {
    for (const q of grade10PhysicsWavesReviewQuestions) {
      expect(q.correctAnswerIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctAnswerIndex).toBeLessThan(q.choices.length);
    }
  });
});

describe('seed: أسئلة الإتقان', () => {
  it('خمسة أسئلة إتقان لكل درس', () => {
    for (const lesson of grade10PhysicsWavesLessons) {
      const count = grade10PhysicsWavesMasteryQuestions.filter(
        (q) => q.lessonId === lesson.id
      ).length;
      expect(count).toBe(5);
    }
  });

  it('كل سؤال إتقان يشير إلى هدف موجود', () => {
    for (const q of grade10PhysicsWavesMasteryQuestions) {
      expect(objectiveIds.has(q.objectiveId)).toBe(true);
    }
  });

  it('correctAnswerIndex ضمن نطاق الخيارات', () => {
    for (const q of grade10PhysicsWavesMasteryQuestions) {
      expect(q.correctAnswerIndex).toBeGreaterThanOrEqual(0);
      expect(q.correctAnswerIndex).toBeLessThan(q.choices.length);
    }
  });
});

describe('seed: عدم اختلاط المراجعة بالإتقان', () => {
  it('لا تتقاطع معرّفات المراجعة مع معرّفات الإتقان', () => {
    const reviewIds = new Set(grade10PhysicsWavesReviewQuestions.map((q) => q.id));
    for (const q of grade10PhysicsWavesMasteryQuestions) {
      expect(reviewIds.has(q.id)).toBe(false);
    }
  });
});

describe('seed: الألعاب', () => {
  it('لعبة مطابقة واحدة لكل درس', () => {
    for (const lesson of grade10PhysicsWavesLessons) {
      const count = grade10PhysicsWavesGames.filter((g) => g.lessonId === lesson.id).length;
      expect(count).toBe(1);
    }
  });

  it('كل لعبة تحمل objectiveIds غير فارغة تشير إلى أهداف موجودة', () => {
    for (const g of grade10PhysicsWavesGames) {
      expect(g.objectiveIds.length).toBeGreaterThan(0);
      for (const oid of g.objectiveIds) {
        expect(objectiveIds.has(oid)).toBe(true);
      }
    }
  });

  it('كل لعبة تحوي عناصر مطابقة', () => {
    for (const g of grade10PhysicsWavesGames) {
      expect(g.items.length).toBeGreaterThan(0);
      for (const item of g.items) {
        expect(item.left.trim().length).toBeGreaterThan(0);
        expect(item.right.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('seed: التجارب', () => {
  const validLevels: SafetyLevel[] = ['safe_home', 'teacher_supervised', 'lab_only', 'not_allowed'];

  it('تجربة واحدة لكل درس', () => {
    for (const lesson of grade10PhysicsWavesLessons) {
      const count = grade10PhysicsWavesExperiments.filter((e) => e.lessonId === lesson.id).length;
      expect(count).toBe(1);
    }
  });

  it('كل تجربة تحمل safetyLevel صالحًا', () => {
    for (const e of grade10PhysicsWavesExperiments) {
      expect(validLevels).toContain(e.safetyLevel);
    }
  });

  it('كل تجارب هذه الوحدة safe_home (فيزياء أساسية بلا مخاطر)', () => {
    for (const e of grade10PhysicsWavesExperiments) {
      expect(e.safetyLevel).toBe('safe_home');
    }
  });

  it('كل تجربة تحوي خطوات وأدوات', () => {
    for (const e of grade10PhysicsWavesExperiments) {
      expect(e.tools.length).toBeGreaterThan(0);
      expect(e.steps.length).toBeGreaterThan(0);
    }
  });
});

describe('seed: سلامة الحقول المشتركة', () => {
  const allContent = [
    ...grade10PhysicsWavesReviewQuestions,
    ...grade10PhysicsWavesMasteryQuestions,
    ...grade10PhysicsWavesGames,
    ...grade10PhysicsWavesExperiments,
  ];

  it('كل عنصر محتوى مصدره curriculum_seed', () => {
    for (const c of allContent) {
      expect(c.source).toBe('curriculum_seed');
    }
    for (const l of grade10PhysicsWavesLessons) {
      expect(l.source).toBe('curriculum_seed');
    }
  });

  it('كل معرّفات المحتوى فريدة عبر المجموعات', () => {
    const allIds = [
      ...grade10PhysicsWavesLessons.map((x) => x.id),
      ...grade10PhysicsWavesObjectives.map((x) => x.id),
      ...grade10PhysicsWavesReviewQuestions.map((x) => x.id),
      ...grade10PhysicsWavesMasteryQuestions.map((x) => x.id),
      ...grade10PhysicsWavesGames.map((x) => x.id),
      ...grade10PhysicsWavesExperiments.map((x) => x.id),
    ];
    expect(new Set(allIds).size).toBe(allIds.length);
  });
});
