# Phase 2-D4 — Real Supabase Composition & Scoring Parity

## الحالة

أُغلقت Phase 2-D4 رسميًا بعد إثبات التركيب الحقيقي والتكافؤ الحسابي. حزمة D4 الأساسية بُنيت فوق `e66983a`، ثم عولج فرق IEEE-754 المحدود في Fix 1، وأصبحت نقطة الإغلاق المعتمدة `1f01c66`.

الخط الأساس:

```text
e66983a
```

الحالة النهائية:

```text
Phase 2-D0  CLOSED
Phase 2-D1  CLOSED
Phase 2-D2  CLOSED
Phase 2-D3  CLOSED
Phase 2-D4  CLOSED

Fix 1 commit:   f3df8ef
D4 close commit: 1f01c66
```

## 1. الغرض

إغلاق فجوتين متبقيتين في مسار حفظ نتائج الإتقان:

1. إثبات أن Auth وAuthorization وRepository المحتوى وReact Hook وخدمة النتائج وRPC وPostgreSQL تعمل معًا في مسار حقيقي واحد.
2. إنشاء بوابة تكافؤ دائمة بين `calculateScore()` في TypeScript و`submit_mastery_attempt` في PostgreSQL.

حزمة D4 الأساسية كانت مرحلة إثبات تركيب وتكافؤ فقط، بلا Migration ولا تعديل React أو خدمات D2. بعد الاختبار الحقيقي ظهر فرق IEEE-754 محدود في المصالحة، فعولج في Fix 1 بسطر واحد داخل خدمة D2 دون تغيير SQL أو RPC أو حساب الدرجة نفسه.

## 2. نطاق الملفات

```text
tests/integration/helpers/mastery-results-fixtures.ts
tests/integration/supabase-mastery-composition.integration.tsx
tests/integration/supabase-mastery-scoring-parity.integration.ts
vitest.supabase.config.ts
package.json
README_PHASE_2_D4.md
APPLY_PHASE_2_D4.txt
```

حزمة D4 الأساسية لم تعدّل:

```text
src/
supabase/migrations/
RPC
RLS
MasteryTestView
useMasteryResultPersistence
خدمات mastery-results
```

Fix 1 اللاحق عدّل فقط عتبة المطابقة في `src/services/mastery-results/mastery-results.service.ts` من `Number.EPSILON * 100` إلى `1e-9`.

## 3. قرار فصل الاختبارات

D4 تستخدم ملفين منفصلين:

### أ. Composition

```text
tests/integration/supabase-mastery-composition.integration.tsx
```

هدفه عميق: اختبار سلسلة واحدة كاملة عبر React وSupabase الحقيقية.

### ب. Parity

```text
tests/integration/supabase-mastery-scoring-parity.integration.ts
```

هدفه عريض: مقارنة الحساب المحلي والخادمي لكل توزيعات ثلاث إجابات.

الفصل يسمح بتشغيل بوابة التكافؤ بمعزل عن اختبار تركيب React.

## 4. بيئة اختبار React

إعداد Supabase السابق كان:

```text
environment = node
include = integration.ts فقط
```

D4 توسع `include` إلى:

```text
integration.ts
integration.tsx
```

ويحدد ملف Composition محليًا:

```ts
// @vitest-environment jsdom
```

بقية اختبارات Supabase تبقى على بيئة Node.

## 5. Fixture مستقلة

تُنشأ fixture مخصصة لـD4 داخل قاعدة البيانات:

- درس approved مستقل.
- Objective مستقلة.
- ثلاثة أسئلة mastery approved.
- معرف درس عربي.
- معرف سؤال عربي.
- معرف سؤال لاتيني غير ASCII.
- تنظيف كامل بعد انتهاء الاختبارات.

لا تُعدّل Seed المشتركة.

## 6. اختبار التركيب الحقيقي

### 6.1 المسار الأول

```text
إنشاء مستخدم student/active حقيقي
→ Supabase client معزول بمفتاح publishable
→ AuthService حقيقية
→ AuthorizationService حقيقية
→ تسجيل دخول بكلمة مرور حقيقية
→ ContentRepository حقيقية
→ جلب الأسئلة عبر getMasteryQuestionsByLesson
→ MasteryResultsRepository حقيقية
→ MasteryResultsService حقيقية
→ useMasteryResultPersistence حقيقية داخل jsdom
→ saving
→ submit_mastery_attempt RPC
→ saved
→ قراءة mastery_attempts وmastery_attempt_answers عبر psqlAdmin
→ مقارنة الحالة الرسمية بالصفوف المخزنة
```

لا Mock لأي Service أو Repository أو RPC في هذا المسار.

### 6.2 المسار الثاني

يُركّب Hook مرتين باستخدام الحمولة المجمدة نفسها:

```text
نفس submissionId
نفس startedAt
نفس lessonId
نفس questions
نفس answers
```

المتوقع:

```text
المرة الأولى  saved
المرة الثانية already_saved
نفس attemptId
عدد السجلات = 1
reconciliation = matched_local_result
```

## 7. ترتيب الأسئلة

اختبارات D4 لا تستخدم:

```text
localeCompare
Array.sort
ترتيبًا محليًا مصطنعًا
```

الأسئلة تُجلب حرفيًا عبر:

```ts
createSupabaseContentRepository(client).getMasteryQuestionsByLesson(lessonId);
```

وهذه Repository تطلب:

```text
ORDER BY id
```

داخل PostgreSQL عبر PostgREST. الخدمة تمرر الترتيب نفسه إلى بصمة العميل، وRPC تستخدم ترتيب PostgreSQL نفسه.

اختبار المعرّفات غير ASCII يقارن صراحةً ترتيب Repository مع:

```sql
SELECT id
FROM public.questions
ORDER BY id ASC
```

## 8. بوابة التكافؤ

الملف:

```text
tests/integration/supabase-mastery-scoring-parity.integration.ts
```

يختبر كل التوليفات الممكنة لثلاثة أسئلة:

```text
000
001
010
011
100
101
110
111
```

لكل حالة تُقارن:

```text
calculateScore.totalQuestions = RPC.questionCount
calculateScore.correctAnswers = RPC.correctCount
calculateScore.score = RPC.percentage
reconciliation = matched_local_result
```

ظهور `display_reconciled_to_server` مع تطابق العدادات كشف في أول تشغيل فرق IEEE-754 غير دلالي بين ترتيب العمليات الحسابية في TypeScript وPostgreSQL. عولج ذلك في Fix 1 بتغيير عتبة مقارنة النسبة فقط إلى `1e-9` بعد فحصين صحيحين تامين لـ`questionCount` و`correctCount`. بعد الإصلاح أصبحت جميع حالات Parity تعيد `matched_local_result`.

## 9. اختبار الترتيب والبصمة

يختبر مسار مستقل:

- ترتيب الأسئلة العائدة من Repository يطابق ترتيب PostgreSQL.
- بصمة `createMasteryScoringFingerprint` تطابق `scoringFingerprint` الرسمية.
- معرفات الدرس والأسئلة تشمل العربية وUnicode غير ASCII.

## 10. اختبار Idempotency داخل Parity

نفس `MasteryAttemptServiceSubmission` يُرسل مرتين:

```text
saved
already_saved
```

المطلوب:

- النتيجة الرسمية الثانية مطابقة للأولى بالكامل.
- `attemptId` لم يتغير.
- `reconciliation` بقيت `matched_local_result`.

## 11. السكربتات

تضيف D4 سكربتين فقط:

```text
npm run test:mastery-results-composition
npm run test:mastery-results-parity
```

لم يُضف `verify:mastery-results-closure` في حزمة D4 نفسها؛ أُضيف لاحقًا في D5-C1 وأصبح يستدعي بوابة Parity صراحةً.

## 12. عدد الاختبارات والدليل الفعلي

```text
Composition:                 2/2 PASS
Parity:                     10/10 PASS
Basic tests:               508/508 PASS
Supabase integration files: 8/8 PASS
Supabase integration tests: 89/89 PASS
```

Composition وParity جزء من مجموعة Supabase التكاملية، وليستا 12 اختبارًا فريدًا إضافيًا.

## 13. المخاطر والحواجز

### 13.1 البيئة

Supabase المحلية وDocker يجب أن يكونا عاملين.

### 13.2 التوازي

ملفا D4 يعملان مع:

```text
concurrent: false
```

وكل fixture تحمل معرفات فريدة.

### 13.3 الشبكة الحقيقية

اختبار Composition يعتمد على REST وAuth وRPC الحقيقية، لذلك يستخدم مهلات صريحة للاختبارات والـhooks.

### 13.4 التنظيف

يُحذف مستخدم Auth أولًا حتى تُحذف Attempts بالإرث، ثم تُحذف الأسئلة والهدف والدرس.

## 14. معايير القبول

- [x] Build ناجح.
- [x] 508/508 اختبارًا أساسيًا.
- [x] 89/89 اختبار Supabase.
- [x] ملف Composition ينجح باختبارين.
- [x] ملف Parity ينجح بعشرة اختبارات.
- [x] كل حالات Parity تعيد `matched_local_result`.
- [x] ترتيب معرفات Unicode يطابق PostgreSQL.
- [x] البصمة المحلية تطابق الرسمية.
- [x] `already_saved` يعيد النتيجة نفسها.
- [x] لا Mock لخدمة النتائج أو RPC في D4.
- [x] حزمة D4 الأساسية لم تعدل `src/` أو Migration؛ Fix 1 اللاحق عدّل سطر عتبة المصالحة فقط في خدمة D2 دون SQL أو RPC.
- [x] Lint وPrettier و`git diff --check` ناجحة.
- [x] شجرة Git نظيفة ومتزامنة.

## 15. بوابة D5

انتقلت الخطة إلى Phase 2-D5، وأضيف الأمر الموحد:

```text
npm run verify:mastery-results-closure
```

نجح كاملًا عند `f042ca9`، واستدعى Composition وParity صراحةً بعد مجموعة Supabase العامة. D5-C2 هي دفعة التوثيق والتجميد الأخيرة قبل الوسم `v0.5-mastery-results-cloud-complete`.
