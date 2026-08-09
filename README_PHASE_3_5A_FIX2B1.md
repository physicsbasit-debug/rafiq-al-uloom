# Phase 3-5A Fix 2B-1

## Pure structural state + invariants + Objective editor

This APPLY package contains the exact reviewed production/test/document files approved for Fix 2B-1.

Scope:

- pure objective structural helpers
- objective editor with local form buffer
- stable client-owned objective keys
- linked-objective deletion guard
- integration into TeacherLessonEditor through the existing updatePayload path
- focused pure/UI/editor tests

Explicitly excluded:

- SQL, RPC, RLS or Supabase changes
- question editor (Fix 2B-2)
- submission-readiness UI/runtime gate (Fix 2B-3)
- changes to useTeacherLessonEditor.ts
- changes to teacher-workspace.utils.ts
- App.tsx, authorization, repositories or services

The stable parent before the GitHub upload should be c7b6405.
