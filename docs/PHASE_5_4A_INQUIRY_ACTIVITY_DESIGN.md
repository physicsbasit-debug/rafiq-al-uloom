# Phase 5-4A — Inquiry Activity Design

## Pre-Implementation Contract

**الحالة:** ARCHITECTURE REVIEW APPROVED — IMPLEMENTATION CANDIDATE
**Baseline:** `f3992bdbae2e22813bd49032cd2c59a89c867ef6`
**Parent architecture:** `PHASE_5_4_INQUIRY_DATA_ACTIVITIES_ARCHITECTURE.md`
**Parent review:** `PHASE_5_4_ARCHITECTURE_REVIEW=APPROVED`
**Claude architecture review:** `PHASE_5_4A_ARCHITECTURE_REVIEW=APPROVED`
**Scope:** Inquiry Activity only. Data/Graph remains deferred to Phase 5-4B.

---

## 1. Purpose

Phase 5-4A adds the first student-deliverable `InquiryActivity` without reopening the frozen Authoring, Reviewer, AI, Auth, Mastery, or durable-result contracts.

The activity is a guided scientific inquiry whose student flow is:

```text
context
→ driving question
→ hypothesis
→ observation / evidence
→ conclusion
```

The phase does **not** attempt to score the scientific quality of free-text inquiry responses.

---

## 2. Clarification carried forward from architecture review

The following distinction is explicit and normative:

> `no scoring` is a Phase 5-4A Inquiry rule, not a blanket rule for all Phase 5-4 activities.

Inquiry responses are open scientific reasoning and therefore receive no automatic `correct / incorrect`, numeric score, mastery update, or AI judgment in 5-4A.

By contrast, Phase 5-4B Data may perform deterministic session-only numeric answer checks against values derived from student-visible data. That transient validation is not durable scoring and does not write `MasteryResult` or any persistent attempt.

Therefore:

```text
Inquiry 5-4A:
  free-text reasoning
  no automatic scoring
  no correctness judgment

Data 5-4B:
  deterministic numeric validation may exist
  session-only feedback
  no durable score
  no MasteryResult write
```

There is no conflict with the global Phase 5 rule that new activity results remain session-only unless a later phase explicitly introduces durable persistence.

---

## 3. Existing architecture to preserve

The current Activity Domain already declares:

```ts
type LearningActivityKind = 'matching' | 'experiment' | 'simulation' | 'inquiry' | 'data';
```

However, `AvailableLearningActivity` currently contains only:

```text
MatchingActivity
ExperimentActivity
SimulationActivity
```

The registry already contains `inquiry` as:

```text
availability: planned
interactionMode: guided
physical: false
sessionProgress: false
```

Phase 5-4A should extend the existing generic activity path rather than create parallel routing.

---

## 4. Inquiry domain contract

Create a specialized type:

```ts
export interface Inquiry {
  id: string;
  lessonId: string;
  title: string;
  instructions: string;
  objectiveIds: string[];

  context: string;
  drivingQuestion: string;
  hypothesisPrompt: string;
  observationPrompt: string;
  conclusionPrompt: string;

  status: ContentStatus;
  source: ContentSource;
}
```

### Required invariants

Every Inquiry must satisfy:

1. `id` is non-blank.
2. `lessonId` is non-blank.
3. `title` is non-blank.
4. `instructions` is non-blank.
5. `context` is non-blank.
6. `drivingQuestion` is non-blank.
7. `hypothesisPrompt` is non-blank.
8. `observationPrompt` is non-blank.
9. `conclusionPrompt` is non-blank.
10. `objectiveIds` contains at least one value.
11. `objectiveIds` contains no blank ids.
12. `objectiveIds` contains no duplicates.
13. linked objectives must belong to the same lesson as the Inquiry.
14. no reference/model answer field is permitted in the student-readable Inquiry contract.

A runtime validator equivalent in role to `assertSimulation(...)` is required before repository data is treated as canonical domain data.

---

## 5. LearningActivity integration

Add:

```ts
export interface InquiryActivity extends LearningActivityBase {
  kind: 'inquiry';
  content: Inquiry;
}
```

Then extend:

```ts
AvailableLearningActivity;
```

to include `InquiryActivity`.

The adapter layer adds:

```ts
toInquiryActivity(inquiry);
```

and extends `buildLessonActivities(...)` to receive inquiries as a fourth specialized collection.

The existing structural rules remain unchanged:

```text
non-empty objectiveIds
no duplicate objectiveIds
single-lesson activity catalog
registry-driven display order
```

No switch or Inquiry-specific routing is added to `App.tsx` or `LessonView.tsx`.

---

## 6. Registry change

