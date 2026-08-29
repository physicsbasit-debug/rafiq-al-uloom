# رفيق العلوم — Phase 5-0

## Science Activities Contract & Architecture

**الحالة:** ARCHITECTURE BASELINE CANDIDATE
**Phase 4 frozen baseline:** `v0.7-ai-assisted-authoring-complete`
**Phase 5:** Advanced Science Activities

## الهدف

تأسيس عقد معماري قابل للتوسع للأنشطة العلمية قبل إضافة أنواع جديدة من الألعاب أو المحاكاة أو أنشطة الاستقصاء والبيانات.

هذه المرحلة توثيقية فقط. لا تضيف SQL أو migrations أو تغييرات تشغيلية أو أنواع نشاط جديدة.

## الوضع الحالي

يمتلك رفيق العلوم مسارين منفصلين:

1. الألعاب التعليمية، والنوع المدعوم حاليًا هو `matching` فقط.
2. التجارب العلمية، وهي كيان مستقل يحتوي الأدوات والخطوات والسلامة والملاحظة والاستنتاج.

الألعاب مرتبطة رسميًا بأهداف التعلم عبر `objectiveIds` و`game_objectives`.

أما التجارب فتمتلك حاليًا حقل `objective` نصيًا فقط، ولا توجد لها علاقة رسمية بأهداف الدرس.

## القرار المعماري الرئيسي

لن يتم دمج `games` و`experiments` في جدول واحد داخل Phase 5.

بدلًا من ذلك تعتمد Phase 5 مفهومًا منطقيًا أعلى باسم `LearningActivity`.

`LearningActivity` هو Domain/UI contract يوحّد اكتشاف الأنشطة وعرضها وتصنيفها، بينما يبقى التخزين المتخصص لكل عائلة نشاط مستقلًا.

## Activity Domain

العقد المنطقي المشترك لأي نشاط علمي يجب أن يعبّر عن:

- `id`
- `lessonId`
- `kind`
- `title`
- `objectiveIds`
- `status`
- `source`

ولا يعني ذلك أن جميع الأنشطة ستستخدم interface أو جدولًا واحدًا للتخزين.

البنية المستهدفة مفاهيميًا:

- `MatchingActivity`
- `ExperimentActivity`
- `SimulationActivity`
- `InquiryActivity`
- `DataActivity`

كل نوع يحتفظ بـpayload متخصص.

### MatchingActivity

يحتفظ بمفهوم الأزواج الحالي ولا يُعاد تصميم لعبة المطابقة في Phase 5-0.

### ExperimentActivity

يحتفظ ببيانات الأدوات والخطوات والسلامة والملاحظة والاستنتاج والبديل المنزلي، ويضاف إليه لاحقًا ارتباط رسمي بأهداف التعلم.

### SimulationActivity

يجب أن يمتلك لاحقًا عقدًا صريحًا للمتغيرات والمدخلات والمخرجات والقواعد العلمية، ولا يعتمد على JavaScript حر مخزن داخل المحتوى.

### InquiryActivity

يمثل نشاطًا قائمًا على سؤال أو فرضية أو ملاحظة أو استنتاج، مع فصل واضح بين المطلوب من الطالب والمعلومة المرجعية.

### DataActivity

يمثل قراءة أو معالجة بيانات علمية مثل الجداول والرسوم والعلاقات الكمية، مع محرك حتمي للتحقق متى كانت الإجابة قابلة للحساب.

## Objective Linkage

قاعدة Phase 5:

> كل نشاط قابل للتقديم للطالب يجب أن يرتبط بهدف تعلم واحد على الأقل ارتباطًا بنيويًا قابلًا للتحقق.

الألعاب الحالية تحقق هذه القاعدة.

التجارب الحالية لا تحققها بالكامل لأن `Experiment.objective` نص حر وليس مرجعًا إلى Objective.

لذلك تكون Phase 5-1 مخصصة لإضافة الارتباط الرسمي للتجارب مع الحفاظ على التوافق الخلفي.

الحقل الحالي `Experiment.objective` لا يحذف في 5-1 مباشرة، بل يعامل مؤقتًا بوصفه وصفًا لهدف التجربة إلى أن تكتمل خطة الترحيل.

## Persistence Strategy

لا تنشئ Phase 5-0 جدولًا عامًا باسم `activities`.

