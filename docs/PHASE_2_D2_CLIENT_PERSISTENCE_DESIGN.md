# Phase 2-D2 — Client Persistence Service Design

## الحالة

تصميم Phase 2-D2 المعتمد للتطبيق. لا يتضمن React، ولا Migration، ولا تعديلًا على RPC المثبتة في D1.

## نقطة الأساس

```text
baseline commit: 0367959
Phase 2-D0: CLOSED
Phase 2-D1: CLOSED
Supabase integration: 77/77
Basic tests: 447/447
```

## الهدف

إضافة طبقة عميل مستقلة تستهلك `public.submit_mastery_attempt` من دون أن تستدعي مكونات React `supabase.rpc(...)` مباشرة، ومن دون إنشاء عميل Supabase جديد.

السلسلة المقترحة:

```text
D3 UI لاحقًا
→ masteryResultsService
→ MasteryResultsRepository
→ supabaseMasteryResultsRepository
→ getSupabaseClient()
→ submit_mastery_attempt RPC
```

## النطاق

### داخل D2

- الأنواع التطبيقية لطلب ونتيجة حفظ محاولة الإتقان.
- التطابق الحرفي مع حالات RPC:
  - `saved`
  - `already_saved`
  - `rejected` مع أسباب الرفض السبعة.
- Repository واحدة مسؤولة حصريًا عن `supabase.rpc(...)`.
- Service مسؤولة عن:
  - التحقق المحلي الدفاعي.
  - بناء حمولة الإجابات.
  - حساب بصمة التسجيل.
  - استدعاء Repository.
  - تحديد `matched_local_result` أو `display_reconciled_to_server` بعد النجاح.
- تهيئة كسولة باستخدام `getSupabaseClient()` الحالي.
- عملية صلاحية مركزية جديدة:
  - `submit_own_mastery_result`.
- اختبارات وحدات ومعمارية بلا Docker.

### خارج D2

- لا تعديل على `MasteryTestView`.
- لا زر حفظ أو Retry.
- لا حالات واجهة `saving/saved/failed`.
- لا Migration أو RLS أو GRANT جديدة.
- لا إعادة تنفيذ لاختبارات التكافؤ الحية؛ تأتي في D4.
- لا وسم Git.

## 1. حدود الطبقات

### Repository

`supabase-mastery-results.repository.ts` هي الملف الوحيد داخل `src` الذي يحتوي الاسم الحرفي:

```text
submit_mastery_attempt
```

وتتولى فقط:

1. تحويل طلب TypeScript إلى أسماء معاملات RPC الفعلية.
2. تمرير `AbortSignal`.
3. تحويل الاستجابة غير الموثوقة من `unknown` إلى Union مصنفة.
4. الحفاظ على أسباب الرفض السبعة حرفيًا.
5. تحويل أخطاء النقل إلى:
   - `network_error`
   - `service_unavailable`
   - `unknown`
6. إرسال التفاصيل الخام إلى قناة diagnostic اختيارية فقط.

لا تحسب Repository الدرجة، ولا البصمة، ولا قرار الصلاحية، ولا تسوية العرض.

### Service

`mastery-results.service.ts` تتولى منطق العميل غير المرتبط بـReact:

1. التحقق من `submissionId` و`startedAt`.
2. التحقق من مجموعة الأسئلة:
   - غير فارغة.
   - المعرفات فريدة.
   - جميع الأسئلة للدرس نفسه.
   - كل سؤال `multiple_choice` بعقد تسجيل صالح.
3. التحقق من إجابة واحدة صحيحة البنية لكل سؤال، بلا نقص أو زيادة.
4. حساب `expectedScoringFingerprint`.
5. بناء `answers` من الأسئلة المعروضة نفسها.
6. تمرير النتيجة المرفوضة أو غير المتاحة كما هي.
7. بعد النجاح فقط، مقارنة النتيجة المحلية بالنتيجة الرسمية وإضافة:
   - `matched_local_result`
   - `display_reconciled_to_server`

## 2. التطابق مع RPC

أسباب الرفض في العميل مطابقة حرفيًا للـRPC المثبتة:

```text
not_authenticated
not_authorized
invalid_response_set
lesson_not_available
scoring_contract_stale
question_set_mismatch
submission_conflict
```

لا يُستخدم `content_mismatch`، ولا تُدمج الأسباب في تصنيف عام.

شكل النجاح:

```ts
{
  status: 'saved' | 'already_saved';
  result: {
    attemptId: string;
    submissionId: string;
    lessonId: string;
    questionCount: number;
    correctCount: number;
    percentage: number;
    scoringPolicyVersion: 'mastery-equal-weight-v1';
    scoringFingerprint: string;
    completedAt: string;
  }
}
```

## 3. التحقق من استجابة الخادم

استجابة RPC تعامل كـ`unknown`، ثم تُفحص حقولها قبل تمريرها للتطبيق:

- UUID صالح لـ`attemptId` و`submissionId`.
- `questionCount` عدد صحيح موجب.
- `correctCount` بين صفر وعدد الأسئلة.
- `percentage` رقم محدود بين 0 و100.
- نسخة السياسة مساوية حرفيًا لـ`mastery-equal-weight-v1`.
- البصمة 64 محرف hex.
- `completedAt` تاريخ قابل للتحليل.
- سبب الرفض واحد من الأسباب السبعة فقط.

أي شكل جديد أو تالف يفشل مغلقًا بوصفه:

