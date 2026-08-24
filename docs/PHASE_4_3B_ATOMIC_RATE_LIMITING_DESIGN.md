# Phase 4-3B — Server-side Atomic Rate Limiting

**Status:** APPROVED — Implementation Authorized
**Baseline:** `83d3fd7dacc2f8b147d0a7df5ca290bb10f66f87`
**Previous phase:** Phase 4-3A — CLOSED / FROZEN

## 1. Scope

Phase 4-3B introduces server-side quota enforcement for AI authoring requests before any live AI provider is connected.

This phase does **not** add:

- a live AI provider;
- AI API keys;
- browser-side quota logic;
- provenance persistence;
- canonical content writes;
- revision writes;
- review or publication changes;
- service-role use inside the AI Gateway.

The only intended runtime addition is an atomic, server-authoritative quota decision between validated requests and provider invocation.

## 2. Required request path

```text
platform verify_jwt
→ request/body/content guards
→ active-teacher authorization
→ JSON parsing
→ strict AiGenerationRequest validation
→ consume_ai_authoring_quota()
→ provider invocation
```

Quota evaluation happens **after request validation** and **before provider invocation**.

Invalid requests do not consume quota.

## 3. Private quota state

Internal table:

```text
private.ai_authoring_quota_state
```

One row per user:

```text
user_id                    PK + FK → public.profiles.id
burst_window_started_at    timestamptz
burst_count                integer
daily_window_started_at    timestamptz
daily_count                integer
updated_at                 timestamptz
```

The table stores counters and timestamps only. It stores no prompts, lesson content, AI output, revision ids, or model responses.

No application role receives direct table access.

## 4. RPC contract and authorization response

The only application RPC is:

```text
public.consume_ai_authoring_quota()
```

It has **zero parameters**.

Identity comes only from:

```sql
auth.uid()
```

The function rechecks the live authoritative profile:

```text
role = teacher
AND
status = active
```

The implementation distinction requested at final design review is frozen as follows:

```text
authenticated caller whose live profile is not active-teacher
→ RPC structured result:
  allowed = false
  limit_reason = unauthorized
→ Gateway maps it to HTTP 403
```

This is intentionally distinct from quota exhaustion:

```text
quota exhausted
→ HTTP 429
```

and quota infrastructure failure:

```text
RPC/network/malformed quota response
→ HTTP 503 quota_unavailable
```

The RPC accepts no client-supplied user id, role, status, limit, window, timestamp, or quota policy value.

## 5. Atomicity

The first-use pattern is mandatory:

```sql
INSERT INTO private.ai_authoring_quota_state (...)
VALUES (...)
ON CONFLICT (user_id) DO NOTHING;
```

followed immediately by:

```sql
SELECT ...
FROM private.ai_authoring_quota_state
WHERE user_id = auth.uid()
FOR UPDATE;
```

The forbidden pattern is:

```text
SELECT to check existence
→ conditional INSERT
```

because two concurrent first requests can both observe no row.

The locked transaction then:

```text
server time
→ lazy resets if required
→ quota decision
→ increment both counters only when allowed
→ return decision
```

## 6. Window semantics

Burst policy is a **Fixed Window**, not a rolling/sliding window.

Phase 4-3B local value:

```text
6 attempts / 60 seconds
```

The fixed-window boundary burst tradeoff is explicitly accepted for this stage.

Daily policy is a UTC calendar day with **lazy reset** inside the same RPC transaction.

Phase 4-3B local value:

```text
80 attempts / UTC calendar day
```

There is no `pg_cron`, background reset job, or browser timer.

These numeric values are operational for the local fake-provider stage and must be reviewed again before a live provider is connected.

## 7. Server time

Quota timing is derived only from PostgreSQL server time using:

```sql
clock_timestamp()
```

The browser never supplies quota or reset time.

Server time is re-read after acquiring the per-user row lock so lock wait time cannot make the decision stale.

## 8. Consumption semantics

Before quota reservation:

```text
unauthorized / malformed / invalid request
→ no quota consumed
```

After a successful quota reservation:

```text
counters increment atomically
→ provider invocation follows
```

A committed reservation is not refunded, including later provider timeout, network failure, rejection, invalid provider output, or worker termination.

## 9. Privileges

```text
private.ai_authoring_quota_state
PUBLIC         no direct access
anon           no direct access
authenticated  no direct access
service_role   no direct access

public.consume_ai_authoring_quota()
PUBLIC         no execute
anon           no execute
authenticated  execute only
service_role   no execute
```

The RPC is:

```text
SECURITY DEFINER
SET search_path = ''
```

The Gateway calls it with the authenticated user's JWT and Supabase public/publishable key.

`SUPABASE_SERVICE_ROLE_KEY` remains forbidden in the Gateway.

## 10. Failure semantics

Quota exhaustion:

```text
HTTP 429
error = rate_limited
Retry-After = server-derived seconds
```

Quota infrastructure failure:

```text
HTTP 503
error = quota_unavailable
```

The Gateway fails closed and never reaches the provider if quota status cannot be established.

## 11. Required verification

Implementation verification covers:

- active teacher;
- student/reviewer/pending/suspended denial;
- anon/service-role direct RPC denial;
- zero-parameter RPC contract;
- no direct private table privileges;
- first-use concurrency;
- existing-row concurrency;
- per-user isolation;
- fixed-window lazy reset;
- UTC daily lazy reset;
- exhausted quota does not increment counters;
- invalid request does not consume quota;
- Gateway 429 + Retry-After;
- quota adapter fail-closed behavior;
- architecture ordering and Service Role guards.

## 12. Edge Runtime Session Stability

Observation retained:

```text
Edge Runtime Session Stability — Observation / Revalidation Required
```

A reused local `functions serve` session previously showed a body-write/hang condition under one test sequence, while a fresh normal `verify_jwt` session with a valid teacher JWT and the exact 41,168-byte body returned deterministic `413`.

This remains an observation, not a confirmed Supabase bug or production defect. It does not reopen Phase 4-3A.
