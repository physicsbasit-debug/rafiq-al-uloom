# رفيق العلوم — Phase 5-2

## Activity Domain + Registry + Student Activity Hub

### Official Design & Kickoff Contract

**الحالة:** APPROVED DESIGN — READY FOR PHASE 5-2 IMPLEMENTATION
**Baseline:** `main` @ `5108a69867b7b94d4c54b6c26f14b4a7ed34b037`
**Architecture review:** `PHASE_5_2_ARCHITECTURE_REVIEW=APPROVED`
**نوع الوثيقة:** عقد التصميم والانطلاق الرسمي لـPhase 5-2، بلا كود تنفيذي.

---

## 1) Baseline المعتمد الآن

المستودع:

`physicsbasit-debug/rafiq-al-uloom`

الفرع المعتمد:

`main`

رأس `main` بعد دمج Phase 5-1:

`5108a69867b7b94d4c54b6c26f14b4a7ed34b037`

Phase 5-1 أُغلقت عبر:

- PR: `#5`
- implementation commit:
  `4573df6f18446b8df2168a2b9991a4585e343a62`
- merge commit:
  `5108a69867b7b94d4c54b6c26f14b4a7ed34b037`
- 16 ملفات
- 832 additions / 37 deletions
- final independent staged review:
  `PHASE_5_1_FINAL_STAGED_REVIEW=APPROVED`

Phase 5-1 أضافت الارتباط البنيوي للتجارب بأهداف التعلم، وأصبح:

`Experiment.objectiveIds: string[]`

إلزاميًا مع بقاء:

`Experiment.objective: string`

للتوافق الخلفي كنص بشري.

كما أضيف `experiment_objectives` مع:

- same-lesson composite foreign keys
- ترتيب deterministic position
- `ON DELETE RESTRICT`
- RLS متوافق مع Phase 2-C2-A:
  - لا SELECT لـ`anon`
  - SELECT لـ`authenticated` و`service_role`
  - المستخدم authenticated يجب أن يكون active وبدور مسموح
  - experiment وlesson يجب أن يكونا approved
  - لا client writes

بوابات Phase 5-1 النهائية:

- targeted TypeScript: `69/69`
- pgTAP: `30/30`
- AI gateway targeted integration: `8/8`
- Supabase integration: `146 passed`, و`3` live tests skipped عمدًا
- full normal suite: `893/893`
- Prettier: PASS
- ESLint: PASS
- production build: PASS
- `git diff --check`: PASS

لا يوجد Tag خاص بـPhase 5-1.

---

## 2) العقود المجمدة التي لا يجوز لـPhase 5-2 فتحها

### Phase 4 / Authoring Plane

Authoring Plane مجمد:

`Teacher Form Buffer → Lesson Revision → Submit → Reviewer → Approve → canonical publication`

لا يجوز لأي نشاط جديد:

- الحفظ المباشر في canonical content
- submit مباشر خارج المسار
- approve مباشر
- publish مباشر
- منح AI أي صلاحية حفظ/إرسال/اعتماد/نشر

Phase 5-2 لا تعدل Authoring أو Reviewer أو AI.

### Persistence

لا يوجد جدول عام `activities`.

التخزين يبقى متخصصًا:

- `games`
- `experiments`

ولا تضيف Phase 5-2:

- `simulations`
- `inquiries`
- `data_activities`
- أي migration جديدة
- أي SQL جديد

### Results

نتائج الأنشطة الجديدة في Phase 5 تبدأ session-only.

Phase 5-2:

- لا تضيف durable activity attempts
- لا تعدل Mastery Results
- لا تربط نشاطًا تلقائيًا بنتيجة إتقان

### Safety

مستويات السلامة الحالية ثابتة:

- `safe_home`
- `teacher_supervised`
- `lab_only`
- `not_allowed`

لا UI ولا Registry ولا AI يستطيع خفض مستوى سلامة تجربة.

---

## 3) الوضع الفعلي الحالي في الكود

### Game

`Game` حاليًا:

- `id`
- `lessonId`
- `type: 'matching'`
- `title`
- `instructions`
- `items`
- `objectiveIds`
- `status`
- `source`

### Experiment

`Experiment` حاليًا:

