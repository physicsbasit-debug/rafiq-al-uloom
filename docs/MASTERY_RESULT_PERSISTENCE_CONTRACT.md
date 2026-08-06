# Phase 2-D0 — عقد حفظ نتائج الإتقان

## الحالة

عقد معتمد لـPhase 2-D0 قبل أي Migration أو كود إنتاج.

## 1. الغرض

إضافة حفظ سحابي لمحاولة اختبار الإتقان المكتملة، من دون الثقة بدرجة أو دور أو هوية يرسلها العميل، ومن دون تعطيل العرض المحلي الفوري.

## 2. العقود المجمدة من Phase 2-C

- Supabase Auth يثبت الهوية فقط.
- `public.profiles` هو مصدر الدور والحالة.
- لا يُستخدم Auth Metadata في التفويض.
- Guest وpending وsuspended وprofile_error لا يحفظون نتيجة سحابية.
- لا Service Role داخل العميل.
- لا كتابة مباشرة إلى جداول النتائج من العميل.
- RLS وGRANT وRPC هي الحماية الفعلية.
- أي تغيير لعقود Auth يحتاج قرارًا مستقلًا.

## 3. أهلية الحفظ في النطاق الأول

الحفظ السحابي متاح فقط عندما تجتمع الشروط:

```text
AuthState = authenticated
AuthorizationState = authorized
Profile.status = active
Profile.role ∈ student | teacher | reviewer
Content provider = supabase
الدرس والأسئلة مقروءة قانونيًا من المحتوى السحابي المعتمد
```

الحالات التالية تعطي `not_applicable` ولا ترسل RPC:

```text
Guest
local content provider
```

الحالات التالية تُرفض قبل إرسال الحفظ:

```text
pending
suspended
profile_error
session_error
```

## 4. مجموعة الأسئلة القانونية للمحاولة

في السلوك الحالي، اختبار الإتقان يستخدم **كل** الأسئلة التي يعيدها `getMasteryQuestionsByLesson`، ولا يختار عينة.

المجموعة القانونية على الخادم هي:

```text
public.questions
WHERE lesson_id = p_lesson_id
  AND purpose = 'mastery'
  AND status = 'approved'
ORDER BY id ASC
```

ويجب أن يكون الدرس نفسه `approved`.

الطلب يجب أن يحتوي إجابة واحدة لكل سؤال في المجموعة القانونية:

- لا سؤال ناقص.
- لا سؤال إضافي.
- لا سؤال مكرر.
- لا سؤال من درس آخر.
- لا فهرس اختيار سالب.
- لا فهرس خارج `choices`.

## 5. مدخل RPC

المدخل المقترح:

```ts
interface MasteryAttemptSubmission {
  readonly submissionId: string;
  readonly lessonId: string;
  readonly startedAt: string;
  readonly expectedScoringFingerprint: string;
  readonly answers: ReadonlyArray<{
    readonly questionId: string;
    readonly selectedChoiceIndex: number;
  }>;
}
```

لا يقبل RPC:

```text
userId
studentId
role
status
correctCount
percentage
classification
recommendation
isCorrect
```

`startedAt` قيمة سياقية من العميل وليست وقت الإكمال الرسمي. `completed_at` و`created_at` من الخادم.

## 6. التسجيل الرسمي

العقد الحالي متساوي الوزن وثنائي التصحيح:

```text
is_correct = selected_choice_index = correct_answer_index
question_count = عدد الأسئلة القانونية
correct_count = عدد الإجابات الصحيحة
percentage = correct_count * 100.0 / question_count
```

لا درجات جزئية، ولا وزن مختلف، ولا `score/max_score` في D1.

نسخة السياسة الأولى:

```text
mastery-equal-weight-v1
```

قاعدة البيانات تحفظ على الأقل:

```text
question_count
correct_count
percentage
scoring_policy_version
scoring_fingerprint
```

## 7. بصمة عقد التسجيل

الخادم يحسب بصمة حتمية من المجموعة القانونية، بالترتيب الخادمي، وتشمل:

```text
lesson_id
scoring_policy_version
لكل سؤال:
  question_id
  correct_answer_index
  choices length
```

العميل يحسب البصمة من المحتوى الذي عرضه ويرسلها فقط بوصفها **شرط تزامن متفائل**، لا بوصفها حقيقة موثوقة.

