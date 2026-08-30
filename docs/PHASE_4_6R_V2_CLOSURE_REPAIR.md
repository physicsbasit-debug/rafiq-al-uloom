# Phase 4-6R — V2 Contract Restoration & Closure Repair

**Status:** CLOSED & FROZEN
**Repair branch:** `phase-4-6r-v2-contract-restoration`
**Repair baseline:** `2473b5468962064dab5cd99752d08f122acb02c1`
**Historical attempted freeze tag:** `v0.7-ai-assisted-authoring-complete`
**Canonical corrective freeze tag:** `v0.7.1-ai-assisted-authoring-closure-repair`
**Frozen commit:** `f63fdcf886911d8c884241701721cce2aaa47c61`

## Why this repair exists

A continuity audit found that the previous Phase 4 closure was green against an older and incomplete contract. The automated gate genuinely passed, but it did not prove the complete Phase 4-6 V2 design.

The repair restores the implementation, tests, and closure gate to the approved V2 contract. It does not rewrite history and does not move or delete the historical `v0.7-ai-assisted-authoring-complete` tag.

## Approved repair scope

The repair is intentionally narrow.

### Updated production file

- `src/features/reviewer/workspace/ReviewerRevisionReview.tsx`

The Reviewer now sees the AI-relevant lesson content before approval:

- lesson summary
- learning-objective text
- question purpose
- prompt
- choices
- correct-answer marker
- correct answer
- explanation
- difficulty
- linked objective text and key

No second production file was required.

### Updated Reviewer test

- `tests/features/reviewer/ReviewerRevisionReview.test.tsx`

The test now proves that the detailed objective and question content is visible before any review decision.

### Added canonical deterministic composition test

- `tests/integration/supabase-ai-assisted-authoring-composition.integration.tsx`

This is the canonical Phase 4-6 V2 composition proof.

It uses `DeterministicAiAuthoringProvider` and the real Teacher/Reviewer UI and Supabase persistence path.

The test proves:

1. a new teacher starts with zero revisions;
2. AI suggestions are generated for:
   - `lesson_summary`
   - `objective`
   - `mastery_question`
3. teacher acceptance and explicit apply occur in the local draft UI;
4. the server still contains zero revisions before the explicit manual **حفظ المسودة** action;
5. manual Save is the first server write and creates exactly one revision;
6. the stored revision contains the accepted summary, objective, and mastery question;
7. persisted raw JSON contains none of:
   - `generationId`
   - `providerFamily`
   - `modelLabel`
   - `generatedAt`
   - `target`
8. the revision is explicitly submitted for review;
9. Reviewer DOM shows the accepted summary, objective, purpose, prompt, choices, answer, explanation, difficulty, and linked objective before approval;
10. approval produces an approved revision with `publishedEntityId`;
11. canonical published content preserves:
    - summary
    - objective
    - mastery question
    - choices
    - correct answer
    - explanation
    - difficulty
    - objective-question linkage
    - `source = teacher_authored`

### Added permanent V2 contract guard

- `tests/architecture/phase-4-6-v2-closure-contract.test.ts`

This guard fails if the repaired contract regresses. In particular, it protects against:

- Reviewer returning to counters-only presentation;
- Reviewer visibility assertions disappearing;
- canonical deterministic test disappearing;
- Gateway/live Gemini replacing the deterministic canonical provider;
- the three V2 targets disappearing;
- creation of a server revision before the local AI path and manual Save;
- raw persisted provenance checks disappearing;
- Reviewer DOM proof disappearing before approval;
- publication assertions disappearing;
- the closure script dropping either:
  - canonical deterministic V2 composition, or
  - the separate Browser → Edge → Gemini live proof;
- the old real-composition live test being treated as canonical instead of supplemental smoke.

### Updated Phase 4 closure script

- `scripts/verify-phase-4-closure.sh`

The closure sequence now includes:

1. frozen Phase 3 baseline verification;
2. ephemeral-provenance invariant;
3. formatting, lint, build, and basic tests;
4. Auth and mastery boundary checks;
5. existing Phase 4 AI architecture checks;
6. permanent Phase 4-6 V2 contract guard;
7. Supabase reset and readiness;
8. full non-live Supabase integration suite;
9. frozen Teacher/Reviewer composition proof;
10. canonical deterministic Phase 4-6 V2 composition proof;
11. a fresh live Gemini Edge runtime;
12. the original Browser → Edge → Gemini live gate;
13. the former live real-composition test as **supplemental smoke** only;
14. diff and final clean/synchronized Git checks.

