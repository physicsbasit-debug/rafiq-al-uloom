import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const FORBIDDEN = [
  '@supabase/supabase-js',
  'supabase-authoring.repositories',
  '.rpc(',
  'create_lesson_revision',
  'save_lesson_revision',
  'submit_lesson_revision',
  'review_lesson_revision',
  'author_id',
  'reviewer_id',
] as const;

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) return collectTypeScriptFiles(fullPath);
      if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        return [fullPath];
      }
      return [];
    })
    .sort();
}

describe('architecture: teacher workspace client boundary', () => {
  it.each(FORBIDDEN)('لا تستخدم مساحة المعلم البنية المحظورة: %s', (forbidden) => {
    const root = process.cwd();
    const workspaceRoot = resolve(root, 'src/features/teacher');
    const violations = collectTypeScriptFiles(workspaceRoot)
      .filter((filePath) => readFileSync(filePath, 'utf8').includes(forbidden))
      .map((filePath) => relative(root, filePath));

    expect(violations).toEqual([]);
  });

  it('تتعامل مساحة المعلم مع AuthoringService كحد العميل الوحيد', () => {
    const root = process.cwd();
    const source = readFileSync(
      resolve(root, 'src/features/teacher/workspace/TeacherWorkspace.tsx'),
      'utf8'
    );

    expect(source).toContain('AuthoringService');
    expect(source).toContain('authoringService');
    expect(source).not.toContain('AuthoringRepository');
  });
});
