# Phase 3-5A Gate 1 — Real Supabase composition APPLY

This package applies the Cloud-approved **verification gate only**.

It contains no production source, SQL, migration, RLS/RPC, App.tsx, or authorization-policy changes.

## Confirmed pre-runtime blocker

The current new-lesson UI exposes metadata editing but no objective/question authoring. Its new payload therefore keeps:

```text
objectives = []
questions = []
```

while the trusted SQL payload contract requires:

```text
objectives >= 1
questions >= 1
mastery questions >= 1
```

Cloud independently confirmed the blocker is specifically `objectives/questions`; empty `games/experiments` are valid.

Cloud also recorded a separate usability issue: `unitId` is free text even though SQL requires an existing unit. That issue is not mixed into Gate 1 and is not patched here.

## What Gate 1 proves

The integration file contains three real tests:

1. Real Supabase sign-in + Profile + Authorization access matrix.
2. Real `TeacherWorkspace` new lesson first save. The test expects the correct product behavior: draft creation. If the known mismatch is active, it fails with `PHASE_3_5A_FIRST_SAVE_BLOCKER`.
3. A structurally valid A -> reject -> B successor -> approve -> canonical publication lifecycle through the real Teacher/Reviewer workspaces and real Supabase repositories/services.

## Decision rule

- If all three pass: continue to the full Supabase suite, then Phase 3-5B closure preparation.
- If first-save fails but access matrix and full valid-payload lifecycle pass: stop. Record a narrow new-authoring UI/SQL contract blocker and create a separate Fix 1.
- If a broader test fails: diagnose the first failing layer before changing production.

Do not create the Phase 3 tag from Gate 1 alone.
