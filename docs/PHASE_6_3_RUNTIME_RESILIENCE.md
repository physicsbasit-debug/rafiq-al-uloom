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

The first production gap is above those paths: the application root has no React
error boundary and no central browser runtime diagnostic capture for uncaught `error`
or `unhandledrejection` events.

Additional later 6-3 gaps:

- existing Auth/Profile/Authoring diagnostic hooks are not yet wired to one runtime
  reporter;
- client-side query/auth/authoring/AI paths do not yet share one bounded timeout policy;
- some query UI can receive repository error messages that are more technical than the
  production-facing message should be;
- Edge requests do not yet carry a correlation/reference identifier across the browser
  and gateway logging boundary.

## Delivery slices

### 6-3A — Global runtime safety

This slice adds:

1. a metadata-only runtime diagnostic contract;
2. a top-level React error boundary;
3. global browser capture for uncaught `error` and `unhandledrejection`;
4. a safe Arabic crash fallback with a non-secret reference identifier;
5. tests that prevent raw exception messages, stacks, credentials, or request payloads
   from entering the runtime diagnostic event;
6. no external telemetry vendor.

The default sink writes only the bounded metadata event to the browser console. It does
not serialize the original exception. A later production telemetry sink can replace this
boundary without changing product code.

### 6-3B — Safe async boundary + client timeouts

Planned after 6-3A acceptance:

- introduce one composable client timeout/cancellation primitive;
- keep manual user retry for reads;
- do not add blind automatic retry to writes;
- map technical repository failures to safe public messages while retaining diagnostic
  categories internally.

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

Required before commit:

- targeted runtime unit tests PASS;
- Phase 6-3 architecture contract PASS;
- full static CI gate PASS;
- `npm audit` remains at zero known vulnerabilities;
- `git diff --check` clean;
- no migrations, production Auth policy, educational behavior, or live Gemini execution
  changed.
