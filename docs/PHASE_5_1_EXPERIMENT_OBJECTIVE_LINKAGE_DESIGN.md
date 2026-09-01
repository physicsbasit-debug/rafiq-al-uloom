# رفيق العلوم — Phase 5-1A

## Experiment Objective Linkage Contract & Data Integrity Design

**الحالة:** APPROVED DESIGN — SECURITY ALIGNMENT CORRECTION RECORDED
**Baseline:** `40cb589d8c7793e589ce784961bb810cfada305d`  
**Phase 5-0:** APPROVED ARCHITECTURE BASELINE  
**Phase 4 frozen baseline:** `v0.7.1-ai-assisted-authoring-closure-repair` → `f63fdcf886911d8c884241701721cce2aaa47c61`  
**Phase:** `5-1 — Experiment Objective Linkage`

> **Security Alignment Correction — Phase 5-1 FIX1**
>
> أثناء التنفيذ كشف pgTAP تعارضًا بين صياغة RLS الأصلية في هذه الوثيقة وبين
> عقد الصلاحيات المعتمد تاريخيًا في Phase 2-C2-A. المرجع الأمني الأعلى هو
> Phase 2-C2-A: لا يملك `anon` صلاحية `SELECT` على جداول المحتوى المحمية،
> بينما يملك `authenticated` و`service_role` صلاحية القراءة الصريحة، وتُقيّد
> قراءة `authenticated` بسياسة RLS تتطلب ملفًا شخصيًا نشطًا ودورًا مسموحًا
> ومحتوى معتمدًا. هذا التصحيح يغيّر بنود Security/RLS والاختبارات المرتبطة
> بها فقط، ولا يغيّر Domain Contract أو Data Model أو Seed/Repository design.

## الهدف

إغلاق فجوة Objective Linkage للتجارب العلمية بحيث تصبح كل تجربة قابلة للتقديم للطالب مرتبطة بنيويًا بهدف تعلم واحد على الأقل، مع الحفاظ الكامل على الحقل النصي الحالي `Experiment.objective` والتوافق الخلفي مع المسار الحالي.

هذه الوثيقة تصميم فقط.

لا تنفذ migration، ولا تعدل TypeScript production، ولا تغير Supabase أو Authoring أو Reviewer.

## المشكلة الحالية

العقد الحالي للتجربة يحتوي الحقل:

```ts
objective: string;
```

وهو وصف بشري حر لهدف التجربة، لكنه ليس علاقة مرجعية قابلة للتحقق مع كيان `Objective`.

في المقابل، الألعاب الحالية تمتلك:

```ts
objectiveIds: string[];
```

وتستخدم جدول الربط `game_objectives`.

لذلك يوجد عدم تكافؤ بنيوي بين عائلتي النشاط الحاليتين.

## القرار الأساسي

يضاف إلى عقد `Experiment`:

```ts
objectiveIds: string[];
```

ويظل الحقل الحالي:

```ts
objective: string;
```

موجودًا دون حذف أو تغيير معنى.

بعد 5-1:

- `objective` = وصف بشري لهدف التجربة.
- `objectiveIds` = العلاقة البنيوية الرسمية مع أهداف التعلم.
- لا يتم اشتقاق `objectiveIds` من النص.
- لا تتم مطابقة `objective` تلقائيًا مع `Objective.text`.
- تشابه النصوص لا يعد ضمانًا للعلاقة.

## Invariants

كل تجربة قابلة للتقديم للطالب يجب أن تحقق:

```text
objectiveIds.length >= 1
```

كما يجب أن يحقق كل Objective مرتبط:

```text
objective.lessonId === experiment.lessonId
```

أي ربط بين تجربة وهدف من درس آخر يعد بيانات غير صالحة ويجب رفضه.

## Backward Compatibility

Phase 5-1 لا:

- تحذف `Experiment.objective`.
- تعيد تسمية `Experiment.objective`.
- تغير طريقة عرضه الحالية.
- تغير Student UI.
- تجبر المستهلكين الحاليين على الاعتماد على نصوص الأهداف المرتبطة.

إضافة `objectiveIds` توسع العقد الحالي بدل استبداله.

