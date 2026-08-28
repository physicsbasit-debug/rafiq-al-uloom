# رفيق العلوم — Phase 4-5

## Provenance Persistence Decision — Design for Independent Review

**الحالة:** DESIGN FOR INDEPENDENT REVIEW  
**Frozen baseline:** `703da61d3e1391479b3ffdd2ba64eb2ce8021cfa`  
**Phase 4-4:** CLOSED / FROZEN / Claude APPROVED  
**طبيعة المرحلة:** قرار معماري توثيقي فقط. لا SQL، لا Migration، لا تعديل كود إنتاج، ولا تغيير لأي عقد مجمّد.

---

## 1. القرار المقترح

```text
NO DURABLE AI PROVENANCE PERSISTENCE IN v0.7
```

تبقى معلومات أصل اقتراح AI مؤقتة داخل دورة الاقتراح الحالية فقط، ولا تُحفظ بصورة دائمة في قاعدة البيانات ضمن v0.7.

الحالة المقترحة بعد اعتماد هذه الوثيقة:

```text
Phase 4-5 — CLOSED / FROZEN
Decision: EPHEMERAL PROVENANCE ONLY FOR v0.7
```

هذا القرار لا يعني أن provenance عديمة القيمة مستقبلًا، بل يعني أن الحاجة الحالية لا تبرر إنشاء بنية تخزين دائمة جديدة قبل وجود مستهلك منتج أو متطلب مؤسسي أو تنظيمي حقيقي لها.

---

## 2. الأساس المجمد من Phase 4-0

Phase 4-0 قررت أصلًا أن provenance:

- لا تدخل `LessonRevisionPayload`.
- لا تصبح شرطًا لصحة Revision.
- لا تصبح شرطًا للحفظ أو الإرسال أو المراجعة أو النشر.
- إذا تقرر حفظها مستقبلًا، تكون additive بحتة عبر sidecar/table أو metadata مستقلة.
- تخضع لمبدأ Data Minimization.

كما سمحت Phase 4-0 بوجود metadata مؤقتة مثل:

```text
generationId
providerFamily
modelLabel
generatedAt
target
```

وقد أصبحت هذه المعلومات موجودة بالفعل في العقد الحالي `AiSuggestionMeta`.

إذن Phase 4-5 لا تعيد فتح قرار سابق، بل تحسم فقط سؤالًا مؤجلًا:

> هل توجد اليوم حاجة فعلية لحفظ هذه metadata بصورة دائمة؟

الجواب المقترح: لا.

---

## 3. الحالة الحالية للـprovenance

توجد provenance أثناء دورة اقتراح AI ضمن `AiGenerationResult / AiSuggestionMeta`.

المسار الحالي:

```text
AI request
→ AI result + transient metadata
→ Suggestion Buffer
→ Teacher Accept / Edit-Accept / Reject
→ Form Buffer
→ existing validators
→ existing AuthoringService
→ Revision
→ Reviewer
→ trusted publication
```

عند قبول المعلم، ينتقل المحتوى الذي اختاره إلى Form Buffer وفق العقد الحالي.

أما metadata الخاصة بالتوليد فلا تصبح جزءًا من Revision، ولا تنشئ كتابة خادمية جانبية.

---

## 4. لماذا لا نضع provenance داخل `LessonRevisionPayload`

`LessonRevisionPayload` عقد مجمد من Phase 3، ومحتواه محصور في:

```text
lesson
objectives
questions
games
experiments
```

كما أن `lesson_revision_payload_error` يرفض المفاتيح الإضافية غير المعتمدة.

لذلك إضافة provenance داخل `payload` ستعني:

- تغيير عقد Phase 3 المجمد.
- تعديل validator الخادمي.
- تعديل TypeScript types.
- تعديل mappers/repositories.
- احتمال إدخال metadata غير محتوى إلى canonical authoring contract.

وهذا يخالف قرار 4-0 بأن provenance يجب أن تكون مستقلة عن `LessonRevisionPayload`.

**القرار:** لا provenance داخل `LessonRevisionPayload`.

---

## 5. لماذا لا نستخدم `content_review_events`

`content_review_events` سجل قرارات Reviewer:

```text
revision_id
reviewer_id
decision
note
created_at
```

وظيفته الدلالية هي تسجيل:

```text
Approve / Reject
```

