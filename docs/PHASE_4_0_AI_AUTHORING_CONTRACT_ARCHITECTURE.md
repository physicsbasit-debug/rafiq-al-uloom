# رفيق العلوم — Phase 4-0

## AI-assisted Authoring Contract & Architecture — Approved

**Baseline المغلق:** `v0.6-teacher-dashboard-complete`  
**Baseline commit:** `3f2eb668d1c08ea6699f1a60cb56c58617ad98d7`  
**طبيعة المرحلة:** عقد ومعمارية فقط. لا تكامل AI حي، لا SQL، لا Migration، ولا تغيير لعقود Phase 3 المجمّدة.

## 1. الهدف

إضافة طبقة مساعدة بالذكاء الاصطناعي إلى مساحة المعلم، بحيث تنتج اقتراحات قابلة للمراجعة على مستوى الحقل/العنصر، ثم يقرر المعلم صراحةً قبولها أو تعديلها أو رفضها.

المسار المعتمد:

Teacher → AI suggestion → validation → local Suggestion Buffer → explicit Teacher acceptance → existing Form Buffer → existing validators → existing AuthoringService → revision → Reviewer → trusted publication flow.

## 2. الحدود المجمّدة من Phase 3

ممنوع في 4-0/4-1/4-2:

- تعديل `LessonRevisionPayload`.
- إنشاء مسار كتابة AI خاص داخل `AuthoringService`.
- تعديل `getLessonSubmissionReadiness`.
- تعديل `getQuestionStateIssue`.
- إنشاء validator موازٍ لأسئلة AI بدل `validateQuestionDraft`.
- تغيير RPC/RLS/GRANT/REVOKE الحالية الخاصة بـAuthoring Plane.
- إعطاء AI وصولًا مباشرًا إلى `content_revisions` أو `content_review_events`.
- إعطاء AI وصولًا إلى canonical content writes أو trusted publication RPCs.

أي حاجة مستقبلية لتغيير عقد مجمّد تُفتح كمرحلة مستقلة صريحة.

## 3. القرار الملزم: Field-first

الأهداف الأولية فقط:

- `lesson_summary`
- `objective`
- `review_question`
- `mastery_question`

لا يوجد في البداية:

- `generate_full_lesson`
- `generate_and_save_revision`
- `generate_and_submit`
- `generate_and_publish`

### الملخص

AI يعيد نص ملخص مقترح فقط. القبول الصريح ينسخه إلى الحقل المحلي الحالي.

### هدف التعلم

AI يعيد نص الهدف فقط ولا ينشئ `objective.key`. بعد قبول المعلم يُستخدم `createObjectiveKey` والمسار الحالي و`validateObjectiveDraft`.

### سؤال مراجعة / إتقان

AI يعيد بيانات سؤال تلائم `TeacherQuestionFormDraft`. لا ينشئ `question.key`. ويجب أن يشير `objectiveKey` إلى هدف موجود حاليًا.

`purpose` (`review` أو `mastery`) يحدده المعلم/الزر الذي بدأ الطلب قبل إرسال الطلب إلى AI، ولا يملك AI تغيير هذا الغرض أو اقتراح غرض بديل. أما `difficulty` فيجوز أن تكون جزءًا من الاقتراح ضمن القيم المدعومة فقط، وتبقى خاضعة للتحقق الحالي.

بعد القبول:

AI suggestion → `TeacherQuestionFormDraft` → `validateQuestionDraft` → current apply path → `createQuestionKey` → questions state.

## 4. Suggestion Buffer

يجب الفصل بين `AI Suggestion Buffer` و`Teacher Form Buffer`.

الاقتراح لا يعدّل Form Buffer تلقائيًا.

الحالات:

- Accept
- Edit/Accept
- Reject

قواعد ملزمة:

- لا قبول صامت.
- لا Auto-save.
- لا Auto-submit.
- لا إنشاء Revision خادمية بسبب نجاح طلب AI.
- فشل AI لا يمس النص اليدوي.
- الاستجابة المتأخرة لا تستبدل حالة أحدث.
- تغيير سياق الدرس أثناء الطلب يمنع التطبيق التلقائي للاستجابة القديمة.
- الإلغاء أو فشل الشبكة لا يفقد بيانات المعلم.