```text
status = unavailable
reason = unknown
```

مع diagnostic داخلي، لا رسالة Supabase خام للواجهة.

## 4. بصمة التسجيل

المادة المحلية تطابق عقد D0:

```text
mastery-equal-weight-v1
<UTF8 byte length>:<lesson id>
<UTF8 byte length>:<question id>:<correct answer index>:<choices length>
...
```

### قرار ترتيب الأسئلة

لا تستخدم الخدمة `localeCompare` ولا تنشئ ترتيبًا محليًا جديدًا. تستخدم ترتيب مصفوفة الأسئلة الذي أعاده مستودع Supabase، لأن المستودع الحالي يطلب:

```text
ORDER BY id
```

وبذلك يجب على D3 تمرير مصفوفة `useMasteryQuestions` نفسها من دون خلط أو إعادة ترتيب قبل الحفظ.

تضاف في D4 بوابة تكافؤ فعلية على Supabase تشمل معرفات غير ASCII. إذا ظهر اختلاف Collation، يكون الإصلاح الصحيح في عقد SQL بترتيب صريح، لا ترقيعًا داخل React.

## 5. التهيئة الكسولة

لا يُنشأ `createClient()` جديد.

المسار الافتراضي:

```text
masteryResultsService
→ supabaseMasteryResultsRepository
→ getSupabaseClient()
```

كل من Repository وService الافتراضيتين تتهيآن بـ`??=` عند أول استخدام فقط، مطابقًا لنمط Auth وContent الحالي.

## 6. الصلاحية

تضاف عملية مركزية:

```text
submit_own_mastery_result
```

القرار:

| الحالة                | النتيجة                 |
| --------------------- | ----------------------- |
| Guest                 | رفض `guest`             |
| Auth loading          | رفض `profile_loading`   |
| Session error         | رفض `session_error`     |
| Profile loading/error | رفض مطابق للحالة        |
| Pending               | رفض `account_pending`   |
| Suspended             | رفض `account_suspended` |
| Active student        | سماح                    |
| Active teacher        | سماح                    |
| Active reviewer       | سماح                    |

هذا القرار يسمح بحفظ نتيجة المستخدم نفسه فقط. RLS وRPC تبقيان الحماية الفعلية.

## 7. AbortSignal

- يفحص Repository وService الإلغاء قبل بدء العمل.
- يمرر Repository الإشارة إلى طلب PostgREST/RPC.
- `AbortError` لا تتحول إلى `unavailable`، بل يعاد رميها حتى يستطيع المستهلك إلغاء العملية بصمت.

## 8. حدود عدم الثقة

العميل لا يرسل:

```text
userId
role
status
score
correctCount
percentage
classification
isCorrect
```

العميل يرسل فقط:

```text
submissionId
lessonId
startedAt
expectedScoringFingerprint
answers: questionId + selectedChoiceIndex
```

الدرجة الرسمية تبقى من RPC.

## 9. اختبارات D2 المقترحة

### Fingerprint

- طول UTF-8 لا طول JavaScript.
- Hash ثابت لحالة عربية/لاتينية.
- ترتيب مصفوفة المستودع يُحفظ.
- رفض digest غير صالح.

### Repository

- معاملات RPC الفعلية فقط.
- `saved` و`already_saved`.
- أسباب الرفض السبعة منفصلة.
- تمرير AbortSignal.
- إلغاء قبل الطلب.
- network/service unavailable.
- استجابة خادم غير معروفة تفشل مغلقًا.
- لا تسريب رسالة الخطأ الخام.

### Service

- بناء البصمة والحمولة.
- الحفاظ على الرفض دون إعادة تصنيف.
- التحقق المحلي قبل الشبكة.
- تسوية العرض منفصلة عن رفض الحفظ.
- فشل Crypto لا يرسل RPC ناقصة.
- AbortSignal.

### Architecture

- الاسم `submit_mastery_attempt` موجود في Repository المعتمدة فقط.
- لا ملف React يستدعي `.rpc(...)` مباشرة.

### Authorization

- الأدوار النشطة الثلاثة مسموحة.
- Guest وpending وsuspended مرفوضون.

## 10. معايير قبول D2

- [ ] الأنواع تطابق RPC حرفيًا.
- [ ] لا سبب رفض مفقود أو مدمج.
- [ ] لا `supabase.rpc` داخل React.
- [ ] لا عميل Supabase ثانٍ.
- [ ] Repository تتهيأ كسولًا.
- [ ] Service تتهيأ كسولًا.
- [ ] استجابة RPC غير الموثوقة تتحقق بالكامل.
- [ ] AbortError لا تُبتلع.
- [ ] بصمة TypeScript تطابق مادة D1.
- [ ] العملية `submit_own_mastery_result` مركزية.
- [ ] اختبارات D2 الجديدة ناجحة.
- [ ] 447 اختبارًا أساسيًا سابقًا بلا انحدار.
- [ ] 77 اختبار Supabase سابقًا بلا انحدار عند التحقق النهائي.
- [ ] Build وLint وPrettier نظيفة.

## 11. بوابة الانتقال إلى D3

لا يبدأ ربط `MasteryTestView` قبل:

1. اعتماد كلاود لعقود D2.
2. نجاح اختبارات الوحدات والمعمارية.
3. نجاح Build/Lint/Prettier.
4. بقاء المستودع نظيفًا ومتزامنًا.

D3 وحدها تضيف حالات الواجهة والحفظ بعد إنهاء الاختبار.
