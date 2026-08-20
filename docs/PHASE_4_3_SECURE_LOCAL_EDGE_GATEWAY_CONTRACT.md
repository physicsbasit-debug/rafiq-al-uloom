# رفيق العلوم — Phase 4-3

## Secure Local Supabase Edge Gateway — Draft Contract for Architectural Review

**Baseline المغلق:** Phase 4-2 — Field-level AI Authoring UX  
**Baseline commit:** `0cc9427fb7dda83d9e260d4e7482d80a977e608a`  
**يعتمد على:**

- `docs/PHASE_4_0_AI_AUTHORING_CONTRACT_ARCHITECTURE.md`
- `docs/PHASE_4_1_PROVIDER_NEUTRAL_DOMAIN.md`
- `docs/PHASE_4_2_FIELD_LEVEL_AI_UX.md`

**طبيعة هذه الوثيقة:** عقد ومعمارية فقط.  
**لا كود، لا نشر بعيد، لا تغيير لعقود Phase 3/4-1/4-2 المجمّدة قبل اعتماد هذه الوثيقة.**

---

## 1. الهدف

Phase 4-3 تضيف أول مسار AI حي إلى رفيق العلوم عبر **Supabase Edge Function محلية**، مع إبقاء كل الحدود التي جُمّدت في 4-0 و4-1 و4-2.

المسار الملزم:

```text
Teacher UI
→ existing AiAuthoringProvider interface
→ GatewayAiAuthoringProvider
→ local Supabase Edge Function
→ server authentication + authorization
→ strict request validation
→ server-side per-user rate limit
→ server-owned prompt builder
→ server-side AI provider adapter
→ strict structured-output validation
→ sanitized AiGenerationResult
→ existing local Suggestion Buffer
→ explicit Teacher acceptance
→ existing Form Buffer / local field
→ existing validators
→ existing AuthoringService
→ Reviewer
→ trusted publication flow
```

Phase 4-3 لا تغيّر ما يحدث **بعد** عودة `AiGenerationResult` إلى المتصفح. حدود 4-2 تبقى هي مصدر الحقيقة لذلك الجزء.

---

## 2. القرار الأول: Local Edge Function أول خطوة فعلية

القرار ملزم:

- أول Gateway فعلي يعمل داخل **Supabase المحلية في Codespaces**.
- لا نشر Edge Function إلى Supabase البعيدة في 4-3 قبل بوابة قرار مستقلة لاحقة.
- لا Migration بعيدة تلقائية.
- لا secrets بعيدة تلقائية.
- لا تعديل للبيئة الإنتاجية لمجرد نجاح الاختبارات المحلية.
- Remote Supabase يبقى مؤجلًا كما نص عقد 4-0.

المسار المرحلي:

```text
local browser
→ local Supabase Edge Function
→ live external AI provider
```

وبعد إغلاق 4-3 فقط يمكن للمرحلة اللاحقة أن تقرر متى وكيف ينتقل Gateway إلى البيئة البعيدة.

---

## 3. الحدود المجمّدة التي لا تفتحها 4-3

ممنوع في 4-3:

- تعديل `LessonRevisionPayload`.
- تعديل `AiGenerationRequest`.
- تعديل `AiGenerationResult`.
- تعديل `AiAuthoringProvider`.
- إضافة `purpose` إلى خرج AI أو مدخله.
- جعل AI ينشئ `objective.key` أو `question.key`.
- تغيير `validateObjectiveDraft`.
- تغيير `validateQuestionDraft`.
- تغيير `getQuestionStateIssue`.
- تغيير `getLessonSubmissionReadiness`.
- إضافة مسار حفظ خاص بالـAI داخل `AuthoringService`.
- Auto-save.
- Auto-submit.
- Auto-review.
- Auto-approve.
- Auto-publish.
- كتابة AI مباشرة إلى Revision أو Canonical Content.
- تغيير Reviewer flow.
- تغيير trusted publication flow.
- تخزين provenance داخل `LessonRevisionPayload`.
- إدخال student-facing AI أو chat/tutoring.
- Full Lesson Generation.

إذا احتاج التنفيذ إلى أحد هذه التغييرات، تتوقف 4-3 وتُفتح مراجعة معمارية منفصلة بدل توسيع النطاق بصمت.

