# رفيق العلوم — Phase 5-4B

## Data / Graph Activity — Pre-Implementation Contract

**الحالة:** PRE-IMPLEMENTATION CONTRACT — READY FOR ARCHITECTURE REVIEW
**Baseline:** `main` @ `a37a7b470f85b9e0d87491bba798673408f226d1`
**Parent contracts:** Phase 5-0 + Phase 5-2 + Phase 5-4A clarification
**Scope:** Data / Graph Activity only
**Implementation status:** NOT STARTED in this batch
**Authoring / Reviewer integration:** Deferred to Phase 5-5
**Durable activity result persistence:** Out of scope

---

## 1. Purpose

Phase 5-4B adds the fifth planned `LearningActivityKind` as a real student-deliverable activity:

```text
data
```

The activity is for scientific data interpretation and quantitative reasoning using student-visible datasets, tables, and deterministic graphs.

The target student flow is:

```text
read the scientific context
→ inspect a table and/or graph
→ answer a numeric data task
→ receive deterministic session-only feedback
```

The phase does **not** create a general assessment engine, does **not** write Mastery Results, and does **not** introduce AI grading.

---

## 2. Governing architecture

The following existing decisions remain binding.

### 2.1 Specialized storage

Phase 5-0 established that `LearningActivity` is a Domain/UI abstraction, not a generic persistence table.

Therefore Phase 5-4B must not create:

```text
public.activities
```

Data / Graph content receives specialized persistence.

### 2.2 Structural objective linkage

Every student-deliverable activity must link to at least one learning objective through verifiable structural identifiers.

No free-text objective matching is accepted.

### 2.3 Session-only results

Phase 5 activities remain session-only unless a later explicit persistence phase changes that rule.

Data / Graph therefore must not create:

```text
data_activity_attempts
data_activity_results
activity_attempts
MasteryResult writes
```

### 2.4 Deterministic numeric validation

Phase 5-4A clarified that Data / Graph activities may perform deterministic numeric answer checks against student-visible data.

This is allowed because the feedback is transient and derived from visible data.

It is **not** durable scoring.

### 2.5 No per-kind routing in App

Phase 5-2 established the Activity Hub and renderer registry.

Phase 5-4B must extend those registries and adapters.

It must not add Data-specific routing branches to:

```text
src/App.tsx
src/features/student/lesson-view/LessonView.tsx
```

---

## 3. Current baseline

At baseline `a37a7b4`:

- `LearningActivityKind` already contains `'data'`.
- `AvailableLearningActivity` contains matching, experiment, simulation, and inquiry only.
- Activity Registry contains `data` with `availability: 'planned'`.
- Student Renderer Registry contains no Data renderer.
- `ContentRepository` contains no Data-specific read contract.
- Activity Catalog loads games, experiments, simulations, and inquiries concurrently.
- No Data-specific SQL exists.
- No Data runner or deterministic Data engine exists.

Phase 5-4B should be additive over this structure.

---

## 4. Exact scope

Phase 5-4B should deliver the following implementation slices after this design batch is approved:

1. Data / Graph specialized domain contract.
2. Deterministic numeric dataset and answer engine.
3. Specialized Supabase persistence with objective linkage.
4. Local / async-local / Supabase repository parity.
5. Activity adapter, catalog, registry, and student renderer integration.
6. Student Data / Graph runner.
7. One approved seed activity linked to an existing Grade 10 Physics objective.
8. Unit, architecture, pgTAP, and real Supabase parity tests.

This design batch itself adds only:

```text
docs/PHASE_5_4B_DATA_GRAPH_ACTIVITY_DESIGN.md
tests/architecture/phase-5-4b-data-graph-boundaries.test.ts
```

No runtime production behavior changes are included in this batch.

---

## 5. Non-goals

Phase 5-4B does not:

- create teacher authoring UI for Data / Graph activities;
- create reviewer UI for Data / Graph activities;
- permit AI to author, save, submit, approve, or publish Data content;
- add durable student attempts;
- update Mastery Results;
- add a generic activities table;
- add arbitrary JavaScript expressions to canonical content;
- add user-supplied SVG, HTML, or script payloads;
- add arbitrary mathematical expression evaluation;
- add free-response AI judgment;
- support every chart type;
- redesign the Activity Hub;
- remove existing activity paths;
- add data export or spreadsheet functionality.

