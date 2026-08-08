# Phase 3-4B — Pending Review List

Review package only. Do not upload to GitHub before architectural review.

## Scope

This slice implements the reviewer queue shell and read/navigation behavior only:

- `ReviewerWorkspace`
- `ReviewerPendingList`
- `ReviewerRevisionCard`
- `useReviewerPendingRevisions`
- reviewer workspace types/utilities
- React tests for list/loading/error/retry/abort/navigation
- architecture guard for the reviewer client boundary

## Source boundary

The queue is loaded exclusively through:

```text
ReviewService.listPendingRevisions
```

The Reviewer feature does not import or use `AuthoringService`, repositories, Supabase, or RPC names.

## Explicitly not in 3-4B

- approve
- reject
- review note
- confirmation
- `reviewLessonRevision`
- App composition
- SQL/RLS/RPC changes

Those belong to 3-4C/3-4D.

## Baseline

Built conceptually on the locally closed Phase 3-3 baseline at `caf6006` with 589 passing tests across 56 files. Full Supabase verification remains deferred.