`inquiry` changes from:

```text
availability: planned
sessionProgress: false
```

to:

```text
availability: available
interactionMode: guided
physical: false
sessionProgress: true
```

`sessionProgress: true` means only that the React runner holds the student's current draft responses during the active UI session.

It does **not** mean:

```text
database persistence
localStorage persistence
MasteryResults persistence
attempt history
```

---

## 7. Student Inquiry Runner

Create a specialized React feature, provisionally:

```text
src/features/inquiries/InquiryRunner.tsx
```

### Required UI

The runner displays:

- Inquiry title.
- instructions.
- context.
- driving question.
- hypothesis text area.
- observation/evidence text area.
- conclusion text area.
- back button to the Activity Hub.

### Session state

Allowed local state:

```text
hypothesisText
observationText
conclusionText
```

No result is persisted outside the mounted student activity session.

### No automatic evaluation

The UI must not display:

```text
correct
incorrect
score
percentage
pass
fail
mastery
AI evaluation
model answer
expected answer
```

Phase 5-4A is a structured response workspace, not an automated inquiry grader.

---

## 8. React state/effect guard

The permanent rule from Phase 5-3B is explicitly binding on this component:

> Do not use `useEffect` to synchronize state that can be derived during render.

Rejected pattern:

```ts
useEffect(() => {
  setSomething(derivedValue);
}, [derivedValue]);
```

Use:

```ts
const something = derive(...);
```

when possible.

`useEffect` is permitted only for synchronization with an actual external system such as:

```text
event listener
timer
subscription
browser API
network lifecycle
```

For the first InquiryRunner design there is no expected need for `useEffect`.

`npm run lint` is a mandatory gate and `react-hooks/set-state-in-effect` must remain clean.

---

## 9. Reference-answer confidentiality boundary

The canonical student-readable Inquiry row must not contain:

```text
reference_answer
expected_conclusion
model_answer
teacher_answer
rubric_answer
answer_key
```

Reason:

RLS controls row access, not selective concealment of columns within a row returned to the client. If a student can `SELECT` an approved Inquiry row, any answer field stored in that same row is part of the readable payload.

Teacher/reviewer-only reference material is deferred to Phase 5-5 and must use a separate protected contract/storage path.

### Structural test requirement

Phase 5-4A includes a five-layer architecture/security guard that fails if forbidden answer-key fields are introduced into:

```text
Inquiry type
inquiries migration
Supabase inquiry row mapping
student Inquiry runner
source inquiry seed
```

The fifth source-seed layer is an approved hardening improvement from architecture review. This guard converts the design decision into an executable invariant.

---

## 10. Specialized persistence

Create:

```text
public.inquiries
public.inquiry_objectives
```

No generic `activities` table.

### `inquiries`

Proposed columns:

```text
id text primary key
lesson_id text not null
title text not null
instructions text not null
context text not null
driving_question text not null
hypothesis_prompt text not null
observation_prompt text not null
conclusion_prompt text not null
status content_status not null
source content_source not null
```

Constraints:

```text
FK lesson_id → lessons(id) ON DELETE RESTRICT
UNIQUE (id, lesson_id)
```

No reference answer columns.

### `inquiry_objectives`

Proposed columns:

```text
inquiry_id text not null
objective_id text not null
lesson_id text not null
position integer not null
```

Constraints:

```text
PRIMARY KEY (inquiry_id, objective_id)
UNIQUE (inquiry_id, position)
CHECK (position >= 0)

FOREIGN KEY (inquiry_id, lesson_id)
  REFERENCES inquiries(id, lesson_id)
  ON DELETE RESTRICT

FOREIGN KEY (objective_id, lesson_id)
  REFERENCES objectives(id, lesson_id)
  ON DELETE RESTRICT
```

This preserves same-lesson objective linkage at the database boundary.

---

## 11. RLS and privileges

Follow the established Phase 5 specialized content pattern.

### Privileges

```text
anon          → no privileges
authenticated → SELECT only
service_role  → SELECT
```

No canonical client writes.

### RLS for `inquiries`

Authenticated SELECT requires:

```text
profile.id = auth.uid()
profile.status = active
profile.role ∈ student | teacher | reviewer
inquiry.status = approved
linked lesson.status = approved
```

### RLS for `inquiry_objectives`

Authenticated SELECT requires:

```text
active allowed profile
+
approved inquiry
+
approved lesson
```

No policy may grant student access to any future teacher/reviewer answer material.

---

## 12. Repository contract

Extend `ContentRepository` with a specialized method:

```ts
getInquiriesByLesson(
  lessonId: string,
  options?: RepositoryRequestOptions
): Promise<Inquiry[]>;
```

