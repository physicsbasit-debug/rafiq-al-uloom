# Phase 4-3E — Browser Adapter → Edge Gateway → Live Gemini E2E

**Status:** DESIGN FOR INDEPENDENT REVIEW — NO IMPLEMENTATION YET  
**Frozen baseline:** `fb483e23687365331b8d7f78621234eccd8fc2ef`  
**Phase 4-3D:** CLOSED / FROZEN / Claude APPROVED

## 1. Goal

Phase 4-3E is the live acceptance closure for the transport chain introduced across 4-3A through 4-3D.

It must prove, in one real local-Supabase live-Gemini request:

```text
GatewayAiAuthoringProvider
→ current authenticated teacher session
→ Supabase Edge / ai-authoring-gateway
→ active-teacher authorization
→ atomic quota reservation
→ live Gemini server provider
→ strict server validation
→ HTTP 200 AiGenerationResult
→ browser transport response validation
→ final AiGenerationResult returned to the caller
```

This phase is intentionally **acceptance/integration only**.

It does not redesign or extend:

- `AiGenerationRequest`
- `AiGenerationResult`
- Suggestion Buffer
- teacher form/application semantics
- auth types
- quota policy
- Gemini adapter
- reviewer/publish flow
- canonical/revision persistence
- provenance

No AI output may directly save, approve, publish, or mutate canonical/revision content.

---

## 2. Repository facts at the frozen 4-3D baseline

### 2.1 Browser adapter is already production-wired

`src/App.tsx` creates one stable `GatewayAiAuthoringProvider` with `useMemo(..., [])`.

Its `getAccessToken` reads the current session through:

```ts
getSupabaseClient().auth.getSession();
```

The raw access token is not added to public `AuthSession`.

### 2.2 Browser provider transport contract is already frozen

`GatewayAiAuthoringProvider.generate()`:

1. honors caller abort before work,
2. validates request locally,
3. reads access token once,
4. rechecks abort,
5. performs exactly one `fetch`,
6. sends `authorization`, `apikey`, and JSON only,
7. has no retry,
8. has no browser timeout,
9. has no second `AbortController`,
10. folds non-200 transport failures to frozen `unavailable`,
11. validates HTTP 200 JSON defensively before returning it.

### 2.3 Gateway path is already frozen

The Edge gateway:

- enforces origin policy,
- accepts POST/OPTIONS,
- enforces 32 KiB body ceiling,
- verifies active teacher authorization,
- validates request,
- reserves quota atomically,
- invokes live server provider,
- maps valid domain results to HTTP 200,
- maps timeout/unavailable/rejected transport conditions to 504/503/502.

### 2.4 Existing 4-3C live test is direct server-boundary coverage

`tests/integration/supabase-ai-authoring-live-provider.integration.ts`
currently calls the Edge endpoint using `fetch(...)` directly.

That proves:

```text
test → Edge → Gemini
```

but does **not** prove the new 4-3D browser provider layer.

4-3E must keep the 4-3C smoke unchanged and add a separate browser-adapter live test.

---

## 3. Proposed implementation scope

Add exactly:

```text
docs/PHASE_4_3E_BROWSER_EDGE_LIVE_GEMINI_E2E_DESIGN.md
tests/integration/supabase-ai-authoring-browser-gateway-live.integration.ts
```

Optionally add one package script only if independent review considers it materially useful:

```json
"test:ai-authoring-browser-live": "RUN_SUPABASE_INTEGRATION_TESTS=true RUN_LIVE_GEMINI_TESTS=true vitest run --config vitest.supabase.config.ts tests/integration/supabase-ai-authoring-browser-gateway-live.integration.ts"
```

Preferred minimal scope is **two files only** and invoking Vitest explicitly from the verification runner, avoiding a package.json change.

No production source file should change unless the new acceptance test exposes a real defect.

---

## 4. Test gating

The live test must remain opt-in:

```ts
const liveEnabled =
  process.env.RUN_SUPABASE_INTEGRATION_TESTS === 'true' &&
  process.env.RUN_LIVE_GEMINI_TESTS === 'true';
```

When either flag is absent:

- the test is skipped,
- the normal `npm test` suite remains deterministic,
- the normal `npm run test:supabase` suite may continue to report the live test as skipped.