وليس تسجيل أصل المحتوى أو كيفية توليده.

إضافة provenance إليه ستخلط مجالين مختلفين:

```text
Review decision audit
≠
Content origin / AI provenance
```

وهذا قد ينتج لاحقًا صلاحيات RLS وقراءات وسياسات احتفاظ ملتبسة.

**القرار:** لا provenance داخل `content_review_events`.

---

## 6. هل يمكن استخدام `content_revisions` بلا Migration؟

لا يوجد حاليًا عمود مستقل مناسب للـprovenance داخل `content_revisions`.

استخدام أحد الأعمدة الحالية لهذا الغرض سيكون تحميلًا دلاليًا خاطئًا.

أما إضافة:

```text
ai_provenance jsonb
```

أو أعمدة منفصلة، فهي Migration حقيقية، وليست تمثيلًا مجانيًا ضمن البنية الحالية.

كذلك طبقة Authoring الحالية تنشئ وتحفظ Revision عبر عقود محددة، ولا يوجد فيها مسار مستقل لتسجيل provenance.

إذن أي durable persistence حقيقي يعني واحدًا أو أكثر من:

- جدول جديد.
- عمود جديد.
- RPC جديد أو توسيع RPC قائم.
- repository contract جديد أو موسع.
- RLS/GRANT policy جديدة.
- lifecycle جديد بين قبول الاقتراح وحفظ Revision.

ولا توجد حاجة حالية تبرر ذلك.

---

## 7. هل يوجد مستهلك حالي للـprovenance الدائمة؟

لا يوجد ضمن v0.7 مستهلك منتج معتمد يحتاجها:

- Reviewer لا يحتاج provenance لاتخاذ القرار.
- AuthoringService لا يحتاجها للحفظ أو الإرسال.
- trusted publication لا يحتاجها.
- validators لا تستخدمها.
- AI Gateway لا يحتاجها بعد إرجاع النتيجة.
- لا توجد analytics معتمدة مبنية عليها.
- لا يوجد متطلب compliance أو audit مؤسسي معتمد حاليًا يطلب الاحتفاظ الدائم بها.

لذلك تخزينها الآن سيكون تخزين بيانات بلا مستهلك محدد، في تعارض مع Data Minimization.

---

## 8. مشكلة lifecycle التي تمنع تصميم sidecar ساذجًا

اقتراح AI قد يُقبل قبل وجود Revision خادمية أصلًا.

في أول درس جديد يمكن أن يكون:

```text
workingRevisionId = null
```

بينما يستطيع المعلم قبول:

```text
summary suggestion
objective suggestion
question suggestion
...
```

قبل أول Save يدوي ناجح.

لذلك أي تصميم مستقبلي من نوع:

```text
AI provenance row
→ immediate FK to revision_id
```

غير كافٍ.

التصميم المستقبلي، إن أصبحت الحاجة حقيقية، يجب أن يحسم صراحةً:

```text
local accepted provenance buffer
→ explicit manual revision save
→ durable sidecar association
```

ويحدد أيضًا:

- atomicity بين حفظ Revision وحفظ provenance.
- ماذا يحدث إذا نجح Save وفشل provenance write.
- هل ترتبط provenance بكل اقتراح مقبول أم بالRevision ككل.
- retention.
- RLS.
- ما الذي يراه Reviewer.
- هل تنتقل provenance عند successor revision.
- ما الذي يحدث للاقتراح المقبول ثم المعدل يدويًا قبل Save.

هذه أسئلة حقيقية، ولا يوجد سبب لاختراع أجوبتها في v0.7 بلا مستهلك فعلي.

---

## 9. الشكل المستقبلي المفضل إذا ظهرت الحاجة

إذا ظهر لاحقًا متطلب حقيقي، فالخيار المفضل هو sidecar مستقل append-only، وليس تعديل `LessonRevisionPayload`.

اسم مبدئي فقط:

```text
content_revision_ai_provenance
```

وقد يحتوي الحد الأدنى فقط مثل:

```text
revision_id
generation_id
provider_family
model_label
generated_at
target
accepted_at
```

لكن هذا **ليس تصميمًا معتمدًا الآن**.

ولا يعني ذكره الموافقة على:

- prompt persistence.
- raw AI response persistence.
- lesson context persistence.
- user/profile snapshot persistence.
- تخزين بيانات إضافية لمجرد توفرها.

