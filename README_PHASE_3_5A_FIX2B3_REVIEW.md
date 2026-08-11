# REVIEW ONLY — Phase 3-5A Fix 2B-3 — v2

This package is for Claude/Cloud code review only. **Do not upload it to GitHub.**

Production proposal is byte-identical to REVIEW v1:
- NEW `teacher-submission-readiness.ts`
- MODIFIED `TeacherLessonEditor.tsx`

Tests:
- pure readiness contract
- UI readiness / Save isolation
- real Supabase UI composition including Objective A → delete → explicit relink to Objective B → Save → Submit → reviewer queue
- companion regression update for the pre-existing `TeacherLessonEditor.test.tsx`

Cloud-discovered regression addressed in v2:
1. The shared legacy revision fixture now contains one valid `mastery` question linked to `obj-1`, so old Submit lifecycle tests remain content-complete under Fix 2B-3.
2. The old `role="status"`/old wording assertion now checks the approved readiness UX text directly.

Key audit points:
1. Production files must be byte-identical to REVIEW v1.
2. `teacher-submission-readiness.ts` calls `getQuestionStateIssue`; it does not duplicate structural validation.
3. Save remains independent from submission readiness.
4. The companion regression test changes only fixture completeness + the stale message assertion.
5. The real Supabase test constructs the relinked question through actual UI controls.

See `REVIEW_DELTA_FROM_V1_PHASE_3_5A_FIX2B3.txt` and the two semantic patch files.