---

## 4. العقد بين المتصفح والـGateway

### 4.1 جسم الطلب

الـEdge Function تقبل **`AiGenerationRequest` الحالي نفسه** فقط.

المفاتيح العليا المسموحة:

```text
target
context
```

ولا يجوز للمتصفح إرسال:

- raw prompt
- system prompt
- provider name
- model name
- temperature
- token limit
- user id
- role
- email
- purpose
- publication action
- database target
- revision payload

أي مفتاح إضافي يُرفض.

### 4.2 الأهداف المسموحة فقط

```text
lesson_summary
objective
review_question
mastery_question
```

ولا يوجد:

```text
generate_full_lesson
generate_and_save_revision
generate_and_submit
generate_and_publish
```

### 4.3 الرد

الـGateway تعيد `AiGenerationResult` الموافق لعقد 4-1.

لا يُنشأ Result Union جديد في 4-3.

الـBrowser Adapter يعيد التحقق من النتيجة باستخدام عقد 4-1 قبل تمريرها إلى Suggestion Buffer، حتى بعد أن يكون الخادم قد تحقق منها مسبقًا.

هذا دفاع مزدوج:

```text
server validation
+
client domain-contract validation
```

---

## 5. Server-owned prompting

المتصفح لا يملك Prompt.

الـEdge Function هي المالك الوحيد لـ:

- system instructions
- target-specific instructions
- provider model selection
- output format instruction
- safety/pedagogical system constraints الخاصة بهذه المرحلة

الطلب القادم من المتصفح يحتوي سياقًا منظمًا فقط.

### 5.1 Data minimization

يُرسل إلى AI Provider فقط ما يلزم للـtarget الحالي من عقد 4-1:

- `language = ar`
- `gradeLabel`
- `subjectLabel`
- `unitTitle`
- `lessonTitle`
- `currentSummary` للملخص عند وجوده
- `objectives[{key,text}]` للأسئلة فقط

ممنوع إرسال:

- user id إلى AI Provider
- البريد
- profile
- role
- access token
- refresh token
- بيانات الطلاب
- mastery history
- review history
- Revision كاملة
- canonical content غير اللازم
- أسرار Supabase

هوية المستخدم قد تُستخدم داخل الـGateway للمصادقة والـrate limiting فقط، ولا تدخل Prompt.

---

## 6. المصادقة والتصريح خادميًا

الـGateway لا تثق بأي claim يرسله جسم الطلب عن هوية المستخدم أو دوره.

التسلسل:

```text
Authorization Bearer token
→ server verifies session/user
→ server resolves current authorization
→ only an authorized active teacher may continue
```

القواعد:

- Missing/invalid auth → رفض قبل AI Provider.
- Student → رفض.
- Reviewer الذي لا يملك صلاحية التأليف → رفض.
- Role/status المرسل من المتصفح، إن وُجد، مرفوض أصلًا لأنه حقل غير متوقع.
- لا يُكتفى بأن زر الواجهة مخفي أو disabled.
- القرار الأمني النهائي خادمي.

---

## 7. Rate limiting شرط سابق لأول AI call

**لا أول اتصال حي بالمزوّد قبل أن يعمل Rate Limiting خادميًا ويجتاز اختباراته.**

الترتيب الإلزامي:

```text
request-size/method guard
→ auth
→ authorization
→ request validation
→ server-side quota consume
→ AI provider call
```

### 7.1 سياسة استهلاك الحصة

الحصة في 4-3 هي **حصة محاولات AI وليست حصة نجاحات AI**.

السياسة الملزمة:

```text
فشل قبل بدء استدعاء Provider
→ لا تُستهلك محاولة

quota granted
→ تبدأ محاولة Provider
→ تُستهلك المحاولة

success / timeout / network failure / provider rejection / invalid model output
→ لا تُعاد الحصة
```

السبب: بمجرد بدء محاولة المزوّد قد تكون التكلفة الخارجية قد وقعت فعليًا، وإرجاع الحصة عند الفشل يخلق مسار retry مجاني قابلًا للإساءة.

### 7.2 خصائص Rate Limiter

يجب أن يكون:

