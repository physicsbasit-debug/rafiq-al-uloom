# Phase 4-3D — Browser Gateway Provider Design

**Status:** DRAFT FOR INDEPENDENT REVIEW — NO IMPLEMENTATION AUTHORIZED YET  
**Baseline / Phase 4-3C freeze:** `c9d9c03e83cb113e762ffd1ee30f888a32e33658`  
**Phase 4-3C:** CLOSED / FROZEN

## 1. Goal

Phase 4-3D connects the existing teacher AI authoring UI to the already-frozen live AI Gateway:

```text
Teacher UI
→ existing useTeacherAiSuggestion
→ AiAuthoringProvider
→ GatewayAiAuthoringProvider
→ Supabase Edge / ai-authoring-gateway
→ Phase 4-3C live server provider
→ Gemini
→ validated AiGenerationResult
→ existing Suggestion Buffer
```

Phase 4-3D is a browser transport/composition phase only.

It does **not** change:

```text
Phase 4-1 AiGenerationRequest
Phase 4-1 AiGenerationResult
Phase 4-2 Suggestion Buffer
Phase 4-2 sequence/context guards
Phase 4-3A gateway boundary
Phase 4-3B quota semantics
Phase 4-3C Gemini adapter
AuthoringService
revision persistence
reviewer workflow
trusted publication
canonical content
provenance
```

No AI response may directly save, approve, publish, or mutate canonical/revision content.

---

## 2. Repository facts verified at the 4-3C freeze

The frozen `AiAuthoringProvider` contract remains:

```ts
export interface AiAuthoringProvider {
  generate(
    request: AiGenerationRequest,
    options?: AiGenerationOptions
  ): Promise<AiGenerationResult>;
}
```

`AiGenerationResult` still has exactly five statuses:

```text
success
invalid_output
rejected
unavailable
aborted
```

`AiGenerationOptions` already contains:

```ts
readonly signal?: AbortSignal;
```

`useTeacherAiSuggestion` already creates one `AbortController` for the current UI request and calls:

```ts
provider.generate(request, { signal: controller.signal });
```

It also treats provider identity as part of suggestion identity. Therefore the live browser provider instance must be stable and must not be reconstructed on every React render.

`TeacherWorkspace` already accepts an injected `AiAuthoringProvider`, but currently has a deterministic default. Phase 4-3D removes that silent production fallback: the composition root must provide the provider explicitly.

The public `AuthSession` type intentionally does **not** expose an access token. Phase 4-3D must not add one.

---

## 3. Provider location and dependency direction

Add:

```text
src/services/ai-authoring/gateway-ai-authoring.provider.ts
```

It lives beside the deterministic provider and implements the existing frozen `AiAuthoringProvider`.

The provider itself must not import:

```text
@supabase/supabase-js
getSupabaseClient
TeacherWorkspace
React
Gemini SDK
Gemini URLs
server provider code
```

Recommended dependency contract:

```ts
export interface GatewayAiAuthoringProviderDependencies {
  readonly gatewayUrl: string;
  readonly publicApiKey: string;
  readonly getAccessToken: () => Promise<string | null>;
  readonly fetchImpl?: typeof fetch;
}
```

### 3.1 Why `publicApiKey` is included

The existing live 4-3C integration path invokes the Supabase Edge Function with both:

```text
apikey: <Supabase browser publishable/anon key>
authorization: Bearer <user access token>
```

Therefore the browser adapter must preserve the actual Supabase relay contract when using direct `fetch`.

`publicApiKey` means only the browser-safe Supabase publishable/anon key already represented by:

```text
VITE_SUPABASE_ANON_KEY
```

It is **not**:

```text
GEMINI_API_KEY
service_role
Supabase secret key
```

No server secret enters this dependency object.

---

## 4. Composition point

The Supabase wiring belongs in the application composition root, not inside the provider and not inside the teacher feature.

Recommended production composition:

```text
src/App.tsx
```

Conceptually:

```ts
const provider = new GatewayAiAuthoringProvider({
  gatewayUrl: `${normalized VITE_SUPABASE_URL}/functions/v1/ai-authoring-gateway`,
  publicApiKey: VITE_SUPABASE_ANON_KEY,
  getAccessToken: async () => {
    const { data, error } = await getSupabaseClient().auth.getSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  },
});
```

The real implementation must keep the provider instance stable, for example with `useMemo` at the `App` composition root.

The callback reads the **current** session at generation time. It does not capture an old access token.

Supabase may refresh a session as part of its own `getSession()` behavior before the Gateway request. That is not a Gateway retry because no AI Gateway request has yet occurred.

### 4.1 No access token in application auth state

