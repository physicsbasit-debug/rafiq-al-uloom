# Phase 2-B1 — Supabase Client + Environment

## Environment verified

- Node.js: `v24.14.0`
- npm: `11.9.0`
- Required dependency: `@supabase/supabase-js@2.111.0` (exact version)

## Apply the dependency change in Codespaces

Run from the repository root:

```bash
npm install @supabase/supabase-js@2.111.0 --save-exact
```

This command must generate the real `package.json` and `package-lock.json` changes. Do not edit the lockfile manually.

## Files in this overlay

- `.env.example`
- `src/services/data/supabase-client.ts`
- `tests/data/supabase-client.test.ts`

## Required checks

```bash
npm run build
npm run lint
npm run test
npx prettier --check .
git status
```

Expected test increase: 7 tests and 1 test file.

## Explicitly outside scope

- migrations
- seed
- `SupabaseContentRepository`
- provider switching
- changes to features, query hooks, or `ContentRepository`

## Deferred documentation fix

`docs/DATA_MODEL.md` still needs `gradeId` under `Semester`. This is documentation-only and intentionally outside Phase 2-B1.
