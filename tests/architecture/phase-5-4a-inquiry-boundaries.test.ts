import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

const leakGuardFiles = [
  'src/types/inquiry.types.ts',
  'supabase/migrations/20260902090000_add_inquiries.sql',
  'src/services/data/supabase-content.mappers.ts',
  'src/features/inquiries/InquiryRunner.tsx',
  'src/content/seed/grade10-physics-waves.ts',
];

const answerFieldPattern =
  /reference_?answer|expected_?conclusion|model_?answer|teacher_?answer|rubric_?answer|answer_?key/i;

describe('Phase 5-4A inquiry boundaries', () => {
  it('يحرس منع تسريب مفاتيح الإجابة عبر خمس طبقات', () => {
    for (const path of leakGuardFiles) {
      expect(source(path)).not.toMatch(answerFieldPattern);
    }
  });

  it('يبقي InquiryRunner بلا useEffect في هذا النطاق', () => {
    expect(source('src/features/inquiries/InquiryRunner.tsx')).not.toMatch(/\buseEffect\b/);
  });

  it('يبقي InquiryRunner session-only بلا تخزين أو شبكة أو تسجيل درجات', () => {
    const runner = source('src/features/inquiries/InquiryRunner.tsx');

    expect(runner).not.toMatch(
      /\b(?:localStorage|sessionStorage|fetch|XMLHttpRequest|sendBeacon|supabase|score|scoring|correct|incorrect|MasteryResult|masteryResult)\b/i
    );
  });

  it('لا ينشئ تخزين محاولات أو جدول activities عامًا', () => {
    const migration = source('supabase/migrations/20260902090000_add_inquiries.sql');
    expect(migration).not.toMatch(/CREATE TABLE public\.activities\b/i);
    expect(migration).not.toMatch(
      /inquiry_results|inquiry_attempts|activity_attempts|mastery_results/i
    );
  });

  it('يبقي ملفات التوجيه العامة خالية من routing خاص بالاستقصاء', () => {
    expect(source('src/App.tsx')).not.toMatch(/InquiryRunner|InquiryActivity/);
    expect(source('src/features/student/lesson-view/LessonView.tsx')).not.toMatch(
      /InquiryRunner|InquiryActivity/
    );
  });
});
