import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('architecture: rejected revision successor contract', () => {
  it('يفصل مسار rejected عن save ويستخدم supersedesRevisionId في create', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/teacher/workspace/useTeacherLessonEditor.ts'),
      'utf8'
    );

    expect(source).toContain("mode === 'new' || mode === 'revise_rejected'");
    expect(source).toContain('supersedesRevisionId: originRevisionId');
    expect(source).toContain("mode === 'edit_draft' && workingRevisionId");
    expect(source).not.toContain('saveLessonRevision(originRevisionId');
  });
});
