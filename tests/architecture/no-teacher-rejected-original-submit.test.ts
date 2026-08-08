import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('architecture: teacher submit uses working revision only', () => {
  it('يرسل workingRevisionId فقط ولا يستخدم originRevisionId في submit', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/teacher/workspace/useTeacherLessonEditor.ts'),
      'utf8'
    );

    expect(source).toContain("mode === 'edit_draft'");
    expect(source).toContain('service.submitLessonRevision(workingRevisionId');
    expect(source).not.toContain('submitLessonRevision(originRevisionId');
  });
});