Those are separate concerns and phases.

---

## 6. Naming contract

To avoid colliding with the existing logical wrapper name `DataActivity`, the specialized canonical content entity should be named:

```ts
ScientificDataActivity
```

Recommended file:

```text
src/types/data-activity.types.ts
```

The logical `LearningActivity` wrapper becomes:

```ts
export interface DataActivity extends LearningActivityBase {
  kind: 'data';
  content: ScientificDataActivity;
}
```

`AvailableLearningActivity` then becomes:

```text
MatchingActivity
| ExperimentActivity
| SimulationActivity
| InquiryActivity
| DataActivity
```

Repository contract:

```ts
getDataActivitiesByLesson(
  lessonId: string,
  options?: RepositoryRequestOptions
): Promise<ScientificDataActivity[]>;
```

---

## 7. Canonical Data / Graph content contract

Recommended top-level content shape:

```ts
export interface ScientificDataActivity {
  id: string;
  lessonId: string;
  title: string;
  instructions: string;
  objectiveIds: string[];

  config: DataActivityConfig;

  status: ContentStatus;
  source: ContentSource;
}
```

The `config` object owns the student-visible scientific dataset, presentation settings, and deterministic tasks.

Recommended engine discriminator:

```ts
export type DataActivityEngineKind = 'data_graph_v1';
```

Recommended config:

```ts
export interface DataActivityConfig {
  engineKind: 'data_graph_v1';
  context: string;
  presentation: DataPresentation;
  dataset: NumericDataset;
  tasks: NumericDataTask[];
}
```

---

## 8. Dataset contract

Phase 5-4B v1 uses a two-dimensional numeric dataset suitable for a table and line graph.

Recommended structure:

```ts
export interface NumericAxis {
  label: string;
  unit: string;
  values: number[];
}

export interface NumericSeries {
  id: string;
  label: string;
  unit: string;
  values: number[];
}

export interface NumericDataset {
  x: NumericAxis;
  series: NumericSeries[];
}
```

### Dataset invariants

The runtime parser/validator must reject a dataset when:

1. `x.label` is blank.
2. `x.unit` is blank when a unit is required by the authored activity.
3. `x.values` is empty.
4. any x value is not finite.
5. x values are not strictly increasing.
6. `series` is empty.
7. any series id is blank.
8. series ids contain duplicates.
9. any series label is blank.
10. any series value is not finite.
11. any series length differs from x-axis length.
12. the config contains unsupported keys where exact structural parsing is expected.

Strictly increasing x values are required in v1 so the deterministic line graph has one unambiguous horizontal order.

A later phase may introduce categorical x axes under a new engine version rather than weakening `data_graph_v1`.

---

## 9. Presentation contract

Phase 5-4B supports only:

```ts
export type DataPresentationMode =
  | 'table'
  | 'line_graph'
  | 'table_and_line_graph';
```

Recommended shape:

```ts
export interface DataPresentation {
  mode: DataPresentationMode;
  xAxisLabel: string;
  yAxisLabel: string;
}
```

### Presentation rules

- The table and graph must be rendered from the same canonical dataset.
- A graph must never contain values that are not in the dataset.
- A table must never maintain a second copy of numeric values.
- The graph renderer must be deterministic.
- No random jitter is permitted.
- No network request is permitted.
- No dynamic code execution is permitted.

---

## 10. Graph rendering contract

Phase 5-4B v1 uses a deterministic SVG renderer owned by the React feature layer or a small pure geometry helper.

It must not add a charting dependency unless a later implementation review proves that hand-built deterministic SVG is inadequate.

The first graph supports:

- x axis;
- y axis;
- tick marks;
- numeric tick labels;
- axis labels and units;
- one or more line series;
- visible data points;
- deterministic polyline order;
- responsive sizing;
- accessible textual context.

### RTL rule

The application remains Arabic and RTL.

However, scientific numeric axes are not mirrored merely because surrounding UI is RTL.

For v1:

```text
increasing x values → left to right
increasing y values → bottom to top
```

Arabic titles, instructions, captions, buttons, and surrounding layout remain RTL.

This distinction is mandatory.

---

## 11. Deterministic task contract

Phase 5-4B does not accept arbitrary formulas from canonical content.

Tasks use an enumerated rule union.

Recommended initial rules:

```ts
export type NumericDataTaskRule =
  | {
      kind: 'read_value';
      seriesId: string;
      pointIndex: number;
    }
  | {
      kind: 'difference';
      seriesId: string;
      leftIndex: number;
      rightIndex: number;
      absolute: boolean;
    }
  | {
      kind: 'mean';
      seriesId: string;
      pointIndices: number[];
    };
```

Recommended task:

```ts
export interface NumericDataTask {
  id: string;
  prompt: string;
  unit: string;
  tolerance?: number;
  rule: NumericDataTaskRule;
}
```

### Why these rules

They cover the first useful scientific data skills without creating a general-purpose expression interpreter:

- direct reading from a table/graph;
- comparing two values;
- computing an arithmetic mean.

Future rule families must use a new explicit union member and tests.

No rule may execute source text.

---

## 12. Deterministic engine

Recommended file:

```text
src/features/data-activities/engine/data-activity.engine.ts
```

The engine should be React-free and side-effect free.

Recommended responsibilities:

```text
deriveExpectedValue(dataset, rule)
normalizeNumericAnswer(rawInput)
evaluateNumericAnswer(expected, actual, tolerance)
```

The engine must not import or access:

```text
React
window
document
fetch
XMLHttpRequest
Supabase
localStorage
sessionStorage
Date.now
Math.random
eval
new Function
AI provider code
MasteryResult services
```

The engine output is transient evaluation state only.

---

## 13. Numeric input parsing

Student input is text at the UI boundary.

The engine/parser may accept:

- leading/trailing whitespace;
- standard decimal notation;
- Arabic-Indic digits only if the application already has a shared normalization utility suitable for reuse.

Phase 5-4B must not duplicate an unrelated number-normalization implementation merely to appear helpful.

Invalid input should produce a deterministic validation state, not JavaScript `NaN` leaking into UI.

Recommended result:

```ts
type NumericAnswerEvaluation =
  | { status: 'empty' }
  | { status: 'invalid_number' }
  | { status: 'correct'; expected: number; actual: number }
  | { status: 'incorrect'; expected: number; actual: number };
```

The UI does not need to expose the `expected` value to the student.

The internal engine may return it for deterministic unit testing.

---

## 14. Tolerance rule

Default tolerance:

```text
1e-9
```

Task-specific tolerance may be configured only as a finite non-negative number.

Evaluation:

```text
abs(actual - expected) <= tolerance
```

No relative tolerance is introduced in v1.

If a task requires educational rounding, the authored dataset/task must make that expectation explicit in the prompt and use a suitable absolute tolerance.

---

## 15. Answer confidentiality boundary

The canonical student-readable Data / Graph row and config must not contain a precomputed answer key.

Forbidden field families include:

```text
expectedValue
expectedAnswer
correctValue
answerKey
modelAnswer
referenceAnswer
teacherAnswer
```

The deterministic rule itself is allowed because the rule describes an operation over data already visible to the student.

Example:

```text
difference(series A, point 2, point 5)
```

does not contain a secret answer.

The engine computes the numeric result at runtime from the same dataset rendered to the student.

This design avoids storing a concealed answer key in a row readable under student RLS.

---

## 16. Session-only interaction state

`DataActivityRunner` may hold only transient UI state such as:

```text
answer text by task id
evaluation state by task id
currently selected task
```

It must not persist student answers to:

```text
Supabase
localStorage
sessionStorage
IndexedDB
cookies
Mastery Results
```

Unmount/remount may reset the activity.

Durable Data activity attempts require a separate future contract.

---

## 17. Specialized persistence

Recommended migration:

```text
supabase/migrations/20260903080000_add_data_activities.sql
```

Recommended tables:

```text
public.data_activities
public.data_activity_objectives
```

No generic `public.activities` table.

### `data_activities`

