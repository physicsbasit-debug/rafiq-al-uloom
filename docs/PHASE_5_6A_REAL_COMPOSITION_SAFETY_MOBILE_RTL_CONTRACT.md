# رفيق العلوم — Phase 5-6A

## Real Composition + Safety + Mobile/RTL QA Contract

**الحالة:** PRE-IMPLEMENTATION CONTRACT — 5-6A  
**Baseline:** `main` @ `45877f039796731a624dee3b74f9288e0c4e4aba`  
**Branch:** `phase-5-6-real-composition-qa`  
**Previous closure:** Phase 5-5 merged by PR #11 and independently reviewed PASS across 5-5A → 5-5F  
**Scope:** Student real composition, behavioral safety enforcement, Arabic/RTL hardening, mobile visual acceptance, and Phase 5 functional acceptance  
**Production implementation:** NOT STARTED in 5-6A

---

## 1. الهدف

Phase 5-6 لا تضيف عائلة نشاط علمي جديدة، ولا تعيد فتح عقود التأليف والمراجعة التي أُغلقت في Phase 5-5.

هدفها إثبات أن منظومة الأنشطة العلمية تعمل من الطرف الآخر للدورة الكاملة:

```text
Approved Canonical Lesson
→ Student Lesson
→ Student Activity Hub
→ Activity Registry
→ Student Activity Host
→ Matching / Experiment / Simulation / Inquiry / Data
```

مع فرض السلامة سلوكيًا، وضبط العربية وRTL من جذر الوثيقة، ثم تنفيذ بوابة قبول بصرية بشرية على الهاتف واللوحي.

---

## 2. التمييز الرسمي بين 5-5F و5-6

### 5-5F الذي أُغلق سابقًا

أثبت مسار التأليف والنشر الحقيقي:

```text
Teacher
→ Revision
→ Submit
→ Reviewer
→ Reject
→ Successor Revision
→ Submit
→ Reviewer
→ Approve
→ Canonical Publication
```

وكان هدفه التحقق من أن العائلات الخمس تُنشر ذريًا إلى الجداول canonical بروابط أهداف صحيحة.

### 5-6B

يبدأ من محتوى canonical معتمد جاهز مسبقًا، ولا يعيد تشغيل مسار Teacher/Reviewer:

```text
Canonical Publication
→ Student Consumption
```

وعليه فإن عبارة `Real Composition` في 5-6 تعني تركيب تجربة الطالب الحقيقية مع Repository + Queries + Activity Hub + Registry + Renderer + Runners، ولا تعني إعادة اختبار مسار 5-5F.

هذه الصياغة تلغي التداخل التسموي الذي ظهر في نهاية Phase 5-5.

---

## 3. الوضع الحالي المثبت قبل التنفيذ

### 3.1 العائلات الخمس

النظام الحالي يملك خمسة أنواع قابلة للعرض عبر Student Activity Renderer Registry:

```text
matching
experiment
simulation
inquiry
data
```

ولا تنشئ Phase 5-6 نوعًا سادسًا.

### 3.2 فجوة Safety الحالية

`StudentActivityHub` يعرض مستوى سلامة التجربة نصيًا، لكن فتح النشاط ليس محكومًا حاليًا بمستوى السلامة.

`StudentActivityHost` يتحقق من:

- توفر النوع في registry.
- سلامة روابط أهداف التعلم.
- وجود renderer.

لكنه لا يفرض حاليًا Safety Gate للتجارب.

`ExperimentCard` يعرض تفاصيل التجربة وخطوات التنفيذ بصرف النظر عن `safetyLevel`.

لذلك:

> عرض عبارة سلامة لا يُعد فرضًا للسلامة.

Phase 5-6C مخصصة لتحويل Safety من metadata معروضة إلى policy سلوكية غير قابلة للتجاوز من واجهة الطالب.

### 3.3 فجوة جذر RTL

واجهة React الرئيسية تستخدم `dir="rtl"`، لكن وثيقة HTML الأساسية ما تزال بجذر إنجليزي ولا تضبط الاتجاه من المصدر.

Phase 5-6D تجعل:

```html
<html lang="ar" dir="rtl">
```

هو الجذر الافتراضي للتطبيق.

### 3.4 Mobile Visual Acceptance

يوجد عقد سابق ناجح من Phase 3 يعتمد الأحجام:

```text
360 × 800
390 × 844
768 × 1024
```

Phase 5-6E تعيد استخدام المنهجية نفسها وتوسعها لتشمل الأنشطة العلمية ومحررات المعلم وشاشة المراجع الجديدة.

