# Phase 3-4D: Unified Workspace Authorization Composition

**Status: REVIEW APPROVED — APPLY CANDIDATE**

## Goal

Connect the already-completed teacher and reviewer workspaces to the real application without changing the student `Step` machine or duplicating authorization logic in `App.tsx`.

## Baseline

- Stable commit before this candidate: `4cf7a6726cb0eec366b4471f682fbe24075662c3`.
- Local baseline: 61 test files / 633 tests.
- Full Supabase verification remains deferred.

## Composition contract

`Step` remains student navigation only. Workspace navigation is separate:

```ts
type AppSurface = 'student' | 'teacher' | 'reviewer';
```

The default surface is `student`.

The teacher entry and teacher mount are independently guarded with:

```text
access_teacher_workspace
```

The reviewer entry and reviewer mount are independently guarded with:

```text
access_reviewer_workspace
```

The authenticated student experience remains guarded with:

```text
access_student_experience
```

No role comparison is added to `App.tsx`. No authoring/review service, repository, Supabase client, or RPC is imported by `App.tsx`.

## Student position preservation

Opening a workspace changes only `AppSurface`. The existing `step` state remains owned by `AppContent`. Returning with `العودة إلى التعلم` changes only `AppSurface` back to `student`, so the prior student `Step` value is preserved.

This contract preserves the student screen/lesson position. It does not claim to preserve arbitrary internal scroll positions or unsaved local state inside child screens.

## Authorization changes while mounted

The workspace child itself stays inside `RequireCapability`. If the authorization state changes and the active account can no longer enter that workspace, the workspace child is no longer rendered. No `wasAuthorized` or equivalent sticky local authorization state is introduced.

## Out of scope

This APPLY candidate does not change:

- `authorization.policy.ts`;
- `RequireCapability.tsx`;
- teacher authoring lifecycle;
- reviewer decision lifecycle;
- `Step` union;
- authentication lifecycle;
- SQL, migrations, RLS, GRANTs, RPCs, or Supabase functions.

## New tests

`tests/features/AppWorkspaceComposition.test.tsx` adds 10 runtime cases:

- active student has no workspace entry and mounts neither workspace;
- active teacher can enter only TeacherWorkspace;
- active reviewer can enter only ReviewerWorkspace;
- teacher Step value survives workspace round-trip;
- reviewer Step value survives workspace round-trip;
- authorization revocation removes an already-selected teacher workspace;
- authorization revocation removes an already-selected reviewer workspace;
- teacher return to learning causes no sign-out/session/authorization refresh;
- reviewer return to learning causes no sign-out/session/authorization refresh;
- guest remains on the local student path with no workspace entry.

`tests/architecture/app-workspace-composition-contract.test.ts` adds 6 architecture cases covering:

- `AppSurface` / `Step` separation;
- exactly two teacher guards, two reviewer guards, and one student guard;
- no inline role decisions or resurrected `authorized` variable;
- no service/repository/Supabase/RPC imports in App;
- feature-boundary imports for both workspaces;
- return-to-learning changing `AppSurface` only.

Expected full local count after application: **63 test files / 649 tests**, subject to Codespaces verification.
