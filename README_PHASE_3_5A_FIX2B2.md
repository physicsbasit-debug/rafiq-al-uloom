# Phase 3-5A Fix 2B-2 APPLY

**Question Editor + objectiveKey Linkage**

This is the changed-files-only APPLY package built from the exact REVIEW v2 source approved by Cloud.

Baseline:

```text
70f9dfcc11fdfa266909e37390efa463fdcecf3a
```

Approved REVIEW SHA-256:

```text
7f319285d59afe792456a6531bc81cbdefea881b87b1e4304ee0091250b35302
```

## Production changes

```text
src/features/teacher/workspace/teacher-lesson-structure.ts
src/features/teacher/workspace/TeacherQuestionsEditor.tsx
src/features/teacher/workspace/TeacherLessonEditor.tsx
```

## Tests

```text
tests/features/teacher/teacher-question-structure.test.ts
tests/features/teacher/TeacherQuestionsEditor.test.tsx
tests/features/teacher/TeacherLessonEditorQuestions.test.tsx
```

These add 24 Vitest cases total (11 + 11 + 2).

## Documentation

```text
docs/PHASE_3_5A_FIX2B2_QUESTION_EDITOR.md
```

## Not included / frozen

No SQL, RPC, RLS, App composition, authoring service/repository, authoring types, quiz types,
or teacher editor hook is included in this APPLY.

After upload, run the exact gates in `APPLY_PHASE_3_5A_FIX2B2.txt` before declaring Fix 2B-2 closed.
