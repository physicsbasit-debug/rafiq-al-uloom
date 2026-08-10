# Phase 3-5A Fix 2B-2 — Question Editor + objectiveKey Linkage

## Status

REVIEW CANDIDATE ONLY. Do not apply or upload to the repository yet.

Baseline commit: `70f9dfcc11fdfa266909e37390efa463fdcecf3a`.

## Scope

This review implements the Question Editor portion of the already approved Fix 2B contract:

- local Question Form Buffer,
- stable client-generated `question.key`,
- `purpose: review | mastery`,
- fixed internal `type: multiple_choice`,
- prompt,
- `choices[]`,
- `correctAnswerIndex`,
- explanation,
- `objectiveKey` chosen only from current committed objectives,
- `difficulty` limited by the TypeScript product contract to `easy | medium | hard`,
- local structural validation,
- immutable add/edit/delete,
- read-only behavior,
- save/submit structural corruption guard,
- the open-buffer objective-deletion edge case.

Out of scope:

- SQL, RPC, RLS, repositories, services, auth, App composition,
- games/experiments editing,
- AI generation,
- autosave,
- rich text,
- full submission-readiness checklist,
- real Supabase composition gate.

Submission-readiness UX and the real UI → Supabase → submit runtime gate remain Fix 2B-3.

## Authoritative contracts

### Question payload

`LessonRevisionPayload['questions'][number]` is the only committed Question shape:

- `key`
- `purpose`
- `type`
- `prompt`
- `choices`
- `correctAnswerIndex`
- `explanation`
- `objectiveKey`
- `difficulty`

No parallel committed DTO is introduced.

### Difficulty

Backend SQL accepts a non-empty string structurally.

The product TypeScript contract narrows it to:

```ts
export type Difficulty = 'easy' | 'medium' | 'hard';
```

The UI therefore displays Arabic labels but stores only the English contract values:

- `easy` → سهل
- `medium` → متوسط
- `hard` → صعب

The exact unchanged source files are included under `REFERENCE_UNCHANGED/` for independent review.

## Buffer vs committed state

A Question Form Buffer is temporary local editor state. It does not appear in
`draftPayload.questions` until Apply succeeds.

Committed Question invariant:

```text
for every draftPayload.questions[i]:
  draftPayload.objectives contains key === question.objectiveKey
```

A buffer reference does not block Objective deletion because it is not committed state.

### Critical edge case

If Question Buffer currently points to Objective A, there is no committed Question pointing to A,
and A is deleted from `draftPayload.objectives`:

- Objective deletion remains allowed.
- Question Buffer stays open.
- prompt is preserved.
- choices are preserved.
- correctAnswerIndex is preserved while its referenced choice remains present.
- purpose is preserved.
- explanation is preserved.
- difficulty is preserved.
- only buffer `objectiveKey` is cleared.
- no replacement Objective is selected automatically.
- Apply remains disabled until the user explicitly chooses a current Objective.
- no Lesson payload mutation is triggered by the Question Editor until Apply.

## Choice/index behavior

- at least 2 choices,
- each choice must be non-empty after trimming,
- correctAnswerIndex must be an integer within the current choices array,
- deleting the currently correct choice clears the selection,
- deleting a choice before the correct choice decrements the index to preserve the same selected answer,
- no silent fallback to the first answer.

## Stable key behavior

- new Questions receive a client key from `createQuestionKey`,
- key is not displayed as an input,
- key is not derived from prompt or array position,
- edits preserve the existing key,
- rejected-successor behavior remains owned by the existing hook and service flow,
- no backend historical key-stability rule is claimed.

## Save vs submit boundary

Fix 2A remains intact:

- structurally valid incomplete drafts are saveable,
- a review-only Question is structurally valid and saveable,
- this phase does not add the 2B-3 completeness checklist,
- backend submission completeness remains authoritative until 2B-3 adds the matching local UX gate.

Historical malformed committed Questions are surfaced as structural issues and prevent Save/Submit
from the editor until explicitly corrected. This is structural validity, not completeness.

## Expected production diff

Only these production files are in scope:

```text
src/features/teacher/workspace/teacher-lesson-structure.ts   MODIFIED
src/features/teacher/workspace/TeacherQuestionsEditor.tsx    NEW
src/features/teacher/workspace/TeacherLessonEditor.tsx       MODIFIED
```

Expected TeacherLessonEditor changes are limited to:

- import `TeacherQuestionsEditor`,
- import `getQuestionStateIssue`,
- compute current committed Question structural issue,
- mount `TeacherQuestionsEditor`,
- route `onChange(questions)` through the existing `updatePayload`,
- prevent Save/Submit while committed Question structure is invalid.

No change is intended to:

- `useTeacherLessonEditor.ts`,
- `originRevisionId`,
- `workingRevisionId`,
- create/save/submit service calls,
- commit-on-success behavior,
- rejected A → successor B behavior.

## Required review focus

1. Run the pure helper functions independently.
2. Diff `TeacherLessonEditor.tsx` against baseline `70f9dfc`.
3. Verify the two files under `REFERENCE_UNCHANGED/` against independent copies/hashes.
4. Inspect the buffer-objective deletion edge test first.
5. Confirm no infrastructure import or RPC leaked into feature code.
