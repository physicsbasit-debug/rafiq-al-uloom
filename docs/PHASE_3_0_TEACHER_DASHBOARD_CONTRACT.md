# Phase 3-0: Teacher Dashboard Contract & Architecture

## الحالة

هذه وثيقة عقد معماري فقط. لا تنفذ كود إنتاجي، ولا Migration، ولا RLS جديدة، ولا RPC جديدة، ولا تغيّر واجهات الطالب.

نقطة الأساس المجمدة:

```text
v0.5-mastery-results-cloud-complete
→ c99ecf69a5225a03108798476dc69e75987d7595
```

ويجب التعامل مع العقود المجمدة قبلها كحدود لا تُكسر ضمنيًا:

```text
v0.3-data-layer-complete
v0.4-auth-security-complete
v0.5-mastery-results-cloud-complete
```

## 1. الهدف

بناء عقد Phase 3 قبل أي كود بحيث تصبح لوحة المعلم والمراجع لاحقًا قادرة على:

```text
teacher
→ إنشاء مسودة محتوى
→ تعديل المسودة التي يملكها
→ إرسالها للمراجعة
→ استلام الرفض مع ملاحظة
→ إنشاء مراجعة جديدة بعد الرفض

reviewer
→ قراءة المحتوى المرسل للمراجعة
→ مراجعة المحتوى
→ اعتماد أو رفض المراجعة
→ تسجيل قرار تدقيقي

student
→ لا يرى إلا المحتوى المنشور المعتمد
```

الهدف ليس فتح جداول المحتوى الحالية للكتابة المباشرة، بل إضافة مسار تأليف ومراجعة يظل منفصلًا عن مسار القراءة المنشور حتى لحظة النشر الموثوق.

## 2. حدود Phase 3

تشمل Phase 3:

- لوحة المعلم.
- لوحة المراجع.
- إنشاء مسودات بشرية.
- دورة المراجعة والاعتماد.
- ملكية المسودة.
- سجل قرار المراجعة.
- نشر المحتوى المعتمد إلى الطبقة المنشورة.
- RLS وRPC وخدمات العميل المطلوبة لهذا المسار.
- اختبارات تجاوز الواجهة عبر PostgREST.
- اختبارات تركيب حقيقية Auth → Authorization → Authoring → Review → Publish.

لا تشمل Phase 3:

- توليد محتوى بالذكاء الاصطناعي.
- مراجعة آلية أو اعتماد آلي.
- دور `admin` جديد.
- إدارة حسابات المستخدمين.
- تعديل عقود نتائج الإتقان في Phase 2-D.
- تغيير نموذج Auth أو `profiles` أو حالات الحساب.
- إضافة Router لمجرد وجود لوحة جديدة.
- إعادة تصميم تجربة الطالب بلا حاجة مرتبطة بعقد Phase 3.

التأليف بالذكاء الاصطناعي يبقى Phase 4، وأي محتوى AI مستقبلي يجب أن يدخل نفس دورة المراجعة البشرية ولا يتجاوزها.

## 3. ما هو مجمد ولا يُعاد تعريفه

### 3.1 الأدوار

الأدوار المعتمدة تبقى:

```text
student
teacher
reviewer
```

لا تضيف Phase 3 دورًا رابعًا.

### 3.2 حالات الحساب

تبقى:

```text
pending
active
suspended
```

لا تمنح أي صلاحية تأليف أو مراجعة إلا لحساب `active`.

### 3.3 مصدر التفويض

- Supabase Auth مصدر الهوية.
- `public.profiles` مصدر `role` و`status`.
- لا تعتمد الصلاحية على User Metadata قابلة لتعديل المستخدم.
- `authorization.policy.ts` يبقى محرك قرار واجهة مركزيًا.
- `RequireCapability` يبقى حارس UX، لا حاجز الأمان النهائي.
- GRANT وRLS وRPC والقيود الخادمية هي الحماية الفعلية.

### 3.4 العقود المجمدة التي لا تُمس ضمنيًا

لا تعدل Phase 3-0 أو أي دفعة لاحقة من Phase 3 هذه المناطق إلا بقرار مكتوب واختبارات مخصصة:

```text
AuthState
AuthorizationState
UserRole
UserStatus
profiles RLS
mastery_attempts RLS
mastery_attempt_answers RLS
submit_mastery_attempt
MasteryResultsService
SupabaseMasteryResultsRepository
scoring parity contract
1e-9 reconciliation tolerance
```

## 4. العمليات التطبيقية المعتمدة

الاتحاد الحالي يعرف أصلًا:

```text
access_student_experience
access_teacher_workspace
access_reviewer_workspace
author_content
review_content
```

في v0.5 تبقى `author_content` و`review_content` غير متاحتين عمدًا وتعودان `operation_not_available`.

Phase 3 لا تحتاج لإعادة اختراع الاتحاد قبل وجود البنية الخلفية. عند تفعيل المسار لاحقًا:

```text
author_content
→ active teacher فقط

review_content
→ active reviewer فقط
```

ولا تُفعّل العمليتان في `authorization.policy.ts` قبل اكتمال:

- Repository الكتابة.
- Service التنفيذ.
- Schema/RPC/RLS.
- اختبارات التجاوز المباشر.

القاعدة:

> أهلية الدور لا تعني توفر العملية. لا تتحول `operation_not_available` إلى سماح بمجرد ظهور زر أو شاشة.

## 5. فصل دور teacher عن reviewer

### teacher

يستطيع لاحقًا:

- دخول Teacher Workspace.
- إنشاء Revision جديدة مملوكة له.
- تعديل Revision في حالة `draft` يملكها.
- إرسال Revision إلى `pending_review`.
- رؤية قرارات المراجعة الخاصة بمراجعاته.
- إعادة فتح مراجعة `rejected` كمسودة جديدة أو Revision لاحقة حسب عقد 3-1.

لا يستطيع:

- اعتماد محتوى.
- رفض محتوى.
- تعديل Revision في `pending_review`.
- تعديل Revision يملكها معلم آخر.
- تعديل المحتوى المنشور مباشرة.
- تغيير `author_id` أو `reviewer_id` من العميل.

### reviewer

يستطيع لاحقًا:

- دخول Reviewer Workspace.
- قراءة Revisions في `pending_review`.
- تسجيل قرار مراجعة.
- اعتماد أو رفض Revision مؤهلة.

لا يستطيع في Phase 3:

- استخدام دور reviewer كاختصار للتأليف.
- تعديل Payload المسودة بدل المؤلف.
- اعتماد Revision ليست في `pending_review`.
- تغيير هوية المؤلف.
- تعديل صفوف `profiles` أو منح نفسه دورًا آخر.

### student

- لا يصل إلى Teacher/Reviewer Workspace.
- لا يرى draft أو pending_review أو rejected.
- لا يملك أي صلاحية كتابة محتوى.
- يستهلك المحتوى المنشور عبر المسار الحالي فقط.

## 6. قرار فصل المحتوى المنشور عن مساحة التأليف

القرار المعماري المركزي لـPhase 3:

> جداول المحتوى المنشور الحالية لا تتحول إلى مساحة عمل للمسودات.

المسار الحالي للطالب يعتمد على جداول canonical منشورة مثل `lessons` وبقية المحتوى. هذه الجداول تبقى المصدر المستقر للقراءة.

Phase 3 تبني Authoring Plane منفصلًا.

المخطط المنطقي:

```text
Teacher Workspace
→ Authoring Service
→ Authoring Repository
→ Authoring tables / transition RPCs

Reviewer Workspace
→ Review Service
→ Review Repository
→ Review RPCs

Approved revision
→ trusted publish transaction
→ canonical content tables
→ existing ContentRepository
→ Student Experience
```

سبب الفصل:

- لا نكشف draft للمسار الطلابي بطريق الخطأ.
- لا نكسر `ContentRepository` المجمد.
- لا نحتاج إعطاء teacher/reviewer `UPDATE` مباشر على `lessons`.
- يصبح تعديل المحتوى المعتمد Revision جديدة بدل تعديل صامت للسجل المنشور.
- يصبح Phase 4 قادرًا مستقبلًا على إنشاء Draft تدخل نفس المسار دون منح AI صلاحية نشر.

## 7. نموذج Authoring Plane المقترح لـ3-1

هذه أسماء منطقية مرشحة، ويُحسم الشكل SQL النهائي في 3-1 قبل التنفيذ:

### 7.1 `content_revisions`

يمثل نسخة عمل مستقلة عن المحتوى المنشور.

الحد الأدنى المتوقع:

```text
id
entity_type
entity_id nullable for new content
author_id
status
payload
base_fingerprint or base_version
revision_number
created_at
updated_at
submitted_at nullable
```

في Phase 3 يكون `entity_type` على الأقل `lesson`. لا يوسع إلى أنواع أخرى بلا حاجة واختبارات.

### 7.2 `content_review_events`

سجل append-only لقرارات المراجعة:

```text
id
revision_id
reviewer_id
decision
note
created_at
```

القرار:

```text
approve
reject
```