Implement parity in:

```text
local-content.repository.ts
async-local-content.repository.ts
supabase-content.repository.ts
```

The Supabase implementation must follow the established no-N+1 pattern:

1. query inquiries for the lesson;
2. query all `inquiry_objectives` for the returned inquiry ids;
3. group ordered objective ids;
4. map each Inquiry exactly once.

The same `AbortSignal` must propagate through all relevant queries.

---

## 13. Supabase row/mapping contract

Add specialized row types:

```text
InquiryRow
InquiryObjectiveRow
```

and mappers:

```text
mapInquiryRow(...)
mapInquiryObjectiveRow(...)
```

The mapper must:

- reject malformed row payloads;
- reject empty structural objective linkage;
- reject duplicate objective ids;
- validate `lesson_id` consistency;
- produce camelCase domain output;
- never synthesize objective linkage from free text.

No automatic text matching between prompts and objectives is allowed.

---

## 14. Activity Catalog

Extend the existing concurrent catalog load from:

```text
games
experiments
simulations
```

to:

```text
games
experiments
simulations
inquiries
```

using the same `Promise.all` pattern.

The catalog must continue rejecting an activity returned for a different lesson.

No generic repository `getActivitiesByLesson` method is introduced.

---

## 15. Student renderer registration

Add an Inquiry renderer to:

```text
student-activity-renderer.registry.tsx
```

The renderer must:

1. narrow `activity.kind === 'inquiry'`;
2. reject a mismatched activity defensively;
3. render `InquiryRunner`;
4. use the existing `onBackToActivities` callback.

`StudentActivityHost` remains unchanged.

`StudentActivityHub` remains unchanged unless implementation reveals a genuine architectural blocker. Such a blocker must stop the phase and return to design review rather than trigger an opportunistic patch.

---

## 16. Seed Inquiry

Use the existing Grade 10 Physics Waves lesson:

```text
lesson:
  g10-phy-waves-l3
  الموجات الصوتية

objective:
  l3-o1
  يفسّر الطالب اعتماد انتقال الصوت على وجود وسط مادي.
```

Proposed Inquiry id:

```text
g10-phy-waves-l3-inquiry-sound-medium
```

### Proposed content

Title:

```text
هل ينتقل الصوت دون وسط مادي؟
```

Context:

```text
يوضع جرس كهربائي يعمل داخل وعاء يمكن سحب الهواء منه.
يستمر الجرس في الاهتزاز، لكن الصوت المسموع يضعف تدريجيًا كلما قل الهواء داخل الوعاء.
```

Driving question:

```text
ماذا تشير هذه الملاحظة إلى دور الوسط المادي في انتقال الصوت؟
```

Prompts:

```text
hypothesisPrompt:
اكتب فرضيتك قبل تفسير النتيجة.

observationPrompt:
اكتب الملاحظة أو الدليل الذي تعتمد عليه من وصف الحالة.

conclusionPrompt:
اكتب استنتاجك العلمي حول حاجة الصوت إلى وسط مادي للانتقال.
```

The Inquiry contains no reference answer.

---

## 17. Seed generation

Extend the existing seed graph with:

```text
inquiries
```

and validate:

- unique Inquiry ids;
- valid lesson reference;
- at least one objective id;
- no duplicate objective ids;
- all objectives exist;
- every objective belongs to the same lesson.

Extend Supabase seed generation with:

```text
inquiries
inquiry_objectives
```

using deterministic ordered `position`.

---

## 18. Protected files

The following remain unchanged in Phase 5-4A unless a blocker is proven and design is reopened:

```text
src/App.tsx
src/features/student/lesson-view/LessonView.tsx
src/features/activities/StudentActivityHub.tsx
src/features/activities/StudentActivityHost.tsx
src/services/queries/activity-query.hooks.ts
```

Also out of scope:

```text
Teacher Authoring
Reviewer
AI Gateway
Auth
Mastery Results
```

Protected-file hashes should be captured before implementation and checked again at closure.

---

## 19. Explicit non-goals

Phase 5-4A does not add:

```text
DataActivity
Data engine
graphs
automatic inquiry scoring
AI inquiry evaluation
reference answers
teacher rubrics
durable inquiry attempts
localStorage inquiry persistence
MasteryResult writes
generic activities table
generic activity result table
Authoring integration
Reviewer integration
AI generation
```

These are separate contracts/phases.

---

## 20. Expected implementation file scope

The exact diff remains subject to pre-implementation audit, but the expected production scope is:

```text
docs/PHASE_5_4A_INQUIRY_ACTIVITY_DESIGN.md

src/types/inquiry.types.ts
src/types/activity.types.ts

src/content/seed/grade10-physics-waves.ts
scripts/generate-supabase-seed.ts

src/features/activities/activity-adapters.ts
src/features/activities/activity-registry.ts
src/features/activities/student-activity-renderer.registry.tsx
src/features/inquiries/InquiryRunner.tsx

src/services/activities/activity-catalog.service.ts
src/services/data/content.repository.ts
src/services/data/local-content.repository.ts
src/services/data/async-local-content.repository.ts
src/services/data/supabase-content.rows.ts
src/services/data/supabase-content.mappers.ts
src/services/data/supabase-content.repository.ts

supabase/migrations/<phase-5-4a-add-inquiries>.sql
supabase/seed.sql
supabase/tests/<phase-5-4a-inquiries>.sql
```

Expected test additions/updates include:

```text
tests/inquiries/inquiry-domain.test.ts
tests/features/InquiryRunner.test.tsx
tests/activities/activity-adapters.test.ts
tests/activities/activity-registry.test.ts
tests/activities/activity-catalog.service.test.ts
tests/data/supabase-content.mappers.test.ts
tests/data/supabase-content.repository.test.ts
tests/content/seed-graph-validation.test.ts
tests/content/seed.test.ts
tests/architecture/phase-5-4a-inquiry-boundaries.test.ts
tests/integration/supabase-content.repository.integration.ts
```

No implementation file should be added merely because it is on this expected list; the pre-implementation repository audit must verify each actual touchpoint first.

---

## 21. Acceptance gates

### Domain

```text
Inquiry validation PASS
non-empty objectiveIds PASS
duplicate objective rejection PASS
same-lesson linkage PASS
no reference-answer fields PASS
```

### UI

```text
InquiryRunner renders PASS
hypothesis input PASS
observation input PASS
conclusion input PASS
session-only state PASS
back navigation PASS
no score/correctness UI PASS
no reference-answer leakage PASS
React hooks lint PASS
```

### Repository

```text
local repository parity PASS
async-local repository parity PASS
Supabase repository parity PASS
AbortSignal propagation PASS
no N+1 PASS
invalid linkage rejection PASS
```

### Database

```text
migration PASS
same-lesson composite FK PASS
ON DELETE RESTRICT PASS
position constraints PASS
anon blocked PASS
authenticated approved-content SELECT PASS
inactive profile blocked PASS
unapproved inquiry blocked PASS
unapproved lesson blocked PASS
service_role SELECT PASS
no client writes PASS
```

### Architecture

```text
no generic activities table PASS
no durable inquiry results PASS
App unchanged PASS
LessonView unchanged PASS
StudentActivityHub unchanged PASS
StudentActivityHost unchanged PASS
activity query hook unchanged PASS
Authoring untouched PASS
Reviewer untouched PASS
AI untouched PASS
Auth untouched PASS
Mastery untouched PASS
```

### Final technical closure

```text
focused tests PASS
full npm test PASS
npm run lint PASS
npm run build PASS
prettier PASS
git diff --check PASS
Supabase reset PASS
pgTAP PASS
Supabase integration PASS
protected-file hashes PASS
Claude independent actual-diff review PASS
Claude final closure review PASS
```

---

## 22. Review sequence

Phase 5-4A follows the established staged process:

```text
1. repository pre-implementation audit
2. architecture/design document
3. Claude architecture review
4. implementation candidate
5. actual diff review
6. focused technical gates
7. full technical gates
8. final independent closure review
9. one clean commit
10. push
11. pull request
12. verify merge SHA
13. freeze Phase 5-4A baseline
```

No implementation starts before the architecture review approves this contract.

---

## 23. Claude review questions

Please explicitly evaluate:

1. Is the Inquiry domain contract minimal but sufficient?
2. Is `no scoring` correctly scoped to Inquiry rather than Data?
3. Does the reference-answer confidentiality boundary fully prevent student leakage in 5-4A?
4. Is specialized persistence appropriate?
5. Are same-lesson objective constraints sufficient?
6. Is the RLS model consistent with the frozen content boundary?
7. Is session-only state correctly separated from durable results?
8. Are protected files correctly identified?
9. Does InquiryRunner need any effect at all in this scope?
10. Are there missing repository or test touchpoints?
11. Is the seed scenario scientifically and pedagogically appropriate?
12. Is Phase 5-4A safe to implement without reopening 5-5 concerns?

Expected decision format:

```text
PHASE_5_4A_ARCHITECTURE_REVIEW=APPROVED
```

or:

```text
PHASE_5_4A_ARCHITECTURE_REVIEW=CHANGES_REQUIRED
```

with blockers listed explicitly.