Recommended columns:

```text
id text primary key
lesson_id text not null
title text not null
instructions text not null
engine_kind text not null
config jsonb not null
status content_status not null
source content_source not null
```

Constraints:

```text
FOREIGN KEY lesson_id → lessons(id) ON DELETE RESTRICT
CHECK engine_kind IN ('data_graph_v1')
CHECK jsonb_typeof(config) = 'object'
UNIQUE (id, lesson_id)
```

The database guards basic shape.

The TypeScript parser owns detailed config semantics.

### `data_activity_objectives`

Recommended columns:

```text
data_activity_id text not null
objective_id text not null
lesson_id text not null
position integer not null
```

Constraints:

```text
PRIMARY KEY (data_activity_id, objective_id)
UNIQUE (data_activity_id, position)
CHECK (position >= 0)

FOREIGN KEY (data_activity_id, lesson_id)
  REFERENCES data_activities(id, lesson_id)
  ON DELETE RESTRICT

FOREIGN KEY (objective_id, lesson_id)
  REFERENCES objectives(id, lesson_id)
  ON DELETE RESTRICT
```

This enforces same-lesson objective linkage at the database boundary.

---

## 18. RLS and privileges

Follow the specialized Phase 5 pattern already used by Simulation and Inquiry.

### Privileges

```text
anon          → no privileges
authenticated → SELECT only
service_role  → SELECT
```

No canonical client writes.

### Data activity SELECT

Authenticated read requires:

```text
profile.id = auth.uid()
profile.status = active
profile.role ∈ student | teacher | reviewer
data activity.status = approved
linked lesson.status = approved
```

### Objective linkage SELECT

Authenticated read requires:

```text
active allowed profile
+
approved data activity
+
approved lesson
```

No answer-key policy is needed because no answer key exists in this student-readable contract.

---

## 19. Supabase row and mapper contract

Add specialized row types:

```text
DataActivityRow
DataActivityObjectiveRow
```

The row includes:

```text
engine_kind
config
```

as raw boundary data.

The mapper must:

1. validate primitive row fields;
2. validate the engine kind;
3. parse config through the shared Data config parser;
4. reject empty objective linkage;
5. reject duplicate objective ids;
6. preserve lesson consistency;
7. return canonical camelCase output;
8. never synthesize an answer key;
9. never evaluate task rules in the mapper.

Evaluation belongs in the deterministic engine, not the network mapper.

---

## 20. Repository contract

Extend `ContentRepository` with:

```ts
getDataActivitiesByLesson(
  lessonId: string,
  options?: RepositoryRequestOptions
): Promise<ScientificDataActivity[]>;
```

Implement parity in:

```text
local-content.repository.ts
async-local-content.repository.ts
supabase-content.repository.ts
```

### Supabase query pattern

Follow the established no-N+1 pattern:

1. query Data activity rows by lesson;
2. return empty immediately if none;
3. collect activity ids;
4. query all objective-link rows for those ids;
5. group ordered objective ids;
6. map each Data activity exactly once.

The same `AbortSignal` must propagate through both network queries.

No per-row objective request.

---

## 21. Activity adapter and catalog integration

Add:

```ts
toDataActivity(dataActivity)
```

Extend:

```ts
buildLessonActivities(
  games,
  experiments,
  simulations,
  inquiries,
  dataActivities
)
```

The adapter must preserve:

- id;
- lesson id;
- title;
- objective ids;
- status;
- source;
- specialized content.

It must apply the same structural objective-id guards as existing activity types.

### Activity Catalog

Extend the existing concurrent load:

```text
games
experiments
simulations
inquiries
dataActivities
```

using one `Promise.all`.

No generic persistence repository method is introduced.

---

## 22. Registry integration

Only after the domain, repository, seed, and runner are real and tested, change:

```text
data.availability
```

from:

```text
planned
```

to:

```text
available
```

Recommended metadata:

```text
kind: data
label: بيانات ورسوم
interactionMode: guided
physical: false
sessionProgress: true
```

`sessionProgress: true` refers only to mounted React session state.

---

## 23. Student renderer integration

Recommended runner:

```text
src/features/data-activities/DataActivityRunner.tsx
```

