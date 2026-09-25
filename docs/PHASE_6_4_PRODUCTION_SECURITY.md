# Phase 6-4 — Production Security Hardening

Baseline commit:

`10d37e25e9346e17b88a0f653113f170b2bd70ba`

Phase 6-3 is closed. Phase 6-4 hardens production security without changing educational
behavior, authorization semantics, database history, or live-provider behavior unless a
specific security defect proves such a change necessary.

## Security-scope rule

Phase 6-4 separates two kinds of controls:

1. repository-enforceable controls that can be proved in CI;
2. remote production controls that must be verified against the real hosted environment.

Local `supabase/config.toml` is a development/runtime fixture and is not accepted as proof
that the future remote production project has the same Auth, SSL, SMTP, password, or
network-restriction settings.

## Delivery slices

### 6-4A — GitHub Actions immutable pinning

This slice closes the CI action supply-chain gap:

- `actions/checkout` is pinned to the reviewed immutable commit for `v6.1.0`;
- `actions/setup-node` is pinned to the reviewed immutable commit for `v7.0.0`;
- human-readable version comments remain beside the immutable SHAs;
- a repository-wide workflow test rejects moving external action refs such as `@v6`,
  `@main`, or `@latest`;
- local actions (`./...`) and `docker://...` references are not falsely classified as
  GitHub action refs;
- CI permissions remain `contents: read`;
- no production secrets are introduced into ordinary CI.

Reviewed pins on 2026-09-19:

- `actions/checkout` `v6.1.0`:
  `d23441a48e516b6c34aea4fa41551a30e30af803`
- `actions/setup-node` `v7.0.0`:
  `820762786026740c76f36085b0efc47a31fe5020`

### 6-4B — Repository security contract + automated guard

This slice hardens ordinary CI without duplicating the existing secret, migration, Auth,
mastery-result, production-environment, dependency, or immutable-action guards:

- every `actions/checkout` step sets `persist-credentials: false`;
- ordinary CI rejects `pull_request_target`;
- ordinary CI rejects `permissions: write-all`;
- ordinary CI rejects `contents: write` and `id-token: write`;
- ordinary CI rejects `${{ secrets.* }}` consumption;
- `scripts/check-repository-security.mjs` runs inside the static CI gate;
- the 6-4 architecture test proves the repository-security wiring remains present.

This contract intentionally applies to `.github/workflows/ci.yml`, not to future deployment
workflows that may legitimately require narrowly scoped deployment permissions. Any future
deployment workflow must receive its own explicit security contract before production use.

### 6-4C — Database/RLS privilege audit

This slice audits the final PostgreSQL catalog state after all migrations are applied.
It deliberately avoids inferring current security from historical migration text.

The integration audit verifies:

- every application table in `public` and `private` has RLS enabled;
- `anon` has no application-table privileges;
- `authenticated` has no direct application-table write privileges;
- `service_role` direct DML is limited to the reviewed `public.profiles UPDATE` exception;
- the `private` schema and AI quota state remain inaccessible to application roles;
- every `SECURITY DEFINER` function has an explicit empty `search_path`;
- externally callable `SECURITY DEFINER` functions are not executable by `PUBLIC`;
- the callable `authenticated` function surface matches the reviewed RPC allowlist;
- `anon` and `service_role` cannot execute callable application functions;
- no application RLS policy targets `anon` or `PUBLIC`.

Trigger-returning functions are excluded only from the callable RPC-surface checks because
they are not application RPC endpoints. They remain covered by the `SECURITY DEFINER`
`search_path` audit when applicable.

The audit is read-only and is automatically included by `vitest.supabase.config.ts`.
No package script, workflow, local Supabase verifier, historical migration, Auth, Edge,
educational, or live-provider change is required.

A forward-only security migration is added only if this audit proves a concrete privilege
defect in the final database state.

### 6-4D — Remote production security baseline

This slice verifies the real hosted Supabase project with a read-only audit. Local
`supabase/config.toml` remains a development fixture and is never accepted as production
evidence.

`scripts/audit-remote-production-security.mjs` reads only:

- hosted Auth configuration;
- Postgres SSL-enforcement status;
- database network-restriction status;
- deployed Edge Function metadata;
- no Edge Function secret values or secret names; secret-read permission is intentionally withheld.