---

## 4. حدود Safety في Phase 5 الحالية

ضمن العقود الحالية:

- `experiment` هو النوع الوحيد الذي يمتلك إجراءات تنفيذ مادية صريحة:
  - tools
  - steps
  - safetyNotes
  - safetyLevel
- `matching` نشاط رقمي.
- `simulation` نشاط رقمي حتمي.
- `data` نشاط بيانات/رسم حتمي.
- `inquiry` في عقد Phase 5 الحالي نشاط استقصائي نصي/تحليلي قائم على:
  - context
  - drivingQuestion
  - hypothesisPrompt
  - observationPrompt
  - conclusionPrompt

ولا يمتلك tools/steps/safetyLevel.

### قاعدة إلزامية

لا يجوز استخدام `inquiry`, `data`, `simulation`, أو `matching` للتحايل على عقد Safety وإدخال إجراء مادي يحتاج أدوات أو تنفيذًا مختبريًا.

إذا احتاج النشاط إلى إجراء مادي فعلي، فيجب تمثيله كـ`experiment` واستخدام `safetyLevel`.

أي توسع مستقبلي يسمح لـInquiry أو Data Activity بإجراء مادي يحتاج قرار schema مستقل، ولا يدخل ضمن 5-6.

---

# 5. عقد Safety السلوكي

## 5.1 مصدر الحقيقة

القيم canonical الحالية تبقى بلا تغيير:

```text
safe_home
teacher_supervised
lab_only
not_allowed
```

Phase 5-6 لا تضيف قيمة خامسة ولا تغير معنى القيم القديمة.

## 5.2 مبدأ التنفيذ

الواجهة لا تخفض مستوى السلامة ولا تتعامل مع `safetyLevel` كزينة بصرية.

يجب أن يوجد قرار مركزي واحد قابل للاختبار يشتق منه Student UI السلوك، بصورة مفاهيمية مثل:

```text
SafetyLevel
→ StudentSafetyDecision
```

ولا يجوز توزيع منطق متناقض عبر Hub وHost وExperimentCard.

## 5.3 مصفوفة السلوك المعتمدة

| safetyLevel | الظهور في Activity Hub | الدخول | الأدوات | الخطوات الإجرائية | prompts | السلوك |
|---|---|---|---|---|---|---|
| `safe_home` | نعم | تنفيذ كامل | تظهر | تظهر | تظهر | `execute` |
| `teacher_supervised` | نعم | عرض مقيّد | تظهر | لا تظهر في self-service | تظهر كتحضير/مناقشة | `supervised_preview` |
| `lab_only` | نعم | عرض تعريفي | لا تعرض كقائمة تنفيذ | لا تظهر | لا تظهر كتعليمات تنفيذ | `lab_preview` |
| `not_allowed` | نعم كحالة محجوبة أو غير قابلة للتنفيذ | ممنوع | لا | لا | لا | `blocked` |

---

## 5.4 `safe_home`

يُسمح للطالب بفتح النشاط كاملًا.

يجب أن يرى:

- العنوان.
- الهدف الوصفي.
- أهداف التعلم المرتبطة.
- الأدوات.
- الخطوات.
- ملاحظات السلامة.
- الملاحظة.
- الاستنتاج.
- البديل المنزلي إن وجد.

زر Activity Hub يكون إجراءً فعليًا من نوع:

```text
فتح النشاط
```

ولا يحتاج تأكيدًا وهميًا من الطالب.

---

## 5.5 `teacher_supervised`

المعنى:

> النشاط قابل للتنفيذ فقط بوجود إشراف معلم فعلي.

المنصة الحالية لا تمتلك مفهومًا موثوقًا باسم `supervisionPresent` ولا جلسة Teacher-led تتحقق خادميًا من وجود المعلم.

لذلك لا يجوز اختراع checkbox من نوع:

```text
أؤكد أن المعلم موجود
```

ثم اعتباره Enforcement.

### السلوك في Student self-service

يسمح بعرض تحضيري مقيّد فقط.

يُعرض:

- العنوان.
- هدف التجربة.
- أهداف التعلم.
- مستوى السلامة.
- الأدوات اللازمة.
- ملاحظات السلامة.
- prompts للمناقشة/التحضير إذا كانت مفيدة.

ولا تعرض الخطوات الإجرائية القابلة للتنفيذ.

يكون الإجراء في Hub بصياغة مختلفة عن `safe_home`، مثل:

```text
عرض متطلبات التجربة
```

ويظهر تنبيه واضح:

```text
هذه التجربة تُنفذ بإشراف المعلم فقط.
```

### ما لا تفعله 5-6

لا تضيف Teacher-led execution session ولا إثبات حضور معلم.

إذا احتاج المشروع لاحقًا فتح خطوات التنفيذ تحت جلسة إشراف موثوقة، فهذا عقد مستقل.

---

## 5.6 `lab_only`

المعنى:

> التنفيذ محصور في بيئة مختبرية مناسبة، وليس مسار self-service للطالب.

### السلوك

يسمح للطالب بعرض معلومات تعريفية فقط:

- العنوان.
- الهدف.
- أهداف التعلم.
- سبب/تصنيف السلامة.
- ملاحظات عامة غير إجرائية عند الحاجة.

لا تعرض:

- خطوات التنفيذ.
- قائمة أدوات بصيغة تحضيرية قابلة للتطبيق الذاتي.
- prompts بصيغة توحي بأن الطالب سيبدأ التنفيذ الآن.
- أي زر بعنوان `فتح النشاط` يوحي بإمكانية التنفيذ.

الإجراء المقترح:

```text
عرض معلومات التجربة
```

مع رسالة ثابتة:

```text
تنفيذ هذه التجربة محصور في المختبر وتحت الإشراف المناسب.
```

---

## 5.7 `not_allowed`

المعنى حاسم:

> لا يوجد مسار تنفيذ للطالب.

### Activity Hub

يظهر النشاط بوصفه حالة غير قابلة للتنفيذ فقط إذا كان ظهوره التربوي مطلوبًا، ويكون زر التنفيذ غير موجود.

تظهر عبارة واضحة:

```text
غير متاح للتنفيذ
```

### Student Activity Host

حتى لو وصل المكوّن إلى النشاط مباشرة عبر حالة داخلية أو اختبار أو استدعاء غير متوقع:

```text
not_allowed
→ blocked
```

ولا يرندر `ExperimentCard` التنفيذي.

هذه Defense in Depth إلزامية، لأن إخفاء زر Hub وحده ليس Enforcement.

### المحتوى الذي لا يظهر للطالب

- الأدوات.
- الخطوات.
- prompts التنفيذية.
- البديل المنزلي كمسار بديل للتنفيذ.

يبقى المحتوى الكامل متاحًا للمعلم والمراجع لأغراض التأليف والمراجعة، ولا يُحذف من canonical.

---

# 6. قواعد عدم الخلط بين العرض والتنفيذ

يجب تمييز ثلاثة مفاهيم:

```text
discoverable
previewable
executable
```

وجود النشاط في القائمة لا يعني أنه قابل للتنفيذ.

وجود صفحة معلومات لا يعني أنها صفحة تنفيذ.

ويجب ألا تستخدم كل الحالات زرًا عامًا واحدًا باسم `فتح النشاط`.

---

# 7. Defense in Depth لعقد Safety

فرض السلامة يجب أن يحدث في مستويين على الأقل:

### المستوى الأول: Student Activity Hub

يشتق الإجراء المناسب من القرار المركزي:

```text
execute
supervised_preview
lab_preview
blocked
```

### المستوى الثاني: Student Activity Host

يعيد التحقق من القرار قبل اختيار renderer.

لا يعتمد Host على أن Hub منع المستخدم سابقًا.

### Experiment renderer/card

لا يستقبل حالة محظورة ويعرض الخطوات بطريق الخطأ.

إذا كان هناك مكوّن preview منفصل، يجب أن يستقبل payload مقصوصًا أو يرندر حقولًا مسموحة فقط.

---

# 8. Safety وTeacher/Reviewer

Phase 5-6 لا تغير صلاحيات Teacher/Reviewer المنشورة في 5-5.

المعلم يستطيع تأليف `safetyLevel`.

المراجع يجب أن يرى كامل معلومات التجربة قبل القرار.

لا يُخفى عن Reviewer أي:

- tools
- steps
- safetyNotes
- safetyLevel
- prompts

لأن إخفاء معلومات الخطر عن Reviewer يناقض وظيفة المراجعة.

ولا يسمح AI بتخفيض المستوى أو اعتماد النشاط.

---

# 9. Phase 5-6B — Student Real Composition Gate

## 9.1 الهدف

إثبات أن محتوى canonical معتمدًا يمر عبر مسار الطالب الحقيقي حتى runner المناسب للعائلة.

## 9.2 قاعدة setup

