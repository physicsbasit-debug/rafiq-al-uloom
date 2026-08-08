# Phase 3-4: Reviewer Workspace UI Contract

## Status

**Phase 3-4A: Reviewer Workspace Contract — REVIEW APPROVED. Phase 3-4B: Pending Review List — REVIEW CANDIDATE.**

This document defines the UI contract only. It does not add React production code, App composition, SQL, migrations, RLS, RPCs, or Supabase deployment changes.

## Baseline

The contract is designed on top of the locally closed Teacher Workspace baseline:

- Phase 3-3B closed at `cb47443`.
- Phase 3-3C closed at `8047b75`.
- Phase 3-3D closed at `caf6006`.
- Current local baseline: 589 passing tests across 56 test files.
- Full Supabase verification remains explicitly deferred.

## 1. Goal

Build a reviewer-facing workspace that:

1. lists lesson revisions awaiting review,
2. opens one exact `pending_review` revision,
3. allows an authorized reviewer to approve or reject that exact revision,
4. requires a non-empty review note before a reject request leaves the UI,
5. commits UI state only after a confirmed service success,
6. prevents duplicate or conflicting review actions,
7. never bypasses the existing ReviewService / authorization / backend boundaries.

The UI architecture is:

```text
Reviewer UI
  -> ReviewService
  -> ReviewRepository
  -> Supabase implementation
  -> existing RPC + RLS
```

React must not call Supabase, RPC names, or repository implementations directly.

## 2. Existing service contract is the source of truth

Phase 3-4 uses the existing 3-2 `ReviewService` contract as-is:

```ts
interface ReviewService {
  listPendingRevisions(options?: AuthoringRequestOptions): Promise<LessonRevisionListResult>;
  reviewLessonRevision(
    input: ReviewLessonRevisionInput,
    options?: AuthoringRequestOptions
  ): Promise<ReviewLessonRevisionResult>;
}
```

The existing input is:

```ts
interface ReviewLessonRevisionInput {
  revisionId: string;
  decision: 'approve' | 'reject';
  note?: string | null;
}
```

The existing successful result shapes are:

```text
approve -> { status: 'approved', revisionId, publishedEntityId }
reject  -> { status: 'rejected_by_reviewer', revisionId }
```

Other outcomes remain the existing `rejected` and `unavailable` result families.

No new service method is invented in 3-4A.

## 3. Authorization boundary

Reviewer Workspace access is governed by the existing centralized capability:

```text
access_reviewer_workspace
```

Review mutations are governed by:

```text
review_content
```

The current authorization policy permits these only for an active authorized reviewer.

Reviewer feature code must not make permission decisions using inline role checks such as:

```ts
role === 'reviewer'
role !== 'teacher'
```

The UI is not a security boundary. Backend/RLS remain authoritative.

Self-approval must not be enabled or inferred by the UI. The feature must not add any client-side workaround that allows a teacher to review their own submission or bypass existing backend protections.

## 4. Pending list source

The pending list has exactly one semantic source:

```ts
ReviewService.listPendingRevisions(...)
```

The Reviewer feature must not derive the queue through:

- AuthoringService,
- ContentRepository,
- direct Supabase table queries,
- direct RPC calls,
- local filtering of a broader content list.

The backend implementation already filters `content_revisions.status = 'pending_review'`; the UI consumes the service result instead of reimplementing that contract.

## 5. Review identity

Opening an item creates one stable review identity:

```text
reviewRevisionId
```

It is the exact revision selected from the pending queue.

Unlike Teacher Workspace, Reviewer Workspace does **not** split identity into `originRevisionId` and `workingRevisionId`, because review approval/rejection updates the existing revision state and records a review event; it does not create a successor revision.

No review action may silently substitute another revision id.

## 6. Reviewer state model

3-4 should use the smallest state model that preserves correctness:

```text
list_loading
list_ready
list_unavailable
review_detail
decision_in_flight
```

`decision_complete` is **not** a persistent screen state.

After a successful approve/reject result:

1. record a transient local success message,
2. close the detail view,
3. immediately call `ReviewService.listPendingRevisions(...)` again,
4. return to the refreshed queue.

The reviewed item disappears naturally because it is no longer `pending_review`.

### Refresh failure after a successful decision

A successful review decision must never be reclassified as failed merely because the subsequent queue refresh fails.

If review succeeds but refresh is unavailable:

```text
decision remains SUCCESSFUL
review action is NOT retried
UI moves to list_unavailable
success message remains visible
user may retry LIST refresh only
```

This prevents duplicate review decisions caused by conflating “decision failed” with “refresh failed”.

## 7. Approve payload is explicit

For approval, the UI contract is explicit:

```ts
reviewLessonRevision({
  revisionId: reviewRevisionId,
  decision: 'approve',
  note: null,
})
```

`note` is sent as `null` deliberately rather than omitted.

This matches the existing ReviewService normalization and repository contract, where approve with an empty note is normalized to `null` and the RPC receives `p_note: null`.

The UI must not reuse stale text from a previous reject note when approving.

## 8. Reject payload and local validation

For rejection, the UI first computes:

```text
normalizedReviewNote = reviewNote.trim()
```

If the result is empty:

```text
ZERO ReviewService.reviewLessonRevision calls
ZERO network review mutation
show a clear Arabic validation message
remain in review_detail
```

For a valid note:

```ts
reviewLessonRevision({
  revisionId: reviewRevisionId,
  decision: 'reject',
  note: normalizedReviewNote,
})
```

The service/backend `review_note_required` validation remains in place as defense in depth.

## 9. Commit-on-success for approve

Approve follows strict commit-on-success:

```text
pending A
 -> user confirms approve
 -> reviewLessonRevision(A, approve, null)
 -> result.status === 'approved'
 -> local success commit
 -> close detail
 -> refresh pending list
```

Before `status === 'approved'`, the UI must not:

- mark A approved,
- remove A as successfully reviewed,
- show a completed-success state,
- start a second decision for A.

A `rejected` or `unavailable` result leaves the review detail open and reviewable unless the response semantics require a queue refresh, such as a stale/non-reviewable revision.

## 10. Commit-on-success for reject

Reject follows the same rule:

```text
pending A
 -> valid note
 -> user confirms reject
 -> reviewLessonRevision(A, reject, note)
 -> result.status === 'rejected_by_reviewer'
 -> local success commit
 -> close detail
 -> refresh pending list
```

Before `status === 'rejected_by_reviewer'`, the UI must not present A as rejected or completed.

Failure leaves the local decision uncommitted.

## 11. Result identity check

For successful review results, the returned `revisionId` must match the active `reviewRevisionId` before the UI commits the decision locally.

```text
result.revisionId === reviewRevisionId
```

If a nominal success result contains a different revision id, the UI treats it as an unexpected/unavailable state rather than committing a decision for the wrong item.

For approve, `publishedEntityId` is retained as returned metadata but does not replace `reviewRevisionId` as the review-session identity.

## 12. Confirmation semantics

Approve and reject both require an explicit confirmation step before calling the service.

Cancelling confirmation means:

```text
ZERO reviewLessonRevision calls
no state transition to success
review detail remains open
```

For reject, empty-note validation occurs **before** confirmation so the user is not asked to confirm an invalid operation.

## 13. Immediate double-action protection

React state alone is insufficient for two synchronous clicks before rerender.

The mutation path must therefore have an immediate in-flight guard, for example:

```ts
reviewInFlightRef
```

The guard is set synchronously before the first `await` and cleared in `finally`.

It must prevent all concurrent combinations:

```text
approve + approve
reject + reject
approve + reject
reject + approve
```

The adversarial test must fire the second action before waiting for a rerender and assert exactly one service mutation.

## 14. Abort behavior

List loading must use `AbortSignal` and abort on unmount/reload replacement.

A review mutation may also receive an `AbortSignal`, but an aborted request must never be converted into a fake review success.

Abort errors are not displayed as raw infrastructure errors.

## 15. Error mapping

Reviewer UI must never expose raw Supabase/Postgres/RPC errors.

It consumes the existing typed result families.

The error map must be exhaustive at the TypeScript type level for the current `AuthoringRejectionReason` union:

```text
not_authenticated
not_authorized
invalid_payload
unit_not_available
lesson_not_available
source_revision_not_available
source_revision_mismatch
revision_not_editable
revision_not_submittable
revision_not_reviewable
invalid_decision
review_note_required
stale_revision
canonical_position_conflict
invalid_revision_id
```

And for all current unavailable reasons:

```text
network_error
service_unavailable
unknown
```

Some reasons are not expected from normal reviewer actions, but exhaustive mapping prevents a newly surfaced typed result from falling through to raw infrastructure text.

Reviewer-specific behavior must be explicit for at least:

```text
revision_not_reviewable
stale_revision
not_authorized
review_note_required
invalid_revision_id
```

## 16. Review history is explicitly out of 3-4A

The current `ReviewService` exposes only:

```text
listPendingRevisions
reviewLessonRevision
```

`listReviewEvents` currently belongs to `AuthoringService`, not `ReviewService`.

Therefore Reviewer Workspace must **not** import AuthoringService merely to display review history.

Review-event/history UI is excluded from 3-4A and from the first Reviewer Workspace implementation unless a future explicit phase expands the ReviewService contract.

This preserves service ownership instead of creating a cross-boundary shortcut.

## 17. No local mutation of revision content

Reviewer Workspace is a review surface, not an editor.

The revision payload is read-only.

3-4 must not call:

```text
createLessonRevision
saveLessonRevision
submitLessonRevision
```

Reviewer decisions go only through:

```text
reviewLessonRevision
```

## 18. Proposed implementation sequence

Phase 3-4 is split into:

```text
3-4A Reviewer Workspace Contract
3-4B Pending Review List
3-4C Review Detail + Approve/Reject
3-4D Authorization Composition
3-4E Local Closure & Verification
```

3-4A contains no production React implementation.

## 19. Expected future files

Later subphases may introduce a compact structure under:

```text
src/features/reviewer/workspace/
```

Possible files include:

