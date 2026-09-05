# رفيق العلوم — Phase 5-5

## Teacher Authoring + Reviewer Integration for Science Activities

**الحالة:** PRE-IMPLEMENTATION CONTRACT — 5-5A
**Baseline:** `main` @ `33181a65bbde813d0ec2e863dd60e5ec4af8dfa7`
**Branch:** `phase-5-5-activity-authoring-reviewer`
**Scope:** Authoring / Reviewer integration for `matching`, `experiment`, `simulation`, `inquiry`, and `data`
**Production implementation:** NOT STARTED in 5-5A

## الهدف

دمج الأنشطة العلمية المتخصصة في مسار التأليف والمراجعة الحالي دون إنشاء مسار نشر موازٍ ودون كسر عقود Phase 3 وPhase 4 المجمدة.

المسار الوحيد المعتمد يبقى:

```text
Teacher Form Buffer
→ LessonRevisionPayload
→ Save Draft
→ Submit
→ Reviewer
→ Approve / Reject
→ Atomic canonical publication
```

لا تكتب واجهة المعلم مباشرة في جداول المحتوى canonical، ولا يملك AI صلاحية الحفظ أو الإرسال أو الاعتماد أو النشر.

## الفجوة الحالية

`LessonRevisionPayload` الحالي يدعم:

```text
lesson
objectives
questions
games
experiments
```

ولا يدعم بعد:

```text
simulations
inquiries
dataActivities
```

كما أن `experiments` داخل Authoring تحتفظ بالوصف النصي `objective` لكنها لا تحمل الارتباط البنيوي بالأهداف الذي أصبح موجودًا في المحتوى canonical.

لذلك Phase 5-5 ليست تعديل واجهة فقط، بل توسيع منظم لعقد Revision والتحقق الخادمي والنشر الذري وواجهتي Teacher وReviewer.

## عقد Revision للأنشطة العلمية

يُوسّع `LessonRevisionPayload` ليضيف المصفوفات التالية:

```text
simulations
inquiries
dataActivities
```

كما يضاف إلى `experiments` الحقل `objectiveKeys` مع الإبقاء على `objective` النصي للتوافق الخلفي والوصف التربوي.

### المفاتيح داخل Revision

- كل نشاط يستخدم `key` محليًا ثابتًا داخل المسودة، وليس canonical id.
- كل نشاط قابل للتقديم للطالب يستخدم `objectiveKeys` للإشارة إلى `payload.objectives[].key`.
- لا تُخزن canonical objective IDs داخل Revision لأن IDs النهائية لا تكون معروفة بعد للدرس الجديد.
- يجب أن تكون `key` غير فارغة وفريدة داخل عائلة النشاط نفسها.
- يجب أن تكون `objectiveKeys` غير فارغة، بلا تكرار، وكل قيمة منها تشير إلى هدف موجود في نفس Revision عند الإرسال للمراجعة.

### التحويل عند الاعتماد

عند اعتماد Reviewer ينشئ الخادم المحتوى canonical أولًا، ثم يحول `objectiveKeys` إلى objective IDs الجديدة، ثم ينشئ النشاط في جدوله المتخصص وروابط الأهداف داخل المعاملة الذرية نفسها.

لا يجوز للمتصفح تنفيذ هذا التحويل أو الكتابة مباشرة إلى جداول الأنشطة canonical.

## التوافق الخلفي مع Revisions التاريخية