لا يُخزّن القرار النهائي كمعلومة تدقيقية وحيدة قابلة للمسح عند تعديل Revision لاحقًا.

### 7.3 لماذا لا تكفي حقول `reviewed_by/reviewed_at` فقط

وجود حقول snapshot على Revision قد يفيد للاستعلام السريع، لكنه لا يحل محل سجل أحداث المراجعة إذا كانت Revision قد تمر بأكثر من دورة رفض وإعادة تقديم.

لذلك عقد 3-1 يجب أن يقرر بوضوح:

- إما append-only review events مع حقول snapshot مشتقة/مساعدة.
- أو نموذج آخر يضمن تاريخ القرارات كاملًا.

لا يُقبل تصميم يمحو قرار رفض سابق عند إعادة الإرسال.

## 8. حالات Revision ودورة الحياة

الحالات المنطقية المعتمدة للعقد:

```text
draft
pending_review
rejected
approved
```

المسار:

```text
create
→ draft

teacher submits
→ pending_review

reviewer approves
→ approved
→ publish canonical content atomically

reviewer rejects
→ rejected

teacher revises
→ new draft/revision
→ pending_review
```

### انتقالات ممنوعة

```text
draft → approved
rejected → approved
approved → draft by direct mutation
pending_review → draft by arbitrary client update
student → any authoring transition
teacher → approve/reject
reviewer → mutate author payload
```

الانتقالات الحساسة لا تعتمد على Update حر من العميل.

## 9. تعديل المحتوى المعتمد

لا يعدل teacher صف المحتوى المنشور مباشرة.

إذا كان الدرس موجودًا ومعتمدًا:

```text
canonical approved lesson
→ create new revision referencing current canonical version/fingerprint
→ teacher edits revision
→ pending_review
→ reviewer decision
→ atomic publish on approval
```

حتى اعتماد Revision الجديدة:

- يبقى المحتوى المنشور السابق فعالًا للطلاب.
- لا يرى الطالب نسخة نصف مكتملة.
- لا تتغير نتيجة القراءة الحالية.

### منع lost update

عقد 3-1 يجب أن يحمي من اعتماد Revision بُنيت على نسخة canonical قديمة إذا تغير الأصل منذ إنشاء Revision.

الحد الأدنى:

```text
base_fingerprint / base_version
```

وعند النشر:

```text
if current canonical version != revision base
→ reject publish with stale_revision
```

لا يُسمح بتجاوز التعارض بصمت.

## 10. النشر يجب أن يكون عملية خادمية ذرية

اعتماد reviewer ليس مجرد:

```text
UPDATE lessons SET status = 'approved'
```

العقد المطلوب:

```text
reviewer approves revision
→ trusted RPC / database function
→ verify auth.uid()
→ verify active reviewer profile
→ verify revision == pending_review
→ verify current base version/fingerprint
→ validate payload
→ write/update canonical content
→ append review event
→ mark revision approved
→ commit transaction
```

إذا فشلت أي خطوة:

```text
ROLLBACK ALL
```

لا يجوز أن يصبح canonical content منشورًا بينما سجل المراجعة أو حالة Revision فشلت.

## 11. حدود RLS وGRANT المقترحة

Phase 3-0 لا تنشئ السياسات، لكنها تلزم 3-1 بإثبات الآتي.

### authoring revisions

active teacher:

- SELECT مراجعاته التي يملكها.
- INSERT Revision يكون `author_id = auth.uid()` فقط.
- UPDATE حقول المسودة المسموحة فقط عندما يملك Revision وحالتها `draft`.
- لا يغير `author_id`.
- لا يكتب `approved` أو reviewer fields مباشرة.

active reviewer:

- SELECT Revisions المرسلة `pending_review` المطلوبة للمراجعة.
- لا يعدل payload المؤلف مباشرة.
- قرارات approve/reject تمر عبر trusted transition path.

student/pending/suspended/anon:

- لا قراءة لمساحة التأليف.
- لا كتابة.

### canonical content

- لا يمنح teacher/reviewer `INSERT/UPDATE/DELETE` مباشرًا على canonical tables.
- القراءة المنشورة الحالية تبقى كما هي.
- النشر يمر عبر trusted server-side transaction فقط.

## 12. ownership لا يعتمد على Payload يرسله العميل

العميل لا يقرر:

```text
author_id
reviewer_id
approved_by
created_by
```

القيم الأمنية تُشتق خادميًا من:

```text
auth.uid()
+
public.profiles
```

إذا احتاج RPC `revision_id` أو payload، فهذا لا يعني قبول user id من العميل بوصفه هوية موثوقة.

## 13. Repository وService boundaries