- `id`
- `lessonId`
- `title`
- `objective`
- `objectiveIds`
- tools / steps
- safety notes / safety level
- observation / conclusion prompts
- home alternative
- `status`
- `source`

### ContentRepository

يوجد حاليًا:

- `getGamesByLesson`
- `getExperimentsByLesson`
- `getObjectivesByIds`
- بقية عقود المحتوى

Phase 5-2 يجب أن **تستهلك هذه العقود** بدل إنشاء persistence contract عام جديد.

### Student UI

`App.tsx` يملك حاليًا Step منفصلًا للعبة:

`{ name: 'game'; lessonId; unitId }`

ويستدعي `MatchingGameView` مباشرة.

`LessonView`:

- يعرض `LessonExperiments` inline داخل الدرس
- يملك زر `لعبة تعليمية`
- يملك أزرار المراجعة والإتقان

لا يوجد Student Activity Hub حاليًا.

### Matching

`MatchingGameView`:

- يجلب games بالدرس
- يجلب أهدافها
- يشغّل matching engine
- يحفظ حالة الجولة في React session state فقط
- لا يحفظ نتيجة دائمة

### Experiments

التجارب تُعرض حاليًا عبر:
`LessonExperiments → ExperimentCard`

ولا يوجد standalone activity runner للتجربة.

---

# 4) الهدف الدقيق لـPhase 5-2

إنشاء طبقة نشاط منطقية موحدة فوق التخزين المتخصص الحالي، ثم Student Activity Hub قابل للتوسع دون تحويل `App.tsx` إلى switch ضخم لكل نوع نشاط مستقبلي.

Phase 5-2 يجب أن تحقق ثلاثة مخرجات فقط:

1. **Activity Domain**
2. **Activity Registry**
3. **Student Activity Hub**

ولا تنشئ Simulation بعد؛ ذلك Phase 5-3.

---

# 5) القرار المقترح: Activity Domain

إنشاء عقد مشترك React-free.

## LearningActivityKind

يُعرّف المجال الكامل المخطط له:

```ts
type LearningActivityKind = 'matching' | 'experiment' | 'simulation' | 'inquiry' | 'data';
```

لكن Phase 5-2 لا تنشئ محتوى وهميًا للأنواع الثلاثة المستقبلية.

## Common activity metadata

كل نشاط قابل للتقديم للطالب يجب أن يعبّر عن:

```ts
interface LearningActivityBase {
  id: string;
  lessonId: string;
  kind: LearningActivityKind;
  title: string;
  objectiveIds: string[];
  status: ContentStatus;
  source: ContentSource;
}
```

## Current executable union

Phase 5-2 تنتج فقط adapters للكيانات الموجودة فعلًا:

```ts
interface MatchingActivity extends LearningActivityBase {
  kind: 'matching';
  content: Game;
}

interface ExperimentActivity extends LearningActivityBase {
  kind: 'experiment';
  content: Experiment;
}

type AvailableLearningActivity = MatchingActivity | ExperimentActivity;
```

الهدف من `content`:

- الحفاظ على specialized payload
- عدم نسخ حقول game/experiment إلى schema عام
- عدم تغيير جداول التخزين
- عدم فقد أي safety أو game payload

## Invariants

أي adapter يجب أن يرفض أو يمنع إنتاج Activity إذا:

- `objectiveIds.length === 0`
- يوجد objective ID فارغ
- يوجد duplicate objective ID
- اختلف `lessonId` بين wrapper والمحتوى

ولا يقوم بأي text matching تلقائي.

---

# 6) القرار المقترح: Activity Adapters

إنشاء adapters خالصة:

- `toMatchingActivity(game)`
- `toExperimentActivity(experiment)`
- `buildLessonActivities(games, experiments)`

الخصائص:

- deterministic
- React-free
- لا network
- لا Supabase
- لا mutation للمصدر
- لا safety rewriting
- تحافظ على source/status/objectiveIds كما هي

الترتيب المقترح:

1. ترتيب حسب registry `displayOrder`
2. داخل النوع الواحد يحافظ على ترتيب repository الحالي
3. tie-breaker بالـid فقط إذا احتاج الاختبار

لا randomization داخل Activity Catalog.

---

# 7) القرار المقترح: Activity Registry

يجب منع switch متضخم داخل `App.tsx`.

## Domain Registry — React-free

Registry يحتوي metadata/capabilities فقط.

