# Phase 3-3C — Lesson Editor + Create/Save Lifecycle

## Apply status

`REVIEW APPROVED / EXECUTION PENDING` — upload these changed files to GitHub, then verify in Codespaces before local closure.

Base: Phase 3-3B locally closed at `cb47443c8fe4bed22d305b828ec7ef103c00b0f5`.

## What this apply package adds

- `TeacherLessonEditor`.
- `useTeacherLessonEditor` session state.
- New/create-save lifecycle.
- Existing-draft save lifecycle.
- Rejected-revision successor creation lifecycle.
- Commit-on-success identity handling.
- Read-only pending/approved modes.
- Manual save and double-save protection.
- 15/15 rejection-message mapping and 3/3 unavailable mapping.
- Local list -> editor navigation inside `TeacherWorkspace`.
- Direct tests for rejected revision never being saved in place.

## Deliberate scope limit

The editor changes lesson-level fields only. Existing objectives/questions/games/experiments remain intact in the payload and are verified not to be lost during save. No raw JSON editor is exposed.

## Not included

- submit;
- review notes;
- App integration;
- reviewer UI;
- SQL/migrations/RLS/RPC changes;
- remote Supabase deployment.

## Execution focus

1. Trace `originRevisionId` and `workingRevisionId` in all three writable modes.
2. Prove `saveLessonRevision(rejectedId, ...)` never occurs.
3. Verify commit-on-success after create rejection/unavailability.
4. Verify all 15 rejection reasons and all 3 unavailable reasons map to teacher-safe text.
5. Verify child collections survive lesson-level edits unchanged.
6. Verify no direct Supabase/repository/RPC dependency enters teacher feature code.