أي حقول مستقبلية تخضع لمبدأ Data Minimization ولمتطلب منتج صريح.

---

## 10. مخاطرة معروفة ومقبولة في v0.7

نقبل صراحةً المخاطرة التالية:

> إذا ظهرت لاحقًا حاجة تنظيمية أو مؤسسية أو تدقيقية لمعرفة أي محتوى منشور سابقًا كان قد أُنشئ أو عُدّل بمساعدة AI، فلن تتوفر provenance رجعيًا للمحتوى الذي نُشر خلال الفترة التي كانت فيها provenance مؤقتة فقط.

هذه فجوة معروفة ومقبولة لـv0.7، وليست سهوًا في التصميم.

لا نحاول تعويضها الآن بتخزين استباقي بلا متطلب فعلي، لأن ذلك سيغيّر عقودًا وقاعدة بيانات وسياسات وصول من أجل احتمال غير معتمد.

إذا ظهر المتطلب مستقبلًا، يبدأ من لحظة اعتماد persistence الجديدة فصاعدًا ما لم توجد وسيلة مستقلة وموثوقة لإعادة بناء التاريخ، ولا يُفترض وجود مثل هذه الوسيلة تلقائيًا.

---

## 11. ما لا يتغير في Phase 4-5

لا تغيير في:

```text
LessonRevisionPayload
AiGenerationRequest
AiGenerationResult
AiSuggestionMeta
Suggestion Buffer
Teacher Form Buffer
AuthoringService
create_lesson_revision
save_lesson_revision
submit_lesson_revision
review_lesson_revision
Reviewer workflow
trusted publication
Auth
RLS
quota
AI Gateway
Gemini provider
```

ولا:

```text
SQL
Migration
table
column
RPC
repository
production TypeScript
runtime behavior
```

---

## 12. Scope الرسمي

ملف واحد فقط:

```text
docs/PHASE_4_5_PROVENANCE_PERSISTENCE_DECISION.md
```

لا ملفات إنتاج.

لا اختبارات جديدة لأن runtime behavior لا يتغير.

---

## 13. معايير القبول

1. إثبات أن provenance الحالية ephemeral ولا تؤثر على Revision.
2. إثبات عدم وجود provenance داخل `LessonRevisionPayload`.
3. إثبات عدم تعديل Schema/RPC/RLS.
4. توثيق سبب رفض تخزين provenance داخل `payload` أو `content_review_events`.
5. توثيق أن الشكل المستقبلي المفضل، إن ظهرت حاجة فعلية، هو sidecar مستقل لا تعديل payload.
6. تأكيد أن غياب provenance الدائمة لا يمنع Save/Submit/Review/Publish.
7. تأكيد عدم تغيير أي ملف إنتاج أو runtime behavior في Phase 4-5.
8. توثيق المخاطرة المقبولة صراحةً: provenance للمحتوى المنشور قبل أي قرار persistence مستقبلي لن تكون متاحة رجعيًا بالضرورة.

---

## 14. معيار فتح persistence مستقبلًا

لا تفتح durable provenance persistence لمجرد أن metadata موجودة.

تفتح فقط إذا ظهر مستهلك حقيقي ومحدد، مثل:

- متطلب تنظيمي أو مؤسسي موثق.
- audit requirement.
- شفافية منشورة للمحتوى.
- analytics معتمدة تحتاج provenance.
- workflow جديد يحتاجها لاتخاذ قرار فعلي.

وعندها تفتح مرحلة مستقلة بحدود واضحة تشمل:

```text
Schema
Migration
RLS
RPC/repository boundary
lifecycle
retention
visibility
failure semantics
tests
```

ولا تُعاد صياغة ذلك كتعديل جانبي داخل مرحلة أخرى.

---

## 15. الحكم المطلوب من المراجع المستقل

يرجى إصدار أحد الحكمين فقط:

```text
APPROVED
```

أو:

```text
CHANGES REQUIRED
```

إذا كان الحكم `CHANGES REQUIRED`، يجب تحديد أقل تعديل لازم فقط، مع ذكر المخاطرة أو التعارض الفعلي، دون توسيع Scope إلى تنفيذ persistence ما لم يكن هناك سبب منتج أو أمني مثبت.
