# Phase 3-2 — Authoring/Review Client Layer + Authorization Activation

## 1. الحالة

هذه الوثيقة هي عقد تنفيذ لـPhase 3-2 فوق الحالة المحلية المغلقة لـPhase 3-1. المراجعة المعمارية لـ3-2 معتمدة، وبقي الإغلاق التنفيذي في Codespaces.

نقطة الأساس:

```text
Phase 3-0 CLOSED @ 37a4024
Phase 3-1 CLOSED functionally @ 37e2858
Latest documented Git state before 3-2: 028c8ed (docs-only follow-up; no SQL/RPC/test-logic change)
Phase 3-2 review: APPROVED; execution verification pending
Remote Supabase deployment: intentionally deferred
```

الدليل المحلي الذي يسمح ببدء 3-2:

```text
Build PASS
Lint PASS
Prettier PASS
508/508 basic tests
111/111 Supabase integration tests
Phase 3-1 authoring tests 22/22
Git clean
HEAD = origin/main
```

لا تعتمد 3-2 على وجود مشروع Supabase بعيد. الاختبارات التكاملية تستخدم Supabase المحلية داخل Codespaces، والنشر البعيد مؤجل بقرار صريح إلى مرحلة تشغيل لاحقة.

## 2. الهدف

تحويل backend الموثوق الذي أنشأته 3-1 إلى طبقة عميل مستقرة يمكن لواجهتي المعلم والمراجع استخدامها لاحقًا من دون استدعاء Supabase مباشرة.

المساران بعد 3-2:

```text
Teacher feature
→ authoringService
→ AuthoringRepository
→ Supabase implementation
→ create/save/submit RPCs + RLS reads

Reviewer feature
→ reviewService
→ ReviewRepository
→ Supabase implementation
→ pending queue + review RPC
```

وفي الوقت نفسه تُفعّل عمليتا التفويض المؤجلتان من Phase 2-C4/3-0:

```text
author_content → active teacher only
review_content → active reviewer only
```

## 3. النطاق المسموح

3-2 تضيف أو تعدل فقط:

- أنواع Authoring Plane في TypeScript.
- `AuthoringRepository` و`ReviewRepository`.
- تنفيذ Supabase واحد مركزي يملك RPCs الأربع.
- `AuthoringService` و`ReviewService`.
- runtime mapping/fail-closed لصفوف JSON ونتائج RPC.
- AbortSignal ودلالات `unavailable` العامة.
- تفعيل `author_content` و`review_content` في السياسة المركزية فقط.
- unit tests للخدمات والمستودعات.
- architecture test يمنع RPC المباشر والاستيراد المباشر لتنفيذ Supabase من features.
- integration test حقيقي على Supabase المحلية لمسار client layer.

## 4. خارج النطاق

لا تشمل 3-2:

```text
React Teacher Workspace UI
React Reviewer Workspace UI
hooks خاصة باللوحات
أي Migration جديدة
أي تعديل على Migration 3-1
أي تعديل على submit_mastery_attempt
أي تعديل على RLS نتائج الإتقان أو profiles
AI
Service Role في المتصفح
Remote Supabase deployment
v0.6 tag
```

## 5. قرار Repository boundary

عقد 3-0 سمح إما بفصل تنفيذَي Authoring/Review أو دمجهما إذا كانت الواجهة أصغر. تعتمد 3-2 حلاً وسطًا واضحًا:

```text
AuthoringRepository interface   مستقل
ReviewRepository interface      مستقل

Supabase implementation owner   ملف واحد
```

الملف الوحيد المسموح له بامتلاك أسماء RPCs هو:

```text
src/services/authoring/supabase-authoring.repositories.ts
```

والسبب:

- RPCs الأربع تنتمي إلى backend contract واحد.
- mappers وfailure semantics مشتركة.
- منع تكرار parsing ودلالات الشبكة.
- إبقاء الواجهتين المنطقيتين منفصلتين للـfeatures القادمة.

هذا لا يعني أن teacher وreviewer يشتركان في صلاحية؛ RLS/RPC في PostgreSQL تبقى الحاجز النهائي.

