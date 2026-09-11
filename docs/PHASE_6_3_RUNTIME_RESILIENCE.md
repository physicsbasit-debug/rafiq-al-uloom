# Phase 6-3 — Runtime Resilience + Observability

Baseline commit:

`a35804c4de732d6414446c2cba6b085ecc6179fa`

Phase 6-2 is closed. Phase 6-3 is operational-only and must not change educational
behavior, migrations, production authorization rules, or live-provider policy.

## Audit findings

The current codebase already has several strong resilience foundations:

- `useAsyncQuery` owns an `AbortController`, rejects stale request versions, and avoids
  writes after unmount.
- content repository requests propagate `AbortSignal` into Supabase queries.
- teacher AI suggestion requests cancel superseded work and reject stale completions.
- mastery-result persistence reuses one submission identifier across an explicit retry,
  preserving the existing idempotent submission contract.
- the live Gemini server provider already enforces a 25-second provider timeout,
  distinguishes caller abort from provider timeout, and performs one provider transport
  attempt only.

The first production gap was above those paths: the application root had no React
error boundary and no central browser runtime diagnostic capture for uncaught `error`
or `unhandledrejection` events.

Additional 6-3 gaps after 6-3A:

- existing Auth/Profile/Authoring diagnostic hooks are not yet wired to one runtime
  reporter;
- client-side query/authoring/AI paths do not yet share one bounded timeout policy;
- some query UI can receive repository error messages that are more technical than the
  production-facing message should be;
- Edge requests do not yet carry a correlation/reference identifier across the browser
  and gateway logging boundary.

## Delivery slices

### 6-3A — Global runtime safety

Closed on commit:

`f48752876e0adf61bf6f3a9724b7ff4fe778f09c`

GitHub Actions run:

`34613773594`

The slice added:

1. a metadata-only runtime diagnostic contract;
2. a top-level React error boundary;
3. global browser capture for uncaught `error` and `unhandledrejection`;
4. a safe Arabic crash fallback with a non-secret reference identifier;
5. tests that prevent raw exception messages, stacks, credentials, or request payloads
   from entering the runtime diagnostic event;
6. no external telemetry vendor.

Both `Static / Core / Supply Chain` and `Local Supabase Integration` passed on the exact
6-3A commit.

### 6-3B — Safe async boundary + client timeouts

This slice adds one client-side async boundary used only where cancellation is safe:

- content reads use a 15-second deadline while retaining the existing request-version,
  unmount, and caller cancellation guards;
- browser AI Gateway transport uses a 30-second deadline, intentionally above the
  existing 25-second Edge provider timeout;
- caller cancellation and timeout remain distinct categories;
- a timeout settles even when an underlying read ignores `AbortSignal`;
- AI timeout aborts the browser transport itself rather than merely abandoning the
  response;
- technical query causes remain available internally, while `QueryBoundary` maps them
  to bounded Arabic production messages;
- explicit user retry remains unchanged;
- no automatic retry is added to reads or writes;
- Auth operations are intentionally not wrapped in a naïve `Promise.race`, because an
  uncancellable authentication mutation could otherwise finish after the UI reports a
  timeout and create a ghost session/state transition.

6-3B does not change migrations, Edge Functions, authorization policy, educational
behavior, the live Gemini server timeout, or provider retry policy.

### 6-3C — Diagnostic wiring

Planned after 6-3B acceptance:

- route existing Auth/Profile/Authorization/Authoring diagnostic hooks into the runtime
  reporter;
- preserve public-safe error contracts;
- avoid user identifiers, tokens, bodies, lesson text, and provider payloads in logs.

### 6-3D — Edge correlation + safe logging

Planned after 6-3C acceptance:

- add request/reference correlation across browser and Edge gateway;
- log bounded operational categories only;
- retain the existing provider timeout and no-retry policy.

## 6-3A acceptance

Completed:

- targeted runtime unit tests PASS;
- Phase 6-3 architecture contract PASS;
- full static CI gate PASS;
- `npm audit` at zero known vulnerabilities;
- `git diff --check` clean;
- GitHub Actions static and local Supabase integration jobs PASS;
- no migrations, production Auth policy, educational behavior, or live Gemini execution
  changed.

## 6-3B acceptance

Required before commit:

- client async-boundary unit tests PASS;
- query timeout and safe-public-message tests PASS;
- AI browser transport timeout test PASS with exactly one fetch attempt;
- existing AI caller-cancellation tests remain PASS;
- Phase 6-3 architecture contract PASS;
- full static CI gate PASS;
- `npm audit` remains at zero known vulnerabilities;
- `git diff --check` clean;
- no migrations, Edge Functions, Auth mutations, educational behavior, or live Gemini
  execution changed.