- قد توجد Revisions قديمة لا تحتوي `simulations` أو `inquiries` أو `dataActivities`.
- عند القراءة فقط، تُطبّع المصفوفات الجديدة المفقودة إلى `[]` قبل إرجاع `LessonRevisionPayload` للتطبيق.
- التجارب التاريخية التي لا تحتوي `objectiveKeys` تُطبّع إلى `objectiveKeys: []` لأغراض القراءة والعرض فقط.
- يمنع استنتاج `objectiveKeys` تلقائيًا من النص الحر `objective` لأن التشابه النصي ليس ارتباطًا بنيويًا موثوقًا.
- تبقى Revisions المعتمدة التاريخية قابلة للقراءة دون إعادة كتابة بياناتها.
- تبقى المسودات التاريخية قابلة للفتح والحفظ داخل Revision الحالية، أما Revision المرفوضة فلا تعدل in-place؛ ينشأ منها successor Revision جديد باستخدام `supersedesRevisionId` وفق العقد الحالي.
- قبل Submit بعد 5-5 يجب أن تحقق كل تجربة قابلة للتقديم للطالب ارتباطًا بنيويًا صالحًا عبر `objectiveKeys`.
- أي Revision تاريخي بحالة `pending_review` يفتقد الارتباط البنيوي لا يُعتمد بصمت؛ يعاد للمعلم لاستكمال الارتباط ثم ينشأ Revision جديد وفق المسار الحالي.
- تبقى صلاحية حفظ المسودة منفصلة عن جاهزية الإرسال، بما يتوافق مع عقد `p_require_complete` الحالي.

## Snapshot المحتوى والحفاظ على الأنشطة

- عند إنشاء Revision لدرس canonical معتمد، يجب أن تمثل المسودة snapshot كاملًا للحالة المراد نشرها، بما فيها `games`, `experiments`, `simulations`, `inquiries`, و`dataActivities` وروابط أهدافها.
- لا يعتمد مسار الاعتماد على carry-forward مخفي من الجداول القديمة؛ محتوى Revision هو المصدر الكامل للحالة canonical الجديدة.
- المصفوفة الموجودة صراحة بقيمة `[]` تعني أن المعلم يريد عدم وجود أنشطة من تلك العائلة في النسخة الجديدة.
- الحقل المفقود لا يعامل كطلب حذف؛ يظل حالة legacy فقط ولا يجوز اعتماد Revision جديد وهو مفقود.
- عند فتح درس معتمد للتعديل، يجب تحميل كل الأنشطة canonical الحالية وتحويل objective IDs إلى `objectiveKeys` المطابقة داخل Form Buffer.
- عند الاعتماد تنشأ النسخة الجديدة للدرس وكل أنشطتها وروابط أهدافها داخل transaction واحدة.

## توسيع canonical fingerprint

- يجب أن تشمل `lesson_content_fingerprint` كامل graph المحتوى القابل للتأليف والنشر، لا الدرس والأسئلة والألعاب والتجارب فقط.
- تضاف المحاكاة مع `engineKind`, `config`, `status`, `source` وروابط أهدافها المرتبة.
- تضاف أنشطة الاستقصاء بكل حقولها canonical وروابط أهدافها المرتبة.
- تضاف أنشطة البيانات بكل presentation/config والبيانات والمهام وروابط أهدافها المرتبة.
- تضاف روابط `experiment_objectives` إلى تمثيل التجارب داخل fingerprint.
- يجب أن يكون ترتيب كل مجموعة وروابط أهدافها deterministic قبل SHA-256.
- أي تغيير canonical في نشاط أو رابط هدف بعد فتح Revision يجب أن يؤدي إلى `stale_revision` عند محاولة الاعتماد.
- لا تشمل البصمة حالة تفاعل الطالب أو نتائج النشاط لأنها session-only وخارج canonical lesson graph.

## النشر الذري والحفظ التاريخي