## 6. AuthoringRepository

العقد المخصص للمعلم:

```text
listOwnRevisions()
listReviewEvents(revisionId)
createLessonRevision(input)
saveLessonRevision(revisionId, payload)
submitLessonRevision(revisionId)
```

### القراءة

لا يرسل العميل `author_id` في query. الاستعلام يطلب الصفوف المرئية فقط ويعتمد على RLS التي حسمتها 3-1:

```text
active teacher
→ SELECT visible own revisions only
```

وهذا يمنع تحويل هوية المستخدم إلى فلتر موثوق من العميل.

### الكتابة

لا يوجد `.insert()` أو `.update()` أو `.delete()` مباشر على `content_revisions`.

الكتابة تمر فقط عبر:

```text
create_lesson_revision
save_lesson_revision
submit_lesson_revision
```

ولا يمرر أي منها `author_id` أو `user_id`.

## 7. ReviewRepository

العقد المخصص للمراجع:

```text
listPendingRevisions()
reviewLessonRevision(input)
```

الـqueue تطلب `status = pending_review` فقط، ثم RLS تحسم أن الدور reviewer/active.

قرار الاعتماد/الرفض يمر فقط عبر:

```text
review_lesson_revision
```

ولا يرسل `reviewer_id` من العميل.

## 8. Service boundaries

### AuthoringService

مسؤولة عن:

- Abort قبل بدء العملية.
- رفض UUID غير صالح محليًا قبل الشبكة.
- منع `supersedesRevisionId` غير صالح.
- fail-closed عند throw غير متوقع من Repository.
- عدم إعادة تنفيذ backend JSON Schema validator كاملًا.

الخادم يبقى مصدر الحقيقة لصلاحية الحمولة التفصيلية والروابط الداخلية.

### ReviewService

إضافة إلى ما سبق:

- تطبيع note عبر `trim()`.
- رفض `reject` بلا ملاحظة قبل RPC.
- رفض decision غير معروف وقت التشغيل.
- تمرير `approve` بلا ملاحظة كـ`null`.

## 9. دلالات الخطأ العامة

لا تُسرّب رسائل Supabase الخام إلى UI.

العمليات تعيد واحدًا من:

```text
success status محدد بالعقد
rejected + domain reason
unavailable + network_error | service_unavailable | unknown
```

`AbortError` لا تتحول إلى unavailable؛ يعاد رميها حتى يستطيع hook/feature إلغاء الطلب بصورة صحيحة.

## 10. Runtime mapping

تنفيذ Supabase لا يعتمد على cast أعمى لنتيجة RPC أو صفوف قاعدة البيانات.

يُتحقق وقت التشغيل من الأقل التالي:

- UUIDs.
- timestamps.
- revision status.
- review decision.
- revision number.
- base fingerprint إن وجد.
- top-level payload shape.
- status/result shape لكل RPC.
- rejection reason ضمن القائمة المعروفة.

أي شكل غير معروف يفشل مغلقًا إلى:

```text
unavailable / unknown
```

مع diagnostic داخلي فقط.

## 11. Authorization activation

قبل 3-2 كانت السياسة تحتوي placeholder مقصودًا:

```text
author_content → operation_not_available
review_content → operation_not_available
```

3-1 أثبتت backend enforcement عبر RLS/RPC واختبارات bypass؛ لذلك 3-2 تفعّل فقط:

```text
author_content
→ active teacher = allowed
→ student/reviewer = role_not_allowed

review_content
→ active reviewer = allowed
→ student/teacher = role_not_allowed
```

ولا يتغير أي من:

- guest.
- Auth loading/error.
- profile loading/error.
- pending.
- suspended.
- `access_student_experience`.
- `submit_own_mastery_result`.
- `access_teacher_workspace`.
- `access_reviewer_workspace`.

`operation_not_available` يبقى fail-closed لأي عملية غير معروفة وقت التشغيل.

## 12. حدود React والمعمارية