**البند الأحمر:**

`AI output may populate a local suggestion buffer only. AI output must never create a server-side revision without explicit teacher acceptance.`

## 5. العقد المحايد للمزوّد

في 4-1:

- `AiAuthoringProvider`
- `AiGenerationRequest`
- `AiGenerationResult`
- `AiAuthoringTarget`
- `AiSuggestion`
- `AiSuggestionMeta`

الطلب يحمل الحد الأدنى فقط حسب target: الصف/المادة/الوحدة/عنوان الدرس/الأهداف الحالية عند الحاجة/نوع السؤال/العربية. لا تُرسل Revision كاملة لتوليد حقل صغير بلا حاجة.

النتيجة ليست `LessonRevisionPayload`.

الحالات المفاهيمية:

- `success`
- `invalid_output`
- `rejected`
- `unavailable`
- `aborted`

المزوّد الأول:

`DeterministicAiAuthoringProvider`

## 6. التحقق: مصدر واحد للحقيقة

هناك مستويان:

1. Schema validation لاستجابة AI من حيث الشكل والأنواع فقط.
2. Existing domain validation بعد قبول المعلم.

للأهداف:

`validateObjectiveDraft`

للأسئلة:

`validateQuestionDraft`, `getQuestionStateIssue`, `getLessonSubmissionReadiness`

لا يُنشأ `validateAiQuestion` بديل.

حالات عدائية يجب رفضها:

- سؤال بلا إجابة صحيحة.
- أقل من اختيارين.
- اختيار فارغ.
- شرح فارغ.
- `objectiveKey` غير موجود.
- purpose أو difficulty غير صالحين.

## 7. AI Gateway

الاتصال الحي يؤجل إلى 4-3.

المسار:

Browser → local Supabase Edge Function → AI Provider → structured validation → sanitized response → Browser Suggestion Buffer.

قواعد الأمن:

- مفتاح AI خادمي فقط.
- لا `VITE_*` لمفتاح AI.
- لا مفتاح AI داخل React أو bundle.
- Gateway لا يستدعي Authoring RPCs أو publication RPCs.
- Gateway لا يكتب إلى canonical tables أو `content_revisions`.
- المستخدم يجب أن يكون مصادقًا ومصرحًا له خادميًا.
- يفضّل ألا يحتاج Gateway إلى Service Role أصلًا. أي حاجة لاحقة لها قرار أمني مستقل.
- **Rate limiting / abuse prevention لكل مستخدم يؤجل تصميمه التفصيلي إلى 4-3، لكنه شرط أمني إلزامي قبل أي اتصال AI حي فعلي؛ لا يجوز اعتبار 4-3 قابلة للإطلاق بدونه.**
- يجب أن يكون الحد مطبقًا خادميًا عند Gateway لا اعتمادًا على تعطيل زر في React، وأن يفشل بصورة آمنة عند تجاوز الحد.
- Remote Supabase يبقى مؤجلًا.

## 8. Data minimization

لا يُرسل أكثر مما يحتاجه target.

ممنوع افتراضيًا إرسال البريد، user id، بيانات Profile غير الضرورية، Review history، بيانات الطلاب، نتائج mastery للمستخدمين، الأسرار/session tokens، أو Revision كاملة بلا حاجة.

## 9. الحراس التربويون

يجب احترام:

- الصف/المستوى.
- المادة.
- الوحدة/الدرس.
- أهداف الدرس الحالية.
- purpose: review/mastery.
- ارتباط السؤال بهدف موجود.
- العربية المناسبة.
- الوضوح العلمي.
- عدم التوسع المنهجي غير المسنود.
- عدم تحويل mastery إلى سؤال حفظ سطحي لمجرد اكتمال الحقل.

هذه الحراس لا تستبدل المعلم أو Reviewer.

**صحة المحتوى العلمي للاقتراح ليست مثبتة آليًا بمجرد نجاح schema/domain validation أو الحراس التربويين.** هذه الطبقات تتحقق من البنية والسياق والقواعد القابلة للفحص فقط. المسؤولية النهائية عن الدقة العلمية تبقى ضمن المراجعة البشرية: المعلم قبل القبول، ثم Reviewer ضمن مسار Phase 3 الحالي.