يُنشأ fixture اختبار canonical معتمد مباشرة عبر test/admin setup الموثوق.

لا تستخدم 5-6B:

- TeacherWorkspace لإنشاء المحتوى.
- ReviewerWorkspace لاعتماده.
- `review_lesson_revision`.
- Revision lifecycle.

هذه الأمور أُثبتت في 5-5F.

## 9.3 graph المطلوب

درس canonical معتمد واحد على الأقل يحتوي:

```text
2 Objectives
1 Matching Game
1 Experiment (safe_home)
1 Simulation
1 Inquiry
1 Data Activity
```

وكل نشاط مرتبط بالأهداف canonical الصحيحة.

## 9.4 المسار الواجب إثباته

```text
real Supabase rows
→ Content Repository
→ activity queries
→ StudentActivityHub
→ objective loading
→ registry
→ StudentActivityHost
→ renderer
→ actual family runner/view
```

لا mocks لمصدر البيانات في gate الأساسي.

## 9.5 ما يجب إثباته

### Hub

- تظهر العائلات الخمس من canonical.
- تظهر عناوينها الحقيقية.
- تظهر أسماء أهداف التعلم المرتبطة.
- لا يوجد dangling objective.
- كل بطاقة تحصل على label من registry.

### Matching

- يفتح `MatchingGameRunner` الحقيقي.
- تظهر الأزواج canonical.
- يعمل الرجوع إلى Activity Hub.

### Experiment

في 5-6B يستخدم fixture `safe_home` حتى يكون الهدف Composition لا Safety variants.

- يفتح مسار التجربة الحقيقي.
- تظهر الحقول canonical.
- يعمل الرجوع.

### Simulation

- يفتح `WaveSimulationRunner`.
- يستخدم config canonical.
- القيم المعروضة مشتقة من config الحقيقي.

### Inquiry

- يفتح `InquiryRunner`.
- context/question/prompts canonical ظاهرة.

### Data

- يفتح `DataActivityRunner`.
- dataset/tasks canonical مستخدمة.
- لا fixture React محلي يحل محل repository.

---

# 10. منع false positives في 5-6B

يجب أن تمنع الاختبارات نجاحًا زائفًا بسبب:

- رندر fixture مباشرة بدل repository.
- عنوان مكرر في مكان غير النشاط.
- استخدام IDs من lesson مختلف.
- query mocked.
- Activity Registry bypass.
- تشغيل runner مباشرة دون Hub/Host.
- روابط أهداف غير تابعة للدرس نفسه.
- Activity من حالة غير `approved`.
- بيانات قديمة باقية من اختبار سابق.

تستخدم run IDs فريدة وتنظيفًا واضحًا أو IDs حتمية مع isolation.

---

# 11. Phase 5-6C — Safety Enforcement

## الهدف

تنفيذ القرار المركزي لعقد Safety ثم ربطه بـHub وHost وExperiment presentation.

## النطاق المتوقع

- pure safety decision function / policy.
- unit tests لكل قيمة SafetyLevel.
- Hub behavior tests.
- Host bypass tests.
- Experiment view/preview tests.

## معايير القبول

### safe_home

```text
Hub action enabled
Host allows execution
steps visible
```

### teacher_supervised

```text
Hub preview only
Host never opens full execution in self-service
steps hidden
supervision warning visible
```

### lab_only

```text
Hub informational preview only
Host blocks execution renderer
procedural details hidden
lab warning visible
```

### not_allowed

```text
no execute action
direct Host path blocked
no tools/steps/prompts leaked to student
```

---

# 12. Phase 5-6D — Arabic Root + RTL Hardening

## 12.1 جذر HTML

يصبح الجذر:

```html
<html lang="ar" dir="rtl">
```

ويظل React RTL-compatible.

## 12.2 لا إعادة تصميم

5-6D ليست Design System rewrite.

لا تغير الألوان أو الهوية أو بنية التنقل بلا سبب وظيفي.

## 12.3 QA آلي

تضاف اختبارات regression مناسبة للتأكد من:

- `lang="ar"`.
- `dir="rtl"`.
- عدم إزالة RTL من root مستقبلًا.
- عدم إضافة `dir="ltr"` غير مبرر في الأسطح الأساسية.
- رسائل Safety الجديدة عربية.
- عدم تسرب رسائل تقنية خام للمستخدم في المسارات المعدلة.

---

# 13. Phase 5-6E — Mobile / RTL Visual Acceptance

هذه بوابة بشرية إلزامية.