The script must not print Phase 4 closure PASS unless the canonical V2 composition proof succeeds.

## Explicitly unchanged

This repair does **not** change:

- SQL or migrations;
- Edge Functions;
- AI Gateway production implementation;
- Auth state or public AuthSession contract;
- authorization policy;
- Authoring repositories;
- Review RPC;
- ReviewService;
- LessonRevisionPayload;
- the Phase 4-5 ephemeral provenance decision;
- Phase 5 production code.

## Local evidence completed

The following local gates have passed during the repair:

### Reviewer visibility gate

- Reviewer targeted tests: **18/18 passed**
- production build: passed
- `git diff --check`: passed

### Canonical deterministic composition gate

- canonical V2 integration test: **1/1 passed**
- real local Supabase reset: passed
- zero revisions before manual Save: proved
- exactly one revision after manual Save: proved
- raw persisted provenance exclusion: proved
- Reviewer visibility before approval: proved
- trusted publication content and linkage: proved
- Reviewer regression tests: **18/18 passed**
- build: passed
- `git diff --check`: passed

### Permanent V2 contract guard gate

- V2 architecture/contract guard: **9/9 passed**
- canonical V2 regression: **1/1 passed**
- Reviewer regression: **18/18 passed**
- shell syntax for closure script: passed
- build: passed
- `git diff --check`: passed

## Current changed-path contract

Before this document is added, the repair contains exactly five implementation/test/tooling paths:

1. `scripts/verify-phase-4-closure.sh`
2. `src/features/reviewer/workspace/ReviewerRevisionReview.tsx`
3. `tests/features/reviewer/ReviewerRevisionReview.test.tsx`
4. `tests/architecture/phase-4-6-v2-closure-contract.test.ts`
5. `tests/integration/supabase-ai-assisted-authoring-composition.integration.tsx`

This document is the sixth and final approved repair path:

6. `docs/PHASE_4_6R_V2_CLOSURE_REPAIR.md`

`docs/PHASES.md` must remain unchanged until independent implementation review and final closure are complete.

## Historical tag handling

The existing tag `v0.7-ai-assisted-authoring-complete` is retained as historical evidence of the earlier attempted freeze.

It must **not** be moved, deleted, or silently repointed.

If the repaired implementation passes the complete closure process and independent review, the corrective freeze candidate is:

`v0.7.1-ai-assisted-authoring-closure-repair`

The corrective tag is not created by this implementation stage.

## Final closure evidence

Phase 4 is formally closed and frozen under:

`v0.7.1-ai-assisted-authoring-closure-repair`

→ `f63fdcf886911d8c884241701721cce2aaa47c61`

Final closure evidence:

1. the complete Phase 4-6R implementation received independent implementation approval;
2. PR #2 was merged to `main` with merge commit `cb98be6e5467659b5b208d52aaba3f808ccce517`;
3. the inherited `docs/PHASES.md` formatting debt was repaired in an isolated formatting-only commit;
4. `npm run verify:phase-4-closure` completed successfully on clean synchronized `main`;
5. the command printed `PHASE 4 AUTOMATED CLOSURE VERIFICATION PASSED`;
6. Browser → Edge → live Gemini passed;
7. canonical deterministic AI-assisted composition passed;
8. supplemental live AI composition passed;
9. the final independent closure review returned `PHASE_4_6R_FINAL_INDEPENDENT_CLOSURE=APPROVED`;
10. the corrective annotated tag was created and verified locally and remotely;
11. the historical `v0.7-ai-assisted-authoring-complete` tag remains unchanged.

Final raw closure log SHA-256:

`6421bd57d1132f486eff841eab5383c96222c4f12d836ce8ae2129ad275afc8b`

Corrective annotated tag object:

`830bd9445d765d76b01f2930869ba681d725b1dd`

GitHub verification status for the annotated tag is `unsigned`, matching the repository's historical tag practice.

## Permanent process rule adopted

Whenever a design advances from V1 to V2 or later, the same stage must update all four together:

1. implementation requirements;
2. behavioral tests;
3. closure gate;
4. permanent architecture/contract guard.

A green closure gate built against an older contract is not sufficient evidence of current-design completeness.