```text
ReviewerWorkspace.tsx
ReviewerPendingList.tsx
ReviewerRevisionCard.tsx
ReviewerRevisionReview.tsx
useReviewerPendingRevisions.ts
useReviewerRevisionReview.ts
reviewer-workspace.types.ts
reviewer-workspace.utils.ts
index.ts
```

This list is descriptive, not a requirement to create every file. Files should be split only when they own a real responsibility.

## 20. Architecture guards required in implementation phases

Reviewer feature tests/guards must reject:

- direct Supabase access,
- direct authoring/review RPC names,
- imports of Supabase repository implementations,
- `author_id` / `reviewer_id` supplied by UI,
- inline role-based authorization,
- teacher mutation APIs inside reviewer feature code.

Authorization remains centralized.

## 21. Required test contract for 3-4B

Pending-list tests must cover:

1. loading -> success,
2. empty queue,
3. unavailable state,
4. retry,
5. abort/unmount,
6. exact service boundary: `ReviewService.listPendingRevisions`,
7. opening the exact selected revision,
8. no mutation from list/create/open actions.

## 22. Required test contract for 3-4C

### Approve

```text
pending A
 -> approve + confirm
 -> reviewLessonRevision({revisionId:A, decision:'approve', note:null})
 -> approved(A)
 -> refresh queue
```

Assertions must include the explicit `note: null` payload.

Failure path:

```text
review mutation fails
 -> no local approved state
 -> no fake successful removal
```

### Reject empty note

```text
pending A
 -> reject
 -> note = whitespace only
 -> ZERO reviewLessonRevision calls
```

### Reject valid note

```text
pending A
 -> reject + "  يحتاج تعديل  "
 -> confirm
 -> reviewLessonRevision({revisionId:A, decision:'reject', note:'يحتاج تعديل'})
 -> rejected_by_reviewer(A)
 -> refresh queue
```

### Review identity

A successful result for a different revision id must not commit a local success for the active revision.

### Double action

Two synchronous actions before rerender must produce exactly one service mutation.

The test matrix must include conflicting actions, not only duplicate identical actions.

### Successful decision + failed refresh

Test explicitly:

```text
review decision succeeds
 -> queue refresh fails
 -> decision remains recorded as successful
 -> UI shows list unavailable + retry
 -> mutation is NOT repeated
```

This is a separate failure domain from review mutation failure.

## 23. Critical reviewer invariant

The most important reviewer invariant is:

```text
pending revision A
 -> reviewer chooses decision for A
 -> exactly one reviewLessonRevision call for A
 -> local completion only after matching server success for A
```

For reject:

```text
empty note -> zero mutation calls
valid note -> reject A only
```

For approve:

```text
approve A -> note:null explicitly
```

No client code may manufacture reviewer/author identity or change the revision under review.

## 24. Out of scope

Phase 3-4 does not add:

- SQL or migrations,
- RLS changes,
- RPC definitions,
- Supabase schema changes,
- Teacher Workspace lifecycle changes,
- student/mastery changes,
- AI features,
- realtime subscriptions,
- notifications,
- rich-text editing,
- reviewer content editing,
- version-history UI,
- ReviewService history expansion,
- broad App refactoring.

## 25. Final acceptance criteria for Phase 3-4

Phase 3-4 will not close until implementation proves:

```text
Reviewer access through centralized capability       PASS
Pending list only through ReviewService              PASS
Exact reviewRevisionId preserved                     PASS
Approve sends explicit note:null                     PASS
Reject empty note blocked locally                    PASS
Reject note trimmed before service call              PASS
Approve commit-on-success                            PASS
Reject commit-on-success                             PASS
Successful decision separated from refresh failure   PASS
Returned revision identity checked                   PASS
Immediate double-action protection                   PASS
No direct infrastructure access                      PASS
No author_id/reviewer_id supplied by UI              PASS
No inline role authorization                         PASS
No reviewer content mutation                         PASS
Architecture guards                                  PASS
React tests                                          PASS
Lint                                                 PASS
Build                                                PASS
Prettier                                             PASS
git diff --check                                     PASS
HEAD == origin/main                                  PASS
working tree clean                                   PASS
```

Full Supabase verification remains deferred until explicitly resumed.

## 26. Gate to 3-4B

No Reviewer Workspace production component is created until this contract is reviewed and approved.

After approval, the next implementation package is:

```text
Phase 3-4B: Pending Review List
```

Its scope is read-only queue loading/navigation only. Approve/reject mutations remain out of 3-4B and begin in 3-4C.


## 24. Phase 3-4B implementation slice

Phase 3-4B implements only the read/navigation slice of this contract.

Included:

- `ReviewerWorkspace` shell.
- pending queue loading through `ReviewService.listPendingRevisions` only.
- loading, success, empty, unavailable, retry, thrown-error, and abort handling.
- opening the exact `LessonRevision` selected from the queue.
- an architecture guard for the Reviewer feature boundary.

Explicitly excluded from 3-4B:

- `reviewLessonRevision` calls,
- approve/reject controls,
- reject-note validation,
- decision confirmation,
- decision commit-on-success,
- decision refresh-after-success,
- Reviewer App composition.

These mutation semantics remain reserved for Phase 3-4C.
