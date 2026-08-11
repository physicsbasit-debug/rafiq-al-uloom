# Phase 3-5A Fix 2B-3 — Submission Readiness UX + Real Supabase Composition Gate

Baseline target: `ec6ee191ba5221b5dd5cbe818f84ddc1d745b659`.

## Frozen contracts

- SQL remains authoritative for submission completeness.
- TypeScript mirrors only the three product completeness counts: objective >= 1, question >= 1, mastery >= 1.
- `getQuestionStateIssue` is the sole structural source of truth for committed questions.
- `dangling_objective` maps to the dedicated UX reason; every other non-null structural issue maps to `invalid_question_structure`.
- Save Draft never calls or depends on `getLessonSubmissionReadiness`.
- Submit Action Readiness = content readiness + the existing `session.canSubmit` lifecycle contract.

## Real Supabase acceptance

1. objective-only UI disabled + service submit rejected `invalid_payload`.
2. review-only UI disabled + service submit rejected `invalid_payload`.
3. Real UI builds Objective A and B, opens a mastery Question Buffer linked to A, deletes A, explicitly relinks to B, applies locally, saves through real AuthoringService/Supabase, verifies persisted `objectiveKey === teacher-objective-2`, submits, reaches `pending_review`, and the same revision id is visible/openable in ReviewerWorkspace.

No SQL/RPC/RLS/Auth/Repository/App changes are included.

## Companion regression fixture update

The pre-existing `TeacherLessonEditor.test.tsx` Submit lifecycle fixture must remain content-complete under the new gate. Its shared draft/rejected revision payload therefore contains one valid mastery question linked to its existing `obj-1`. This changes no production contract; it prevents lifecycle tests from accidentally becoming completeness tests.

The stale dirty-submit assertion is updated from the removed `role="status"`/old wording to the approved readiness message: `احفظ التغييرات قبل الإرسال للمراجعة.`
