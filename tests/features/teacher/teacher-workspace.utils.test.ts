import { describe, expect, it } from 'vitest';

import {
  teacherAuthoringFailureMessage,
  teacherDraftsUnavailableMessage,
} from '@features/teacher/workspace/teacher-workspace.utils';
import type { AuthoringRejectionReason, AuthoringUnavailableReason } from '@services/authoring';

const rejectionReasons: readonly AuthoringRejectionReason[] = [
  'not_authenticated',
  'not_authorized',
  'invalid_payload',
  'unit_not_available',
  'lesson_not_available',
  'source_revision_not_available',
  'source_revision_mismatch',
  'revision_not_editable',
  'revision_not_submittable',
  'revision_not_reviewable',
  'invalid_decision',
  'review_note_required',
  'stale_revision',
  'canonical_position_conflict',
  'invalid_revision_id',
];

const unavailableReasons: readonly AuthoringUnavailableReason[] = [
  'network_error',
  'service_unavailable',
  'unknown',
];

describe('teacher workspace error mapping', () => {
  it('يعرّف رسالة عربية لكل أسباب الرفض 15/15', () => {
    expect(rejectionReasons).toHaveLength(15);
    for (const reason of rejectionReasons) {
      const message = teacherAuthoringFailureMessage(reason);
      expect(message.trim().length).toBeGreaterThan(0);
      expect(message).not.toContain('RPC');
      expect(message).not.toContain('PostgreSQL');
    }
  });

  it('يعرّف رسالة عربية لكل unavailable reason 3/3', () => {
    expect(unavailableReasons).toHaveLength(3);
    for (const reason of unavailableReasons) {
      expect(teacherAuthoringFailureMessage(reason)).toBe(teacherDraftsUnavailableMessage(reason));
    }
  });
});