لا تُستبدل بـjsdom.

## الأحجام

```text
360 × 800
390 × 844
768 × 1024
```

عند zoom = 100%.

## قواعد PASS العامة

في كل شاشة:

- لا horizontal viewport scroll.
- لا قص للعناوين أو الحقول أو الأزرار.
- RTL منطقي.
- النص العربي الطويل يلتف.
- لا يعتمد إجراء أساسي على hover.
- الأزرار قابلة للنقر.
- الحالات disabled/loading/error واضحة.
- لا تتراكب العناصر.
- لا يختفي الإجراء الأساسي خارج viewport.
- لا يوجد LTR مفاجئ بسبب رقم/معرف تقني معروض خامًا.
- العودة بين النشاط والقائمة قابلة للاستخدام.

---

# 14. شاشات Student المطلوبة في 5-6E

يُفحص على الأحجام الثلاثة:

1. Lesson View مع زر الأنشطة.
2. Student Activity Hub وفيه العائلات الخمس.
3. Matching runner.
4. Experiment `safe_home`.
5. Experiment `teacher_supervised` preview.
6. Experiment `lab_only` preview.
7. Experiment `not_allowed` blocked state.
8. Simulation runner.
9. Inquiry runner.
10. Data Activity runner.

## حالات ضغط

- عنوان عربي طويل.
- اسم هدف طويل على سطرين أو أكثر.
- أدوات متعددة.
- safety notes طويلة.
- بيانات سلسلة طويلة بقدر واقعي.
- prompt طويل.
- رسالة Safety طويلة.
- أكثر من نشاط في القائمة.

---

# 15. شاشات Teacher المطلوبة في 5-6E

يُفحص:

- Teacher Workspace.
- lesson editor.
- objectives.
- questions.
- Matching editor.
- Experiment editor.
- Simulation editor.
- Inquiry editor.
- Data Activity editor.
- Submission Readiness.
- save/submit actions.

يجب فحص Form Buffer المفتوح، لا البطاقات المغلقة فقط.

---

# 16. شاشات Reviewer المطلوبة في 5-6E

يُفحص:

- Reviewer Workspace.
- Revision كاملة.
- تفاصيل الأنشطة الخمس.
- تجربة طويلة الخطوات.
- Simulation config.
- Data Activity dataset/tasks.
- rejection note.
- approve/reject controls.

لا يعتبر ظهور عدد الأنشطة بديلًا عن قراءة المحتوى الفعلي.

---

# 17. قالب تسجيل Mobile Visual Acceptance

```text
COMMIT: ______________________________________
REVIEWER: ____________________________________
DATE: ________________________________________

360 × 800
Student Hub: PASS / FAIL
Matching: PASS / FAIL
Experiment Safety States: PASS / FAIL
Simulation: PASS / FAIL
Inquiry: PASS / FAIL
Data: PASS / FAIL
Teacher Editors: PASS / FAIL
Reviewer Details: PASS / FAIL
Notes:

390 × 844
Student Hub: PASS / FAIL
Matching: PASS / FAIL
Experiment Safety States: PASS / FAIL
Simulation: PASS / FAIL
Inquiry: PASS / FAIL
Data: PASS / FAIL
Teacher Editors: PASS / FAIL
Reviewer Details: PASS / FAIL
Notes:

768 × 1024
Student Hub: PASS / FAIL
Matching: PASS / FAIL
Experiment Safety States: PASS / FAIL
Simulation: PASS / FAIL
Inquiry: PASS / FAIL
Data: PASS / FAIL
Teacher Editors: PASS / FAIL
Reviewer Details: PASS / FAIL
Notes:

Root lang=ar: PASS / FAIL
Root dir=rtl: PASS / FAIL
No horizontal viewport scroll: PASS / FAIL
Long Arabic text wrapping: PASS / FAIL
Actions reachable: PASS / FAIL
Safety states understandable: PASS / FAIL
No procedural leak in blocked/restricted modes: PASS / FAIL

OVERALL: PASS / FAIL
```

---

# 18. Phase 5-6F — Full Functional Acceptance

5-6F لا تضع الوسم النهائي لـPhase 5.

هي البوابة الوظيفية السابقة لـ`5-Freeze`.

يجب أن تثبت على commit واحد:

- lint PASS.
- build PASS.
- core/unit tests PASS.
- Supabase integration PASS.
- Student Real Composition PASS.
- Safety behavior PASS.
- RTL regression PASS.
- Mobile Visual Acceptance PASS.
- Git working tree clean.