The audit never prints Management API payloads, secret values, raw CIDRs, or the project
reference. Its persisted report contains only a SHA-256 project fingerprint, PASS/WARN/PENDING/FAIL
results, and bounded human-readable findings. The default report path is outside the
repository under `/tmp`.

Hard failures cover insecure hosted state that already exists once the production
frontend URL is bound, including:

- a missing, local, credentialed, non-HTTPS, or mismatched Site URL after
  `EXPECTED_PRODUCTION_SITE_URL` is supplied;
- unsafe redirect allow-list entries;
- anonymous Auth or manual identity linking enabled;
- email autoconfirm or insecure email-change handling;
- password minimum below eight characters;
- password-change reauthentication disabled;
- refresh-token rotation disabled;
- Postgres SSL enforcement disabled;
- a deployed `ai-authoring-gateway` without JWT verification.

Plan- or deployment-dependent controls are reported without inventing closure:

- leaked-password protection and custom SMTP may be warnings depending on plan/policy;
- network restrictions are recorded as PASS or WARN because Supabase treats them as an
  additional platform control;
- production Site URL readiness and exact matching, Edge deployment, and
  `GEMINI_API_KEY` verification may remain PENDING until Phase 6-7;
  `GEMINI_API_KEY` is intentionally not inspected during 6-4D.

The script requires `SUPABASE_ACCESS_TOKEN` and either `SUPABASE_PROJECT_REF` or a hosted
`VITE_SUPABASE_URL`. `EXPECTED_PRODUCTION_SITE_URL` is optional until the production
frontend URL is finalized. These values stay in the Codespace environment and are never
added to ordinary CI.

### 6-4E — Security closure + deep review

Before Phase 6-4 closes:

- run the full static and local Supabase CI gates;
- perform the planned deep security review;
- reconcile any review findings with the repository and remote-production checklist;
- document unresolved deployment-only checks for Phase 6-7.

## 6-4A acceptance

Required before commit:

- all external GitHub Actions references use full 40-character commit SHAs;
- checkout and setup-node pins match the reviewed official release commits;
- the Phase 6-4 architecture test PASS;
- the existing Phase 6-2 supply-chain contract remains PASS after the immutable-pin update;
- full static CI gate PASS;
- local Supabase integration remains unchanged;
- `npm audit` remains at zero known vulnerabilities;
- `git diff --check` clean;
- no package dependency, migration, Supabase runtime, Auth, authorization, educational,
  Edge, or live Gemini behavior change.

## 6-4B acceptance

Required before commit:

- both ordinary CI checkout steps set `persist-credentials: false`;
- repository security guard PASS;
- Phase 6-4 architecture tests PASS;
- full static CI gate PASS;
- local Supabase integration behavior remains unchanged;
- no dependency, migration, Auth, authorization, Edge, educational, or live-provider change;
- `git diff --check` clean.

## 6-4C acceptance

Required before commit:

- database security integration audit PASS against a fresh local Supabase reset;
- every application table in `public` and `private` has RLS enabled;
- no unexpected `anon`, `authenticated`, or `service_role` table privilege is present;
- every `SECURITY DEFINER` function has an explicit empty `search_path`;
- callable function privileges match the reviewed RPC surface;
- no application RLS policy targets `anon` or `PUBLIC`;
- full static CI gate PASS;
- full local Supabase CI gate PASS;
- `git diff --check` clean;
- no historical migration is modified;
- no forward-only migration is added unless the audit proves a concrete privilege defect.

## 6-4D acceptance

Required before the slice is considered audited:

- remote audit executes against the real hosted Supabase project;
- no `FAIL` findings remain;
- Postgres SSL enforcement is enabled and applied;
- hosted Auth uses an HTTPS non-local Site URL;
- email autoconfirm, anonymous users, and manual identity linking are disabled;
- minimum password length is at least eight characters;
- password-change reauthentication and refresh-token rotation are enabled;
- redirect allow-list contains no local or non-HTTPS entries;
- remote audit report contains no secret values or raw Management API payloads;
- ordinary CI remains free of Supabase Management API credentials;
- deployment-only `PENDING` items are explicitly carried to Phase 6-7;
- full static CI gate remains PASS;
- `git diff --check` clean;
- no migration, Auth application behavior, educational code, or live-provider behavior is changed.