- per authenticated user.
- خادميًا.
- ذريًا تحت الطلبات المتزامنة.
- معتمدًا على server time.
- غير قابل لتحديد limit أو window من المتصفح.
- مطبقًا قبل أي provider call يستهلك تكلفة.
- fail-closed عند تعذر التأكد من الحصة.

يُفضّل مستويان:

- burst/window قصير.
- daily quota.

الأرقام النهائية للحدود هي **سياسة تشغيل خادمية**، وليست جزءًا من `AiGenerationRequest`. تُجمّد قبل أول live call في Migration/Implementation Note ولا تُقبل من client parameters.

### 7.2 تصميم قاعدة البيانات المسموح به

4-3 تسمح بأصغر Migration تشغيلية لازمة للـRate Limiting فقط.

المسار المفضل:

```text
private/internal rate-limit storage
+
one narrow RPC:
consume_ai_authoring_quota
```

خصائص الـRPC:

- تعتمد على `auth.uid()` خادميًا.
- لا تقبل `user_id` من المتصفح.
- لا تقبل limit من المتصفح.
- لا تقبل timestamp من المتصفح.
- لا تقرأ أو تكتب محتوى الدروس.
- لا تلمس `content_revisions`.
- لا تلمس `content_review_events`.
- لا تستدعي أي publication RPC.
- نتيجتها التشغيلية فقط: allowed / remaining / retry-after أو ما يعادلها.

لا يحتاج Gateway إلى Service Role لهذا التصميم.

**أي اقتراح لاستخدام Service Role داخل Gateway يحتاج قرارًا أمنيًا جديدًا صريحًا، ولا يُسمح بإدخاله كتفصيل تنفيذي عابر.**

---

## 8. حارس معماري صريح للـRPC

هذه نقطة قبول إلزامية وليست توصية.

يُضاف Architecture Guard يفحص Gateway subtree ويمنع وجود أسماء trusted authoring/publication RPCs، ومنها على الأقل:

```text
create_lesson_revision
save_lesson_revision
submit_lesson_revision
review_lesson_revision
```

كما يمنع:

- direct canonical table writes.
- `content_revisions`
- `content_review_events`
- imports من Reviewer feature.
- imports من Teacher AuthoringService بهدف الكتابة.
- أي publication boundary.

إذا استُخدم `.rpc(...)` داخل Gateway، فالاسم الوحيد المسموح به في 4-3 هو RPC التشغيلية الضيقة الخاصة بالـrate limit:

```text
consume_ai_authoring_quota
```

ويجب أن يثبت الاختبار ذلك كـallowlist، لا مجرد blacklist جزئية.

---

## 9. Service Role وSecrets

### 9.1 AI secret

مفتاح AI:

- Edge environment فقط.
- لا `VITE_*`.
- لا React source.
- لا bundle.
- لا test fixture committed.
- لا raw log.
- لا error message للمستخدم.

### 9.2 Supabase Service Role

القرار الافتراضي في 4-3:

```text
NO SERVICE ROLE IN GATEWAY
```

Gateway تستخدم user JWT + أقل صلاحية لازمة.

إذا ظهر احتياج حقيقي للـService Role، يتوقف التنفيذ وتُراجع الحدود قبل إدخاله.

### 9.3 ملف البيئة المحلي

الـlocal provider secret يمكن أن يوجد في ملف local env غير متتبع أو secret injection محلي.

يجب وجود فحص repository hygiene يثبت أن secret لم يدخل Git.

---

## 10. Provider-neutral server adapter

4-1 يبقى provider-neutral في المتصفح، و4-3 تحافظ على المبدأ خادميًا.

يكون داخل Edge:

```text
Gateway handler
→ ServerAiProvider adapter
→ selected external provider
```

اسم المزوّد/model لا يدخل عقد Browser.

اختيار أول مزوّد حي هو إعداد خادمي، ويمكن تغييره لاحقًا دون تعديل UI أو 4-1/4-2 contracts.

`providerFamily` و`modelLabel` في metadata يحددهما الخادم، لا النموذج ولا المتصفح.

---

## 11. Structured Output: fail closed

الـGateway تطلب خرجًا منظمًا خاصًا بالـtarget.

### 11.1 Lesson Summary / Objective

المحتوى المقبول من AI قبل إضافة metadata:

```text
{text}
```

### 11.2 Question

المفاتيح فقط:

```text
prompt
choices
correctAnswerIndex
explanation
objectiveKey
difficulty
```

لا `purpose`.

لا key داخلي للسؤال.

### 11.3 التحقق الخادمي

قبل الرد:

- exact expected fields.
- nonblank strings.
- choices count/shape.
- integer correctAnswerIndex داخل النطاق.
- explanation غير فارغ.
- objectiveKey موجود ضمن request objectives.
- difficulty ضمن القيم المعتمدة.
- target/result consistency.

أي إخفاق:

```text
invalid_output
```

ولا يصل object غير موثوق إلى Suggestion Buffer كنجاح.

### 11.4 لا heuristic repair في 4-3

لا استخراج تخميني من نص حر.
لا قص Markdown fences ثم افتراض أن كل شيء صحيح.
لا retry خفي لإصلاح JSON.
لا retry تلقائي يضاعف التكلفة بصمت.

المحاولة الجديدة تكون بطلب صريح من المعلم.

الـrepair/pedagogical refinement الأعمق إن احتجناه مكانه 4-4، لا Gateway الأمني الأساسي.

---

## 12. فشل Provider وTransport

Phase 4-3 لا تغيّر Result Union في 4-1.

لذلك:

- malformed client request → rejected/invalid_request وفق العقد.
- invalid AI output → invalid_output.
- provider failure/timeout/network → unavailable/provider_unavailable.
- browser abort → aborted في Provider Adapter عندما يكون ذلك قابلاً للرصد.
- server 429 rate limit يبقى transport-level، ويحوّله Gateway Provider إلى حالة عدم توفر آمنة ضمن العقد الحالي دون إضافة enum جديد في 4-1.

يمكن للـHTTP response استخدام `Retry-After`، لكن لا يُضاف حقل جديد إلى `AiGenerationResult` في 4-3.

إذا أردنا UI مخصصًا للـrate limit لاحقًا فهذا تغيير عقد مستقل، وليس سببًا لكسر Freeze 4-1 الآن.

---

## 13. Cancellation / stale result

دفاع 4-2 يبقى كما هو ولا يُستبدل.

Gateway Provider يجب أن يدعم `AbortSignal` من `AiGenerationOptions`.

المسار:

```text
UI abort
→ abort gateway request when runtime permits
+
4-2 monotonic stale-result guard
```

حتى لو استمر provider call خادميًا بسبب قيود runtime:

- لا يجوز تطبيق late result في المتصفح.
- لا mutation.
- لا auto retry.
- الحصة قد تبقى محسوبة لأنها provider attempt بدأت فعليًا.

---

## 14. Data persistence

لا تُخزّن اقتراحات AI في 4-3.

مسموح persistence فقط لـ:

- rate-limit operational state.

غير مسموح:

- prompt history.
- generated suggestions.
- lesson content copy.
- AI provenance داخل revision.
- user content logs.

قرار provenance persistence يبقى في Phase 4-5 كما نصت 4-0.

---

## 15. Logging

الـGateway logs التشغيلية يمكن أن تشمل:

- request/generation correlation id.
- target.
- duration.
- outcome category.
- provider status/error code المنقح.
- rate-limit decision.

ممنوع تسجيل:

- JWT.
- refresh token.
- API key.
- full prompt.
- lesson title/content افتراضيًا.
- objectives texts.
- generated answer body.
- email.
- student data.

عند `invalid_output` يُسجل سبب validation، لا raw model output افتراضيًا.

---

## 16. CORS وHTTP boundary

الـGateway:

- تقبل POST لتوليد الاقتراح.
- تتعامل مع OPTIONS عند الحاجة.
- لا تعرض endpoint عام بلا Auth.
- تضع حدًا لحجم request body قبل provider call.
- تضبط origin policy محليًا بما يلائم التطبيق.
- لا تعتمد `*` كقرار إنتاجي افتراضي.
- لا تقبل query params لتغيير model/prompt/limit/role.

---

## 17. لا Cache في 4-3

كل ضغط صريح من المعلم = محاولة توليد جديدة.

لا cache للاقتراحات في 4-3 لأن:

- السياق قد يتغير.
- الهدف قد يُحذف.
- 4-2 لديها snapshot/current-state guards.
- cache يضيف stale semantics إضافية قبل الحاجة إليها.

