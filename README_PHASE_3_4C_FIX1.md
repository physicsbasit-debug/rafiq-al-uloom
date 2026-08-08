# Phase 3-4C Fix 1 — Double-Action Hook-Level Verification

## Scope

This is a test-only correction for the four concurrent double-action cases in `ReviewerRevisionReview.test.tsx`.

Production code changes: **0**.

The previous UI-level test queried the second action button again after the first click. React correctly re-rendered both decision buttons as disabled with the shared label `جارٍ تنفيذ القرار...`, so the second query failed before the second action was attempted.

Fix 1 keeps the same four cases but exercises `useReviewerRevisionReview.review()` directly at hook level, where `reviewInFlightRef` lives. Two review calls are started synchronously in the same `act()` block. The test then proves that `reviewLessonRevision` is called exactly once, with the first decision, the same revision id, and the correct note semantics.

## Unchanged

- `src/features/reviewer/workspace/useReviewerRevisionReview.ts`
- `src/features/reviewer/workspace/ReviewerRevisionReview.tsx`
- `src/features/reviewer/workspace/ReviewerWorkspace.tsx`
- all service/repository/Supabase code
- SQL/RLS/RPC
- test count

## Expected verification

1. `ReviewerRevisionReview.test.tsx`: **17/17**
2. full local suite: **633/633** across **61/61** test files
3. then run the normal Prettier/Lint/Build/diff gates.

Full Supabase verification remains deferred.