مقترح:

```ts
interface ActivityRegistryEntry {
  kind: LearningActivityKind;
  label: string;
  displayOrder: number;
  availability: 'available' | 'planned';
  interactionMode: 'interactive' | 'guided';
  physical: boolean;
  sessionProgress: boolean;
}
```

Phase 5-2:

- matching = available / interactive / non-physical / session progress
- experiment = available / guided / physical / no persisted result
- simulation = planned
- inquiry = planned
- data = planned

**ممنوع** وضع React component داخل Domain Registry.

## UI Renderer Registry

داخل React feature layer يوجد map صغير مستقل:

`kind → renderer`

ويستهلك فقط الأنواع المتاحة حاليًا.

`App.tsx` لا يحتوي switch لكل نوع نشاط.

عند إضافة Simulation في 5-3:

- يسجل renderer جديد
- لا يضاف فرع simulation جديد داخل App.

---

# 8) القرار المقترح: Activity Catalog Service

بدل إضافة `getActivitiesByLesson()` إلى `ContentRepository` وإيهام وجود storage عام:

إنشاء service تجميعي أعلى من repository:

```text
ActivityCatalogService
  ├─ getGamesByLesson()
  └─ getExperimentsByLesson()
       ↓
  adapters
       ↓
AvailableLearningActivity[]
```

الاستدعاءان يعملان بالتوازي عبر `Promise.all`.

نفس `AbortSignal` يمر لكليهما.

لا N+1.

لا SQL جديد.

لا تعديل RLS.

لا تعديل Supabase repository إلا إذا كشف preflight حاجة حقيقية غير متوقعة؛ الافتراض الحالي: **لا حاجة**.

---

# 9) Student Activity Hub

إضافة Step عالي المستوى واحد فقط داخل Student Experience:

```ts
{
  name: 'activities';
  lessonId: string;
  unitId: string;
}
```

`App.tsx` يعرف Hub فقط، ولا يعرف matching/experiment/simulation runners واحدًا واحدًا.

## LessonView

إضافة زر واضح:

`الأنشطة العلمية`

مع الحفاظ مؤقتًا على المسارات الحالية حتى تثبت QA عدم وجود regression.

**اقتراح المحافظة على backward compatibility في 5-2:**

- لا نحذف `LessonExperiments` inline
- لا نحذف زر `لعبة تعليمية` الحالي
- نضيف Hub كمسار إضافي
- إزالة الازدواج أو إعادة تركيب LessonView تؤجل إلى 5-6 Real Composition إذا أثبتت الحاجة

هذا يجعل 5-2 additive لا destructive.

## Hub cards

لكل AvailableLearningActivity:

- النوع
- العنوان
- أهداف التعلم المرتبطة
- source/status لا يلزم عرضهما للطالب لكن يبقيان في domain
- experiment يعرض safety level بوضوح
- زر فتح النشاط

Empty state واضح.

Loading/error عبر QueryBoundary الحالي.

RTL/mobile-first.

---

# 10) تشغيل النشاط داخل Hub

المقترح أن يكون اختيار النشاط داخل Hub نفسه، لا Step جديد لكل kind في App.

```text
StudentActivityHub
  → selectedActivityId
  → StudentActivityHost
  → UI Renderer Registry
  → Matching renderer أو Experiment renderer
```

وبهذا:

- App يملك Step واحدًا للأنشطة
- إضافة الأنواع المستقبلية لا توسع App

## Matching

الحفاظ على المحرك الحالي.

لتمكين تشغيل activity واحدة من Hub دون كسر السلوك القديم:

إما:

1. إضافة `gameId?: string` إلى `MatchingGameView` مع إبقاء السلوك الحالي عند غيابه، أو
2. استخراج presentational runner مشترك يقبل `Game[]` واستخدام `[selectedGame]` من Hub.

**التفضيل المعماري:** الخيار 2 إذا كان الاستخراج صغيرًا وآمنًا؛ الخيار 1 إذا أظهر preflight أن الاستخراج يسبب refactor واسعًا.

لا تغيير في scoring/feedback/randomization semantics.

## Experiment

إنشاء renderer خفيف يعيد استخدام `ExperimentCard` أو View صغيرة للـExperiment المختارة.