## 10. Provenance

في 4-0/4-1/4-2:

لا Migration ولا persistence.

يجوز metadata مؤقتة خارج `LessonRevisionPayload` مثل:

- `generationId`
- `providerFamily`
- `modelLabel`
- `generatedAt`
- `target`

قرار persistence يؤجل إلى 4-5 فقط. إذا تقرر لاحقًا فهو additive بحت عبر sidecar/table أو metadata مستقلة، ولا يدخل validators الحالية ولا يصبح شرطًا لصحة Revision أو نشرها.

## 11. حالات الفشل

الحالات:

- `idle`
- `loading`
- `suggested`
- `invalid_output`
- `unavailable`

القواعد:

- invalid output لا يطبق على Form Buffer.
- unavailable يبقي التأليف اليدوي كامل الوظيفة.
- aborted بلا mutation.
- stale response تُهمل.
- **أي طلب AI معلّق يُلغى أو تُهمل نتيجته فور مغادرة المعلم شاشة المحرر (unmount/navigation). لا يجوز تطبيق استجابة بعد العودة لاحقًا إلى الدرس حتى لو بقي الطلب حيًا فنيًا.**
- retry يعيد طلب الاقتراح فقط ولا يحفظ Revision.
- AI ليست dependency مطلوبة للحفظ أو الإرسال اليدوي.

## 12. بوابة القبول قبل أول اتصال AI حي

### A. Deterministic Provider + adversarial tests

تشمل success لكل target، invalid output، abort، unavailable، stale response، سؤال بلا correct answer، `objectiveKey` غير موجود، invalid purpose/difficulty، objective فارغ.

ويجب استخدام validators الحالية بعد القبول.

### B. Real Supabase composition بلا AI حي

Teacher Auth/Profile → deterministic suggestion → explicit acceptance → existing Form Buffer → existing validator → existing AuthoringService → create/save Revision → submit → Reviewer queue → Approve/Reject → existing trusted publication path.

لا mock لـAuthoringRepository في الاختبار النهائي.

### C. Architecture guards

تمنع:

- AI secret في client source/bundle.
- Service Role في client source/bundle.
- Gateway access/import إلى publication boundary.
- Gateway call لأسماء trusted publication RPCs.
- كتابة AI مباشرة إلى canonical tables.
- AI bypass لـAuthoringService بعد قبول المعلم.
- بدء API حي قبل اكتمال A/B/C.

أعداد الاختبارات لا تُعلن مسبقًا؛ المخرجات المنفذة هي المرجع.

## 13. تقسيم Phase 4

- 4-0 Contract & Architecture
- 4-1 Provider-neutral domain + deterministic provider
- 4-2 Field-level Teacher AI UX
- 4-3 Secure local Supabase Edge Gateway
- 4-4 Pedagogical guardrails
- 4-5 Provenance persistence decision
- 4-6 Real composition + security closure + freeze

الوسم المقترح عند الإغلاق الكامل:

`v0.7-ai-assisted-authoring-complete`

## 14. خارج النطاق الآن

Full Lesson Generation، autonomous agent authoring، AI review/approval/publication، AI direct DB writes، student-facing AI، adaptive tutoring/chat، AI-generated games/experiments كمسار أول، Remote Supabase deployment، تغيير الأدوار، تعديل عقود Phase 3، provenance migration قبل 4-5.

## 15. معيار إغلاق Phase 4-0

تُعد 4-0 مكتملة فقط عند:

1. مراجعة الوثيقة معماريًا وأمنيًا وتربويًا.
2. عدم بقاء قرار مفتوح يؤثر في حدود Phase 3.
3. اعتماد Field-first.
4. اعتماد Suggestion Buffer المنفصل.
5. اعتماد بوابة A/B/C قبل AI الحي.
6. إثبات أن 4-0 لا تحتاج SQL/Migration.
7. عدم كتابة أي كود AI تنفيذي قبل اعتماد الوثيقة.

بعد الاعتماد يبدأ 4-1 من Domain Layer + deterministic provider فقط.
