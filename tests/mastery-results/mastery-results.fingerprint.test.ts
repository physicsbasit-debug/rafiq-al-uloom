import { describe, expect, it } from 'vitest';

import {
  buildMasteryScoringMaterial,
  createMasteryScoringFingerprint,
} from '@services/mastery-results/mastery-results.fingerprint';
import type { Question } from '@shared-types/quiz.types';

function question(
  id: string,
  lessonId: string,
  correctAnswerIndex: number,
  choices: string[]
): Question {
  return {
    id,
    lessonId,
    type: 'multiple_choice',
    prompt: id,
    choices,
    correctAnswerIndex,
    explanation: 'شرح',
    objectiveId: 'objective-1',
    difficulty: 'medium',
    status: 'approved',
    source: 'curriculum_seed',
  };
}

describe('mastery scoring fingerprint', () => {
  const lessonId = 'درس-1';
  const questions = [
    question('q-a', lessonId, 0, ['A', 'B']),
    question('سؤال-b', lessonId, 1, ['أ', 'ب', 'ج']),
  ];

  it('يطابق مادة SQL حرفيًا مع طول UTF-8 وترتيب السؤال بالمعرف', () => {
    expect(buildMasteryScoringMaterial(lessonId, questions)).toBe(
      'mastery-equal-weight-v1\n8:درس-1\n3:q-a:0:2\n10:سؤال-b:1:3'
    );
  });

  it('ينتج SHA-256 ثابتة للمادة نفسها', async () => {
    await expect(createMasteryScoringFingerprint(lessonId, questions)).resolves.toBe(
      'f9409f2f9b744296082963eb8fd3a08852d7bb8fb59ae769ecd0bb56bca5cccf'
    );
  });

  it('تستخدم ترتيب الأسئلة الذي أعاده مستودع Supabase دون إعادة ترتيب محلية', () => {
    expect(buildMasteryScoringMaterial(lessonId, [...questions].reverse())).not.toBe(
      buildMasteryScoringMaterial(lessonId, questions)
    );
  });

  it('يرفض ناتج digest غير صالح بدل إرساله إلى RPC', async () => {
    await expect(
      createMasteryScoringFingerprint(lessonId, questions, async () => 'not-a-hash')
    ).rejects.toThrow('Invalid SHA-256 fingerprint');
  });
});