## Data Model

يضاف جدول متخصص:

```text
public.experiment_objectives
```

ولا ينشأ جدول عام باسم:

```text
activities
learning_activities
activity_payloads
```

الحقول المقترحة:

```text
experiment_id text NOT NULL
objective_id  text NOT NULL
lesson_id     text NOT NULL
position      integer NOT NULL
```

المفتاح الأساسي:

```text
PRIMARY KEY (experiment_id, objective_id)
```

ويضاف:

```text
UNIQUE (experiment_id, position)
CHECK (position >= 0)
```

وجود `position` مقصود للحفاظ على ترتيب `objectiveIds` بصورة حتمية.

## لماذا يحتوي جدول الربط على lesson_id؟

وجود `lesson_id` يسمح لقاعدة البيانات نفسها بفرض invariant مهم:

> التجربة والهدف المرتبط بها يجب أن يكونا من الدرس نفسه.

الاعتماد على TypeScript أو Seed Validator فقط لا يكفي لحماية قاعدة البيانات من إدخال SQL مباشر غير صالح.

## Composite Foreign Keys

يقترح التصميم إضافة مفاتيح فريدة مركبة على الجداول الحالية:

```text
experiments (id, lesson_id)
objectives  (id, lesson_id)
```

ثم يربط جدول `experiment_objectives` كالتالي:

```text
(experiment_id, lesson_id)
    → experiments(id, lesson_id)

(objective_id, lesson_id)
    → objectives(id, lesson_id)
```

بهذا لا يمكن إنشاء علاقة بين تجربة من درس A وهدف من درس B.

هذه النقطة قرار تصميمي يجب أن يعتمد مستقلًا قبل التنفيذ.

## Delete Semantics

يقترح التصميم:

```text
ON DELETE RESTRICT
```

ولا يستخدم cascade افتراضيًا.

Phase 5-1 ليست مرحلة حذف أو إدارة دورة حياة المحتوى.

## non-empty linkage

قاعدة البيانات تستطيع منع:

- objective غير موجود.
- experiment غير موجود.
- relationship عابر للدروس.
- position سالب.
- objective مكرر داخل التجربة.
- position مكرر داخل التجربة.

أما شرط وجود child row واحد على الأقل لكل Experiment فليس FK عاديًا بسيطًا.

لذلك لا تضيف 5-1 trigger معقدًا فقط لتحقيق هذه القاعدة.

يتم فرض non-empty linkage في 5-1 عبر:

1. Seed validation.
2. Runtime mapper/repository validation.
3. Integration tests.

وعند فتح كتابة الأنشطة داخل `Phase 5-5` يجب أن يفرض Authoring/Publication transaction هذا invariant قبل النشر.

إذا أثبتت المراجعة المستقلة أن DB-level deferred constraint trigger مطلوب منذ 5-1، تتوقف المرحلة ويعاد اعتماد التصميم قبل التنفيذ.

## Domain Contract المستهدف

```ts
export interface Experiment {
  id: string;
  lessonId: string;
  title: string;
  objective: string;
  objectiveIds: string[];
  tools: string[];
  steps: string[];
  safetyNotes: string[];
  safetyLevel: SafetyLevel;
  observationPrompt: string;
  conclusionPrompt: string;
  homeAlternative: string | null;
  status: ContentStatus;
  source: ContentSource;
}
```

`objectiveIds` يجب أن تكون:

- required.
- غير فارغة.
- مرتبة.
- بلا duplicates.
- كل ID موجود.
- كل Objective يعود إلى نفس `lessonId`.

## Seed Contract

التجارب الموجودة في:

```text
src/content/seed/grade10-physics-waves.ts
```

يجب أن تحصل على `objectiveIds` صريحة.

لا يجوز استنتاج الروابط أثناء runtime من `objective` النصي.

`validateSeedGraph()` يجب أن يرفض:

- تجربة بلا objectiveIds.
- objectiveId غير موجود.
- objectiveId من درس آخر.
- objectiveId مكرر.
- علاقة غير متوافقة مع lessonId.

## Seed SQL