الخادم يعيد الحساب دائمًا.

إذا اختلفت البصمتان قبل الإدخال:

```text
رفض كامل
لا attempt محفوظة
reason = scoring_contract_stale
```

## 8. فصل نوعي الفشل والتباين

### أ. رفض RPC قبل الحفظ

هذه الحالات لا تنشئ Attempt ولا Answers:

```text
question_set_mismatch
scoring_contract_stale
invalid_response_set
not_authenticated
not_authorized
lesson_not_available
```

النتيجة التطبيقية:

```ts
type RejectedMasteryAttempt = {
  readonly status: 'rejected';
  readonly reason:
    | 'question_set_mismatch'
    | 'scoring_contract_stale'
    | 'invalid_response_set'
    | 'not_authenticated'
    | 'not_authorized'
    | 'lesson_not_available';
};
```

لا يستخدم الاسم العام `content_mismatch` لأنه يخلط أسبابًا مختلفة.

### ب. نجاح الحفظ مع تسوية العرض

قد ينجح الحفظ وتعود نتيجة رسمية مختلفة عن النتيجة المحلية المعروضة مؤقتًا.

المحاولة هنا محفوظة فعلًا. ليست حالة رفض ولا `content_mismatch`.

النتيجة الناجحة تحتوي:

```ts
type MasteryResultReconciliation =
  | 'matched_local_result'
  | 'display_reconciled_to_server';
```

والنتيجة الرسمية:

```ts
interface OfficialMasteryAttemptResult {
  readonly attemptId: string;
  readonly submissionId: string;
  readonly lessonId: string;
  readonly questionCount: number;
  readonly correctCount: number;
  readonly percentage: number;
  readonly scoringPolicyVersion: 'mastery-equal-weight-v1';
  readonly scoringFingerprint: string;
  readonly completedAt: string;
}
```

العميل يعتمد النتيجة الرسمية للعرض بعد النجاح، لكنه لا ينشئ محاولة ثانية.

## 9. النتيجة التطبيقية المصنفة

```ts
type MasteryAttemptSubmissionResult =
  | {
      readonly status: 'saved' | 'already_saved';
      readonly result: OfficialMasteryAttemptResult;
      readonly reconciliation: MasteryResultReconciliation;
    }
  | RejectedMasteryAttempt
  | {
      readonly status: 'unavailable';
      readonly reason: 'network_error' | 'service_unavailable' | 'unknown';
    };
```

`unavailable` لا يجزم أن الخادم لم يحفظ؛ لذلك Retry يستخدم `submissionId` نفسه دائمًا.

## 10. Idempotency

القيد:

```text
UNIQUE(user_id, submission_id)
```

عند تكرار الطلب نفسه:

- لا تنشأ محاولة ثانية.
- يعيد RPC السجل الرسمي نفسه.
- تكون الحالة `already_saved`.

لا يسمح باستخدام `submissionId` نفسه مع درس أو مجموعة إجابات مختلفة. هذه الحالة تُرفض بوصفها `invalid_response_set` أو رمزًا أدق يثبت في D1.

## 11. الذرية

داخل Transaction واحدة:

```text
قراءة auth.uid()
→ التحقق من Profile active
→ قراءة الدرس والأسئلة القانونية
→ التحقق من البصمة ومجموعة الإجابات
→ حساب النتائج
→ إدخال attempt
→ إدخال answers
→ إعادة النتيجة الرسمية
```

إما نجاح الكل أو فشل الكل.

## 12. مفاتيح البيانات

وفق المخطط الحالي:

```text
attempt.id: uuid
attempt.user_id: uuid → auth.users(id) ON DELETE CASCADE
attempt.lesson_id: text → lessons(id) ON DELETE RESTRICT
answer.question_id: text → questions(id) ON DELETE RESTRICT
answer.attempt_id: uuid → attempts(id) ON DELETE CASCADE
```

## 13. القراءة والكتابة

المستخدم يستطيع:

```text
SELECT محاولاته وإجاباتها فقط
EXECUTE submit_mastery_attempt
```

ولا يستطيع مباشرة:

```text
INSERT
UPDATE
DELETE
```

