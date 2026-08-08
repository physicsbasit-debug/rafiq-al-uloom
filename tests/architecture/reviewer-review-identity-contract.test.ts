import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const source = readFileSync(
  resolve(process.cwd(), 'src/features/reviewer/workspace/useReviewerRevisionReview.ts'),
  'utf8'
);

describe('architecture: reviewer decision identity contract', () => {
  it('يرسل reviewRevisionId نفسه إلى reviewLessonRevision', () => {
    expect(source).toContain('revisionId: reviewRevisionId');
  });

  it('يفحص result.revisionId قبل الالتزام المحلي', () => {
    expect(source).toContain('result.revisionId !== reviewRevisionId');
    expect(source.indexOf('result.revisionId !== reviewRevisionId')).toBeLessThan(
      source.indexOf('onDecisionCommitted({')
    );
  });

  it('يرسل approve مع note:null صراحة', () => {
    expect(source).toContain("note: decision === 'approve' ? null : normalizedNote");
  });
});
