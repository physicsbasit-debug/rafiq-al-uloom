# Phase 2-D1 — Database Schema, RPC & RLS

## الحالة

تصميم معتمد من كلاود ومرشح تطبيق نهائي للرفع والاختبار الحي في Codespaces. لا تُغلق D1 قبل نجاح `supabase db reset` واختبارات Supabase الفعلية.

لا تتضمن هذه الحزمة خدمة العميل أو دمج React. نطاقها قاعدة البيانات واختبارات التكامل الحقيقية فقط.

## نقطة الأساس

```text
Baseline commit: 2fbefca
Phase 2-D0: CLOSED
Auth freeze tag: v0.4-auth-security-complete
Verified baseline: 447 basic + 61 Supabase integration = 508 tests
```

## 1. إغلاق فجوة `quiz-engine.ts`

المصدر الفعلي الذي تمت مراجعته مباشرة قبل بناء SQL:

```text
src/features/quiz/quiz-engine.ts
```

الملف غير معدّل وغير موجود داخل حزمة التطبيق النهائية.

منطق الصحة الفعلي:

```ts
isChoiceIndexValid =
  Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < question.choices.length;

isCorrectAnswer =
  isChoiceIndexValid(question, selectedIndex) && selectedIndex === question.correctAnswerIndex;
```

ترجمة D1 إلى SQL مطابقة حرفيًا:

1. فهرس الاختيار يجب أن يكون عددًا صحيحًا غير سالب.
2. فهرس الاختيار يجب أن يكون أصغر من عدد الاختيارات.
3. الإجابة صحيحة فقط عند مساواة الفهرس المختار للفهرس الرسمي.
4. لا مقارنة نصية، ولا تعدد إجابات، ولا حساسية أحرف، ولا درجات جزئية.

## 2. الملفات النهائية

```text
supabase/migrations/20260806070000_add_mastery_result_persistence.sql
tests/integration/supabase-mastery-results.integration.ts
docs/PHASE_2_D1_DATABASE_DESIGN.md
README_PHASE_2_D1.md
APPLY_PHASE_2_D1.txt
```

`quiz-engine.ts` ليست داخل الحزمة النهائية لأنها غير معدلة. تمت مراجعتها مباشرة لإثبات مطابقة منطق SQL قبل اعتماد D1.

## 3. نموذج البيانات

### `public.mastery_attempts`

يحفظ محاولة مكتملة واحدة كما حسبها الخادم:

```text
id uuid
user_id uuid → auth.users(id) ON DELETE CASCADE
lesson_id text → lessons(id) ON DELETE RESTRICT
submission_id uuid
started_at timestamptz
completed_at timestamptz
question_count integer
correct_count integer
percentage double precision
scoring_policy_version text
scoring_fingerprint text
request_fingerprint text
created_at timestamptz
```

القيد:

```text
UNIQUE(user_id, submission_id)
```

`submission_id` ليس هوية للمستخدم ولا نتيجة، بل مفتاح Idempotency داخل حساب واحد.

### `public.mastery_attempt_answers`

```text
attempt_id uuid → mastery_attempts(id) ON DELETE CASCADE
question_id text → questions(id) ON DELETE RESTRICT
question_order integer
selected_choice_index integer
is_correct boolean
created_at timestamptz
```

المفاتيح:

```text
PRIMARY KEY (attempt_id, question_id)
UNIQUE (attempt_id, question_order)
```

السجلات غير قابلة للتعديل من العميل.

## 4. عقد RPC

```sql
public.submit_mastery_attempt(
  p_submission_id uuid,
  p_lesson_id text,
  p_started_at timestamptz,
  p_expected_scoring_fingerprint text,
  p_answers jsonb
) RETURNS jsonb
```

لا يقبل:

```text
user_id
student_id
role
status
score
correct_count
percentage
classification
is_correct
```

الهوية تأتي فقط من:

```sql
auth.uid()
```

والدور والحالة من:

```sql
public.profiles
```

## 5. ترتيب التحقق داخل RPC

