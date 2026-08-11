# Phase 3-5B1 — APPLY Contract

## Status

Approved REVIEW content, packaged for repository overlay.

## Baseline

`c2092dc70934d6006b62c2b1474749cea65540a1`

## Source scope

Exactly four repository files:

- `src/features/teacher/workspace/TeacherLessonEditor.tsx`
- `src/features/teacher/workspace/TeacherObjectivesEditor.tsx`
- `src/features/teacher/workspace/TeacherQuestionsEditor.tsx`
- `src/features/teacher/workspace/teacher-workspace.css` (new)

## Styling architecture decision

Existing design-system React components use TypeScript token objects and inline styles. This teacher authoring surface intentionally uses locally scoped CSS classes because creating new React form-wrapper primitives would add a props/forwarding API without evidence that such an API is justified. The CSS consumes the project's existing CSS variables only and does not introduce design tokens.

## RTL rule

New CSS must use logical, direction-neutral properties. Physical directional properties such as `margin-left/right`, `padding-left/right`, `border-left/right`, `text-align:left/right`, and `float` are forbidden.

## Frozen behavior

This phase does not alter:

- `useTeacherLessonEditor`
- teacher workspace utilities
- teacher lesson/question structure logic
- submission readiness logic
- AuthoringService/repositories
- payload contracts
- Save/Submit lifecycle
- question Form Buffer
- stable objective/question keys
- Objective A -> delete -> explicit Objective B relink behavior
- Supabase/RPC/SQL/RLS

Any need to touch a frozen contract is a STOP condition and requires a new REVIEW.

## Visual acceptance

Automated gates prove non-regression, not beauty. Phase closure requires user review of real desktop and mobile screenshots after APPLY passes all automated checks.
