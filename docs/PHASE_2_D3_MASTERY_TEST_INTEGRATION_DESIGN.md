# Phase 2-D3 — Mastery Test Integration Design

## الحالة

حزمة تطبيق نهائية معتمدة بعد مراجعة الكود والـDiff المباشر مقابل baseline.

## 1. الأساس

تُبنى هذه المرحلة فوق:

```text
baseline commit: c098927
Phase 2-D0: CLOSED
Phase 2-D1: CLOSED
Phase 2-D2: CLOSED
```

لا تغيّر هذه المرحلة SQL أو RPC أو عقود D2. مهمتها الوحيدة ربط `MasteryTestView` بطبقة الحفظ المعتمدة.

## 2. أهداف D3

1. إبقاء النتيجة المحلية فورية.
2. بدء الحفظ بعد عرض النتيجة من دون انتظار الشبكة.
3. تطبيق الحالات الخمس:

```text
idle
saving
saved
failed
not_applicable
```

4. عدم استدعاء خدمة الحفظ قبل قرار `authorizeOperation`.
5. عدم استدعاء Supabase مباشرة من React.
6. إعادة المحاولة بنفس `submissionId` و`startedAt` والحمولة نفسها.
7. اعتماد النتيجة الرسمية للعرض عند نجاح الحفظ مع تسوية مختلفة.
8. إلغاء الطلب عند فك تركيب المكوّن.

## 3. النطاق البرمجي

### ملفات جديدة

```text
src/features/mastery/mastery-result-save.types.ts
src/features/mastery/useMasteryResultPersistence.ts
src/features/mastery/MasteryResultSaveStatus.tsx
```

### ملف معدل

```text
src/features/mastery/MasteryTestView.tsx
```

### اختبارات جديدة

```text
tests/features/useMasteryResultPersistence.test.tsx
tests/features/MasteryTestView.persistence.test.tsx
```

لا يُعدّل اختبار `MasteryTestView.test.tsx` الحالي. يجب أن تبقى اختباراته السبعة عشر كما هي، ويعامل غياب `AuthSessionContext` في الاختبار المعزول بوصفه زائرًا لا ينطبق عليه الحفظ.

## 4. حدود المرحلة

خارج D3:

```text
لا Migration
لا تعديل RPC
لا تعديل mastery-results service/repository
لا تعديل Auth policy
لا package.json
لا dependency جديدة
لا سجل نتائج
لا لوحة معلم
لا Offline queue
لا وسم Git
```

## 5. لماذا Hook مستقلة؟

`MasteryTestView` الحالية تحتوي منطق الاختبار المحلي فقط: الإجابات، إنهاء الاختبار، حساب الدرجة، التصنيف، التوصية، والمراجعة.

إدخال تفاصيل Auth وSupabase وRetry داخلها سيحوّلها إلى مكوّن متعدد المسؤوليات. لذلك تفصل D3 منطق الحفظ في:

```text
useMasteryResultPersistence
```

المكوّن يرسل فقط:

```text
questions
answersByQuestionId
```

والـHook تتولى:

```text
Content provider
Auth/Authorization snapshot
authorizeOperation
submission session
service call
AbortController
retry
state machine
```

## 6. الحالة المصنفة

```ts
type MasterySaveState =
  | { status: 'idle' }
  | { status: 'saving'; submissionId: string }
  | {
      status: 'saved';
      submissionStatus: 'saved' | 'already_saved';
      result: OfficialMasteryAttemptResult;
      reconciliation: MasteryResultReconciliation;
    }
  | {
      status: 'failed';
      failure: MasterySaveFailure;
      retryable: boolean;
    }
  | {
      status: 'not_applicable';
      reason: 'guest' | 'local_content';
    };
```

### عدم فقدان أسباب RPC

فشل الخدمة يحتفظ بالنتيجة الأصلية كاملة:

```text
rejected + one of the seven exact RPC reasons
unavailable + network_error/service_unavailable/unknown
```

لا يُستبدل السبب بـ`content_mismatch` أو اسم عام آخر.

### فشل التفويض

فشل التفويض قبل الخدمة يُحفظ منفصلًا:

```text
kind = authorization
reason = AuthorizationDecisionReason
```

ولا يُزعم أنه سبب صادر من RPC.

## 7. خريطة القرار قبل الخدمة

```text
Content provider = local
→ not_applicable(local_content)
→ لا Service

Content provider = supabase + guest
→ authorizeOperation returns guest
→ not_applicable(guest)
→ لا Service

Content provider = supabase + denied non-guest
→ failed(authorization reason)
→ لا Service

Content provider = supabase + allowed
→ saving
→ masteryResultsService.submitAttempt
```

العملية المستخدمة حرفيًا:

```text
submit_own_mastery_result
```

## 8. الجلسة وIdempotency

تبدأ جلسة المحاولة عند تركيب محتوى الاختبار بعد تحميل الأسئلة:

```text
startedAt = وقت بدء جلسة الاختبار بعد تحميل الأسئلة
submissionId = crypto.randomUUID() عند أول إنهاء
```

ثم تُجمّد نسخة من:

```text
lessonId
questions + choices
answersByQuestionId
submissionId
startedAt
```

Retry لا يعيد البناء من State متغيرة، بل يعيد الحمولة المجمدة نفسها حرفيًا.

## 9. ترتيب عرض النتيجة والحفظ

داخل `handleFinishTest`:

```text
calculateScore
→ setResult(local result)
→ persistence.submitAttempt(...)
```

