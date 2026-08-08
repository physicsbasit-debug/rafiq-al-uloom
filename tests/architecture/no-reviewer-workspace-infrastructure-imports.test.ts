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
  'AuthoringRepository',
  'ReviewRepository',
  'AuthoringService',
  'authoringService',
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

describe('architecture: reviewer workspace client boundary', () => {
  it.each(FORBIDDEN)('لا تستخدم مساحة المراجع البنية أو الخدمة المحظورة: %s', (forbidden) => {
    const root = process.cwd();
    const workspaceRoot = resolve(root, 'src/features/reviewer');
    const violations = collectTypeScriptFiles(workspaceRoot)
      .filter((filePath) => readFileSync(filePath, 'utf8').includes(forbidden))
      .map((filePath) => relative(root, filePath));

    expect(violations).toEqual([]);
  });

  it('تستخدم ReviewService وحدها لقائمة المراجعة وقرار المراجع', () => {
    const root = process.cwd();
    const listHook = readFileSync(
      resolve(root, 'src/features/reviewer/workspace/useReviewerPendingRevisions.ts'),
      'utf8'
    );
    const reviewHook = readFileSync(
      resolve(root, 'src/features/reviewer/workspace/useReviewerRevisionReview.ts'),
      'utf8'
    );

    expect(listHook).toContain('ReviewService');
    expect(listHook).toContain('service.listPendingRevisions');
    expect(reviewHook).toContain('ReviewService');
    expect(reviewHook).toContain('service.reviewLessonRevision');
  });
});