بعد 3-2 يجب أن يظل ممنوعًا داخل `.tsx`:

```text
supabase.rpc(...)
supabase.from(...).insert/update/delete
role === 'teacher' لاتخاذ قرار author_content
role === 'reviewer' لاتخاذ قرار review_content
```

كما يمنع استيراد:

```text
@services/authoring/supabase-authoring.repositories
```

مباشرة من `src/features`.

الـfeatures القادمة في 3-3/3-4 تستخدم الخدمات العامة فقط.

## 13. اختبار التركيب المحلي

3-2 تضيف اختبارًا حقيقيًا على Supabase المحلية يثبت:

```text
real active teacher identity
→ authorization author_content = allowed
→ AuthoringService
→ Supabase AuthoringRepository
→ create draft
→ list own revisions
→ submit

real active reviewer identity
→ authorization review_content = allowed
→ ReviewService
→ pending queue
→ approve
→ canonical teacher_authored lesson exists
```

ويثبت أيضًا أن student لا يحصل على عمليتي author/review من السياسة.

هذا الاختبار لا يحل محل bypass tests الخاصة بـ3-1؛ هو يثبت تركيب client layer فوق backend المحمي.

## 14. قرار التطوير المحلي

بناءً على القرار التشغيلي الحالي:

```text
Remote Supabase for rafiq-al-uloom = deferred
```

لذلك بوابة 3-2 لا تحتوي:

```text
supabase login
supabase link
supabase db push
```

وتستخدم فقط:

```text
npx supabase start
npm run test:supabase
```

عند الانتقال لاحقًا إلى تشغيل بعيد، تُرفع migrations المتراكمة وفق خطة نشر مستقلة ولا يُعاد تصميم العقود بسبب غياب Remote أثناء التطوير.

## 15. الملفات البرمجية المقترحة

```text
src/services/authoring/authoring.types.ts
src/services/authoring/authoring.errors.ts
src/services/authoring/authoring.repository.ts
src/services/authoring/review.repository.ts
src/services/authoring/supabase-authoring.mappers.ts
src/services/authoring/supabase-authoring.repositories.ts
src/services/authoring/authoring.service.ts
src/services/authoring/review.service.ts
src/services/authoring/index.ts
src/services/auth/authorization.policy.ts

tests/authoring/supabase-authoring.repositories.test.ts
tests/authoring/authoring.services.test.ts
tests/auth/authorization.policy.test.ts
tests/architecture/no-direct-authoring-rpc.test.ts
tests/integration/supabase-authoring-client-layer.integration.ts
```

## 16. بوابات القبول

لا تُغلق 3-2 قبل نجاح:

```text
Build
Lint
Prettier
all basic tests
all Supabase integration tests
new authoring repository/service unit tests
new authorization policy matrix
new architecture boundary tests
new real client-layer integration test
existing Phase 3-1 workflow/bypass tests
existing Auth tests
existing mastery-result tests/parity/composition
git diff --check
Git clean
HEAD = origin/main
```

## 17. شرط عدم التراجع

أي فشل في 3-2 لا يُعالج عبر:

- توسيع RLS عشوائيًا.
- قبول user/reviewer IDs من العميل.
- direct table writes.
- تعطيل bypass tests.
- تعديل عقود v0.4/v0.5 غير المرتبطة.
- تشغيل Service Role في Frontend.

إذا كشف الاختبار نقصًا في backend، يُعامل كقرار مستقل ولا يُخفى داخل Repository.

## 18. المخرج بعد الإغلاق

بعد نجاح 3-2 تصبح الخارطة:

```text
3-0  Contract & Architecture                         CLOSED
3-1  Schema + RLS + Trusted Transitions              CLOSED
3-2  Repositories + Services + Authorization         CLOSED
3-3  Teacher Workspace UI                            NEXT
3-4  Reviewer Workspace UI                           pending
3-5  Real Composition + Closure & Freeze             pending
```

لا وسم جديد في 3-2. `v0.6-teacher-dashboard-complete` يبقى مؤجلًا حتى إغلاق 3-5.