`scripts/generate-supabase-seed.ts` يبقى مصدر إنشاء:

```text
supabase/seed.sql
```

ولا يعدل `supabase/seed.sql` يدويًا.

المولد يجب أن يضيف rows إلى:

```text
experiment_objectives
```

بترتيب `objectiveIds`.

شكل الربط المتوقع:

```text
experiment_id
objective_id
lesson_id
position
```

## Supabase Row Layer

يضاف raw row type منفصل:

```ts
export interface ExperimentObjectiveRow {
  experiment_id: string;
  objective_id: string;
  lesson_id: string;
  position: number;
}
```

ولا يضاف `objectiveIds` داخل `ExperimentRow` لأن العمود غير موجود داخل `experiments`.

## Mapper Contract

يتغير mapper مفاهيميًا من:

```ts
mapExperimentRow(row);
```

إلى:

```ts
mapExperimentRow(row, objectiveIds);
```

ويجب أن يرفض:

- empty objectiveIds.
- duplicates.
- invalid raw objective link data.

## Supabase Repository

توقيع `ContentRepository` لا يحتاج إلى التغيير:

```ts
getExperimentsByLesson(
  lessonId: string,
  options?: RepositoryRequestOptions
): Promise<Experiment[]>;
```

التغيير داخلي فقط.

التدفق المستهدف:

```text
1. SELECT experiments WHERE lesson_id = requested lesson
2. إذا لا توجد تجارب → []
3. جمع experiment IDs
4. SELECT experiment_objectives
   WHERE experiment_id IN (...)
   ORDER BY experiment_id
   ORDER BY position
5. تجميع objective IDs لكل experiment
6. mapExperimentRow(experiment, objectiveIds)
7. رفض أي experiment بلا linkage
```

لا يتم تنفيذ N+1 query لكل تجربة.

## Local Repository Parity

بما أن seed Experiment سيحتوي `objectiveIds`، فإن Local Repository يعيد العقد الكامل مباشرة.

يجب أن يثبت اختبار parity أن Local وSupabase يعيدان نفس:

- experiment IDs.
- objectiveIds.
- ترتيب objectiveIds.

## RLS & Grants

المشروع يستخدم explicit table grants، ويظل عقد Phase 2-C2-A هو المرجع الأمني.

لذلك migration الجديدة يجب أن تضمن صراحة:

```text
anon          = no SELECT
authenticated = SELECT
service_role  = SELECT
```

على `experiment_objectives`، مع عدم منح أي write access لأدوار التطبيق.

## RLS Policy

يتم:

```text
ENABLE ROW LEVEL SECURITY
```

على `experiment_objectives`.

سياسة القراءة تكون:

```text
TO authenticated
```

وتسمح بالقراءة فقط عندما تتحقق الشروط جميعًا:

```text
profile.status = active
profile.role IN (student, teacher, reviewer)
experiment.status = approved
lesson.status = approved
```

وبذلك:

- `anon` لا يملك table-level `SELECT` أصلًا.
- المستخدم `authenticated` غير النشط لا يرى الروابط حتى لو كان المحتوى معتمدًا.
- المستخدم النشط لا يرى روابط تجارب أو دروس غير معتمدة.
- `service_role` يحتفظ بسلوك bypass الخاص به، مع explicit `SELECT` table privilege.

## Existing Security Boundary

5-1 لا تمنح:

```text
INSERT
UPDATE
DELETE
```

لـanon أو authenticated على canonical activity tables.

ولا:

- تفتح Teacher direct writes.
- تفتح Reviewer direct writes.
- تغير Authoring Plane.
- تغير Auth.
- تغير Phase 4 security boundaries.

## Required SQL Integrity Tests

يجب أن تثبت PostgreSQL رفض:

```text
experiment → objective from another lesson
duplicate experiment/objective pair
duplicate position for same experiment
negative position
missing experiment
missing objective
```

ويجب أن تقبل:

```text
one valid objective
multiple valid objectives from same lesson
stable ordered positions
```

## Required RLS Tests

يجب إثبات:

```text
anon has no SELECT privilege
active authenticated can read approved linkage
active authenticated cannot read draft linkage
pending authenticated cannot read approved linkage
suspended authenticated cannot read approved linkage
service_role can read required rows
no client write grant was introduced
```

تعمل هذه الاختبارات على Supabase المحلية.

Remote Supabase يبقى خارج نطاق 5-1.

## Required TypeScript Tests

الحد الأدنى المتوقع:

```text
tests/content/seed.test.ts
tests/content/async-local-content.repository.test.ts
tests/data/supabase-content.mappers.test.ts
tests/data/supabase-content.repository.test.ts
```

ويضاف اختبار integration متخصص إذا لزم:

```text
tests/integration/supabase-experiment-objectives.integration.ts
```

## Existing Tests That Must Remain Green

لا يجوز أن تكسر 5-1:

```text
content repository tests
seed tests
Supabase content integration tests
Auth/security tests
Mastery results tests
Teacher/Reviewer tests
Phase 4 closure architecture tests
build
lint
prettier
```

## Candidate Production Scope

بعد اعتماد هذه الوثيقة فقط، النطاق المتوقع للتنفيذ:

```text
src/types/experiment.types.ts
src/content/seed/grade10-physics-waves.ts
src/services/data/supabase-content.rows.ts
src/services/data/supabase-content.mappers.ts
src/services/data/supabase-content.repository.ts
scripts/generate-supabase-seed.ts
supabase/seed.sql
supabase/migrations/<timestamp>_add_experiment_objective_linkage.sql
```

أي Production file إضافي خارج هذا النطاق يحتاج تبريرًا ومراجعة قبل إضافته.

## Explicitly Out of Scope

5-1 لا تعدل:

```text
src/App.tsx
Teacher Workspace
Reviewer Workspace
AuthoringService
ReviewService
AI providers
AI Gateway
Edge Functions
Auth state
Authorization policy
Mastery Results
Game domain
game_objectives contract
LessonRevisionPayload
Phase 4 frozen implementation
```

## No Activity Result Persistence

5-1 لا:

- تحفظ نتائج تنفيذ التجربة.
- تضيف student attempt tables.
- تربط التجارب بـMastery Results.

## No AI Activity Generation

التجارب ليست AI authoring target في 5-1.

لا يضاف target جديد إلى Phase 4 AI contracts.

ولا يوسع Gemini ليولد تجارب.

## Safety Boundary

إضافة Objective Linkage لا تغير عقد السلامة الحالي.

القيم تبقى:

```text
safe_home
teacher_supervised
lab_only
not_allowed
```

ولا يسمح لأي linkage بتغيير أو خفض `safetyLevel`.

## Deferred Phase 5-5 Reviewer Invariant

عند فتح Authoring للتجارب والأنشطة في `Phase 5-5`:

> يجب أن يرى Reviewer المحتوى الفعلي الكامل للنشاط قبل الاعتماد.

لا يكفي عرض:

```text
activity count
objective count
metadata only
summary only
```

ويجب أن تشمل المراجعة الفعلية حينها payload النشاط وروابط الأهداف والسلامة.

هذا invariant موثق الآن فقط ولا يغير Reviewer في 5-1.

## Implementation Work Order After Approval

Phase 5-1 تُنفذ كمسار عمودي End-to-End واحد على فرع تنفيذ واحد وPR واحد.

لا تُدمج `5-1B1` إلى `5-1B5` بصورة مستقلة إلى `main`، ولا تُعامل كمراحل إصدار منفصلة.

كما لا يُنشأ commit وسيط مقصود يترك TypeScript وSQL أو Local وSupabase في حالة عقد غير متطابق.

الأسماء التالية هي **checkpoints داخلية لترتيب العمل والتحقق فقط**:

```text
5-1B1
Prepare the vertical contract change across Domain + Seed + Row/Mapper surfaces
without creating a mergeable intermediate state.

5-1B2
Add SQL schema + same-lesson integrity + RLS/grants on the same implementation branch.

5-1B3
Complete Supabase repository linkage and runtime validation so TypeScript and DB contracts align.

5-1B4
Regenerate seed SQL and prove Local/Supabase objective-linkage parity.

5-1B5
Run SQL/RLS integration, full regression, scope audit, and closure.
```

