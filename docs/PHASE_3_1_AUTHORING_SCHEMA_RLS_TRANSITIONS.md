# Phase 3-1 — Authoring Schema + RLS + Trusted Transitions

## الحالة

مرشح مراجعة قبل الرفع إلى GitHub.

نقطة الأساس التنفيذية:

```text
Phase 3-0 CLOSED
commit 37a4024
v0.5-mastery-results-cloud-complete remains frozen
```

هذه الدفعة هي أول دفعة إنتاجية في Phase 3. نطاقها قاعدة البيانات واختبارات التجاوز المباشر فقط؛ لا UI ولا Repository/Service للعميل ولا تفعيل لعمليات `author_content`/`review_content` بعد.

## 1. الهدف

تحويل عقد Phase 3-0 إلى حاجز خادمي حقيقي يضمن:

```text
active teacher
→ draft revision
→ save
→ submit
→ pending_review

active reviewer
→ review
→ reject OR approve
→ append-only audit event
→ atomic canonical publish on approval
```

مع إبقاء الطالب على مسار القراءة الحالي فقط:

```text
ContentRepository
→ canonical approved content
```

## 2. الملفات الإنتاجية

Migration واحدة فقط:

```text
supabase/migrations/20260807170000_add_teacher_authoring_workflow.sql
```

لا تعديل على migrations القديمة، ولا تعديل على:

```text
profiles RLS
mastery_attempts RLS
mastery_attempt_answers RLS
submit_mastery_attempt
MasteryResultsService
SupabaseMasteryResultsRepository
authorization.policy.ts
React
```

## 3. قرار مهم اكتُشف أثناء تحويل العقد إلى SQL

النسخة المنشورة من الدرس لا يمكن تعديلها في مكانها بأمان.

السبب ليس شكليًا. `mastery_attempt_answers.question_id` يحتفظ بمفتاح أجنبي إلى `public.questions(id)` مع `ON DELETE RESTRICT`. إذا حذف النشر أسئلة النسخة القديمة أو أعاد استخدام IDs نفسها مع محتوى جديد فسيفسد معنى التاريخ المحفوظ لنتائج الإتقان القديمة.

لذلك 3-1 تعتمد versioned canonical publish:

```text
approved canonical lesson A
→ teacher revision based on fingerprint(A)
→ reviewer approval
→ A becomes non-published historical row
→ canonical lesson B is inserted with new server-generated ids
→ students see B only
→ historical mastery rows keep pointing to A and its old questions
```

لا يُعدل `submit_mastery_attempt` لتحقيق ذلك.

### 3.1 كيف تصبح النسخة السابقة غير منشورة؟

لا نضيف قيمة Enum جديدة إلى `content_status` ضمن هذه الدفعة.

بدل ذلك:

```text
old lesson.status = draft
old lesson.archived_at = timestamp
```

ويظل كل child row القديم موجودًا كما هو.

سياسة القراءة الحالية تخفيه لأن الطالب يقرأ فقط lesson `approved`، كما أن `submit_mastery_attempt` نفسه يرفض lesson غير approved.

### 3.2 تعارض `(unit_id, display_order)`

القيد القديم:

```text
UNIQUE (unit_id, display_order)
```

يمنع وجود نسخة تاريخية ونسخة حالية في الموضع نفسه.

تستبدله 3-1 بفهرس فريد جزئي:

```text
UNIQUE (unit_id, display_order)
WHERE status = 'approved'
```

أي لا يمكن أن يوجد أكثر من درس منشور واحد في الموضع نفسه، بينما يمكن الاحتفاظ بالنسخ التاريخية غير المنشورة.

## 4. Authoring Plane

### `content_revisions`

تخزن نسخة العمل المستقلة عن canonical content.

أهم الحقول:

```text
id
entity_type = lesson
entity_id nullable
published_entity_id nullable
author_id
status
payload
base_fingerprint nullable
revision_number
supersedes_revision_id nullable
created_at
updated_at
submitted_at nullable
```