على جدولي المحاولات والإجابات.

قراءة محاولات مستخدم آخر مؤجلة إلى Phase 3 وبعملية صلاحية مستقلة.

## 14. التصنيف والتوصية

النتيجة الرسمية تحفظ counts وpercentage، ولا تجعل النص العربي للتصنيف حقيقة قاعدة بيانات.

الواجهة تستخدم:

```text
classifyMasteryScore(official percentage)
getMasteryRecommendation(classification)
```

الحدود الحالية المجمدة لهذه السياسة:

```text
>= 80 متقن
>= 60 قريب من الإتقان
< 60 يحتاج مراجعة
```

تغيير الحدود مستقبلًا يحتاج نسخة سياسة جديدة واختبارات انتقال، لا تعديلًا صامتًا.

## 15. بوابة التكافؤ الدائمة

اختبار التكافؤ بين TypeScript وRPC **بوابة دائمة قابلة لإعادة التشغيل**، وليس اختبار قبول لمرة واحدة.

يضاف أمر مستقل في D4، باسم مقترح:

```text
npm run test:mastery-results-parity
```

ويجب أن يستدعيه صراحة:

```text
npm run verify:mastery-results-closure
```

بعد `supabase db reset` وجاهزية البيئة.

الاختبار يستخدم Supabase حقيقية ويقارن:

```text
calculateScore() في TypeScript
مع النتيجة الرسمية من submit_mastery_attempt
```

على الأقل للحالات:

```text
0 correct
1 correct
كل الحدود الممكنة حتى N correct
ترتيبات إجابة مختلطة
already_saved
```

أي تعديل لاحق على:

```text
src/utils/scoring.ts
منطق SQL/RPC
scoring_policy_version
```

يجب أن يبقي بوابة التكافؤ خضراء. لا يجوز إزالة الاختبار من أمر الإغلاق لتجاوز فشل.

## 16. دمج الواجهة في D3

بعد إنهاء الاختبار:

```text
عرض النتيجة المحلية فورًا
→ بدء الحفظ
→ عند النجاح: تسوية العرض مع النتيجة الرسمية
→ عند unavailable: إبقاء النتيجة وزر Retry
```

Retry يعيد `submissionId` نفسه.

Guest والمزوّد المحلي لا يظهر لهما فشل حفظ؛ تكون الحالة `not_applicable`.

## 17. خارج النطاق

- حفظ محاولة غير مكتملة.
- الاستئناف بين الأجهزة.
- Offline queue.
- سجل النتائج داخل الواجهة.
- لوحة المعلم والمراجع.
- تعديل أو حذف النتيجة.
- أوزان الأسئلة والدرجات الجزئية.
- أنواع أسئلة غير multiple choice.
- مقارنة الطلاب أو التقارير.

## 18. معايير قبول العقد

- [x] يطابق `MasteryTestView` الفعلي.
- [x] يطابق `calculateScore` الفعلي.
- [x] يطابق عتبات classifier الفعلية.
- [x] يطابق نوع الإجابة الحالي: choice index.
- [x] يطابق مفاتيح `text` للمحتوى و`uuid` للمستخدم.
- [x] يفصل رفض RPC عن تسوية العرض بعد النجاح.
- [x] يجعل التكافؤ بوابة دائمة داخل أمر الإغلاق.
- [x] لا يثق بدرجة أو مستخدم أو صلاحية من العميل.
- [x] لا يفتح حفظًا لمحتوى Local/Draft في النطاق الأول.
- [x] لا يغيّر عقود Phase 2-C.

## 19. بوابة الانتقال إلى D1

العقد معتمد، لكن لا يكتب منطق التسجيل داخل RPC قبل التحقق المباشر من:

```text
src/features/quiz/quiz-engine.ts
```

وبالأخص الدالتين:

```text
isCorrectAnswer
getQuestionFeedback
```

يجب إثبات أن قاعدة صحة الإجابة الفعلية متوافقة مع:

```text
selected_choice_index = correct_answer_index
```

إذا احتوت `isCorrectAnswer()` أي منطق إضافي، يجب تحديث عقد التسجيل واختبارات التكافؤ قبل إنشاء Migration. لا يجوز افتراض المساواة البسيطة اعتمادًا على شكل `Question` وحده.