The live test must not silently enable Gemini access.

---

## 5. Live test identity

Use the existing real local Supabase fixture stack:

```text
readLocalSupabaseEnvironment()
SupabaseAuthFixtures
createIdentity(..., 'teacher', 'active')
```

Create exactly one temporary active teacher.

Before the live call, clear only that fixture user's quota row:

```sql
DELETE FROM private.ai_authoring_quota_state
WHERE user_id = <fixture teacher id>;
```

Cleanup must delete the temporary auth user using the existing fixture cleanup path.

No persistent test account is introduced.

---

## 6. Browser-provider construction inside the integration test

Construct the real production class:

```ts
new GatewayAiAuthoringProvider({
  gatewayUrl: `${env.apiUrl}/functions/v1/ai-authoring-gateway`,
  publicApiKey: env.publishableKey,
  getAccessToken: async () => {
    tokenReadCount += 1;

    const { data, error } = await teacher.client.auth.getSession();
    if (error) return null;

    return data.session?.access_token ?? null;
  },
});
```

Important:

- do not use `teacher.accessToken` directly as the provider dependency,
- use the fixture's real publishable-key Supabase client and `auth.getSession()`,
- this mirrors the production composition principle from `App.tsx`,
- the test must not import or use service-role credentials in provider construction,
- service role remains only inside test-fixture administration.

Assert:

```text
tokenReadCount === 1
```

for the single valid generation call.

---

## 7. Exactly one live AI call

The acceptance test should perform **one** valid live Gemini generation only.

Recommended target:

```text
objective
```

Recommended Arabic context:

```json
{
  "target": "objective",
  "context": {
    "language": "ar",
    "gradeLabel": "الصف العاشر",
    "subjectLabel": "الفيزياء",
    "unitTitle": "الموجات",
    "lessonTitle": "الانعكاس"
  }
}
```

Reasons for one call:

- proves the complete transport chain,
- minimizes provider cost,
- minimizes live-test flakiness,
- stays far below burst quota,
- avoids turning acceptance into a provider benchmark.

Do not call all four target types live in this phase. Their structural behavior is already covered deterministically.

---

## 8. Required assertions

The live result must satisfy all of the following:

```text
status === success
target === objective
suggestion.kind === objective
suggestion.text is a non-empty string
meta.target === objective
meta.providerFamily === google_gemini
meta.modelLabel === gemini-3.5-flash
```

The test should additionally assert that the response has passed the actual browser transport validator simply by virtue of being returned by `GatewayAiAuthoringProvider.generate()`.

Do not reimplement a second response validator inside the integration test.

### 8.1 Arabic acceptance

Do not require an exact sentence.

Require only:

- non-empty generated objective text,
- and preferably presence of at least one Arabic Unicode character.

Example semantic-light check:

```ts
expect(/[\u0600-\u06FF]/u.test(result.suggestion.text)).toBe(true);
```

This avoids brittle wording assertions while still proving Arabic output.

---

## 9. Quota proof

After the successful live call, query the private quota row through the existing administrative test helper only.

Assert:

```text
burst_count === 1
daily_count === 1
```

for that freshly cleared fixture identity.

This proves the successful path traversed the frozen 4-3B reservation point exactly once.

The assertion is not used as a provider retry detector by itself; the browser provider's deterministic unit tests already prove one-fetch semantics. It is an end-to-end path confirmation.

---

## 10. No direct fetch in the 4-3E test

The new test must not call:

```ts
fetch(`${env.apiUrl}/functions/v1/ai-authoring-gateway`, ...)
```

directly.

That is 4-3C coverage.

The only live Gateway call in 4-3E must originate inside:

```text
GatewayAiAuthoringProvider.generate()
```

This is the central acceptance criterion of the phase.

An architecture/static test may be added only if needed to enforce this, but preferred scope is to keep implementation minimal and rely on independent source review plus the integration test itself.

---

## 11. No UI-save assertion in this phase

4-3E proves the live transport chain, not the already-frozen 4-2 form semantics.

Do not expand the phase into browser DOM automation merely to re-prove:

- Suggestion Buffer isolation,
- Accept,
- Apply,
- Save,
- reviewer submission.