الحالات الوحيدة:

```text
draft
pending_review
rejected
approved
```

`author_id` لا يأتي كمعامل RPC؛ يُشتق من `auth.uid()`.

### `content_review_events`

سجل append-only:

```text
revision_id
reviewer_id
decision = approve | reject
note
created_at
```

رفض reviewer يتطلب note غير فارغة.

لا تمنح أدوار التطبيق INSERT/UPDATE/DELETE مباشرة لهذا الجدول.

## 5. Payload contract

Revision تمثل درسًا كاملًا، وليس عنوانًا منفردًا.

الجذر:

```text
lesson
objectives[]
questions[]
games[]
experiments[]
```

### lesson

```text
unitId
title
displayOrder
summary
keyConcepts[]
examples[]
misconceptions[]
```

### objectives

```text
key
text
```

`key` محلي داخل Revision فقط ولا يصبح canonical id.

### questions

```text
key
purpose = review | mastery
type = multiple_choice
prompt
choices[]
correctAnswerIndex
explanation
objectiveKey
difficulty
```

Phase 3-1 تشترط سؤال mastery واحدًا على الأقل حتى لا تنشر درسًا لا يمكن أن يدخل مسار الإتقان الحالي.

### games

في هذه المرحلة:

```text
type = matching
```

مع `objectiveKeys[]` محلية مرتبطة بأهداف الـRevision.

### experiments

تحترم `safety_level` الحالي حرفيًا:

```text
safe_home
teacher_supervised
lab_only
not_allowed
```

## 6. IDs المنشورة مملوكة للخادم

لا يقبل RPC أي:

```text
author_id
reviewer_id
approved_by
published lesson id
canonical objective id
canonical question id
```

عند النشر يُنشئ الخادم lesson id من revision UUID، ثم يولد child ids deterministically من lesson id + ordinality.

هذا يمنع collision مع النسخ القديمة ويمنع العميل من انتحال ownership عبر IDs أمنية.

## 7. Fingerprint وstale revision

عند إنشاء Revision لدرس منشور:

```text
lesson_content_fingerprint(entity_id)
→ SHA-256 over deterministic canonical lesson graph
→ stored in base_fingerprint
```

يشمل fingerprint:

- lesson fields.
- objectives.
- questions.
- games + objective links.
- experiments.
- canonical status/source fields.

عند approve:

```text
current fingerprint != base_fingerprint
→ rejected / stale_revision
→ no canonical write
→ no approval event
→ revision remains pending_review
```

ترك Revision في `pending_review` هنا مقصود: النظام لم ينسب للـreviewer قرار رفض لم يتخذه. يستطيع reviewer بعد رؤية سبب stale أن يرفضه صراحة مع note، ثم ينشئ teacher Revision جديدة.

## 8. RPCs الموثوقة

### `create_lesson_revision`

```text
payload
entity_id nullable
supersedes_revision_id nullable
```

الخادم:

- يثبت `active teacher`.
- يشتق author من `auth.uid()`.
- يتحقق من payload.
- يشتق base fingerprint لدرس موجود.
- يسمح successor فقط من Revision مرفوضة يملكها teacher نفسه.

### `save_lesson_revision`

يسمح فقط:

```text
active teacher
+ owns revision
+ status = draft
```

### `submit_lesson_revision`

انتقال موثوق:

```text
draft → pending_review
```

ولا يقبل Revision يملكها teacher آخر.

### `review_lesson_revision`

يسمح فقط لـactive reviewer.

Reject:

```text
pending_review
→ append reject event
→ rejected
```

Approve:

```text
lock revision
→ validate payload
→ verify base fingerprint
→ verify canonical position
→ retire previous canonical version when editing
→ insert complete new canonical lesson graph
→ append approval event
→ mark revision approved
→ commit
```

كل ذلك داخل استدعاء PostgreSQL واحد؛ أي exception يعيد المعاملة كلها.

## 9. RLS وGRANT