لا "نجاح/رسوب" ولا نتيجة مصطنعة للتجربة في 5-2.

سلامة التجربة تظهر بلا تخفيض أو override.

---

# 11) Objective display

Hub يحتاج نصوص الأهداف لا IDs فقط.

الطريقة المقترحة:

1. catalog يجلب activities
2. يجمع `objectiveIds` الفريدة
3. يستخدم `getObjectivesByIds`
4. UI يبني map `objectiveId → Objective`

لا query لكل activity.

ممنوع N+1.

إذا objective ID مفقود رغم أن المحتوى وصل:

- لا نخفي الخلل
- يظهر Error contract أو invariant failure في التطوير/الاختبار
- لا يتم اختراع نص هدف بديل

---

# 12) Security

Phase 5-2 **لا تغير RLS**.

القراءة تستمر عبر عقود المحتوى الحالية.

لا:

- grants جديدة
- policies جديدة
- migrations
- RPCs
- anonymous privilege expansion

المحتوى المنشور الذي يصل للطالب يبقى خاضعًا لعقود Phase 2-C2-A الحالية.

---

# 13) Non-goals الصريحة

Phase 5-2 لا تقوم بأي من التالي:

- لا Simulation engine
- لا Inquiry activity implementation
- لا Data/Graph activity implementation
- لا generic `activities` table
- لا migration
- لا seed content جديد
- لا authoring forms
- لا reviewer UI
- لا AI generation
- لا activity result persistence
- لا Mastery Results integration
- لا safety rule redesign
- لا حذف legacy `Experiment.objective`
- لا تغيير matching scoring
- لا إعادة تصميم Lesson page بالكامل
- لا remote Supabase deployment

---

# 14) الاختبارات المطلوبة

## Domain

- adapters تنتج common metadata الصحيح
- objectiveIds preserved
- no mutation
- duplicate/empty objective IDs rejected
- kind correct
- experiment safety preserved

## Registry

- kinds unique
- display order deterministic
- current kinds available
- future kinds planned فقط
- لا React import في domain registry

## Catalog

- games + experiments fetched exactly once per lesson
- requests parallel قدر الإمكان
- same AbortSignal
- no N+1
- deterministic result
- repository failure propagates clearly

## Hub

- loading
- error + retry
- empty state
- cards للـmatching والexperiment
- objective text resolved
- safety badge للتجربة
- selection/open/back
- renderer dispatch by registry
- unknown/unavailable kind fails safely

## Regression

- direct legacy Matching route ما زال يعمل
- LessonExperiments inline ما زالت تعمل
- full existing suite
- build/lint/prettier
- Supabase integration unchanged
- no SQL diff

---

# 15) بوابات القبول المقترحة

قبل التنفيذ:

1. `main` = `5108a69867b7b94d4c54b6c26f14b4a7ed34b037`
2. worktree clean
3. لا `activity.types.ts`/registry/hub موجود مسبقًا بصورة متعارضة
4. repository contracts الحالية مؤكدة

بعد التنفيذ:

1. targeted Phase 5-2 tests PASS
2. full `npm run test` PASS
3. `npm run lint` PASS
4. `npm run build` PASS
5. `npx prettier --check .` PASS
6. `git diff --check` PASS
7. إذا لم يتغير SQL: إثبات `git diff --name-only -- supabase/migrations supabase/tests` فارغ بالنسبة لـ5-2
8. existing Supabase integration suite PASS إذا كانت البيئة المطلوبة جاهزة
9. independent final staged review APPROVED
10. commit واحد متماسك
11. PR واحد
12. merge إلى main
13. لا Tag لهذه المرحلة الداخلية

---

# 16) Work order المقترح

Phase 5-2 تكون implementation vertical واحدة بعد اعتماد التصميم.

Internal checkpoints فقط، وليست commits/PRs مستقلة:

### 5-2 B1

Activity Domain + adapters + tests

### 5-2 B2

Domain Registry + Catalog Service + tests

### 5-2 B3

Student Activity Hub + UI Renderer Registry

### 5-2 B4

App/Lesson integration + regression tests + final QA

لا نقدم أي checkpoint منفرد على أنه review candidate غير متماسك.

---

# 17) الملفات المتوقعة مبدئيًا

هذه ليست قائمة تنفيذ نهائية حتى preflight، لكنها نطاق متوقع للمراجعة.

