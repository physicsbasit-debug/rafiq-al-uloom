# Phase 3-1 — Authoring Schema + RLS + Trusted Transitions

## Package status

Architecture/security review approved. This is the final `changed_files_only` package for GitHub application and real Codespaces/PostgreSQL validation.

Baseline:

```text
v0.5-mastery-results-cloud-complete
Phase 3-0 CLOSED @ 37a4024
```

## Scope

This package adds the first production backend for Teacher Dashboard authoring:

- `content_revisions` authoring plane.
- `content_review_events` append-only review audit.
- server-derived canonical fingerprints.
- trusted create/save/submit/review RPC transitions.
- atomic canonical lesson publishing.
- direct PostgREST bypass tests from the start.
- explicit retention of historical canonical rows so v0.5 mastery-result foreign keys remain valid.

It does **not** add React UI, repositories/services, capability activation, AI, or `v0.6`.

## Important publishing decision

Approved lessons are versioned, not overwritten in place.

```text
old approved canonical lesson
→ revision
→ reviewer approval
→ old lesson becomes historical/non-published
→ new canonical lesson graph inserted with server-generated ids
```

This prevents historical `mastery_attempt_answers.question_id` references from being deleted or silently reinterpreted.

## Files

```text
supabase/migrations/20260807170000_add_teacher_authoring_workflow.sql
tests/integration/helpers/authoring-fixtures.ts
tests/integration/supabase-authoring-workflow.integration.ts
tests/integration/supabase-authoring-bypass.integration.ts
docs/PHASE_3_1_AUTHORING_SCHEMA_RLS_TRANSITIONS.md
docs/PHASES.md
README_PHASE_3_1.md
APPLY_PHASE_3_1.txt
```

## Review result

External architecture/security review approved the migration design, RLS/GRANT boundaries, trusted transitions, stale-revision protection, append-only review history, versioned canonical publishing, and the 22 new integration tests.

The reviewed implementation files are unchanged in this final package. Only the package wrapper (`README` / `APPLY`) was converted from review mode to application mode.

## Mandatory real acceptance gate

No claim is made that Phase 3-1 is CLOSED until the final GitHub commit passes real Codespaces validation against local Supabase/PostgreSQL.

The acceptance order is:

1. Upload this package to GitHub and pull the resulting commit.
2. Confirm the commit contains only the eight Phase 3-1 files.
3. Start local Supabase from a clean stopped state and wait for full readiness.
4. Run the two new Phase 3-1 integration suites directly.
5. Run the complete build/lint/prettier/basic/Supabase regression suite.
6. Confirm Git is clean and synchronized with `origin/main`.

Do not create `v0.6` in Phase 3-1. That tag is reserved for complete Phase 3 closure.
