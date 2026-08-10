# Phase 3-5A Fix 2B-2 Fix 1 — Render Guard APPLY

## Purpose

Close the only real gate failure found after Fix 2B-2 runtime verification:
`react-hooks/set-state-in-effect` in `TeacherQuestionsEditor.tsx`.

The functional behavior was already green in Codespaces (24/24 targeted, 45/45 teacher regression, 689/689 full suite). This fix changes only the synchronization mechanism for an open Question Form Buffer when its selected Objective disappears.

## Approved behavior

- No `useEffect` is used for this synchronization.
- `previousObjectives` is stored with `useState`.
- On a changed `objectives` reference, render-time state adjustment is conditional.
- If the open buffer references a now-missing Objective, only `objectiveKey` is cleared.
- Other buffer fields remain unchanged.
- Re-adding the deleted Objective later does not silently restore the old link.
- The teacher must explicitly choose a current Objective before Apply.
- No service, repository, RPC, SQL, payload contract, authorization, or App composition changes.

## Files changed

1. `src/features/teacher/workspace/TeacherQuestionsEditor.tsx`
2. `tests/features/teacher/TeacherQuestionsEditor.test.tsx`
3. `tests/features/teacher/TeacherLessonEditorQuestions.test.tsx`

The test file also contains the already-proven selector correction for the read-only assertion (`ارتداد الموجة — الإجابة الصحيحة`).

## Runtime closure gate

Run `APPLY_PHASE_3_5A_FIX2B2_FIX1_V3.txt` exactly in Codespaces after the GitHub upload commit exists.

Expected functional results before formatting:

- Fix 2B-2 targeted suite: 24/24
- teacher regression suite: 45/45
- full suite: 689/689 across 69 files
- lint: PASS, specifically no `react-hooks/set-state-in-effect`
- build: PASS (existing Vite chunk-size warning is non-blocking)

Prettier warnings are handled only after the functional/lint gates are green, with formatting-only proof before the formatting commit.
