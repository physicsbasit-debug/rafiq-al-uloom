# Phase 3-4D APPLY package

This is the changed-files-only APPLY package for **Unified Workspace Authorization Composition**, approved in external code review after the REVIEW candidate was inspected structurally and the architecture guard was executed independently.

## Baseline

Apply only on the repository state that contains the completed Phase 3-4A/B/C (+Fix1) baseline. The last confirmed clean commit before this phase was:

`4cf7a6726cb0eec366b4471f682fbe24075662c3`

## Production change

Only one existing production file is modified:

- `src/App.tsx`

The reviewed production bytes are preserved exactly in this APPLY package.

## New tests

- `tests/features/AppWorkspaceComposition.test.tsx`
- `tests/architecture/app-workspace-composition-contract.test.ts`

The reviewed test bytes are preserved exactly in this APPLY package.

## Documentation

- `docs/PHASE_3_4D_UNIFIED_WORKSPACE_AUTHORIZATION_COMPOSITION.md`

Only the document status was advanced from REVIEW CANDIDATE to REVIEW APPROVED / APPLY CANDIDATE.

## Expected Codespaces result

Baseline: 61 test files / 633 tests.
Added: 2 test files / 16 tests.
Expected: **63 test files / 649 tests**.

Run targeted tests first, then Prettier check, lint, build, full tests, diff check, and final Git cleanliness/hash verification.

Full Supabase verification remains deferred and is not part of this phase.