ولا يجوز نقل Mobile PASS من commit قديم إذا تغير production UI بعده.

---

# 19. Phase 5-Freeze منفصلة

بعد نجاح 5-6F فقط تبدأ `5-Freeze`.

هناك يتم:

- تحديث `docs/PHASES.md`.
- تحديث الوثائق المعمارية/التشغيلية المتأثرة.
- تسجيل الأدلة والأعداد النهائية.
- إنشاء closure verification command إذا لزم.
- إنشاء tag Phase 5 على commit الإغلاق نفسه.
- التحقق من:
  - local HEAD
  - origin/main
  - tag dereference
  - clean tree

ولا تُعلن Phase 5 `CLOSED & FROZEN` داخل 5-6A أو 5-6F.

---

# 20. التبعيات والأدوات

Phase 5-6 لا تضيف Playwright أو Cypress افتراضيًا.

الأدوات الحالية:

- Vitest.
- Testing Library.
- Supabase local integration.
- browser/device mode للقبول البصري البشري.

أي تبعية جديدة تحتاج فجوة لا يمكن حلها بالأدوات الحالية وقرارًا مكتوبًا.

---

# 21. Non-goals

Phase 5-6 لا تشمل:

- نوع نشاط سادس.
- إعادة تصميم Authoring Plane.
- إعادة تصميم Reviewer workflow.
- AI authoring للأنشطة.
- حفظ دائم لنتائج الأنشطة.
- Remote Supabase deployment.
- Teacher-led supervised session جديدة.
- إثبات حضور معلم إلكترونيًا.
- إضافة SafetyLevel إلى Simulation/Inquiry/Data.
- إعادة تصميم Design System.
- تغيير Mastery Results.
- إعادة فتح Phase 4.
- تعديل migrations تاريخية.

---

# 22. Forward-only Rule

أي SQL جديد، إذا أثبت التدقيق لاحقًا أنه ضروري، يكون migration أمامية جديدة فقط.

لا تعدل Phase 5-5 migrations ولا migrations تاريخية.

لكن baseline الحالي يشير إلى أن 5-6C Safety يمكن تنفيذها في طبقة Student UI/domain دون SQL لأن `safetyLevel` موجود canonical أصلًا.

---

# 23. خطة التنفيذ المعتمدة بعد 5-6A

```text
5-6A  Current-State Audit + Real Composition / Safety / Mobile-RTL Contract
      → documentation only

5-6B  Student Canonical → Student Real Composition Gate
      → integration tests first

5-6C  Behavioral Safety Enforcement
      → central policy + Hub/Host enforcement + tests

5-6D  Arabic Root + RTL Hardening
      → minimal production change + regression tests

5-6E  Mobile / RTL Visual Acceptance
      → mandatory human gate

5-6F  Full Phase 5 Functional Acceptance
      → one-commit acceptance evidence

5-Freeze
      → docs + closure command + final tag/freeze
```

---

# 24. معايير قبول 5-6A

5-6A = PASS فقط إذا أكدت المراجعة المستقلة:

1. التمييز بين 5-5F و5-6B واضح وغير متداخل.
2. 5-6B يبدأ من canonical approved data ولا يعيد Teacher/Reviewer lifecycle.
3. Safety semantics محددة لكل مستوى.
4. `teacher_supervised` لا يعتمد checkbox زائفًا لإثبات الإشراف.
5. `lab_only` لا يقدم إجراءات قابلة للتنفيذ الذاتي.
6. `not_allowed` ممنوع سلوكيًا في Hub وHost.
7. Safety enforcement دفاعي في أكثر من طبقة.
8. Reviewer يظل قادرًا على رؤية التفاصيل الكاملة.
9. الأنواع غير experiment لا تُستخدم لإجراءات مادية بلا Safety contract.
10. Root Arabic/RTL hardening محدد دون redesign.
11. Mobile Visual Acceptance بشري وإلزامي.
12. لا dependency جديدة بلا حاجة.
13. 5-6F منفصلة عن 5-Freeze.
14. لا تعديل لم migrations تاريخية.
15. لا production code داخل 5-6A.

---

## القرار

حتى اعتماد هذه الوثيقة:

```text
NO PRODUCTION CODE
NO SQL
NO MIGRATION
NO NEW DEPENDENCY
NO PHASE 5-6B IMPLEMENTATION
```

الخطوة التالية الوحيدة هي مراجعة 5-6A المستقلة واعتماد العقد أو إرجاع findings قبل أي تنفيذ.
