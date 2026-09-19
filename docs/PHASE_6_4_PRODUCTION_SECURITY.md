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

Planned after 6-4A acceptance:

- consolidate repository-level production security invariants;
- extend automated checks only where they prove a real boundary;
- avoid duplicating existing secret, migration, Auth, and mastery boundary scanners.

### 6-4C — Database/RLS privilege audit

Planned after 6-4B acceptance:

- audit current forward-only migrations, RLS, grants, `SECURITY DEFINER`, and
  `search_path` contracts;
- prefer tests and documentation when the current database contract is already correct;
- add a new migration only if a concrete privilege defect is proven.

### 6-4D — Remote production security baseline

Planned before real production deployment:

- verify the hosted Supabase Auth and password policy;
- verify HTTPS/SSL and remote database access controls;
- verify redirect URLs and email-confirmation/password-change policy;
- verify production secrets exist only in their server-side boundaries;
- record evidence from the real production project rather than inferring it from local
  configuration.

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
