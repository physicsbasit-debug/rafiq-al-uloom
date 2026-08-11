# Phase 3-5A Fix 2B-3 — APPLY

Baseline: `ec6ee191ba5221b5dd5cbe818f84ddc1d745b659`

This APPLY is built from the Claude-approved REVIEW v2.

Scope:
- submission readiness pure helper
- TeacherLessonEditor submission readiness UX
- companion regression fixture/message update
- local pure/UI tests
- real Supabase UI composition gate

Frozen / untouched:
- `useTeacherLessonEditor.ts`
- `teacher-workspace.utils.ts`
- `src/services/authoring/**`
- `src/types/quiz.types.ts`
- `src/App.tsx`
- `supabase/**`

No SQL, RPC, RLS, Auth, Reviewer workflow, or repository redesign is included.