### Commit and merge rule

- لا merge إلى `main` قبل اكتمال المسار العمودي كله.
- لا PR مرحلي مستقل لكل checkpoint.
- لا يُعتبر أي checkpoint حالة قابلة للإصدار.
- يجب أن يكون أول implementation commit المرشح للمراجعة متماسكًا عموديًا عبر Domain + SQL + Repository + Seed contract.
- إذا احتاج العمل إلى حفظ محلي مؤقت أثناء التطوير، فلا يُقدَّم ذلك كـreview candidate ولا يُدفع باعتباره مرحلة مكتملة.
- قبل أي push للمراجعة يجب أن تكون `build/typecheck` واختبارات الربط الأساسية خضراء وأن لا يوجد contract skew بين TypeScript وPostgreSQL.

بهذا تحافظ 5-1 على القرار الأصلي: لا توجد حالة عامة أو قابلة للدمج يكون فيها عقد التطبيق وقاعدة البيانات مختلفين.

## No Contract-Skew Intermediate State

قاعدة تنفيذية ملزمة في 5-1:

> لا يجوز أن يصل إلى `main`، أو إلى PR مرشح للاعتماد، commit يضيف `Experiment.objectiveIds` من جهة ويترك مخطط PostgreSQL/Repository/Seed contract على العقد القديم من جهة أخرى، أو العكس.

ترتيب العمل الداخلي يجوز أن يكون متسلسلًا، لكن وحدة المراجعة والدمج تظل Vertical End-to-End.

## Stop Conditions

يتوقف التنفيذ فورًا إذا احتاج إلى:

```text
تعديل Authoring Plane
تعديل Reviewer
تعديل LessonRevisionPayload
تعديل Game contract
إضافة generic activity table
إضافة direct canonical writes
إضافة AI experiment generation
تغيير Phase 4 frozen code
حفظ نتائج النشاط
```

كما يتوقف إذا أثبت PostgreSQL أو الاختبارات أن تصميم Composite FK يحتاج تغييرًا جوهريًا.

## معايير قبول Phase 5-1A

تقبل هذه المرحلة فقط إذا:

1. لا يوجد Production code change.
2. لا توجد migration فعلية.
3. لا يوجد Supabase runtime change.
4. يظل `Experiment.objective` محفوظًا.
5. يعتمد `objectiveIds` كالعلاقة الرسمية.
6. يحدد same-lesson invariant بوضوح.
7. يحدد non-empty invariant بوضوح.
8. يحدد SQL/RLS/grants المطلوبة قبل التنفيذ.
9. يحدد local/Supabase parity.
10. يحدد اختبارات الفشل والنجاح المطلوبة.
11. يحافظ على Authoring/Reviewer/AI boundaries.
12. يوثق Reviewer full-content invariant المؤجل لـ5-5.
13. يحصل التصميم على مراجعة مستقلة قبل بدء Production implementation.

## قرار المراجعة المطلوب

قبل 5-1B نحتاج مراجعة مستقلة صريحة للنقاط:

```text
A. هل إضافة objectiveIds إلى Experiment صحيحة؟
B. هل الإبقاء على objective النصي يحقق backward compatibility؟
C. هل experiment_objectives هو التخزين الصحيح بدل generic activities table؟
D. هل lesson_id + Composite FKs هو الأسلوب المناسب لفرض same-lesson في PostgreSQL؟
E. هل Seed + runtime + tests كافية لفرض non-empty في 5-1 مع تأجيل publish-time enforcement إلى 5-5؟
F. هل RLS/GRANT design يحافظ على الحدود الأمنية الحالية؟
G. هل النطاق محدود ولا يعيد فتح Phase 4 أو Authoring/Reviewer؟
H. هل اعتبار 5-1B1 إلى 5-1B5 checkpoints داخلية فقط ضمن فرع/PR عمودي واحد، بلا merge أو review candidate وسيط يترك TypeScript وSQL غير متطابقين، يحافظ على قرار 5-1 الأصلي؟
```

لا يبدأ التنفيذ قبل صدور موافقة صريحة على هذا العقد.
