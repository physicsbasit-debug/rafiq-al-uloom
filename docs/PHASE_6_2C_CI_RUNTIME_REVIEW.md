# Phase 6-2C — CI Runtime Review + Phase 6-2 Closure

**Baseline:** `353b12a51f283856c326fa3e8dbbbb609948bbe0`
**Branch:** `phase-6-production-readiness`
**Scope:** CI runtime reliability only. No educational feature changes.

## Baseline evidence

Phase 6-2B closed on GitHub Actions Run `34178825223`:

- `Static / Core / Supply Chain` — SUCCESS.
- `Local Supabase Integration` — SUCCESS.
- Local Supabase integration baseline: 25 passed files + 3 skipped.
- 171 passed tests + 3 skipped.
- Post-suite auth/profile orphan invariant — PASS.

The earlier failed Run `34164873613` was traced to a cross-file test race and fixed in 6-2B Fix 2.

## Runtime review findings

### 1. Node runtime drift

The workflow used `node-version: '22.x'`.

The successful GitHub runner resolved this to `22.23.2`, but the patch release could drift later without a repository change.

**Decision:** pin both CI jobs to Node `22.23.2`.

### 2. Supabase CLI determinism

`package.json` already pins the Supabase CLI exactly to `2.110.0`, and CI uses `npm ci`.

The runtime verifier now also checks the installed CLI version explicitly before Docker startup.

All direct Supabase CLI calls in the integration helper use `npx --no-install`, so CI cannot silently download another CLI version.

### 3. Initial local-stack recovery

Successful and failed GitHub runs both showed transient registry messages such as `Rate exceeded`.

These messages do not imply a migration or application failure. Run #3 completed successfully despite them.

**Decision:** allow exactly two initial start attempts:

```text
start
→ if failure: stop partial stack
→ wait 5 seconds
→ one retry
→ fail if the retry also fails
```

No test retry is added. Persistent migration/configuration failures therefore remain failures.

### 4. Partial-start cleanup

Previously cleanup was armed only after `supabase start` returned successfully.

A partial Docker start followed by CLI failure could therefore leave local containers behind.

**Decision:** arm cleanup before the first start attempt. `trap cleanup EXIT` remains the final cleanup owner.

### 5. GoTrueClient integration isolation

The integration harness intentionally creates many Supabase clients.

They previously inherited the same default auth storage key, producing repeated:

```text
Multiple GoTrueClient instances detected in the same browser context
```

The helper now assigns a unique storage key per isolated client while keeping:

- `persistSession: false`
- `autoRefreshToken: false`
- `detectSessionInUrl: false`

This is test-harness isolation only. Production Auth architecture is unchanged.

### 6. Fix 1 — AI suggestion wait stabilization

The first full 6-2C Supabase gate exposed one flaky integration assertion in:

```text
tests/integration/supabase-ai-assisted-authoring-composition.integration.tsx
```

The test already waited up to 8 seconds for each AI request button to become enabled, but after clicking it the three waits for the resulting `استخدام الاقتراح` button used Testing Library's shorter default timeout.

Under the full parallel Supabase suite, one of those waits expired while the UI still showed `جارٍ إعداد الاقتراح...`.

The provider in this test is deterministic and local, so this was not a Gemini/network failure and no provider retry was added.

**Decision:** make all three `استخدام الاقتراح` waits explicit and consistent:

```ts
await screen.findByRole('button', { name: 'استخدام الاقتراح' }, { timeout: 8_000 });
```

The rerun then passed:

```text
Test Files  25 passed | 3 skipped (28)
Tests       171 passed | 3 skipped (174)
PASS: no auth users without profiles after integration suite
LOCAL SUPABASE CI GATE PASSED
```

The same run also no longer emitted the repeated GoTrueClient same-storage-key warning.

No whole-suite retry or per-test retry was introduced.

### 7. Fix 3 — Edge runtime readiness false positive exposed by GitHub Run #4

GitHub Actions Run `34384063440` on commit
`49219571e51227fbb070716a3868322d243954f0` produced:

- `Static / Core / Supply Chain` — SUCCESS.
- `Local Supabase Integration` — FAILURE.
- the non-live readiness probe had already reported PASS from an unauthenticated `401`;
- later, `supabase-ai-authoring-gateway.integration.ts` failed all 8 tests;
- the first authenticated boundary request received `502` instead of `403`;
- the remaining gateway requests timed out at the 5-second test timeout.

This sequence proved that the old readiness probe could accept a platform/Kong
`verify_jwt` response before the Edge Function runtime was demonstrably serving.
An unauthenticated `401` therefore verified JWT protection, but not the worker itself.

**Decision:**

1. keep JWT verification enabled;
2. wait for the pinned Supabase CLI runtime marker
   `Serving functions on http://127.0.0.1:54321/functions/v1/`;
3. only after that marker is present, accept the gateway `401` protection probe;
4. if the integration suite fails, print Edge process liveness and the last 120 lines
   of the Edge log before cleanup;
5. do not retry the integration suite or any failed test.

This change remains operational-only. It does not modify product behavior, migrations,
provider logic, production Auth, or live Gemini execution.

### 8. Supply-chain patch discovered during Fix 3 closure

Final static verification exposed the Vitest / `@vitest/mocker` security advisory
affecting the installed `4.1.10` release.

**Decision:**

1. update Vitest only from `4.1.10` to the patched `4.1.11` release;
2. allow the lockfile to update the matching Vitest package family and its resolved
   transitive dependency versions;
3. do not run broad `npm audit fix`;
4. require `npm audit` to return zero known vulnerabilities before closure;
5. rerun both the static and local Supabase CI gates under Vitest `4.1.11`.

Final local acceptance under Vitest `4.1.11`:

- targeted 6-2B + 6-2C architecture contracts: 20/20 PASS;
- core/unit suite: 1167/1167 PASS;
- Phase 6 architecture suite: 35/35 PASS;
- dependency audit: 0 vulnerabilities;
- local Supabase integration: 171 PASS + 3 intentionally skipped;
- post-suite auth/profile orphan invariant: PASS.

## Explicit deferrals

These are intentionally not changed in 6-2C:

- GitHub Action references (`actions/checkout@v6`, `actions/setup-node@v7`) remain major-version references.
  Commit-SHA provenance hardening belongs to **6-4 Production Security Hardening**.
- The Vite chunk-size warning remains deferred to **6-6 Performance + Delivery Readiness**.
- Live Gemini tests remain outside ordinary CI.
- Remote/production Supabase remains outside local CI and belongs to production deployment/UAT gates.

## Acceptance gate

Run:

```bash
npx --no-install prettier --check .
bash -n scripts/verify-ci-supabase.sh
npm run verify:ci-static
npm run verify:ci-supabase
git diff --check
```

Expected:

```text
STATIC CI GATE PASSED
LOCAL SUPABASE CI GATE PASSED
```

After local success:

1. perform the planned independent Cloud review of the 6-2C runtime decisions;
2. resolve any blocking review finding;
3. commit and push;
4. verify both GitHub Actions jobs on the exact new commit;
5. close Phase 6-2 only after no blocking finding remains.

## Phase 6-2 closure target

```text
6-2A Static/Core/Supply-chain CI       CLOSED
6-2B Local Supabase Integration CI     CLOSED
6-2C CI Runtime Review + Closure       CLOSED
------------------------------------------------
Phase 6-2 CI + Supply Chain            CLOSED
```

**NEXT after closure:** `6-3 — Runtime Resilience + Observability`
