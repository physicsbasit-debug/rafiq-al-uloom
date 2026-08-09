# Phase 3-5A — Real Supabase Teacher/Reviewer Composition Verification

## Purpose

Phase 3-5A is a verification gate, not a feature phase. It proves the real wire between authentication, authorization, the Phase 3 client services, Supabase RPC/RLS, and the actual Teacher/Reviewer workspace components before any Phase 3 freeze or tag.

Stable baseline before this gate:

- commit: `cba044529d929e9da1226ca97ebf219b65c78e98`
- basic suite: `63/63` files, `649/649` tests
- Phase 3-4 locally complete

## Important static finding before runtime

The current new-lesson editor initializes:

```text
objectives = []
questions = []
games = []
experiments = []
```

The trusted SQL payload contract rejects a payload when:

```text
objective count = 0
OR question count = 0
OR mastery question count = 0
```

The current UI exposes lesson metadata fields but does not expose objective/question authoring controls. Therefore the real first-save path is a suspected/strongly evidenced integration blocker even though mocked UI tests pass.

Cloud independently confirmed this mismatch. This package does **not** patch it. It adds a real acceptance/reproduction test so Codespaces + local Supabase can establish the runtime fact first.

## Verification layers

The new integration file contains three real tests:

1. **Real access matrix**
   - creates isolated student/teacher/reviewer/pending/suspended identities;
   - performs real sign-in through `AuthService`;
   - resolves the real Profile through `AuthorizationService`;
   - evaluates the existing central policy for teacher/reviewer workspace access.

2. **Real first save from a new TeacherWorkspace lesson**
   - signs in a real active teacher;
   - builds `AuthoringService` over repositories using that same signed-in Supabase client;
   - renders the production `TeacherWorkspace`;
   - opens `إنشاء درس جديد`;
   - fills every field currently exposed by the editor;
   - presses `حفظ المسودة`;
   - expects a server-owned draft to exist.

   If the current SQL/UI mismatch is active, this test should fail with a diagnostic beginning:

   ```text
   PHASE_3_5A_FIRST_SAVE_BLOCKER:
   ```

3. **Real teacher/reviewer lifecycle using a structurally valid draft**
   - creates a valid full payload through the real AuthoringService to isolate the workspace lifecycle from the first-save completeness gap;
   - TeacherWorkspace opens, edits, saves, submits A;
   - ReviewerWorkspace sees A and rejects it;
   - TeacherWorkspace sees rejected A and first save creates successor B;
   - A remains rejected and untouched;
   - B is submitted;
   - ReviewerWorkspace sees B and approves it;
   - the resulting canonical lesson is read by a real active student and must be `approved` + `teacher_authored`.

This third test distinguishes a narrow new-authoring UI completeness defect from a broader failure of services, RPC/RLS, reviewer flow, successor identity, or publication.

## What is intentionally not changed

- no production source files;
- no SQL/migrations;
- no RLS/RPC changes;
- no `App.tsx` changes;
- no authorization policy changes;
- no workspace refactor;
- no mocks of authoring/review/auth infrastructure in this new integration test.

The only UI-related spy is `window.confirm`, so the test does not stop for a browser modal.

## Honest boundary

Phase 3-4D already proves the `App.tsx` surface composition and `RequireCapability` guards. Phase 3-5A does not introduce test-only dependency injection into `App.tsx` just to make a browser-shaped test possible. Instead it renders the real workspace components with real services built from the same real signed-in Supabase clients.

Together:

```text
3-4D: App surface + capability composition
3-5A: real Auth/Profile + workspace + Service/Repository + RPC/RLS + persistence
```

This is a stronger boundary than modifying production solely for test wiring.

## Runtime protocol

Do not run the full Supabase suite first. Start with the new file so a first-save failure is isolated and readable.

```bash
npx supabase stop --no-backup
npx supabase start

RUN_SUPABASE_INTEGRATION_TESTS=true npx vitest run \
  --config vitest.supabase.config.ts \
  tests/integration/supabase-teacher-reviewer-workspace-composition.integration.tsx
```

Interpretation:

- access matrix PASS + lifecycle PASS + first-save FAIL = narrow new-authoring UI/SQL contract blocker;
- broader failures = diagnose the first failing layer before changing production;
- all 3 PASS = proceed to the complete Supabase suite and Phase 3-5B preparation.

No Phase 3 tag is allowed from Gate 1 alone.

## Cloud review refinement

Cloud independently verified the current SQL contract and current editor surface and confirmed:

- the hard blocker is limited to missing `objectives` and `questions` authoring for a new lesson;
- empty `games` and `experiments` are valid and are not part of this blocker;
- free-text `unitId` is a separate usability issue because SQL requires an existing unit, but it is not structurally impossible and is intentionally kept outside this Gate 1 blocker.

Gate 1 therefore remains diagnostic only. Production remediation, if runtime reproduces the first-save failure, belongs to a separate Phase 3-5A Fix 1.