قررت 3-1 أن تكون أكثر تحفظًا من السماح بـUPDATE أعمدة محددة مباشرة.

### direct table writes

لا يحصل `authenticated` على:

```text
INSERT
UPDATE
DELETE
```

على:

```text
content_revisions
content_review_events
```

كل الكتابة تمر عبر RPCs الموثوقة.

### SELECT revisions

active teacher:

```text
own revisions only
```

active reviewer:

```text
pending_review only
```

student/pending/suspended:

```text
no rows
```

anon:

```text
no table privilege
```

### SELECT review events

active teacher:

```text
events for own revisions
```

active reviewer:

```text
events authored by that reviewer
```

ولا توجد كتابة مباشرة.

## 10. Canonical content remains protected

لا تغير 3-1 GRANT الكتابة لجداول المحتوى الحالية.

لذلك يظل:

```text
teacher direct lessons UPDATE → denied
reviewer direct lessons UPDATE → denied
```

والـSECURITY DEFINER review transition وحده يملك مسار النشر.

## 11. Helper functions ليست API عامة

الدوال الداخلية:

```text
jsonb_is_text_array
lesson_revision_payload_error
lesson_content_fingerprint
set_content_revision_updated_at
```

لا تمنح EXECUTE إلى `authenticated` أو `anon`.

الدوال الأربع التطبيقية فقط تمنح EXECUTE إلى `authenticated`، ثم تنفذ التحقق الفعلي من role/status خادميًا.

## 12. اختبارات 3-1 الجديدة

### workflow integration

`tests/integration/supabase-authoring-workflow.integration.ts`

يثبت:

- server-owned author id.
- draft save + submit.
- reviewer queue.
- rejection event append-only.
- successor revision بعد الرفض.
- approval + complete canonical graph.
- student sees published result.
- base fingerprint derived server-side.
- stale revision cannot publish.
- old canonical lesson retires without deleting historical question rows.

### bypass integration

`tests/integration/supabase-authoring-bypass.integration.ts`

يثبت:

- direct INSERT cannot forge `author_id`.
- direct UPDATE/DELETE revisions denied.
- reviewer cannot mutate author payload.
- reviewer cannot insert audit event directly أو forge reviewer_id.
- teacher sees own rows only.
- reviewer sees pending only.
- student/pending/suspended see no authoring rows.
- anon denied by privilege layer.
- student/reviewer cannot call teacher authoring operations successfully.
- teacher/student/suspended reviewer cannot review.
- teacher cannot save/submit another teacher revision.
- reject note required.
- reviewer id derived from session.
- canonical lesson direct writes remain denied.

## 13. ما لا تفعله 3-1

لا يوجد في هذه الدفعة:

```text
React UI
Teacher Dashboard screen
Reviewer Dashboard screen
AuthoringRepository
ReviewRepository
AuthoringService
ReviewService
author_content activation
review_content activation
AI generation
new application roles
v0.6 tag
```

هذه الحدود تمنع تحويل 3-1 إلى دفعة عملاقة يصعب إثباتها.

## 14. معايير قبول 3-1

قبل إغلاق الدفعة يجب أن يثبت Git/Codespaces فعليًا:

```text
supabase db reset succeeds with the new migration
Build PASS
Lint PASS
Prettier PASS
508 baseline tests remain green
all pre-existing Supabase tests remain green
all new Phase 3-1 workflow tests green
all new Phase 3-1 bypass tests green
git diff --check PASS
working tree clean
HEAD = origin/main
```

لا تعتمد أرقام إجمالية جديدة قبل تشغيلها فعليًا.

## 15. البوابة إلى 3-2

بعد إغلاق 3-1 فقط يمكن أن تبدأ:

```text
Phase 3-2
Authoring/Review Repositories + Services + Authorization Activation
```

وعندها فقط يجوز تغيير:

```text
author_content → active teacher allowed
review_content → active reviewer allowed
```

لأن backend enforcement سيكون موجودًا ومختبرًا قبل تفعيل capability في العميل.