إذا احتجنا cache لاحقًا فهو قرار مستقل.

---

## 18. مصدر التحقق الخادمي: مصدر تنفيذي واحد أولًا

لا يجوز أن تتباعد قواعد Edge عن عقد 4-1 بصمت.

الترتيب الملزم في 4-3A:

1. محاولة استيراد `src/services/ai-authoring/ai-authoring.contract.ts` نفسه حرفيًا داخل Edge Function.
2. يجب أن يثبت `deno check` و`supabase functions serve` أن سلسلة الاستيراد المتعدية كاملة قابلة للحل، بما فيها `ai-authoring.types.ts` ثم `@shared-types/quiz.types` ثم أي imports تابعة لها.
3. إذا تعذر ذلك تقنيًا، يكون البديل استخراج **runtime-neutral shared core واحد** ثم إعادة التصدير منه للمتصفح والـEdge دون تغيير semantics المجمدة.
4. لا يُسمح بإنشاء validator خادمي مكرر إلا كحل أخير بعد إثبات تعذر الخيارين السابقين؛ وعندها تصبح Parity Tests إلزامية.

في حالة الاضطرار للخيار الثالث فقط، تُشغّل fixtures متطابقة ضد:

- Browser/Domain validator في 4-1.
- Server validator في Edge.

ويجب أن تتفق على:

- valid request.
- extra top-level field.
- invalid target.
- invalid language.
- unexpected context field.
- empty objectives for question.
- duplicate objective key.
- invalid question choices.
- invalid correctAnswerIndex.
- objectiveKey خارج request.
- invalid difficulty.
- extra output fields.

Phase 4-3 لا تعيد اختراع semantics مختلفة على الخادم.

---

### 18.1 حسم 4-3A بعد الاختبار الفعلي

أثبت التشغيل الفعلي فرقًا مهمًا بين `deno check` المستقل وBundler الخاص بـSupabase Edge Runtime:

- الاستيراد الحرفي لـ`ai-authoring.contract.ts` نجح في `deno check`.
- لكن `supabase start` فشل عند بناء Function بسبب تفاعل import-map shim مع الاستيرادات النسبية غير ذات الامتداد، وأنتج مسارًا غير صالحًا من نوع `ai-authoring.types.ts.ts`.
- لذلك عُدَّ الخيار الأول غير صالح **للRuntime الفعلي** رغم نجاح الفحص المستقل.

بناءً عليه تُفعّل الخطة الاحتياطية الثانية المعتمدة مسبقًا:

```text
runtime-neutral shared contract core
        ↑                    ↑
browser 4-1 wrapper      Edge 4-3
```

القواعد:

- يوجد **مصدر تنفيذي واحد** لقواعد request/output validation.
- ملف 4-1 العام يبقى Wrapper typed يحافظ على العقود العامة المجمدة.
- Edge تستورد النواة المشتركة مباشرة بامتداد `.ts` صريح.
- النواة المشتركة لا تعتمد React أو DOM أو Vite aliases أو ملفات تطبيق أخرى.
- اختبار type parity وقت البناء يثبت بقاء request/result/suggestion/reason unions متكافئة مع عقود 4-1 العامة.
- لا يوجد server validator مكرر.

### 18.2 حسم حدود الجسم وطبقات المصادقة في 4-3A

أظهرت التجارب المحلية الفعلية أن حدود المسؤولية يجب أن تُصاغ بدقة على طبقتين:

```text
Kong / Supabase platform verify_jwt
        ↓
Edge Function handler
        ↓
bounded body-size guard (32 KiB)
        ↓
application Profile / active-teacher authorization
        ↓
strict request validation
        ↓
quota/provider في المراحل اللاحقة
```

النتائج المرجعية في بيئة 4-3A المحلية:

- طلب صغير بلا Authorization مع `verify_jwt` الطبيعي أعاد `401` سريعًا من طبقة المنصة.
- مع `--no-verify-jwt` أعاد الطلب الصغير بلا Authorization `401` من كود التطبيق.
- مع `--no-verify-jwt` أعاد الجسم نفسه البالغ `41,168` بايت `413 request_too_large` سريعًا، ما يثبت أن `readBoundedBody` نفسه يفرض الحد.
- في السيناريو الأقرب للتشغيل الحقيقي، أي `verify_jwt` مفعّل + JWT معلم صالح + نفس `41,168` بايت، أعاد المسار `413 request_too_large` بنجاح.

