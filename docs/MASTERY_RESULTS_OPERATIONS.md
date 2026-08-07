# رفيق العلوم — تشغيل حفظ نتائج الإتقان

## 1. الغرض

تصف هذه الوثيقة السلوك التشغيلي الفعلي لمسار حفظ نتائج اختبار الإتقان بعد Phase 2-D4. لا تمنح صلاحيات جديدة، ولا تستبدل `GRANT` أو RLS أو الدالة `submit_mastery_attempt`.

## 2. النطاق الحالي

المسار السحابي يحفظ محاولة اختبار إتقان مكتملة فقط عندما يكون:

```text
AuthState = authenticated
AuthorizationState = authorized
Profile.status = active
Profile.role ∈ student | teacher | reviewer
Content provider = supabase
الدرس والأسئلة = approved
```

الحالات التالية لا ترسل طلب حفظ سحابي:

```text
Guest
VITE_CONTENT_PROVIDER = local
```

وتظهر داخليًا بوصفها `not_applicable`.

الحالات التالية تُرفض قبل استدعاء خدمة الحفظ:

```text
pending
suspended
profile_error
session_error
authorization loading
```

## 3. متغيرات بيئة العميل

المسموح في تطبيق Vite:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_CONTENT_PROVIDER=supabase
```

`VITE_SUPABASE_ANON_KEY` مفتاح عميل عام. الحماية الفعلية تبقى في `GRANT` وRLS وRPC.

يُمنع إدخال مفاتيح `service_role` أو كلمات مرور قاعدة البيانات أو أسرار JWT في `src/` أو `public/` أو ناتج `dist/`.

## 4. المسار التشغيلي

بعد إنهاء الاختبار:

```text
calculateScore محليًا
→ عرض النتيجة المحلية فورًا
→ useMasteryResultPersistence
→ authorizeOperation('submit_own_mastery_result')
→ createMasteryResultsService
→ createSupabaseMasteryResultsRepository
→ submit_mastery_attempt
→ PostgreSQL يحسب النتيجة الرسمية
→ الواجهة تعتمد النتيجة الرسمية بعد النجاح
```

React لا تستدعي `.rpc()` مباشرة، واسم `submit_mastery_attempt` محصور في:

```text
src/services/mastery-results/supabase-mastery-results.repository.ts
```

## 5. حالات الحفظ في الواجهة

```text
idle
saving
saved
failed
not_applicable
```

- `idle`: لم تُنهَ المحاولة بعد.
- `saving`: النتيجة المحلية ظاهرة والحفظ جارٍ.
- `saved`: أعاد الخادم `saved` أو `already_saved`.
- `failed`: رفض غير قابل للتكرار أو تعذر خدمة قابل لإعادة المحاولة حسب السبب.
- `not_applicable`: Guest أو مزود محتوى محلي.

## 6. النتيجة الرسمية والتسوية

الخادم هو مصدر الحقيقة للحقول:

```text
questionCount
correctCount
percentage
scoringPolicyVersion
scoringFingerprint
completedAt
```

العميل يقارن النتيجة المحلية بالرسمية بعد تطابق `questionCount` و`correctCount` تطابقًا تامًا.

سماحية مقارنة النسبة:

```text
1e-9
```

هذه السماحية تعالج فروق IEEE 754 الطبيعية الناتجة من اختلاف ترتيب العمليات بين TypeScript وPostgreSQL، ولا تُستخدم لإخفاء اختلاف في عدد الأسئلة أو الإجابات الصحيحة.

قيم التسوية:

```text
matched_local_result
display_reconciled_to_server
```

في الحالتين تعتمد الواجهة النتيجة الرسمية بعد نجاح الحفظ.

## 7. Idempotency وإعادة المحاولة

كل محاولة تملك `submissionId` ثابتًا يُنشأ مرة واحدة عند إنهاء الاختبار.

عند فشل شبكي غير حاسم:

```text
Retry
→ نفس submissionId
→ نفس startedAt
→ نفس lessonId
→ نفس questions
→ نفس answers
```

الطلب المكرر المطابق يعيد:

```text
already_saved
نفس attemptId
لا سجل إضافي
```

استخدام `submissionId` نفسه مع حمولة مختلفة يُرفض.

## 8. حالات الرفض

الأسباب الرسمية:

```text
not_authenticated
not_authorized
invalid_response_set
lesson_not_available
scoring_contract_stale
question_set_mismatch
submission_conflict
```

الرفض لا يُعامل كفشل شبكي، ولا يُنشئ محاولة ناقصة.

## 9. التخزين والصلاحيات

الجداول:

```text
public.mastery_attempts
public.mastery_attempt_answers
```

المستخدم يستطيع قراءة سجلاته وفق RLS وتنفيذ RPC المعتمدة، ولا يستطيع إجراء `INSERT` أو `UPDATE` أو `DELETE` مباشرة على جدولي النتائج.

الحفظ ذري:

```text
Attempt + Answers
```

إما يُحفظان معًا أو لا يُحفظ شيء.

## 10. التشغيل المحلي

شغّل Supabase المحلية أولًا:

```bash
npx supabase start
```

اختبارات المسار المستقلة:

```bash
npm run test:mastery-results-composition
npm run test:mastery-results-parity
```

أمر الإغلاق الكامل:

```bash
npm run verify:mastery-results-closure
```

## 11. سلوك أمر الإغلاق

الأمر:

1. يتوقف عند أول فشل عبر `set -euo pipefail`.
2. يشغّل Build وLint و508 اختبارات أساسية وPrettier.
3. يشغّل فاحص حدود Auth وفاحص حدود نتائج الإتقان.
4. يرفض البدء إذا كانت Supabase متوقفة.
5. يعيد بناء قاعدة Supabase عبر `db reset`.
6. يستعيد الـStack فقط إذا ترك `db reset` خدمات API متوقفة رغم أن البيئة كانت عاملة قبل الأمر.
7. يشغّل 89 اختبار تكامل Supabase.
8. يعيد تشغيل Composition وParity صراحةً كبوابتي إغلاق إلزاميتين.
9. يتحقق من `git diff --check`.
10. يرفض الإغلاق إذا كانت شجرة العمل غير نظيفة أو كان `HEAD` مختلفًا عن `origin/main`.
11. لا ينشئ الوسم ولا يدفعه تلقائيًا.

## 12. فاحص حدود عميل النتائج

الملف:

```text
scripts/check-mastery-results-client-boundaries.mjs
```

يفرض:

- حصر اسم RPC في Repository المعتمدة.
- منع `.rpc()` المباشر داخل ملفات React `.tsx`.
- منع الكتابة المباشرة من العميل إلى جدولي النتائج.
- وجود الاستدعاء المعتمد داخل Repository.

ويعمل إلى جانب:

```text
scripts/check-auth-client-boundaries.mjs
```

الذي يفحص أسرار العميل وحدود Auth.

## 13. التحذيرات المعروفة غير الحاجبة

### حجم حزمة Vite

تحذير تجاوز Chunk مقدار `500 kB` مسجل لتحسين أداء مستقل. لا يغيّر صحة حفظ النتائج.

### Multiple GoTrueClient instances

قد يظهر داخل اختبار Composition في `jsdom` لأن الاختبار ينشئ عملاء Supabase معزولين تحت مفتاح تخزين واحد. التحذير نفسه يصرح بأنه ليس خطأ، وقد نجحت بوابات D4 كاملة. يمكن تنظيفه لاحقًا باستخدام `storageKey` فريد لكل عميل اختبار معزول، دون فتح D5 لهذا الغرض.

## 14. خارج النطاق

لا تشمل Phase 2-D:

- سجل نتائج داخل الواجهة.
- استئناف محاولة غير مكتملة بين الأجهزة.
- Offline queue.
- تعديل أو حذف محاولة.
- عرض نتائج طالب آخر.
- تقارير مقارنة الطلاب.
- أوزان الأسئلة أو الدرجات الجزئية.
- لوحة المعلم والمراجع.

هذه البنود تحتاج مراحل وعقود صلاحية مستقلة.