Phase 3 يجب أن تضيف طبقة كتابة منفصلة عن `ContentRepository` الحالي.

القرار:

```text
ContentRepository
→ read canonical published content only

AuthoringRepository
→ teacher revision queries + draft persistence + submit transition

ReviewRepository
→ reviewer queue + review transitions
```

يجوز في 3-1/3-2 دمج Authoring/Review تحت عقد واحد إذا ثبت أن الواجهة أصغر، لكن لا تُضاف وظائف الكتابة إلى `supabase-content.repository.ts` لمجرد أنه موجود أصلًا.

الخدمات المقترحة:

```text
AuthoringService
ReviewService
```

المكونات لا تستورد Supabase client ولا repository implementations مباشرة.

المسار:

```text
React feature
→ service/hook
→ repository interface
→ Supabase implementation
→ RLS/RPC
```

## 14. حدود React

لا تحتوي مكونات Teacher/Reviewer على:

```text
supabase.from(...).insert/update/delete
supabase.rpc(...)
role === 'teacher' inline authorization logic
role === 'reviewer' inline authorization logic
```

استخدام الدور في العرض الوصفي مسموح، لكن قرار السماح بالعملية يمر عبر السياسة/الخدمة المعتمدة.

يجب إضافة اختبارات معمارية لاحقًا تمنع:

- direct Supabase write from `.tsx`.
- direct authoring repository implementation import from features.
- inline authorization role checks الخاصة بعمليات Phase 3.

## 15. علاقة Phase 3 بـ`authorization.policy.ts`

`authorization.policy.ts` مجمد من v0.4 لكنه يحتوي placeholder مقصودًا لـ:

```text
author_content
review_content
```

التغيير المسموح مستقبلًا في 3-2 محدود:

```text
author_content
operation_not_available
→ allowed for active teacher

review_content
operation_not_available
→ allowed for active reviewer
```

ولا يغيّر:

- منطق guest.
- pending/suspended handling.
- `access_student_experience`.
- `access_teacher_workspace`.
- `access_reviewer_workspace`.
- AuthState أو AuthorizationState.

قبل تفعيل هاتين العمليتين يجب أن تكون بوابة backend الفعلية موجودة ومختبرة.

## 16. نموذج القراءة في لوحات Phase 3

### Teacher queue

يرى المعلم فقط Revisions التي يملكها، مصنفة مثلًا إلى:

```text
draft
pending_review
rejected
approved/history
```

### Reviewer queue

يرى المراجع:

```text
pending_review
```

ومعلومات ضرورية للسياق، لا بيانات مستخدمين غير لازمة للمراجعة.

### Student read path

لا يتغير:

```text
ContentRepository
→ canonical approved content
```

## 17. Privacy & least privilege

- لا تعرض Teacher Dashboard قائمة Profiles كاملة.
- لا يحتاج teacher بريد reviewer أو بيانات حسابه.
- لا يحتاج reviewer بيانات شخصية للمؤلف خارج display identity اللازمة للسياق إن اعتمدت.
- لا يضاف أي استعلام `auth.users` إلى Frontend.
- لا يستخدم Service Role في العميل.
- أي lookup إداري خاص يبقى خارج Phase 3 ما لم يوجد دور إداري معتمد لاحقًا.

## 18. اختبارات تجاوز الواجهة إلزامية من البداية

لا تُغلق 3-1 أو أي دفعة تفتح كتابة قبل اختبارات PostgREST مباشرة تثبت على الأقل:

### teacher

```text
can create own draft
cannot forge author_id
cannot edit another teacher draft
cannot edit pending_review payload
cannot approve
cannot reject
cannot directly update canonical lessons
```

### reviewer

```text
can read pending review queue as contracted
cannot mutate author payload directly
can approve only pending_review through approved path
can reject only pending_review through approved path
cannot approve as another reviewer id
cannot directly update canonical lessons
```

### student

```text
cannot read authoring tables
cannot write authoring tables
cannot call review transitions successfully
```

### account status

```text
pending denied
suspended denied
```

### anonymous

```text
denied at privilege/RLS layer
```

## 19. اختبارات التكامل الحقيقي المطلوبة قبل إغلاق Phase 3

المسار الكامل المطلوب إثباته:

```text
real teacher Auth
→ Profile teacher/active
→ authorization author_content
→ create draft
→ edit own draft
→ submit

real reviewer Auth
→ Profile reviewer/active
→ authorization review_content
→ read pending revision
→ approve
→ publish canonical transaction

real student/teacher read path
→ ContentRepository reads newly approved canonical content
```

ويجب أيضًا اختبار مسار الرفض:

```text
teacher submits
→ reviewer rejects with note
→ teacher sees rejection
→ new draft/revision
→ resubmit
→ approve
```

واختبار stale revision/concurrency قبل الإغلاق النهائي.

## 20. القرار بشأن Self-approval

Phase 3 تعتمد فصلًا واضحًا للواجبات:

```text
teacher authors
reviewer reviews/approves
```

لا يوجد self-approval لأن reviewer لا يستخدم مسار authoring في Phase 3.

إذا أضيف مستقبلًا دور مركب أو reviewer authoring، يجب عندها إضافة قاعدة صريحة تمنع اعتماد الشخص لمراجعته الخاصة قبل تفعيل هذا السيناريو.

## 21. التعامل مع Seed والمحتوى الحالي

المحتوى الحالي `curriculum_seed` يبقى canonical منشورًا ولا يُحوّل تلقائيًا إلى Revisions.

عند تعديل درس Seed عبر لوحة المعلم مستقبلًا:

```text
canonical seed lesson
→ teacher-authored revision based on current version
→ review
→ publish updated canonical lesson
```

لا تعيد Phase 3 كتابة تاريخ Seed القديم على أنه teacher authored.

## 22. Phase 4 AI boundary

Phase 4 يمكنها مستقبلًا إنشاء Revision مصدرها AI، لكن العقد الملزم:

```text
AI output
→ draft revision only
→ human teacher/reviewer workflow
→ never direct canonical publish
```

لا تستخدم Phase 3 أي provider أو API للذكاء الاصطناعي.

## 23. تقسيم Phase 3 المقترح

```text
3-0  Teacher Dashboard Contract & Architecture
     Docs only; no production code

3-1  Authoring Schema + RLS + Trusted Transitions
     migrations + constraints + RPCs + direct bypass tests

3-2  Authoring/Review Repositories + Services + Authorization Activation
     no UI yet beyond test harnesses if needed

3-3  Teacher Workspace UI
     create/edit/submit own revisions

3-4  Reviewer Workspace UI
     review/approve/reject + audit visibility

3-5  Real Composition + Closure & Freeze
     full teacher→reviewer→publish→student chain + closure tooling
```

يمكن تقسيم دفعة لاحقة إلى A/B عند ظهور حاجة فعلية، لكن لا تُدمج Schema + Services + UI + Closure في دفعة واحدة.

## 24. الوسم المقترح

بعد إغلاق Phase 3 كاملًا فقط:

```text
v0.6-teacher-dashboard-complete
```

الاسم مقترح في 3-0 ولا يُنشأ قبل:

- نجاح أمر إغلاق Phase 3 على الالتزام النهائي نفسه.
- تحديث `PHASES.md` إلى CLOSED فعليًا.
- Git clean.
- `HEAD = origin/main`.
- تحقق annotated tag محليًا وبعيدًا عبر `^{}`.

## 25. سياسة الأرقام

نقطة الأساس الحالية:

```text
508 basic tests
89 Supabase integration tests
597 unique tests
```

لا يُعلن رقم نهائي جديد لـPhase 3 في 3-0.

كل دفعة تضيف فقط الاختبارات التي تثبت عقدها. العدد ليس هدفًا؛ تغطية الملكية، الانتقالات، التجاوز المباشر، الذرية، والتكامل هي المعيار.

## 26. معايير قبول Phase 3-0

لا تُغلق 3-0 إلا بعد:

- اعتماد الفصل بين canonical content وauthoring plane.
- اعتماد teacher/reviewer separation.
- اعتماد lifecycle وانتقالاته الممنوعة.
- اعتماد مبدأ revision بدل تعديل المحتوى المنشور مباشرة.
- اعتماد سجل مراجعة يحفظ التاريخ.
- اعتماد trusted atomic publish path.
- اعتماد ownership من `auth.uid()` لا من payload العميل.
- اعتماد حدود Repository/Service.
- اعتماد اختبارات PostgREST المباشرة كشرط مبكر.
- اعتماد حدود Phase 4.
- التأكد أن لا ملف إنتاجي أو SQL تغير في 3-0.

## 27. قاعدة التغيير

أي تغيير لاحق في هذه القرارات يحتاج تعديلًا مكتوبًا في العقد نفسه أو ADR مخصص، مع اختبارات في نفس الدفعة:

```text
role responsibilities
review lifecycle
ownership model
canonical/authoring separation
publish transaction
review audit history
self-approval policy
Phase 4 boundary
```

لا تعتمد هذه القرارات على وصف محادثة أو ذاكرة تنفيذية غير موجودة في Git.
