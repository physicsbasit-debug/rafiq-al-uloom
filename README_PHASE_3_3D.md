# Phase 3-3D — Submit Flow + Rejected Successor Completion

Status: **REVIEW APPROVED — APPLY / LOCAL VERIFICATION PENDING**

Base: Phase 3-3C locally closed at `8047b75d24a251b9b1204276ed184e3de4e29b28`.

## Scope

This review slice adds only the teacher submit lifecycle on top of the already-closed editor/create/save flow:

- `submitLessonRevision(workingRevisionId)` only;
- explicit submit confirmation;
- submit disabled while local edits are dirty;
- no implicit save+submit chain;
- double-submit protection;
- submit `AbortController` lifecycle;
- commit-on-success transition to `readonly_pending_review`;
- failed submit keeps the same editable draft identity;
- executable test for `rejected A -> successor B -> save B -> submit B -> never submit A`;
- architecture test prohibiting submit through `originRevisionId`.

## Explicitly unchanged / out of scope

- no `App.tsx` change;
- no reviewer UI;
- no review-note loading;
- no SQL / migration / RLS / RPC definition change;
- no direct Supabase or repository implementation import in teacher UI;
- no approved-lesson revision UI;
- no autosave;
- no AI;
- no remote Supabase deployment.

## Codespaces verification priority

The first review target is `useTeacherLessonEditor.ts`:

1. prove submit is reachable only in `edit_draft` with non-null `workingRevisionId` and clean state;
2. prove `submitLessonRevision` receives `workingRevisionId` only;
3. prove successful submit is the only path to `readonly_pending_review`;
4. prove rejected/unavailable submit does not mutate local mode or identity;
5. trace the rejected path end-to-end: A rejected -> create B -> save B -> submit B -> never submit A.

## Expected Codespaces delta after APPLY

This APPLY package adds 8 new React test cases to the existing `TeacherLessonEditor.test.tsx` and 1 new architecture test. If no other tests change, the local basic-suite expectation is:

`580 + 9 = 589 tests`.

That number is a forecast only. Codespaces remains the execution authority during local closure verification.