```text
auth.uid()
→ Profile active ودور مسموح
→ التحقق البنيوي من الحمولة
→ حساب request_fingerprint
→ معالجة Retry موجود سابقًا
→ درس approved
→ مجموعة أسئلة mastery + approved
→ سلامة عقد multiple_choice
→ حساب scoring_fingerprint رسمي
→ مقارنة بصمة العميل
→ تطابق مجموعة الأسئلة كاملًا
→ صلاحية فهارس الاختيارات
→ حساب correct_count وpercentage
→ INSERT attempt
→ INSERT answers
→ إرجاع النتيجة الرسمية
```

أي خطأ غير متوقع بعد بداية الإدخال يلغي Transaction كاملة.

## 6. حالات RPC

### نجاح

```text
saved
already_saved
```

### رفض قبل الحفظ

```text
not_authenticated
not_authorized
lesson_not_available
invalid_response_set
question_set_mismatch
scoring_contract_stale
submission_conflict
```

`submission_conflict` هو الاسم الأدق الذي حسمه D1 للحالة التي يعاد فيها استخدام `submission_id` نفسه مع درس أو بصمة أو إجابات مختلفة.

## 7. Idempotency

يحسب الخادم `request_fingerprint` من:

```text
scoring_policy_version
lesson_id
expected_scoring_fingerprint
الإجابات مرتبة حسب question_id
```

لا يدخل `started_at` في البصمة، لأن Retry لنفس المحاولة قد يعيد بناء وقت الإرسال، بينما هوية المحاولة ومحتواها لم يتغيرا.

السلوك:

```text
نفس user + submission_id + request_fingerprint
→ already_saved + نفس attemptId

نفس user + submission_id + محتوى مختلف
→ submission_conflict
```

تمت معالجة السباق المتزامن أيضًا عبر التقاط `unique_violation` الخاص بالقيد المسمى فقط، ثم قراءة السجل الفائز ومقارنة البصمة.

## 8. بصمة التسجيل الرسمية

السياسة:

```text
mastery-equal-weight-v1
```

مادة البصمة الحتمية:

```text
policy_version
UTF-8 byte_length(lesson_id):lesson_id
ثم لكل سؤال بترتيب id:
UTF-8 byte_length(question_id):question_id:correct_answer_index:choices_length
```

الخوارزمية:

```text
SHA-256 UTF-8 lowercase hex
```

الخادم يعيد حسابها دائمًا. بصمة العميل شرط تزامن متفائل فقط.

## 9. RLS وGRANT

### المستخدم `authenticated`

مسموح:

```text
SELECT محاولاته فقط إذا بقي Profile active
SELECT إجابات محاولاته فقط
EXECUTE submit_mastery_attempt
```

ممنوع مباشرة:

```text
INSERT
UPDATE
DELETE
```

على الجدولين.

### `anon`

```text
لا SELECT
لا DML
لا EXECUTE RPC
```

### `service_role`

يحصل على `SELECT` فقط على جدولي النتائج. الإدخال يمر عبر RPC، والحذف يحدث تبعيًا عند حذف مستخدم Auth. لا يُستخدم Service Role في العميل.

## 10. `SECURITY DEFINER`

الدالة:

```sql
SECURITY DEFINER
SET search_path = ''
```

وكل مرجع داخلها مؤهل باسم Schema، بما في ذلك:

```text
public.*
auth.uid()
extensions.digest()
```

تم سحب EXECUTE من `PUBLIC`, `anon`, `authenticated`, و`service_role` أولًا، ثم منحه فقط إلى `authenticated`.

## 11. الذرية

إدخال attempt ثم answers يحدث داخل استدعاء الدالة نفسه.

اختبار التكامل يضيف Trigger مؤقتة تفشل عند إدخال Answer محددة، ثم يثبت:

```text
RPC يفشل
attempt count = 0
answer count = 0
```

وبذلك لا توجد محاولة يتيمة عند فشل حفظ الإجابات.

## 12. الاختبارات المقترحة

ملف التكامل يغطي:

1. Active student يحفظ.
2. Active teacher يحفظ محاولته الشخصية.
3. Active reviewer يحفظ محاولته الشخصية.
4. النتيجة الرسمية 2/3 تطابق النسبة المحلية.
5. Retry مطابق تسلسلي يعيد `already_saved` ونفس `attemptId`.
6. طلبان متزامنان فعليًا لنفس `submission_id` يعيدان `saved` و`already_saved` مع `attemptId` واحد.
7. إعادة استخدام المفتاح مع إجابات مختلفة تعطي `submission_conflict`.
8. بصمة قديمة تعطي `scoring_contract_stale` بلا سجل.
9. درس غير متاح يعطي `lesson_not_available`.
10. سؤال ناقص أو إضافي أو مكرر يعطي `question_set_mismatch`.
11. فهرس سالب أو كسري أو خارج النطاق يعطي `invalid_response_set`.
12. Pending وSuspended يعطيان `not_authorized` بلا سجل.
13. Anonymous لا ينفذ RPC عند طبقة الامتياز.
14. المستخدم يقرأ محاولته وإجاباتها فقط.
15. مستخدم آخر يرى مصفوفة فارغة عبر RLS.
16. INSERT/UPDATE/DELETE المباشر ممنوع.
17. فشل answers يلغي attempt ذريًا.
18. حذف auth user يحذف attempt وanswers عبر Cascade.

## 13. عدم لمس المحتوى المشترك في الاختبارات

الـSeed الحالية `draft`، وبعض اختبارات Phase 2-C تتوقع بقاءها كذلك.

لذلك D1 لا تغيّر درسًا مشتركًا إلى `approved`. تنشئ Fixture مستقلة:

```text
lesson approved خاص بالاختبار
objective خاص
3 mastery questions approved
```

ثم تحذفها بعد حذف مستخدمي الاختبار ومحاولاتهم.

هذا يمنع سباقات بين ملفات Vitest المتوازية.

## 14. مراجعة كلاود والاختبار الإضافي

اعتمد كلاود ترجمة `quiz-engine.ts`، وعقد RPC، وRLS، وGRANT، والذرية، والبصمات، وحالات الرفض. الملاحظة الوحيدة كانت أن اختبار Retry الأصلي تسلسلي ولا يمارس سباق الإدخال الحقيقي.

أضيف لذلك اختبار:

```ts
Promise.all([
  submit(activeStudent, lessonId, questions, { submissionId }),
  submit(activeStudent, lessonId, questions, { submissionId }),
]);
```

ويثبت:

```text
saved + already_saved
نفس attemptId
لا خطأ غير معالج
لا سجل ثانٍ
```

بهذا أصبح مسار `EXCEPTION WHEN unique_violation` خاضعًا لدليل تنفيذي مباشر عند تشغيل الاختبارات الحية.

## 15. ما لم يُختبر في بيئة التجهيز

بيئة إعداد الحزمة لا تحتوي Supabase/Docker/PostgreSQL عاملة، لذلك لم يُنفذ:

```text
supabase db reset
اختبارات التكامل الفعلية
RPC على PostgreSQL
```

تم تنفيذ ما أمكن محليًا:

```text
TypeScript parse للملفات
فحص بنية ZIP
فحص النصوص والمحارف
فحوص ثابتة لعقود SQL الأمنية
مطابقة quiz-engine.ts بالمصدر عند 2fbefca
```

التنفيذ الحي يجب أن يحدث في Codespaces بعد اعتماد كلاود للحزمة، لا قبل المراجعة.

## 16. بوابة الإغلاق

بعد رفع الحزمة يجب تنفيذ:

```text
supabase db reset
npm run test:supabase
npm test
npm run build
npm run lint
npx prettier --check .
git diff --check
```

لا تُعلن D1 مكتملة إلا إذا:

```text
Migration تطبق بنجاح
جميع اختبارات Supabase القديمة والجديدة تنجح
447 اختبارًا أساسيًا تبقى ناجحة
اختبار التزامن الحقيقي ينجح
لا Regression في baseline 508
شجرة Git نظيفة
```