بناءً على ذلك:

1. لا تُعطّل `verify_jwt` في التشغيل الطبيعي أو اختبارات المصادقة.
2. عبارة "body-size guard قبل Auth" تُفهم داخل الـFunction على أنها **قبل application Profile/authorization**، لا قبل platform `verify_jwt`.
3. اختبار الجسم الكبير مع JWT صالح يُشغّل منفردًا ضمن بوابة الإغلاق لتجنب خلطه بضغط مجموعة اختبارات Supabase المتوازية؛ مجموعة التكامل العامة تستمر في اختبار بقية سلوك Gateway تحت `verify_jwt` الطبيعي.
4. يُسمح باختبار معزول إضافي مع `--no-verify-jwt` لإثبات الحارس الداخلي نفسه فقط؛ هذا وضع اختبار محلي وليس إعداد تشغيل.
5. رسائل Edge Runtime المحلية من نوع `connection closed before message completed` أو `error writing a body to connection` بعد استلام العميل `413` تُسجل كملاحظة Runtime مرتبطة بالرفض المبكر للجسم، ولا تُعامل وحدها كفشل وظيفي ما دام HTTP `413` قد وصل للعميل واكتملت اختبارات البوابة.
6. إعادة الفحص على Supabase المستضافة تبقى مطلوبة عند مرحلة النشر البعيد؛ 4-3A تثبت المسار المحلي ولا تدّعي إثبات بنية الاستضافة المستقبلية.

## 19. Architecture Guards الإلزامية

قبل أول AI call حي يجب أن تكون خضراء:

### Guard A — Client secret boundary

يمنع:

- AI secret في `src/**`.
- provider API URL مباشر في Teacher feature.
- Service Role في client.
- direct external AI fetch من React.

### Guard B — Gateway publication boundary

يمنع:

- trusted publication RPC names.
- content revision writes.
- Reviewer/publication imports.
- canonical writes.
- غير `consume_ai_authoring_quota` من RPCs التشغيلية في 4-3.

### Guard C — Frozen contract boundary

يثبت عدم تعديل:

- 4-1 request/result/provider contracts.
- 4-2 acceptance adapter semantics.
- Phase 3 Authoring/Reviewer contracts.

### Guard D — Migration scope

يثبت أن SQL الجديد، إن وجد، محصور في rate limiting ولا يعدّل:

- Authoring Plane tables.
- Reviewer tables.
- existing publication functions.
- existing RLS/GRANT/REVOKE للـAuthoring Plane.

---

## 20. ترتيب التنفيذ بعد اعتماد الوثيقة

### 4-3A — Local Gateway Boundary

بدون live provider أولًا:

- Edge Function محلية.
- method/body/auth guards.
- server request validator.
- deterministic/fake server provider.
- sanitized response.
- architecture guards.

**لا AI API key بعد.**

### 4-3B — Server Rate Limit

- minimal local Migration.
- narrow quota RPC.
- concurrency tests.
- fail-closed tests.
- no Service Role.
- rate-limit architecture guard.

بعد نجاح 4-3A و4-3B فقط يسمح بالخطوة الحية.

### 4-3C — Live Server AI Provider

- local AI secret.
- server prompt builder.
- external provider adapter.
- structured output.
- provider timeout/failure mapping.
- metadata server-owned.

### 4-3D — Browser Gateway Provider

إضافة Provider يطبق `AiAuthoringProvider` الحالي ويتصل بالـEdge المحلية.

لا تغيير على Suggestion Buffer أو acceptance semantics.

الـprovider يحقن عبر نفس المسار الذي جمدناه في 4-2.

### 4-3E — Local End-to-End Acceptance

اختبار فعلي:

```text
authenticated teacher
→ real local Edge
→ live AI provider
→ structured validated suggestion
→ existing 4-2 Suggestion Buffer
```

ويثبت:

- suggestion arrival لا يجعل draft dirty.
- Reject لا يغيّر manual data.
- Accept فقط ينقل الاقتراح.
- overwrite confirmation يبقى فعالًا.
- current purpose يبقى من المعلم.
- deleted objective يظل محميًا عند Accept.
- save/submit/reviewer/publication لم تُمس.

