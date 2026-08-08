# Phase 3-4B + 3-4C — Reviewer Workspace Queue + Review Decision

APPLY changed-files-only package. Architectural review is approved for both slices; execution / local verification in Codespaces is pending.

## Included scope

This cumulative package applies the still-unapplied 3-4B and the approved 3-4C together:

- pending-review queue loaded only through `ReviewService.listPendingRevisions`
- reviewer detail navigation using the exact selected `LessonRevision`
- approve/reject through `ReviewService.reviewLessonRevision`
- approve always sends `note: null`
- reject note is trimmed and blank notes are blocked before confirmation/network
- synchronous double-action protection via `reviewInFlightRef`
- commit-on-success only after expected success status and exact `result.revisionId` match
- successful decision is not repeated if the later queue refresh fails
- typed Arabic error mapping
- architecture guards and React tests

## Critical invariants

```text
pending A
  -> open exact A
  -> reviewRevisionId = A
  -> approve/reject(A)
  -> expected success status + result.revisionId === A
  -> local commit
  -> close detail
  -> reload pending list
```

If the reload fails after a successful review decision, retry reloads the list only and never repeats the review mutation.

## Baseline

Apply over the locally closed Phase 3-3 baseline at `caf6006`. Phase 3-4A is contract-approved. The executed baseline before applying 3-4B/3-4C is 589 passing tests across 56 files. The cumulative expected test count is 633, subject to actual Codespaces execution.

Full Supabase verification remains deferred by project decision.
