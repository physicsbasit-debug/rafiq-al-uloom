# Phase 3-0: Teacher Dashboard Contract & Architecture — Final Upload Package

## Base

```text
v0.5-mastery-results-cloud-complete
c99ecf69a5225a03108798476dc69e75987d7595
```

## Scope

Documentation only. This package does not modify production code, tests, package.json, Supabase migrations, RLS, RPC functions, or the frozen Phase 2-C/2-D implementation.

## Files

```text
docs/PHASE_3_0_TEACHER_DASHBOARD_CONTRACT.md
docs/PHASES.md
docs/ARCHITECTURE.md
docs/PROJECT_CHARTER.md
README_PHASE_3_0.md
APPLY_PHASE_3_0.txt
```

## Core decisions adopted for Phase 3-0

1. Keep roles exactly `student | teacher | reviewer`.
2. Teacher authors; reviewer reviews and approves.
3. Do not grant direct writes to canonical published content tables.
4. Add a separate authoring/revision plane in later Phase 3-1.
5. Use explicit revision lifecycle: `draft → pending_review → approved/rejected`.
6. Approved content edits create a new revision; they do not mutate published rows in place.
7. Preserve review history through append-only review events or an equivalent non-destructive audit design.
8. Publish only through a trusted atomic server-side transition.
9. Derive ownership and reviewer identity from `auth.uid()`/profiles, never trusted client identity fields.
10. Keep `ContentRepository` read-only for canonical published content; add separate authoring/review repositories.
11. Activate existing `author_content` and `review_content` authorization operations only after backend enforcement exists.
12. Require direct PostgREST bypass tests before any Phase 3 write path is considered complete.
13. Keep AI authoring in Phase 4; AI may later create drafts only, never publish directly.

## Proposed implementation sequence

```text
3-0 Contract & Architecture
3-1 Authoring Schema + RLS + Trusted Transitions
3-2 Repositories + Services + Authorization Activation
3-3 Teacher Workspace UI
3-4 Reviewer Workspace UI
3-5 Real Composition + Closure & Freeze
```

## Verification focus

Verify the approved contract against the frozen v0.5 architecture, especially:

- no accidental change to AuthState/AuthorizationState/roles/statuses;
- no weakening of profiles or mastery-result RLS;
- no direct canonical-content write permission for teacher/reviewer;
- lifecycle/state transition completeness;
- revision conflict handling;
- audit history preservation;
- backend/React boundary correctness;
- compatibility with a future Phase 4 AI draft producer.
