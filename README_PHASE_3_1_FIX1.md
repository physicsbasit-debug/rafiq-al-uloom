# Phase 3-1 Fix 1 — Clean UUID capture in workflow integration test

## Scope

This fix changes only the Phase 3-1 workflow integration test harness. It does not modify production SQL, RLS, RPCs, Auth, repositories, UI, or any frozen v0.5 contract.

## Root cause

`psqlAdmin()` invokes `psql -At`. For a top-level `INSERT ... RETURNING id`, psql can emit both the returned UUID and the command tag `INSERT 0 1`. The Phase 3-1 workflow test assigned the full stdout to `historicalAttemptId`, so the next SQL cast received a polluted value such as:

```text
<uuid>\nINSERT 0 1
```

The migration itself had already applied successfully and the 15 bypass tests passed.

## Fix

The fixture insert is now expressed as a data-modifying CTE whose top-level statement is `SELECT`:

```sql
WITH inserted_attempt AS (
  INSERT ...
  RETURNING id
)
SELECT id FROM inserted_attempt;
```

This preserves the real insert and returns only the tuple value expected by the existing `psqlAdmin()` contract, without changing the shared helper.

## Why the shared helper is not changed

`tests/integration/helpers/supabase-auth-fixtures.ts` predates Phase 3-1 and is used by the frozen Auth/Supabase test suite. Changing its global stdout behavior merely to satisfy one new fixture would enlarge the regression surface for no architectural benefit.

## Acceptance

After applying this fix from a clean local Supabase start:

1. Phase 3-1 targeted tests must pass 22/22.
2. The full basic suite must retain 508/508 or higher.
3. The full Supabase suite must retain the existing 89 tests plus the 22 Phase 3-1 tests as discovered by the test configuration.
4. Build, lint, Prettier, git diff check, working-tree cleanliness, and HEAD/origin synchronization must pass.