Do not change:

```text
src/services/auth/auth.types.ts
```

to expose `access_token`.

The raw token remains an infrastructure concern used only to build the outbound Authorization header.

### 4.2 No Supabase wiring in TeacherWorkspace

`TeacherWorkspace` receives:

```ts
readonly aiProvider: AiAuthoringProvider;
```

as an explicit dependency.

It must not call:

```text
supabase.auth.getSession()
getSupabaseClient()
functions.invoke()
fetch(ai-authoring-gateway)
```

The existing teacher-feature infrastructure guard remains valid.

---

## 5. Remove the silent deterministic production fallback

Current `TeacherWorkspace` has a module-level deterministic default provider.

Phase 4-3D should make `aiProvider` explicit/required for `TeacherWorkspace`.

Reason:

```text
missing production wiring
must not silently become
fake deterministic AI
```

The deterministic provider remains fully supported for tests and isolated deterministic scenarios, but only through explicit injection.

The production `App` must inject the Gateway provider.

Architecture tests must prove that the production composition path passes the Gateway provider to `TeacherWorkspace`.

---

## 6. Exact generate() algorithm

For one call:

```ts
generate(request, options);
```

the browser provider performs the following sequence.

### Step 1 — caller cancellation before work

If:

```text
options.signal?.aborted === true
```

return:

```ts
{ status: 'aborted', target: request.target }
```

No token read. No fetch.

### Step 2 — local request validation

Run the existing:

```text
validateAiGenerationRequest(request)
```

before reading the token or calling the network.

If invalid, return the existing frozen rejected result:

```text
status: rejected
reason: invalid_request
requestReason: ...
```

No Gateway call occurs.

This gives defense in depth and proves that only a valid `AiGenerationRequest` crosses the browser boundary.

### Step 3 — obtain current access token once

Call:

```text
getAccessToken()
```

exactly once.

If it:

```text
returns null
throws/fails
```

return:

```ts
{
  status: 'unavailable',
  target: request.target,
  reason: 'provider_unavailable'
}
```

unless the caller signal is now aborted, in which case return `aborted`.

### Step 4 — cancellation re-check

After token acquisition and immediately before `fetch`, check the caller signal again.

If aborted, return `aborted`.

No Gateway call occurs.

### Step 5 — exactly one fetch

Perform exactly one outbound Gateway call:

```text
POST <gatewayUrl>
```

Headers:

```text
Authorization: Bearer <current access token>
apikey: <browser-safe Supabase publishable/anon key>
Content-Type: application/json
```

Body:

```ts
JSON.stringify(request);
```

The body must contain only the validated `AiGenerationRequest`.

Recommended Fetch controls:

```text
signal: options.signal
cache: no-store
credentials: omit
redirect: error
```

There is:

```text
no browser timeout
no second AbortController
no automatic retry
no backoff
no token-refresh retry after a Gateway response
```

The server-owned 25-second provider timeout remains authoritative.

### Step 6 — fetch failure

If Fetch rejects and the supplied caller signal is aborted:

```text
→ aborted
```

Otherwise:

```text
→ unavailable / provider_unavailable
```

The provider does not expose raw transport errors.

### Step 7 — HTTP handling

Only the normal successful Gateway transport response is decoded as an `AiGenerationResult`.

For Phase 4-3D, every non-success Gateway HTTP result is folded into the frozen:

```ts
{
  status: 'unavailable',
  target: request.target,
  reason: 'provider_unavailable'
}
```

This includes currently relevant responses:

|          Gateway HTTP | Server meaning                                 | 4-3D browser result |
| --------------------: | ---------------------------------------------- | ------------------- |
|                   400 | boundary/request disagreement                  | `unavailable`       |
|                   401 | unauthenticated / expired session              | `unavailable`       |
|                   403 | forbidden / origin rejected                    | `unavailable`       |
|                   413 | request too large                              | `unavailable`       |
|                   415 | media contract disagreement                    | `unavailable`       |
|                   429 | teacher quota exhausted                        | `unavailable`       |
|                   502 | provider rejected / invalid transport response | `unavailable`       |
|                   503 | provider/auth/quota unavailable                | `unavailable`       |
|                   504 | server provider timeout                        | `unavailable`       |
| other unexpected HTTP | unknown transport failure                      | `unavailable`       |

This is deliberately less expressive than the server.

Phase 4-3D does **not** add:

```text
rate_limited
unauthenticated
provider_timeout
```

to the frozen domain union.

`retryAfterSeconds` from HTTP 429 is therefore not surfaced in 4-3D. A richer retry/countdown UX requires a separate explicit additive contract review.

