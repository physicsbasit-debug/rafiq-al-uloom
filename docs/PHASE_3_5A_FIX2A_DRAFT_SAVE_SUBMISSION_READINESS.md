# Phase 3-5A Fix 2A — Draft Save vs Submission Readiness Contract

## Status

**REVIEW CANDIDATE — DO NOT APPLY YET**

This change evolves the Phase 3-1 authoring contract forward after the real Phase 3-5A Gate 1 proved that a newly-created teacher draft cannot be saved while `objectives` and `questions` are empty.

The approved rule is:

```text
A draft may be incomplete, but it may not be structurally invalid.
Submission and approval require both structural validity and completeness.
```

## Baseline

Expected current repository point before this review:

```text
5c12b40
```

Historical Phase 3-1 migration that must remain byte-identical:

```text
supabase/migrations/20260807170000_add_teacher_authoring_workflow.sql
SHA-256: 32aecfebb303ef3e5edcd6b1143e4eb7a136212a01fc5117c00ef2f700fa8985
```

The historical migration is **not included** in this review package and must not be edited.

## Runtime evidence that triggered Fix 2A

Gate 1 after the jest-dom test fix produced:

```text
Access Matrix   PASS
First Save      FAIL -> PHASE_3_5A_FIRST_SAVE_BLOCKER
A->B Lifecycle  PASS
```

The full valid lifecycle proves that the trusted authoring/review path works when the payload is complete. The failing first-save case proves that the new lesson path reaches the backend but is rejected as `invalid_payload` while the current UI can only produce empty `objectives` and `questions`.

`invalid_payload` is a general rejection reason. The root-cause conclusion therefore comes from the combined evidence: runtime rejection, actual submitted payload shape, absence of structural-content authoring in the current editor, and successful A->B lifecycle with a complete payload.

## Contract correction

The existing validator conflates two concepts:

1. Structural validity: field types, object/array shape, valid references, unique keys, valid choice indexes, and correctness of elements that are present.
2. Submission readiness: at least one objective, at least one question, and at least one mastery question.

Fix 2A separates them without duplicating the structural validator.

## Validator signatures

A new internal overload is introduced:

```sql
public.lesson_revision_payload_error(
  p_payload jsonb,
  p_require_complete boolean
)
```

The boolean has **no DEFAULT**. This avoids ambiguity with the historical one-argument signature.

The historical signature remains as a strict compatibility wrapper:

```sql
public.lesson_revision_payload_error(p_payload jsonb)
```

and delegates to:

```sql
public.lesson_revision_payload_error(p_payload, true)
```

Thus any historical caller that still invokes the one-argument function retains strict behavior.

## Exact completeness gates

Line-by-line review of the Phase 3-1 validator confirmed that only two existing `IF` blocks represent completeness rather than structural validity:

```text
1. v_objective_count = 0
2. v_question_count = 0 OR v_mastery_count = 0
```

The second item is one combined `OR` condition, not two separate `IF` blocks.

The candidate changes only these gates:

```sql
IF p_require_complete AND v_objective_count = 0 THEN ...

IF p_require_complete
  AND (v_question_count = 0 OR v_mastery_count = 0)
THEN ...
```

All other validation logic is preserved.

## Caller matrix

The actual Phase 3-1 migration contains four validator call sites. Fix 2A classifies all four explicitly:

| Caller                                 | Completeness | Reason                                         |
| -------------------------------------- | ------------ | ---------------------------------------------- |
| `create_lesson_revision`               | `false`      | New draft may be incomplete.                   |
| `save_lesson_revision`                 | `false`      | Existing editable draft may remain incomplete. |
| `submit_lesson_revision`               | `true`       | Review queue accepts only complete content.    |
| `review_lesson_revision` approval path | `true`       | Defense-in-depth before canonical publication. |

The approval path remains strict even though a normal revision must already have passed strict submission validation.

## Security and EXECUTE surface

The historical helper is explicitly inaccessible to all application roles:

```sql
REVOKE ALL ON FUNCTION public.lesson_revision_payload_error(jsonb)
FROM PUBLIC, anon, authenticated, service_role;
```

The new two-argument overload receives the same explicit revoke:

```sql
REVOKE ALL ON FUNCTION public.lesson_revision_payload_error(jsonb, boolean)
FROM PUBLIC, anon, authenticated, service_role;
```

The migration also reasserts the one-argument revoke after replacing its body with the strict wrapper.

No table grants, RLS policies, application roles, authorization operations, or direct content-table write permissions are changed.

## Forward-only migration rule

The implementation is a new migration:

```text
supabase/migrations/20260808215000_separate_draft_save_from_submission_readiness.sql
```

It does not alter the historical 3-1 migration.

The new migration:

1. Adds the two-argument validator implementation.
2. Revokes EXECUTE on it from `PUBLIC`, `anon`, `authenticated`, and `service_role`.
3. Replaces the historical one-argument validator body with a strict wrapper while retaining the same signature and function properties.
4. Reasserts the historical helper revoke.
5. Replaces the four existing RPC bodies only to make their validator mode explicit: `false`, `false`, `true`, `true`.

No table/schema/RLS/GRANT migration is part of Fix 2A.

## Preserved validator properties

Both validator signatures use the same relevant properties as the historical helper:

```text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
```

The RPC signatures, return types, security model, search paths, ownership checks, revision identity rules, fingerprint logic, transaction atomicity, stale-revision behavior, and review transition logic remain unchanged.

## Bypass audit

The existing `supabase-authoring-bypass.integration.ts` does not contain an expectation that empty `objectives` or empty `questions` must be rejected by create/save. Its authoring fixtures use `buildLessonRevisionPayload(...)`, i.e. complete structural payloads, while the tests exercise authorization, ownership, state transitions, direct-table privileges, and RPC execution boundaries.

Therefore no existing bypass expectation needs semantic weakening for Fix 2A.

## New focused integration coverage

The new test file is:

```text
tests/integration/supabase-authoring-draft-readiness.integration.ts
```

It adds seven scenarios:

1. The one-argument validator remains strict; the two-argument validator can validate an incomplete draft structurally; neither helper signature is executable by PUBLIC/application roles.
2. Incomplete draft can be created and saved, but submit returns `invalid_payload` and status remains `draft`.
3. Review-only draft can be created/saved, but cannot submit without a mastery question.
4. Reviewer approval remains strict if a `pending_review` payload is deliberately tampered to incomplete by the admin test harness; approval returns `invalid_payload`, status stays `pending_review`, no publication occurs, and no review event is forged.
5. Structurally invalid payload still fails create even when completeness is optional.
6. `unit_not_available` remains unchanged for incomplete drafts.
7. A rejected revision remains immutable while an incomplete successor draft can be created; the incomplete successor cannot submit.

## Existing evidence that must remain green

No existing Gate 1 expectation is weakened.

After APPLY, the unchanged Gate 1 must become:

```text
Access Matrix   PASS
First Save      PASS
A->B Lifecycle  PASS
3/3 PASS
```

The existing Phase 3-1 workflow and bypass suites remain mandatory acceptance evidence, including stale approval, append-only review history, trusted ownership, and direct-bypass protection.

## Explicit exclusions

Fix 2A does not implement:

```text
Objectives editor
Questions editor
Review/mastery UI
Question choices UI
Correct answer UI
Objective linkage UI
Unit selector UX
App.tsx changes
Teacher/Reviewer component changes
TypeScript service/repository changes
AI / notifications / realtime
Multiple GoTrueClient warning cleanup
```

Those are separate concerns. Structural-content editing belongs to Phase 3-5A Fix 2B.

## Acceptance gates after APPLY

The implementation is not closed until all of the following are demonstrated on a clean local Supabase reset:

```text
Historical Phase 3-1 migration SHA unchanged
New migration applies successfully
Focused Fix 2A integration tests pass
Existing Phase 3-1 workflow tests pass
Existing Phase 3-1 bypass tests pass
Unchanged Gate 1 = 3/3
Full Supabase integration suite passes
Basic Vitest suite passes
Build passes
Lint passes
Prettier passes
git diff --check passes
Working tree is clean after commit/push
HEAD = origin/main
```

No final test count is predeclared. The executed repository output is authoritative.