تبقى `games` و`experiments` كما هي.

ويجوز للأنواع المستقبلية الحصول على تخزين متخصص إذا أثبت العقد حاجتها إليه.

هذه السياسة تمنع إعادة فتح Authoring Plane وRLS والنشر المجمد بلا حاجة.

## Student Result Persistence

نتائج المحاكاة والألعاب والأنشطة الجديدة تكون افتراضيًا session-only في بداية Phase 5.

أي حفظ دائم لمحاولات الأنشطة يتطلب مرحلة وعقدًا مستقلين، ولا يتم ربطه تلقائيًا بـMastery Results الحالية.

## Safety Contract

السلامة جزء من Domain وليس من العرض فقط.

أي تجربة أو نشاط مادي يجب أن يعلن مستوى السلامة صراحة.

القيم الحالية المعتمدة تبقى:

- `safe_home`
- `teacher_supervised`
- `lab_only`
- `not_allowed`

ولا يجوز للواجهة أو AI خفض مستوى السلامة أو تجاوزه.

المحاكاة البرمجية لا تعامل تلقائيًا كتجربة مادية، لكن محتواها العلمي يظل خاضعًا للتحقق التربوي والعلمي.

## Layer Boundaries

### App

يبقى `App.tsx` مسؤولًا عن التنقل عالي المستوى فقط.

لا يوضع فيه منطق تشغيل المحاكاة أو تقييم الإجابات أو قواعد النشاط أو التحقق العلمي أو منطق التخزين.

### Activity Domain

يملك أنواع النشاط وmetadata المشتركة وobjective linkage وactivity capabilities.

### Activity Registry

يستخدم لاحقًا لربط `kind` بالمشغل أو الواجهة المناسبة دون switch متضخم داخل App.

### Activity Engines

كل محرك حتمي مستقل عن React قدر الإمكان وقابل للاختبار بوحدة منفصلة.

### React Features

مسؤولة عن التفاعل والعرض فقط، وتستهلك العقود والمحركات.

## Authoring Boundary

أي نشاط قابل للتأليف يجب أن يمر بنفس السلسلة المجمدة:

`Teacher Form Buffer → Lesson Revision → Submit → Reviewer → Approve → canonical publication`

لا يوجد نشاط علمي يملك مسار نشر مباشر خارج Authoring Plane.

ولا يمنح AI صلاحية حفظ أو إرسال أو اعتماد أو نشر النشاط مباشرة.

## خطة Phase 5

- `5-0` Science Activities Contract & Architecture
- `5-1` Experiment Objective Linkage
- `5-2` Activity Domain + Registry + Student Activity Hub
- `5-3` Interactive Science Simulation Engine
- `5-4` Inquiry + Data/Graph Activities
- `5-5` Teacher Authoring + Reviewer Integration
- `5-6` Real Composition + Safety + Mobile/RTL QA
- `5-Freeze` Closure & Freeze

## معايير قبول 5-0

1. لا Production code.
2. لا SQL أو migrations.
3. لا تغيير لسلوك لعبة المطابقة.
4. لا تغيير لسلوك التجارب الحالية.
5. تعريف واضح لـLearningActivity.
6. اعتماد التخزين المتخصص بدل الجدول العام.
7. تحديد فجوة Objective Linkage للتجارب.
8. تحديد حدود App وDomain وRegistry وEngine وUI.
9. تحديد سياسة السلامة.
10. تحديد سياسة عدم حفظ نتائج الأنشطة افتراضيًا.
11. الحفاظ الكامل على Authoring/Reviewer boundaries.
12. بقاء وسم Phase 4 ثابتًا على الالتزام المجمد.

## Non-goals

Phase 5-0 لا تنشئ simulation، ولا تضيف game type جديدًا، ولا تعدّل `Game` أو `Experiment` أو `LessonRevisionPayload`، ولا تنشئ `experiment_objectives`، ولا تعدّل Supabase، ولا تعيد فتح Phase 4.

## المرحلة التالية

بعد اعتماد 5-0 تبدأ `Phase 5-1 — Experiment Objective Linkage`.

وهي أول مرحلة تنفيذية، ويجب أن تكون backward-compatible ومحمية باختبارات TypeScript وSQL وSupabase integration قبل الانتقال إلى Activity Registry.