---

## 21. الاختبارات المطلوبة

لا نجمّد رقمًا مسبقًا للاختبارات؛ النتائج المنفذة هي المرجع.

لكن يجب تغطية الفئات التالية:

### Request/Auth

- no token.
- invalid token.
- unauthorized role.
- inactive/unauthorized account.
- extra request fields.
- raw prompt field.
- provider/model field.
- invalid language.
- invalid target.
- invalid objectives.

### Rate Limit

- allowed request.
- threshold reached.
- concurrent requests.
- client cannot choose limit.
- client cannot choose user id.
- failure of quota check → no provider call.

### Provider

- success لكل target.
- timeout.
- network failure.
- invalid JSON/structured output.
- unexpected fields.
- objectiveKey خارج request.
- bad difficulty.
- incorrect answer index.
- provider rejection.

### Client Adapter

- success mapping.
- invalid_output mapping.
- unavailable mapping.
- abort.
- no secret in bundle.
- no direct provider fetch.

### 4-2 Composition Regression

- no mutation before Accept.
- no silent overwrite.
- same-instance new request clears old suggestion.
- stale pending response ignored.
- completed suggestion preserved across context change for current-state acceptance checks.
- deleted objective scenario remains blocked.

---

## 22. أول Live Call: بوابة خاصة

لا يُسمح باستدعاء AI Provider حي حتى تكون هذه العناصر خضراء:

1. Local Edge boundary.
2. Auth.
3. Authorization.
4. Request validation.
5. Server-side rate limit.
6. Architecture guards.
7. No-secret repository scan.
8. Deterministic/fake gateway tests.
9. Server validator parity tests.
10. Build/Lint/format/type checks المناسبة.

بعدها فقط يوضع secret محلي ويُجرى أول live call.

---

## 23. معيار إغلاق Phase 4-3

4-3 لا تُكتب CLOSED إلا بعد:

1. اعتماد هذه الوثيقة.
2. نجاح Local Edge Gateway.
3. نجاح auth/authorization server-side.
4. نجاح rate limiting server-side.
5. عدم وجود Service Role في Gateway.
6. نجاح architecture allowlist/forbidden-RPC guard.
7. نجاح parity tests.
8. نجاح live provider محليًا لكل target أو مصفوفة قبول معتمدة تغطي الأهداف الأربعة.
9. نجاح 4-2 regression suite.
10. نجاح full project tests.
11. نجاح local E2E عبر Edge الحقيقية.
12. عدم وجود secret في Git/bundle/log.
13. actual staged diff review.
14. raw terminal log review.
15. commit/push verification.
16. إثبات عدم حصول remote Supabase deployment أو remote migration ضمن 4-3.

لا Tag نهائي لـPhase 4 هنا؛ Tag `v0.7-ai-assisted-authoring-complete` يبقى لإغلاق Phase 4 الكامل بعد 4-4/4-5/4-6.

---

## 24. ما بعد 4-3

حسب خارطة 4-0 المجمّدة:

- 4-4 Pedagogical Guardrails
- 4-5 Provenance Persistence Decision
- 4-6 Real Composition + Security Closure + Freeze

Phase 4-3 لا تبتلع هذه المراحل.

---

## 25. القرار النهائي المقترح للاعتماد

إذا اعتُمد هذا العقد:

- نعم: **Local Supabase Edge Function هي أول خطوة فعلية.**
- نعم: **Remote Supabase يبقى مؤجلًا.**
- نعم: **Rate limiting خادمي إلزامي قبل أول live provider call.**
- نعم: **Gateway لا تحتاج Service Role في التصميم الافتراضي.**
- نعم: **حارس معماري صريح يمنع trusted publication RPCs، ويستخدم allowlist لأي RPC تشغيلية.**
- نعم: **المتصفح يرسل structured request فقط ولا يملك prompt/model/provider.**
- نعم: **4-1 و4-2 يبقيان مجمّدين.**
- نعم: **لا canonical writes ولا revision writes من Gateway.**
- نعم: **لا persistence لاقتراحات AI في 4-3.**
- نعم: **أول live acceptance محلي مطلوب قبل إغلاق 4-3.**