### New

- `src/types/activity.types.ts`
- `src/features/activities/activity-adapters.ts`
- `src/features/activities/activity-registry.ts`
- `src/services/activities/activity-catalog.service.ts`
- `src/services/queries/activity-query.hooks.ts`
- `src/features/activities/StudentActivityHub.tsx`
- `src/features/activities/StudentActivityHost.tsx`
- `src/features/activities/student-activity-renderer.registry.tsx`
- tests مقابلة

### Likely modified

- `src/App.tsx`
- `src/features/student/lesson-view/LessonView.tsx`
- ربما `src/features/games/matching/MatchingGameView.tsx` فقط إذا احتاج تشغيل لعبة واحدة من Hub

### Expected untouched

- Supabase migrations
- Supabase RLS
- seed
- Authoring Plane
- Reviewer Workspace
- AI gateway
- Mastery Results
- experiment persistence schema

إذا كشف preflight خلاف ذلك، نتوقف قبل الكود ونراجع التصميم.

---

# 18) Documentation status alignment في Phase 5-2A

يُصحَّح drift التوثيقي المعروف صراحةً داخل Phase 5-2A نفسها، وبصورة docs-only، دون إعادة فتح أي قرار معماري:

- `docs/PHASES.md` تُحدَّث حالة Phase 5 فقط لتسجل أن:
  - `5-0` معتمدة ومغلقة.
  - `5-1` مغلقة على `main` عند merge commit `5108a69867b7b94d4c54b6c26f14b4a7ed34b037`.
  - `5-2` هي المرحلة الحالية.
- `docs/PHASE_5_0_SCIENCE_ACTIVITIES_ARCHITECTURE.md` يُصحَّح سطر الحالة من re-approval pending إلى baseline معماري معتمد ومغلق، مع ملاحظة قصيرة أن `5-0R` اعتمد إعادة الربط على baseline Phase 4 V2 وأن `5-1` أُنجزت لاحقًا دون تغيير قرارات 5-0.

هذا التصحيح **حالة توثيقية فقط**:

- لا يغيّر Domain أو Persistence أو RLS أو Authoring أو Results أو Safety.
- لا يعيد فتح `5-0` أو `5-1`.
- لا يضيف SQL أو production code.

---

# 19) Architecture approval record

اعتمدت المراجعة المعمارية المستقلة التصميم قبل التنفيذ:

```text
PHASE_5_2_ARCHITECTURE_REVIEW=APPROVED
```

وسجلت المراجعة تحديدًا أن:

- `AvailableLearningActivity` wrapper فوق `Game` و`Experiment` هو الحد الصحيح بدل تغيير نماذج التخزين.
- `ActivityCatalogService` يجب أن يبقى أعلى `ContentRepository` بدل توسيع عقد التخزين بمفهوم عام للأنشطة.
- الفصل بين Domain Registry وUI Renderer Registry ضروري.
- Student Activity Hub يُضاف additive مع إبقاء direct matching وinline experiments في Phase 5-2.
- Step واحد باسم `activities` في `App.tsx` يمنع تضخم App مع الأنواع المستقبلية.
- جلب الأهداف يتم دفعة واحدة بعد تجميع `objectiveIds` الفريدة، دون N+1.
- capabilities المقترحة كافية وغير استباقية.
- Phase 5-2 لا تفتح عقود Phase 4/Authoring/RLS/Results/Safety.
- عقد الاختبارات والبوابات كافٍ.
- تصحيح documentation drift ضمن Phase 5-2A معزول عن التنفيذ البرمجي ومقبول.

---

# 20) Execution gate

لا يبدأ التنفيذ البرمجي لـB1–B4 إلا بعد:

1. نجاح preflight على:
   `main=5108a69867b7b94d4c54b6c26f14b4a7ed34b037`.
2. ثبوت worktree نظيف وعدم وجود Activity surfaces متعارضة.
3. اعتماد ملفات Phase 5-2A الثلاثة فعليًا بمراجعة مستقلة.
4. دمج Phase 5-2A إلى `main`.
5. إنشاء فرع التنفيذ العمودي من baseline التوثيقي الجديد.

Phase 5-2A نفسها docs-only ولا تنشئ production code أو SQL أو migrations أو seed أو RLS أو UI.
