# Phase 6-7C3c1 — Official Semester-1 Catalog

## Scope

- Add Grade 9 and Grade 10 to the learning catalog.
- Keep Semester 1 as the only student-visible semester for both grades.
- Keep Semester 2 in the internal catalog but hidden from the student experience.
- Add the official 2026/2027 Semester-1 unit/topic structure from the user's Grade 9 and Grade 10 plans.
- Add topic records as `draft` structural lessons only; no objectives, explanations, examples, questions, or misconceptions are invented.
- Bind the three existing published virtual labs to their actual Grade/Semester/Unit/Lesson IDs.
- Keep the legacy Grade-10 waves sample hidden in Semester 2 until an official Semester-2 source is provided.

## Publication rule

A planned lesson is visible as “قيد الإعداد” in local development and cannot be opened until its status becomes `approved`. Production anonymous RLS still requires both `approved` and `is_visible`.

## Safety

No database push, no migration, no production branch change, no commit, and no push are performed by this package.