Register:

```text
data → renderDataActivity
```

inside the existing Student Activity Renderer Registry.

The renderer must:

1. narrow `activity.kind === 'data'`;
2. reject mismatched activity defensively;
3. render `DataActivityRunner`;
4. use the existing `onBackToActivities` callback.

Do not change `App.tsx` to know `data_graph_v1`.

Do not add a Data-specific route to `LessonView`.

---

## 24. DataActivityRunner responsibilities

The runner owns presentation and transient interaction.

It may:

- show title and instructions;
- show scientific context;
- render table;
- render deterministic line graph;
- render numeric task prompts;
- accept numeric input;
- invoke the deterministic engine;
- show transient feedback;
- return to Activity Hub.

It must not:

- query repositories itself;
- call Supabase;
- write persistence;
- update Mastery Results;
- call AI;
- execute authored code;
- maintain an answer key;
- use `useEffect` merely to derive state that can be computed during render.

---

## 25. Suggested seed activity

Use the existing Grade 10 Physics Waves content.

Recommended lesson:

```text
g10-phy-waves-l2
خصائص الموجة
```

Recommended structural objective:

```text
l2-o2
يطبّق الطالب العلاقة بين السرعة والتردد والطول الموجي (v = f λ).
```

Recommended activity concept:

```text
title:
قراءة بيانات التردد والطول الموجي

context:
موجات تتحرك في وسط ثابت السرعة، مع جدول لقيم التردد والطول الموجي.
```

A suitable v1 dataset may expose frequency on x and wavelength as a numeric series.

Tasks may include:

- read a wavelength value at a stated frequency;
- compare the wavelength at two visible frequencies;
- calculate the mean of selected visible wavelength values.

The exact dataset values are fixed only during implementation review.

The seed must use approved content status when the existing Phase 5 seed pattern requires student visibility in real Supabase integration.

---

## 26. Scientific correctness rule

Data content is scientific content, not decorative chart data.

Seed data must be internally consistent with the lesson concept.

For the proposed waves seed:

```text
v = f λ
```

must hold for all authored points within the stated intended precision.

A dedicated seed/domain test must verify the relation deterministically.

Do not rely on visual inspection of the graph.

---

## 27. Table / graph parity

A permanent invariant:

> The table and graph are two views of one dataset.

Tests must prove:

```text
number of x points matches
series point counts match
rendered point order is deterministic
task evaluation reads the same dataset object
```

No second independently authored chart values are allowed.

---

## 28. Mobile and RTL requirements

Phase 5-4B must preserve:

```text
dir="rtl"
Arabic UI
mobile-first layout
touch-friendly input controls
no horizontal page overflow
```

For dense numeric tables:

- allow controlled horizontal scrolling inside the table region if necessary;
- do not force the whole page to horizontal-scroll;
- keep headers associated with values;
- keep graph labels readable on narrow screens.

Scientific x/y geometry remains conventional as specified earlier.

---

## 29. Accessibility requirements

At minimum:

- graph has an accessible textual title/caption;
- table remains available when the activity uses `table_and_line_graph`;
- numeric fields have visible labels;
- feedback is available as text, not color only;
- buttons use existing design-system controls where applicable.

The graph alone must not be the only source of numeric information in the combined mode.

---

## 30. Error behavior

Malformed canonical Data content must fail closed at the parser/mapper boundary.

Examples:

```text
unknown engine kind
empty dataset
non-finite number
series-length mismatch
unknown series id in a task
out-of-range point index
duplicate task id
negative tolerance
unsupported task rule
```

These are content-integrity errors.

The engine must not silently repair malformed canonical content.

---

## 31. Testing contract

Implementation requires the following test families.

### Domain

```text
tests/data-activities/data-activity-domain.test.ts
```

Cover:

- config validation;
- dataset invariants;
- unique ids;
- series length parity;
- rule validation;
- tolerance validation.

### Engine

```text
tests/data-activities/data-activity-engine.test.ts
```

Cover:

- read value;
- signed and absolute difference;
- mean;
- numeric parsing;
- tolerance boundary;
- deterministic behavior;
- invalid references.