### Step 8 — HTTP 200 domain result

Parse the JSON defensively.

Do not trust network JSON merely because it came from our own Edge Function.

Validate it against the frozen `AiGenerationResult` response contract and also require:

```text
result.target === request.target
success.meta.target === request.target
success suggestion kind matches request.target
all expected fields have valid runtime shapes
only the five frozen statuses are accepted
```

If the JSON is malformed or fails response-contract validation:

```text
→ unavailable / provider_unavailable
```

Do **not** convert malformed Gateway transport JSON into `invalid_output`.

`invalid_output` is reserved for a valid server-produced domain result where the AI provider candidate failed the existing server/domain output validator.

If the HTTP 200 body is a valid:

```text
success
invalid_output
rejected
unavailable
aborted
```

return it unchanged.

---

## 7. Browser response validator

Add a browser transport validator separate from the frozen 4-1 runtime contract, for example:

```text
src/services/ai-authoring/gateway-ai-authoring.response.ts
```

Recommended API:

```ts
type GatewayResultValidation =
  { readonly valid: true; readonly result: AiGenerationResult } | { readonly valid: false };

export function validateGatewayAiGenerationResult(
  request: AiGenerationRequest,
  value: unknown
): GatewayResultValidation;
```

The validator is transport-boundary code. It does not modify:

```text
AiGenerationResult
AiGenerationRequest
ai-authoring.runtime-contract.ts
```

It must reject:

```text
unknown status
sixth status
extra fields where the contract is exact
wrong target
wrong suggestion kind
wrong meta target
invalid reason literal
malformed success metadata
malformed question/text suggestion
```

This preserves the frozen domain while still implementing defensive network validation.

---

## 8. Cancellation semantics

The 4-2 UI already owns the caller `AbortController`.

Therefore the browser provider forwards:

```ts
options.signal;
```

directly to Fetch.

It must not create:

```text
a second AbortController
a browser 25s timeout
a retry controller
```

The existing 4-2 sequence/context guards remain the authoritative stale-response defense.

Browser cancellation is only a resource-usage optimization.

---

## 9. One-attempt policy

For every `generate()` call:

```text
getAccessToken: at most once
Gateway fetch: at most once
```

There is no automatic retry after:

```text
401
403
429
502
503
504
network failure
invalid Gateway response
```

In particular:

```text
401
→ do not refresh session and resend the AI request automatically
```

because that could create:

```text
double Gateway call
double quota reservation
double external-provider cost
```

A user may explicitly request another suggestion later, which becomes a new `generate()` call.

---

## 10. Exception boundary

`useTeacherAiSuggestion` currently awaits `provider.generate(...)` and expects an `AiGenerationResult`; it is not an exception-driven transport API.

Therefore expected operational failures must not escape the Gateway provider as unhandled exceptions.

The provider translates:

```text
token lookup failure
fetch network failure
response parse failure
invalid response shape
```

into the frozen result statuses described above.

Caller cancellation remains `aborted`.

No raw vendor/Supabase response body or error object is exposed to the teacher UI.

---

## 11. Security rules

Browser source must never contain or call:

```text
GEMINI_API_KEY
generativelanguage.googleapis.com
Gemini REST endpoint
service_role
SUPABASE_SERVICE_ROLE_KEY
server system instruction
responseJsonSchema
Gemini model selection
provider timeout configuration
provider tools
```

Browser may contain only:

```text
Supabase public URL
Supabase browser publishable/anon key
current user access token in memory for Authorization
AiGenerationRequest
Gateway public response
```

The access token must not be:

```text
logged
placed in React state
placed in localStorage by this phase
included in request body
included in an error object returned to UI
```

No `console.*` logging is needed inside the Gateway provider.

---

## 12. Stable provider identity

`useTeacherAiSuggestion` treats a provider identity change as invalidating AI suggestion state.

Therefore production composition must create the `GatewayAiAuthoringProvider` once per application instance.

Do not write:

```tsx
<TeacherWorkspace aiProvider={new GatewayAiAuthoringProvider(...)} />
```

inside a render path.

Use a stable instance, e.g. application-root `useMemo`, then pass it through:

```text
App
→ AppContent
→ TeacherWorkspace
→ TeacherLessonEditor
→ useTeacherAiSuggestion
```

---

## 13. Required tests

### 13.1 Provider unit tests

Must prove:

1. pre-aborted signal returns `aborted` with zero token lookups and zero fetches;
2. invalid request is rejected locally with zero token lookups and zero fetches;
3. current access token is requested once per `generate()`;
4. null token maps to `unavailable` with zero fetches;
5. token lookup failure maps to `unavailable`;
6. cancellation after token lookup but before fetch prevents fetch;
7. exactly one Gateway fetch occurs for a valid request;
8. body deep-equals the original valid `AiGenerationRequest` and contains no extra transport/provider fields;
9. request has `Authorization`, `apikey`, and JSON content type;
10. caller `AbortSignal` is the exact signal passed to Fetch;
11. no browser timeout/second controller exists;
12. network failure maps to `unavailable`;
13. caller abort during Fetch maps to `aborted`;
14. each non-200 status class maps to `unavailable`;
15. 429 performs no retry and no second token lookup;
16. 401 performs no retry and no second token lookup;
17. valid HTTP 200 `success` is returned;
18. valid HTTP 200 `invalid_output` remains `invalid_output`;
19. valid HTTP 200 `aborted` remains `aborted`;
20. malformed JSON / malformed result / wrong target maps to `unavailable`.

### 13.2 Response-validator tests

Must prove rejection of:

```text
unknown/sixth status
wrong target
wrong meta target
wrong suggestion kind
unexpected fields
invalid reason
malformed metadata
malformed question suggestion
```

and acceptance of all five legitimate frozen result branches.

### 13.3 Architecture tests

Add a dedicated 4-3D architecture guard, e.g.:

```text
tests/architecture/browser-ai-gateway-boundary.test.ts
```

It must prove:

1. browser AI source contains no Gemini API key reference;
2. browser AI source never contains/calls `generativelanguage.googleapis.com`;
3. no Service Role enters browser AI composition;
4. Gateway provider does not import Supabase;
5. teacher feature does not import Supabase or Gateway transport directly;
6. browser request cannot send provider/model/prompt/timeout/schema controls;
7. only `AiGenerationRequest` is serialized as the body;
8. no automatic retry loop exists;
9. no second AbortController/browser timeout enters the provider;
10. production `App` composes a stable Gateway provider and passes it to `TeacherWorkspace`;
11. deterministic provider is not the silent production default;
12. Suggestion Buffer remains the landing zone;
13. no AI path calls Authoring RPCs/publication;
14. `AiGenerationResult` remains exactly five statuses.

### 13.4 Existing regression suites

Run:

```text
Prettier
Lint
Build
targeted 4-3D tests
full basic tests
existing Supabase integration suite
```

Phase 4-3D itself does not require `GEMINI_API_KEY`.

The real browser → local Edge → live Gemini end-to-end acceptance remains Phase 4-3E.

---

## 14. Proposed implementation scope

Expected files only:

```text
A  docs/PHASE_4_3D_BROWSER_GATEWAY_PROVIDER_DESIGN.md
A  src/services/ai-authoring/gateway-ai-authoring.provider.ts
A  src/services/ai-authoring/gateway-ai-authoring.response.ts
M  src/services/ai-authoring/index.ts
M  src/App.tsx
M  src/features/teacher/workspace/TeacherWorkspace.tsx
A  tests/services/ai-authoring/gateway-ai-authoring.provider.test.ts
A  tests/architecture/browser-ai-gateway-boundary.test.ts
M  tests/features/teacher/TeacherWorkspace.test.tsx
M  tests/features/AppWorkspaceComposition.test.tsx
M  tests/features/auth/AppAuthFlow.test.tsx
M  tests/features/auth/AppAuthorizationGuard.test.tsx
```

No SQL.

No Edge Function change.

No Gemini adapter change.

No quota change.

No auth-domain type change.

No provenance change.

No package dependency change.

If implementation proves one listed test file does not require modification, it should remain untouched rather than be changed merely to match this estimate.

---

## 15. Explicitly deferred

Not part of 4-3D:

```text
retryAfterSeconds UI
distinct browser auth-expired result
distinct browser provider-timeout result
automatic token refresh + AI resend
production CORS expansion
remote Supabase deployment
provenance persistence
AI security final closure
browser-to-live-Gemini E2E
```

Those require their own reviewed phase or belong to 4-3E / 4-4 / 4-5 / 4-6.

---

## 16. Acceptance condition

Phase 4-3D may be implemented only after independent review confirms:

```text
the frozen five-status domain remains unchanged
the browser provider is Supabase-implementation-neutral through injection
the actual Supabase relay headers are preserved
the production composition cannot silently fall back to deterministic AI
one generate() means at most one Gateway call
caller cancellation uses the existing signal only
HTTP 200 is defensively validated
all transport failures fit the frozen result without exceptions/retries
no browser secret/provider capability regression exists
```

After design approval, implementation proceeds as one narrow package against:

```text
c9d9c03e83cb113e762ffd1ee30f888a32e33658
```
