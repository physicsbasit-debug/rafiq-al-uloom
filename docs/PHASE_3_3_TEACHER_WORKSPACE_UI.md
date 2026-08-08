# Phase 3-3 — Teacher Workspace UI Contract

## Status

- Phase 3-3A: architecture contract approved.
- Phase 3-3B: Workspace Shell + Draft List CLOSED locally at `cb47443c8fe4bed22d305b828ec7ef103c00b0f5`.
- Phase 3-3C: Lesson Editor + Create/Save lifecycle — REVIEW APPROVED; EXECUTION / LOCAL VERIFICATION PENDING.
- Backend / SQL / RLS / RPC changes: none.
- Full Supabase verification: deferred by project decision.

## Architectural path

```text
Teacher UI
  -> AuthoringService
  -> AuthoringRepository
  -> Supabase authoring implementation
  -> RPC + RLS
```

Teacher UI must not import Supabase, repository implementations, RPC names, or make role-literal authorization decisions.

## Revision states

The UI uses backend statuses exactly:

- `draft` -> مسودة
- `pending_review` -> قيد المراجعة
- `rejected` -> يحتاج إلى تعديل
- `approved` -> معتمد

No extra persisted domain status is introduced.

## Revision identity contract

The editor keeps two identities separate:

- `originRevisionId`: the revision from which the session was opened; stable for the session.
- `workingRevisionId`: the current editable draft; may be null initially and may change only after a successful create.

The editor modes are:

```text
new
edit_draft
revise_rejected
readonly_pending_review
readonly_approved
```

### New lesson

```text
originRevisionId = null
workingRevisionId = null
mode = new
```

First successful save:

```ts
createLessonRevision({ payload })
```

Only after `status === 'created'`:

```text
workingRevisionId = returned revision id
mode = edit_draft
dirty = false
```

Subsequent saves use `saveLessonRevision(workingRevisionId, payload)`.

### Existing draft

```text
originRevisionId = draft.id
workingRevisionId = draft.id
mode = edit_draft
```

Save uses the same working revision id.

### Rejected revision

A rejected revision is immutable and is never saved in place.

Opening rejected revision `A` creates this local session:

```text
originRevisionId = A
workingRevisionId = null
mode = revise_rejected
```

First persistence operation:

```ts
createLessonRevision({
  payload,
  supersedesRevisionId: A,
})
```

If and only if the server creates successor draft `B`:

```text
workingRevisionId = B
mode = edit_draft
dirty = false
```

Subsequent saves use `saveLessonRevision(B, payload)`.

`saveLessonRevision(A, ...)` is forbidden.

This is a strict commit-on-success rule. A rejected create or unavailable response leaves `workingRevisionId = null`, keeps the session in `revise_rejected`, and keeps unsaved edits dirty.

### Pending review and approved

Both are read-only in Phase 3-3C. No create/save mutation is exposed from their editor view.

## Approved lesson capability

The backend already supports creating a new revision from an existing approved lesson through the current `entityId` / `p_entity_id` path and the existing base-fingerprint/stale-revision protections.

Phase 3-3 intentionally does not expose that existing capability in the teacher UI yet. This is a UI scope decision, not a missing backend feature.

## Phase 3-3C editable payload scope

This slice deliberately edits the lesson-level fields only:

```text
unitId
title
displayOrder
summary
keyConcepts[]
examples[]
misconceptions[]
```

Existing structured child collections are preserved losslessly through create/save:

```text
objectives[]
questions[]
games[]
experiments[]
```

They are displayed by count but are not edited in this slice. This isolates revision-identity persistence from a large nested-content form. Dedicated structured child editors must be reviewed separately before final Teacher Workspace closure if they are required for the released authoring experience.

No JSON editor or raw payload field is shown to the teacher.

## Manual save and mutation lifecycle

- No autosave.
- Save is disabled until local changes exist.
- Save is disabled while a save/create request is in flight.
- Returning to the list with dirty local changes requires explicit confirmation; returning is disabled while a save is in flight.
- A fresh `AbortController` is passed through the `AuthoringService` call.
- The active request is aborted when the editor unmounts.
- Abort lifecycle errors are not surfaced as user-facing failures.
- Local identity and dirty-state commits happen only after a successful server result.

## Phase 3-3C error mapping

Teacher UI maps all 15 distinct `AuthoringRejectionReason` values:

1. `not_authenticated`
2. `not_authorized`
3. `invalid_payload`
4. `unit_not_available`
5. `lesson_not_available`
6. `source_revision_not_available`
7. `source_revision_mismatch`
8. `revision_not_editable`
9. `revision_not_submittable`
10. `revision_not_reviewable`
11. `invalid_decision`
12. `review_note_required`
13. `stale_revision`
14. `canonical_position_conflict`
15. `invalid_revision_id`

It also maps all three unavailable reasons:

- `network_error`
- `service_unavailable`
- `unknown`

The mappings are declared as exhaustive `Record<>` objects so TypeScript rejects missing known cases.

Raw Supabase/PostgreSQL messages, stack traces, and RPC diagnostics are never rendered to the teacher.

## Phase 3-3C workspace composition

3-3B callbacks remain observable for compatibility, but the workspace now owns its local list/editor screen transition:

```text
Draft list
  -> create new -> TeacherLessonEditor(new)
  -> open revision -> TeacherLessonEditor(revision)
  -> back -> Draft list + fresh list reload
```

No App-level authorization composition is added yet. `App.tsx` remains outside this slice.

## Out of scope

Phase 3-3C does not add:

- submit mutation or submit confirmation;
- review-note loading;
- reviewer UI;
- App authorization composition;
- direct Supabase usage;
- direct repository implementation usage;
- SQL / migrations / RLS / RPC changes;
- approved-lesson revision UI;
- autosave;
- AI generation;
- remote Supabase deployment.

## Acceptance criteria

Phase 3-3C review must prove directly that:

- new editor starts with no working revision;
- first new save calls `createLessonRevision`;
- second save uses the server-returned working id;
- existing draft saves through its draft id;
- rejected revision first save calls `createLessonRevision` with `supersedesRevisionId`;
- rejected revision id is never passed to `saveLessonRevision`;
- failed rejected successor creation leaves `workingRevisionId` null and dirty state intact;
- successful rejected successor creation commits the returned id before later saves;
- pending-review and approved editors are read-only;
- double-save is blocked while a mutation is pending;
- dirty back-navigation requires confirmation;
- structured child collections are preserved during lesson-field saves;
- 15/15 rejection reasons have messages;
- 3/3 unavailable reasons have messages;
- teacher feature contains no direct Supabase/RPC/infrastructure dependency;
- no App integration or backend change is present.

## Next slice after approval and local closure

Phase 3-3D will add submit flow and its confirmation/state rules. Any dedicated structured child-content authoring UI must be explicitly scheduled and reviewed rather than silently folded into submit logic.