### Activity integration

Extend:

```text
tests/activities/activity-adapters.test.ts
tests/activities/activity-registry.test.ts
tests/activities/activity-catalog.service.test.ts
```

### Repository / mapper

Extend:

```text
tests/content/seed.test.ts
tests/content/seed-graph-validation.test.ts
tests/data/supabase-content.mappers.test.ts
tests/data/supabase-content.repository.test.ts
tests/content/async-local-content.repository.test.ts
```

### Runner

```text
tests/features/DataActivityRunner.test.tsx
```

Cover:

- context;
- table/graph presentation;
- numeric input;
- deterministic feedback;
- remount resets session state;
- no persistence.

### Architecture

Permanent file:

```text
tests/architecture/phase-5-4b-data-graph-boundaries.test.ts
```

### Database

```text
supabase/tests/phase_5_4b_data_activities.sql
```

### Real Supabase parity

```text
tests/integration/supabase-data-activity.repository.integration.ts
```

---

## 32. Architecture guards

The Phase 5-4B architecture test must permanently guard:

1. no Data-specific routing in `App.tsx`;
2. no Data-specific routing in `LessonView.tsx`;
3. no generic `public.activities` table;
4. no durable Data/Activity attempt tables;
5. `'data'` remains a declared activity kind;
6. Data remains registered in the Activity Registry;
7. Domain Activity Registry remains React-free;
8. future Data engine remains free of React/network/Supabase/dynamic execution;
9. future Data runner remains session-only with no persistence/network/Mastery writes;
10. forbidden precomputed answer-key field families do not enter the Data content path.

The guard is allowed to activate future-file checks only when those implementation files exist.

This keeps the pre-implementation batch green while making the guard progressively stricter as implementation lands.

---

## 33. Implementation slices after review

Do not implement Phase 5-4B as one uncontrolled patch.

### 5-4B-B — Domain + deterministic engine

Add:

```text
src/types/data-activity.types.ts
src/features/data-activities/engine/data-activity.engine.ts
unit tests
```

No Supabase yet.

### 5-4B-C — Persistence + repository + seed

Add:

```text
migration
pgTAP
rows/mappers
repository parity
seed
seed generator changes
real Supabase parity
```

No UI availability switch until the backend path is real.

### 5-4B-D — Student runner + Activity integration

Add:

```text
DataActivity wrapper
adapter
catalog integration
registry available
renderer
DataActivityRunner
SVG/table presentation
runner tests
```

### 5-4B-E — Full acceptance

Run:

```text
git diff --check
Prettier scoped gate
npm run lint
npm run build
npm test -- --run
npx supabase test db
npm run test:supabase
```

Then perform final staged diff review before commit / PR.

---

## 34. Stop conditions

Implementation must stop and return to design review if any of these becomes necessary:

- generic `activities` persistence;
- durable student attempt persistence;
- Mastery Result changes;
- Data-specific route in App;
- arbitrary code/expression evaluation;
- answer-key storage in student-readable canonical content;
- Authoring / Reviewer changes;
- AI integration;
- a charting dependency required for basic v1 behavior;
- categorical x-axis support that would weaken v1 numeric invariants.

These are scope changes, not “small fixes”.

---

## 35. Acceptance criteria for this design batch

The 5-4B-A design/boundary batch is accepted when:

1. baseline is exactly `a37a7b470f85b9e0d87491bba798673408f226d1`;
2. only the design document and architecture boundary test are added;
3. no production file changes;
4. architecture test passes on the baseline;
5. full normal test suite remains green;
6. lint remains green;
7. build remains green;
8. `git diff --check` passes;
9. independent architecture review approves the contract before 5-4B-B implementation.

---

## 36. Decision summary

Phase 5-4B v1 is:

```text
specialized canonical Data content
+
one canonical numeric dataset
+
table / deterministic line graph views
+
enumerated numeric task rules
+
deterministic session-only feedback
+
structural objective linkage
+
specialized RLS storage
```

It is **not**:

```text
general chart builder
general assessment engine
formula interpreter
AI grader
durable attempt system
Mastery Result path
authoring path
```

That boundary is the central design decision for Phase 5-4B.
