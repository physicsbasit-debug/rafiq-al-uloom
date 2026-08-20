import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const FILES = [
  'src/features/teacher/workspace/TeacherWorkspace.tsx',
  'src/features/teacher/workspace/TeacherLessonEditor.tsx',
  'src/features/teacher/workspace/TeacherObjectivesEditor.tsx',
  'src/features/teacher/workspace/TeacherQuestionsEditor.tsx',
  'src/features/teacher/workspace/useTeacherAiLessonContext.ts',
  'src/features/teacher/workspace/useTeacherAiSuggestion.ts',
  'src/features/teacher/workspace/teacher-ai-acceptance.ts',
] as const;

const FORBIDDEN = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'service_role',
  '.rpc(',
  'create_lesson_revision',
  'save_lesson_revision',
  'submit_lesson_revision',
  'review_lesson_revision',
  'generate_full_lesson',
] as const;

describe('architecture: Phase 4-2 teacher AI wiring', () => {
  it.each(FORBIDDEN)('لا يدخل الحد المحظور إلى ربط AI: %s', (forbidden) => {
    const violations = FILES.filter((file) =>
      readFileSync(resolve(process.cwd(), file), 'utf8').includes(forbidden)
    );
    expect(violations).toEqual([]);
  });

  it('يبقي overwrite guard وcontext availability موصولين في الواجهة الفعلية', () => {
    const lesson = readFileSync(
      resolve(process.cwd(), 'src/features/teacher/workspace/TeacherLessonEditor.tsx'),
      'utf8'
    );
    const objectives = readFileSync(
      resolve(process.cwd(), 'src/features/teacher/workspace/TeacherObjectivesEditor.tsx'),
      'utf8'
    );
    const questions = readFileSync(
      resolve(process.cwd(), 'src/features/teacher/workspace/TeacherQuestionsEditor.tsx'),
      'utf8'
    );

    expect(lesson).toContain('hasAiDestinationChanged');
    expect(objectives).toContain('hasAiDestinationChanged');
    expect(questions).toContain('hasAiDestinationChanged');
    expect(lesson).toContain('contextAvailable={lessonContext !== null}');
    expect(objectives).toContain('contextAvailable={lessonContext !== null}');
    expect(questions).toContain(
      'contextAvailable={lessonContext !== null && objectives.length > 0}'
    );
  });
});