Those are already covered by 4-2 tests.

Why:

- the new risk introduced by 4-3D is the browser network adapter,
- requiring a Playwright/browser dependency would enlarge the dependency and infrastructure surface without improving proof of the new transport contract proportionally.

A real UI manual acceptance may be recorded as a non-code smoke after automated closure, but it should not be required to freeze 4-3E unless independent review identifies a specific untested composition risk.

---

## 12. Security invariants

The 4-3E test must prove or preserve:

1. no Gemini key in browser/test provider dependencies,
2. no service-role key passed to `GatewayAiAuthoringProvider`,
3. browser publishable/anon key only,
4. teacher bearer session only,
5. live active-teacher authorization remains server-owned,
6. quota remains server-owned,
7. one browser Gateway attempt,
8. no retry,
9. no direct canonical/revision write,
10. no AI publication/approval path.

The live Gemini secret remains available only to the local Edge function process.

Do not print `GEMINI_API_KEY` in logs.

---

## 13. Verification runner contract

A Phase 4-3E runner should:

1. verify exact frozen baseline:
   `fb483e23687365331b8d7f78621234eccd8fc2ef`
2. verify clean worktree before apply,
3. apply the small implementation package,
4. run Prettier,
5. run `git diff --check`,
6. run targeted deterministic browser-provider tests,
7. run lint,
8. run build,
9. run full basic suite,
10. ensure local Supabase is running,
11. start a fresh `ai-authoring-gateway` Edge session with normal `verify_jwt`,
12. run full Supabase suite without live flag and confirm live tests remain skipped,
13. verify `GEMINI_API_KEY` exists without printing its value,
14. run only the 4-3E live test with both opt-in flags,
15. confirm exact changed-file scope,
16. emit a final marker:

```text
PHASE_4_3E_LIVE_E2E_VERIFY=PASS
```

### 13.1 Gemini secret check

Use a presence-only check.

Allowed:

```text
PASS: GEMINI_API_KEY is present
```

Forbidden:

```text
GEMINI_API_KEY=<actual value>
```

---

## 14. Expected test counts

Do not freeze hard-coded global test counts into the design as an invariant.

The runner should report the observed counts.

The required semantic gates are:

- all targeted tests pass,
- all basic tests pass,
- full Supabase non-live suite passes with live tests skipped,
- one 4-3E live browser-adapter test passes,
- lint/build pass,
- exact scope pass.

This avoids future count drift becoming a false regression.

---

## 15. Failure interpretation

### Live test returns `unavailable`

Investigate, in order:

1. local Edge process readiness,
2. teacher session availability,
3. verify_jwt path,
4. teacher active profile,
5. quota,
6. Gemini secret presence,
7. provider HTTP mapping,
8. server provider response.

Do not immediately weaken browser or server validation.

### Live test returns `invalid_output`

This means the transport is healthy and the live server returned a valid domain result indicating the Gemini candidate failed the frozen output contract.

That is a provider-quality acceptance failure, not a browser transport failure.

Do not convert it to success.

### 429

A fresh fixture quota row should prevent this. If it occurs, treat it as a setup/identity defect and inspect the fixture/quota state.

---

## 16. Freeze criteria

Phase 4-3E may be declared CLOSED/FROZEN only when:

```text
independent design review: APPROVED
implementation review: APPROVED
targeted browser-provider deterministic tests: PASS
lint: PASS
build: PASS
full basic suite: PASS
full Supabase non-live suite: PASS
4-3E live browser-adapter → Edge → Gemini test: PASS
exact changed-file scope: PASS
no secret leakage: PASS
```

The 4-3C direct-fetch live smoke remains in the repository unchanged.

---

## 17. What Phase 4-3E does not prove

It does not claim:

- semantic excellence of every Gemini response,
- all four target types live,
- production-cloud deployment,
- browser DOM automation,
- high-load quota behavior,
- provenance persistence.

Those belong to their existing deterministic tests or later phases.

4-3E has one precise job:

> prove that the newly frozen browser AI provider can use a real authenticated teacher session to traverse the real local Edge gateway and return a strictly validated live Gemini result without bypassing auth, quota, or the frozen domain contract.
