# Phase 3-3 — Teacher Workspace UI Contract

## Status

- Phase 3-3A: architecture contract approved after review correction.
- Phase 3-3B: Workspace Shell + Draft List review approved; execution / local verification pending.
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

## Authorization boundary

Workspace visibility is composed later through `RequireCapability` with `access_teacher_workspace`.
Authoring mutations remain protected independently through `author_content` and the backend/RLS boundary.

## Revision states

The UI uses the backend statuses exactly:

- `draft` -> مسودة
- `pending_review` -> قيد المراجعة
- `rejected` -> يحتاج إلى تعديل
- `approved` -> معتمد

No extra domain status such as `submitted` is introduced.

## Rejected revision rule

A rejected revision is immutable. It is never saved in place.

When a teacher begins revising rejected revision `A`, the editor session must start with:

```text
originRevisionId = A
workingRevisionId = null
mode = revise_rejected
```

The first successful persistence operation must be:

```ts
createLessonRevision({
  payload,
  supersedesRevisionId: A,
})
```

If the backend creates successor draft `B`, only then may local state commit:

```text
workingRevisionId = B
mode = edit_draft
dirty = false
```

Subsequent saves use `saveLessonRevision(B, payload)`, and submission uses `submitLessonRevision(B)`.
`saveLessonRevision(A, ...)` is forbidden.

This is a commit-on-success rule: local revision identity never advances optimistically before the server confirms creation.

## Revision identity in the editor

The editor must keep two concepts separate:

- `originRevisionId`: the revision from which the session was opened; stable for the session.
- `workingRevisionId`: the current editable draft; may be null initially and may change after a successful create.

This applies both to new content and rejected-revision successor creation.

## Approved lesson capability

The backend already supports creating a new revision from an existing approved lesson through the current `p_entity_id` / `entityId` path, including the existing base-fingerprint and stale-revision protections.

Phase 3-3 intentionally does **not expose that existing backend capability in the teacher UI yet**. This is a deliberate UI scope decision, not a missing backend feature. A future UI can reuse the existing backend contract without inventing new SQL merely to enable this flow.

## Editor modes reserved for later 3-3 slices

```text
new
edit_draft
revise_rejected
readonly_pending_review
readonly_approved
```

Phase 3-3B does not implement the editor. It only provides the shell and revision list needed to open the later editor flow.

## Persistence rules reserved for 3-3C/3-3D

- Manual save only; no autosave.
- Submit requires a real `workingRevisionId` and no unsaved local changes.
- Pending-review and approved revisions are read-only.
- Double-save and double-submit are blocked locally while an operation is in flight.
- `AbortSignal` is propagated through service calls; abort lifecycle errors are not shown to users.

## Error mapping contract

The Teacher UI must eventually define a user-facing mapping for all 15 distinct `AuthoringRejectionReason` values:

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

`invalid_payload` can originate locally as well as from the RPC contract, but is one distinct reason and is not counted twice.

The three unavailable reasons must also be mapped:

- `network_error`
- `service_unavailable`
- `unknown`

Raw Supabase/PostgreSQL messages, stack traces, and RPC diagnostics are never rendered to the teacher.

## 3-3B scope

Phase 3-3B implements only:

- Teacher workspace shell.
- Load own revisions through `AuthoringService.listOwnRevisions`.
- Loading, empty, success, and unavailable states.
- Local status filters.
- Revision cards.
- Create-new callback boundary.
- Open-revision callback boundary.
- Request cancellation on unmount/reload.
- Architecture guard for teacher feature infrastructure imports.

It does **not** implement:

- lesson editor,
- create/save/submit mutations,
- rejected-successor mutation flow,
- review-note loading,
- App authorization composition,
- reviewer UI,
- backend changes,
- remote Supabase deployment.

## 3-3B service boundary

The shell receives an `AuthoringService` boundary and defaults to the project `authoringService`. Components do not construct repositories or Supabase clients.

The service returns revisions already restricted to the signed-in owner by the backend/RLS path. The UI does not send, filter by, or make trust decisions from `authorId`.

## 3-3B ordering and filtering

`listOwnRevisions` already orders results by `updated_at DESC` then `id ASC` in the repository. The UI preserves service order and performs only local status filtering; it does not add a second ordering policy or a filter RPC.

## 3-3B acceptance criteria

- calls `AuthoringService.listOwnRevisions` only through the service boundary;
- shows loading state;
- shows empty state;
- shows all four backend statuses with Arabic labels;
- preserves service ordering;
- filters locally by status;
- opens the exact selected revision through callback;
- exposes create-new through callback without creating a revision yet;
- unavailable state is mapped to Arabic without raw backend details;
- retry performs a fresh request;
- prior request is aborted on reload and request is aborted on unmount;
- no direct Supabase import, repository implementation import, direct RPC name, `author_id`, or `reviewer_id` in teacher feature;
- no role-literal authorization decision in feature code;
- no App integration in 3-3B.