لا يوجد `await` قبل `setResult` ولا بعده داخل معالج الواجهة. لذلك لا تنتظر شاشة النتيجة الشبكة.

اختبار React يستخدم Promise مؤجلة ليثبت أن:

```text
النتيجة ظاهرة
والحفظ ما يزال saving
```

## 10. اعتماد النتيجة الرسمية

عند:

```text
status = saved | already_saved
```

إذا اختلفت النسبة الرسمية، تحدث الواجهة فقط:

```text
score
classification
recommendation
```

ولا تعيد بناء شبكة الأسئلة أو الإجابات أو المراجعة.

رسالة التسوية:

```text
تم حفظ النتيجة واعتماد الدرجة الرسمية.
```

## 11. تجربة المستخدم

### idle

لا رسالة.

### saving

```text
جارٍ حفظ النتيجة في حسابك...
```

### saved

```text
تم حفظ النتيجة في حسابك.
```

أو عند التسوية:

```text
تم حفظ النتيجة واعتماد الدرجة الرسمية.
```

### failed / unavailable

تبقى النتيجة والمراجعة ظاهرتين:

```text
ظهرت نتيجتك، لكن تعذر حفظها الآن.
```

ويظهر زر:

```text
إعادة محاولة الحفظ
```

### failed / rejected أو authorization

تبقى النتيجة ظاهرة، ولا يظهر Retry غير صالح:

```text
ظهرت نتيجتك، لكن لم يتم اعتماد حفظها.
```

### not_applicable

لا تظهر رسالة خطأ للزائر أو للمزوّد المحلي.

## 12. الإلغاء ومنع النتائج المتأخرة

الـHook تستخدم:

```text
AbortController
requestVersion
mountedRef
```

عند فك التركيب:

```text
abort active request
invalidate request version
ignore late result
```

ولا يُبتلع `AbortError` بوصفه فشل حفظ للمستخدم.

## 13. الحفاظ على منطق MasteryTestView

التغيير المقصود في الملف محصور في:

1. استدعاء Hook الحفظ.
2. إرسال الحمولة بعد `setResult`.
3. عرض حالة الحفظ.
4. تسوية الدرجة الرسمية.
5. `key={lessonId}` لإعادة تهيئة جلسة المحاولة عند تغيّر الدرس.

لا يتغير:

```text
اختيار الإجابة مرة واحدة
عداد الإجابات
شرط تفعيل زر الإنهاء
calculateScore المحلي
التصنيف المحلي
التوصية
ReviewItem
تعطيل الخيارات بعد النتيجة
زر العودة
QueryBoundary
```

## 14. الاختبارات الجديدة

### Hook

تغطي:

- idle.
- local provider → not_applicable.
- guest → not_applicable.
- pending authorization → failed بلا Service.
- saving → saved.
- حفظ سبب `submission_conflict` حرفيًا.
- unavailable ثم Retry بنفس الحمولة.
- منع Retry لرفض غير قابل للتكرار.
- تحويل خطأ غير متوقع إلى unavailable/unknown بلا رسالة خام.
- تثبيت startedAt عند بدء جلسة الاختبار.
- Abort عند unmount.

### React integration

تغطي:

- idle قبل الإنهاء.
- ظهور النتيجة المحلية أثناء Promise معلقة.
- saved.
- display reconciliation إلى الدرجة الرسمية.
- failed/unavailable + Retry بنفس ID.
- rejected بلا Retry.
- guest not_applicable بلا رسالة.
- local provider not_applicable بلا رسالة.

## 15. الاختبارات المتوقعة

D3 تضيف 18 اختبارًا:

```text
490 existing
+ 18 D3
= 508 basic tests expected
```

اختبارات Supabase تبقى:

```text
77/77
```

لا تدعي D3 تكافؤًا حيًا بين TypeScript وRPC؛ هذه بوابة D4.

## 16. بوابات القبول

```text
npm run build
npm test                    → 508/508 expected
npm run test:supabase       → 77/77
npm run lint
npx prettier --check .
git diff --check
```

وفحص Diff مباشر:

```text
git diff c098927 -- src/features/mastery/MasteryTestView.tsx
```

## 17. نتيجة المراجعة النهائية

أثبتت المراجعة المباشرة والـDiff الحرفي ما يلي:

1. غياب Auth context يُعامل كزائر بأمان، ويحافظ على الاختبارات المعزولة.
2. `setResult` يسبق `submitAttempt`، لذلك لا تحجب الشبكة عرض النتيجة المحلية.
3. فشل التفويض منفصل عن فشل الإرسال، ولا تفقد أسباب RPC دقتها.
4. Retry مقصور على `unavailable` ويستخدم الحمولة المجمدة نفسها.
5. `submissionId` و`startedAt` والأسئلة والإجابات لا تُعاد صناعتها عند Retry.
6. `requestVersion + AbortController + mountedRef` تمنع تحديثات الطلبات المتأخرة.
7. التسوية الرسمية محصورة في الدرجة والتصنيف والتوصية.
8. Diff `MasteryTestView` إضافي بحت ولا يغيّر منطق الاختبار أو المراجعة القائم.
9. `key={lessonId}` يضمن جلسة جديدة ومعرّفات زمنية جديدة عند الانتقال إلى درس آخر.
10. لا يوجد مسار يستدعي Service قبل قرار `authorizeOperation`.

بذلك أصبحت الحزمة جاهزة للتطبيق الحي في Codespaces، مع بقاء بوابات `build` و`508/508` و`77/77` شرط الإغلاق الرسمي.