- يبقى `review_lesson_revision` هو بوابة النشر الوحيدة للمحتوى المؤلف بشريًا.
- عند اعتماد Revision لدرس موجود، لا تحذف النسخة canonical السابقة ولا أنشطتها؛ تؤرشف وفق نموذج التاريخ الحالي وتبقى مرتبطة بمعرف الدرس التاريخي.
- ينشأ درس canonical جديد بمعرف جديد، ثم تنشأ أهدافه وأسئلته وألعابه وتجاربـه ومحاكاته وأنشطة الاستقصاء والبيانات وروابط الأهداف الخاصة بها.
- جميع عمليات إنشاء النسخة الجديدة وتحديث حالة Revision وتسجيل قرار Reviewer تتم داخل transaction واحدة.
- إذا فشل إنشاء أي نشاط أو رابط هدف، يفشل الاعتماد كاملًا ولا تنشر نسخة جزئية.
- كل نشاط جديد يرتبط فقط بمعرف الدرس canonical الجديد، ولا يعاد استخدام معرف نشاط تابع لنسخة درس مؤرشفة.
- تبقى النسخة التاريخية غير ظاهرة في مسار الطالب لأن القراءة التشغيلية تتطلب درسًا ونشاطًا بحالة `approved` وفق سياسات RLS الحالية.
- لا يوجد حذف ضمني للأنشطة القديمة عند اعتماد Revision جديد؛ التاريخ محفوظ، بينما snapshot داخل Revision يحدد محتوى النسخة الجديدة فقط.

## حدود Teacher UI

- يضاف قسم مستقل للأنشطة العلمية داخل `TeacherLessonEditor` بدل وضع منطق النشاط في `App.tsx`.
- يدعم المعلم إنشاء وتعديل وحذف `games`, `experiments`, `simulations`, `inquiries`, و`dataActivities` داخل Form Buffer فقط.
- كل محرر نشاط يعمل على payload المتخصص لنوعه ولا يعيد تنفيذ محرك التشغيل الخاص بالطالب.
- اختيار أهداف النشاط يتم من أهداف Revision الحالية ويُخزن في `objectiveKeys`.
- حذف هدف مستخدم من نشاط يجب أن يظهر تعارضًا واضحًا قبل الحفظ أو الإرسال، ولا يترك رابطًا معلقًا.
- لا يوجد نشر مباشر من محرر النشاط، ولا كتابة مباشرة إلى Supabase canonical tables.
- AI لا ينشئ ولا يعدل الأنشطة في Phase 5-5.

## حدود Reviewer UI

- يجب أن يرى Reviewer تفاصيل كل نشاط موجود في Revision قبل اتخاذ قرار الاعتماد.
- تعرض لعبة المطابقة العنوان والتعليمات والأزواج أو العناصر والأهداف المرتبطة.
- تعرض التجربة الأدوات والخطوات ومستوى السلامة والملاحظات وأسئلة الملاحظة والاستنتاج والأهداف المرتبطة.
- تعرض المحاكاة التعليمات ونوع المحرك وconfig والقيم العلمية والأهداف المرتبطة.
- يعرض الاستقصاء السياق والسؤال المحوري وفرضية الطالب والملاحظة والاستنتاج والأهداف المرتبطة.
- يعرض نشاط البيانات طريقة العرض والمحاور ومجموعة البيانات والمهام وقواعد التحقق والأهداف المرتبطة.
- Reviewer لا يعدل payload؛ قراره يبقى `approve` أو `reject` مع ملاحظة الرفض وفق العقد الحالي.

## خارج نطاق Phase 5-5

- لا إعادة تصميم لمحركات تشغيل `matching`, `experiment`, `simulation`, `inquiry`, أو `data`.
- لا إنشاء جدول `activities` عام؛ تبقى العائلات على التخزين المتخصص المعتمد.
- لا حفظ دائم لمحاولات أو نتائج الطالب؛ تبقى session-only وفق العقود الحالية.
- لا توليد AI للأنشطة ولا صلاحية AI للحفظ أو الإرسال أو الاعتماد أو النشر.
- لا Real Composition ولا توسيع Safety QA ولا Mobile/RTL QA؛ هذه تبقى ضمن Phase 5-6.
- لا تعديل للمigrations التاريخية؛ أي تغيير خادمي في 5-5 يتم عبر migration أمامية جديدة.

## بوابة قبول 5-5A

تعد 5-5A مكتملة فقط عندما:

1. يغطي العقد جميع العائلات الخمس: matching, experiment, simulation, inquiry, data.
2. يحدد عقد Revision استخدام `key` و`objectiveKeys` والتحويل إلى canonical IDs عند الاعتماد.
3. يحدد التوافق الخلفي للـRevisions التاريخية دون تخمين روابط الأهداف.
4. يثبت أن Revision هو snapshot كامل للنسخة canonical الجديدة.
5. يفرض توسيع `lesson_content_fingerprint` ليشمل الأنشطة وروابط أهدافها.
6. يحافظ على النشر الذري والتاريخ canonical الحالي دون حذف النسخ السابقة.
7. يحدد حدود Teacher UI وReviewer UI دون نشر مباشر من المتصفح.
8. لا تحتوي 5-5A أي تعديل Production أو SQL أو React أو TypeScript.

## الشكل المعتمد لأنشطة LessonRevisionPayload

تستخدم مرحلة 5-5 الأنواع canonical الموجودة بدل اختراع config موازية داخل Authoring.

```ts
games: {
  key: string;
  type: "matching";
  title: string;
  instructions: string;
  items: { left: string; right: string }[];
  objectiveKeys: string[];
}[];

experiments: {
  key: string;
  title: string;
  objective: string;
  objectiveKeys: string[];
  tools: string[];
  steps: string[];
  safetyNotes: string[];
  safetyLevel: SafetyLevel;
  observationPrompt: string;
  conclusionPrompt: string;
  homeAlternative: string | null;
}[];

simulations: {
  key: string;
  title: string;
  instructions: string;
  objectiveKeys: string[];
  config: SimulationConfig;
}[];

inquiries: {
  key: string;
  title: string;
  instructions: string;
  objectiveKeys: string[];
  context: string;
  drivingQuestion: string;
  hypothesisPrompt: string;
  observationPrompt: string;
  conclusionPrompt: string;
}[];

dataActivities: {
  key: string;
  title: string;
  instructions: string;
  objectiveKeys: string[];
  config: DataActivityConfig;
}[];
```

`SimulationConfig` و`DataActivityConfig` يستوردان من الأنواع canonical الحالية، وتبقى validators الحالية مصدر الحقيقة العلمي لهذه التكوينات.

## عقد التحقق الخادمي

- تبقى TypeScript canonical validators مصدر الحقيقة المنطقي لتكوينات الأنشطة، ويجب أن يعكس SQL نفس القيود الأمنية والعلمية اللازمة للنشر.
- توسع `lesson_revision_payload_error` عبر migration أمامية جديدة لتتعرف صراحة على `simulations`, `inquiries`, و`dataActivities` وعلى `objectiveKeys` للتجارب.
- يرفض الخادم المفاتيح غير المعروفة والأنواع غير الصحيحة والقيم الرقمية غير المحدودة أو غير الصالحة.
- تتحقق كل `objectiveKeys` عند Submit من أنها غير فارغة وفريدة وتشير إلى أهداف موجودة في Revision نفسها.
- تتحقق `SimulationConfig` من engine المعتمد والنطاقات الرقمية نفسها التي يفرضها validator canonical.
- قبل اعتماد عقد 5-5B، يُشدّد `parseSimulationConfig` ليطبق exact-key validation ويرفض المفاتيح غير المعروفة، ثم يعكس SQL العقد نفسه دون اختلاف.
- تتحقق `DataActivityConfig` من engine وطريقة العرض والمحاور والبيانات والسلاسل والمهام وقواعدها دون قبول صيغ أو تعليمات تنفيذية حرة.
- لا يستخدم `eval` أو تعبيرات ديناميكية أو arbitrary formulas في أي عقد نشاط.
- يسمح Save Draft بالمحتوى غير المكتمل ضمن حدود السلامة البنيوية، بينما يفرض Submit العقد الكامل عبر `p_require_complete`.
- لا يعتمد Reviewer أي payload يفشل التحقق الخادمي حتى لو اجتاز تحقق الواجهة.
- يجب أن تغطي اختبارات parity عينات قبول ورفض مشتركة بين TypeScript وSQL لكل config متخصص لمنع انحراف العقدين.
