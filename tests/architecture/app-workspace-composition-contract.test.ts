import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const appPath = resolve(process.cwd(), 'src/App.tsx');
const source = readFileSync(appPath, 'utf8');

function occurrences(value: string): number {
  return source.split(value).length - 1;
}

function stepDeclaration(): string {
  const match = source.match(
    /type\s+Step\s*=([\s\S]*?);\s*\n\s*interface\s+StudentExperienceProps/
  );
  if (!match?.[1]) throw new Error('تعذر العثور على اتحاد Step في src/App.tsx');
  return match[1];
}

describe('architecture: App workspace composition contract', () => {
  it('يفصل AppSurface عن Step ويبقي اتحاد Step خاليًا من مساحات العمل', () => {
    const step = stepDeclaration();

    expect(source).toContain("type AppSurface = 'student' | 'teacher' | 'reviewer';");
    expect(step).not.toMatch(/teacher/i);
    expect(step).not.toMatch(/reviewer/i);
    expect(step).not.toMatch(/workspace/i);
  });

  it('يستخدم حارس دخول وحارس mount مستقلين لكل مساحة عمل', () => {
    expect(occurrences('operation="access_teacher_workspace"')).toBe(2);
    expect(occurrences('operation="access_reviewer_workspace"')).toBe(2);
    expect(occurrences('operation="access_student_experience"')).toBe(1);
  });

  it('لا يعيد شروط الدور أو متغير authorized إلى App', () => {
    expect(source).not.toMatch(/const\s+authorized\s*=/);
    expect(source).not.toMatch(/const\s+isTeacher\s*=/);
    expect(source).not.toMatch(/const\s+isReviewer\s*=/);
    expect(source).not.toMatch(/\.role\s*(?:===|!==|==|!=)\s*['"]teacher['"]/);
    expect(source).not.toMatch(/\.role\s*(?:===|!==|==|!=)\s*['"]reviewer['"]/);
    expect(source).not.toMatch(/['"]teacher['"]\s*(?:===|!==|==|!=)\s*[^\n]*\.role/);
    expect(source).not.toMatch(/['"]reviewer['"]\s*(?:===|!==|==|!=)\s*[^\n]*\.role/);
  });

  it('لا يستورد App خدمات التأليف أو المراجعة أو مستودعاتها أو Supabase', () => {
    const forbidden = [
      'authoringService',
      'reviewService',
      'AuthoringRepository',
      'ReviewRepository',
      '@supabase/supabase-js',
      'supabase-authoring.repositories',
      '.rpc(',
      'review_lesson_revision',
      'create_lesson_revision',
      'save_lesson_revision',
      'submit_lesson_revision',
    ];

    for (const pattern of forbidden) expect(source).not.toContain(pattern);
  });

  it('يربط App مساحتي العمل عبر حدود feature فقط', () => {
    expect(source).toContain("import { TeacherWorkspace } from '@features/teacher/workspace';");
    expect(source).toContain("import { ReviewerWorkspace } from '@features/reviewer/workspace';");
    expect(source).toContain('<TeacherWorkspace />');
    expect(source).toContain('<ReviewerWorkspace />');
  });

  it('زر العودة يغير AppSurface فقط ولا يربط العودة بـ setStep أو خدمات الجلسة', () => {
    const returnButton = source.match(/<AppButton\s+label="العودة إلى التعلم"[\s\S]*?\/>/)?.[0];

    expect(returnButton).toBeDefined();
    expect(returnButton).toContain("setAppSurface('student')");
    expect(returnButton).not.toContain('setStep');
    expect(returnButton).not.toContain('signOut');
    expect(returnButton).not.toContain('refreshAuthorization');
    expect(returnButton).not.toContain('retrySession');
  });
});
