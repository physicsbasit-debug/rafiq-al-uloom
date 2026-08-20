# رفيق العلوم — Phase 4-2

## Field-level Teacher AI UX — Final Design Contract

**Baseline المغلق:** Phase 4-1

**Baseline commit:** `de3c167f2c40006b15d1872f8b5805fa961001f4`

**يعتمد على:** `docs/PHASE_4_0_AI_AUTHORING_CONTRACT_ARCHITECTURE.md` و`docs/PHASE_4_1_PROVIDER_NEUTRAL_DOMAIN.md`

**طبيعة المرحلة:** UX/State/Adapter على مستوى الحقل فقط. لا AI حي، لا Edge Function، لا SQL، لا Migration، ولا تعديل للعقود المجمدة من Phase 3.

---

## 1. الهدف

إضافة تجربة AI مساعدة للمعلم داخل محرر الدرس الحالي، بحيث:

1. يطلب المعلم اقتراحًا صريحًا لحقل/عنصر محدد.
2. يصل الاقتراح إلى **AI Suggestion Buffer محلي منفصل**.
3. لا يغيّر الاقتراح أي Form Buffer أو `LessonRevisionPayload` تلقائيًا.
4. يراجع المعلم الاقتراح ثم يختار صراحة:
   - استخدام الاقتراح.
   - رفض الاقتراح.
   - أو تعديل بياناته اليدوية قبل اتخاذ القرار.
5. عند القبول فقط ينتقل الاقتراح إلى Form Buffer الحالي أو إلى الحقل المحلي الحالي بحسب نوع الهدف.
6. بعد ذلك يستمر المسار الحالي كما هو:
   - validators الحالية.
   - Apply الحالي.
   - save/submit الحالي.
   - Reviewer.
   - trusted publication flow.

المسار المعتمد:

```text
Teacher request
→ AiAuthoringProvider
→ structured validation
→ local Suggestion Buffer
→ explicit Teacher acceptance
→ current Form Buffer / local field
→ existing validators
→ existing Apply path
→ existing AuthoringService
→ revision
→ Reviewer
→ trusted publication flow
```

---

## 2. الحدود المجمدة

ممنوع في Phase 4-2:

- تعديل `LessonRevisionPayload`.
- تعديل `AuthoringService`.
- تعديل SQL / RPC / RLS / GRANT / REVOKE.
- تعديل Reviewer flow أو trusted publication flow.
- تعديل `getLessonSubmissionReadiness`.
- تعديل `getQuestionStateIssue`.
- إنشاء validator موازٍ بدل:
  - `validateObjectiveDraft`
  - `validateQuestionDraft`
  - `isObjectiveKeyAvailable`
- جعل AI ينشئ `objective.key` أو `question.key`.
- جعل AI يحدد `purpose`.
- Auto-save أو Auto-submit.
- إنشاء Revision بسبب نجاح AI.
- إدخال أي Secret أو API حي أو Supabase AI Gateway في هذه المرحلة.
- إدخال provenance داخل `LessonRevisionPayload`.
- خلط دورة حياة AI داخل `useTeacherLessonEditor`.

---

## 3. القرار البصري والمعماري: Suggestion Buffer داخل النموذج، لكنه ليس Form Buffer

يظهر Suggestion Buffer **داخل نفس لوحة التحرير بصريًا**، لكنه يحتفظ بحالة مستقلة تمامًا عن Form Buffer.

الشكل المفاهيمي:

```text
Current editor panel
├── manual fields
├── AI suggestion action
└── AI Suggestion Buffer
    ├── preview
    ├── استخدام الاقتراح
    └── رفض
```

القواعد:

- مجرد ظهور الاقتراح لا يعدّل أي حقل يدوي.
- مجرد وصول الاقتراح لا يجعل المسودة `dirty`.
- رفض الاقتراح لا يعدّل Form Buffer.
- فشل AI لا يمس النص اليدوي.
- لا توجد شاشة AI مستقلة ولا Workspace إضافي ولا Modal مركزي.

---

## 4. نطاق `useTeacherAiSuggestion`

يكون لكل **مسار اقتراح منطقي نشط** instance مستقل، وليس sequence عالميًا للمحرر كله.

التركيب المقصود:

```text
TeacherLessonEditor
└── useTeacherAiSuggestion<lesson_summary>

TeacherObjectivesEditor
└── useTeacherAiSuggestion<objective>

TeacherQuestionsEditor
└── useTeacherAiSuggestion<review_question | mastery_question>
```

كل instance يمتلك بصورة مستقلة:

- `AbortController`
- `requestSequence`
- `status`
- `suggestion`
- `requestContextFingerprint`
- `destinationSnapshot`
- failure state

وبالتالي:

- طلب Summary لا يجعل طلب Question stale.
- طلب Question لا يلغي طلب Objective.
- لا يوجد singleton واحد للطلبات الثلاثة.

### هوية المحرر النشط

لا يُنشأ hook لكل بطاقة Objective أو Question محفوظة.

الواجهة الحالية تسمح بمحرر Objective نشط واحد ومحرر Question نشط واحد فقط.

عند تغير هوية المحرر النشط، مثل الانتقال من Question A إلى Question B:

```text
editor identity changes
→ abort pending request
→ invalidate request sequence
→ clear previous suggestion
```

ولا يجوز أن يظهر اقتراح A داخل محرر B.

---

## 5. stale response / unmount / navigation

`AbortController` وحده غير كافٍ. يعتمد 4-2 دفاعين مستقلين:

```text
Abort
+
Stale-result guard
```

القواعد:

1. كل طلب يحصل على sequence/id محلي.
2. بدء طلب جديد في نفس instance:
   - يلغي الطلب السابق.
   - يزيد sequence.
3. عند وصول النتيجة:
   - لا تُقبل إلا إذا كانت ما تزال أحدث request.
4. إذا تغيّر context الذي بدأ منه الطلب:
   - تُهمل النتيجة القديمة.
5. عند unmount/navigation:
   - يُلغى الطلب المعلّق.
   - وتُهمل أي نتيجة متأخرة حتى لو عاد الـPromise لاحقًا.
6. `aborted` لا يعدّل Suggestion Buffer إلى حالة قابلة للتطبيق.
7. `invalid_output` و`unavailable` لا يلمسان Form Buffer.
8. retry يعيد طلب الاقتراح فقط ولا يحفظ Revision.

---

## 6. حماية الكتابة اليدوية: لا استبدال صامت

عند بدء طلب AI يحفظ Suggestion Buffer **destination snapshot صغيرًا** للحقل/النموذج الذي قد يستبدله الاقتراح.

عند ضغط المعلم «استخدام الاقتراح»:

### إذا لم تتغير الوجهة منذ بدء الطلب

```text
current destination === request-time snapshot
→ continue acceptance directly
```

### إذا تغيّرت الوجهة يدويًا أثناء انتظار الاقتراح

```text
current destination !== request-time snapshot
→ explicit confirmation required
```

رسالة مفاهيمية:

> لديك تعديلات كتبتها بعد طلب الاقتراح. استخدام الاقتراح سيستبدل هذه البيانات.

- التأكيد: يكمل القبول.
- الإلغاء: لا يتغير شيء.

### ممنوع: “املأ الحقول الفارغة فقط”

لا يُستخدم merge جزئي بين بيانات AI والبيانات اليدوية، خصوصًا في السؤال، لأن العلاقات بين:

- `choices`
- `correctAnswerIndex`
- `explanation`

يجب أن تبقى وحدة مترابطة لا خليطًا من مصدرين.

---

## 7. `purpose` خارج ملكية AI تمامًا

بالنسبة إلى Question Suggestion:

الـAI يملك فقط:

```text
prompt
choices
correctAnswerIndex
explanation
objectiveKey
difficulty
```

ولا يملك:

```text
purpose
```

قواعد `purpose`:

- يحدده المعلم/الزر الذي بدأ الطلب.
- لا يأتي من AI.
- لا يدخل ضمن destination snapshot الذي يقرر هل توجد كتابة يدويّة متعارضة.
- إذا غيّره المعلم أثناء انتظار الاقتراح، لا يعتبر ذلك سببًا لإظهار تأكيد الاستبدال.
- عند القبول يستخدم **القيمة الحالية** من `editor.form.purpose`.

---

## 8. قبول اقتراح ملخص الدرس

الملخص لا يملك Form Buffer مستقلاً في البنية الحالية، لذلك لا يُنشأ له Form Buffer جديد.

المسار:

```text
request lesson_summary
→ Suggestion Buffer
→ Accept
→ destination snapshot check
→ updateLesson('summary', suggestion.text)
```

القواعد:

- قبل Accept لا يتغير `payload.lesson.summary`.
- بعد Accept فقط تصبح المسودة dirty لأن التغيير دخل payload المحلي.
- لا يحدث save تلقائي.
- لا Revision خادمية.
- إذا تغيّر summary يدويًا منذ بدء الطلب، يطلب confirmation قبل الاستبدال.

---

## 9. قبول اقتراح Objective

المسار:

```text
request objective
→ Suggestion Buffer
→ Accept
→ destination snapshot check
→ validateObjectiveDraft(suggestion.text)
→ editor.text
→ teacher may edit
→ existing Apply button
→ validateObjectiveDraft(editor.text)
→ createObjectiveKey()
→ objectives
```

القواعد:

- AI لا ينشئ `objective.key`.
- Accept لا يضيف الهدف مباشرة إلى `objectives`.
- Accept يملأ Form Buffer فقط.
- يظل زر Apply اليدوي الحالي هو الحد الذي يضيف الهدف.
- `validateObjectiveDraft` الحالية هي مصدر الحقيقة.
- إذا عدّل المعلم `editor.text` أثناء انتظار الاقتراح، يطلب confirmation قبل الاستبدال.

---

## 10. قبول اقتراح Question

المسار:

```text
request review_question/mastery_question
→ Suggestion Buffer
→ Accept
→ destination snapshot check
→ isObjectiveKeyAvailable(currentObjectives, suggestion.objectiveKey)
→ build candidate TeacherQuestionFormDraft
   with current editor.form.purpose
→ validateQuestionDraft(candidate, currentObjectives)
→ editor.form
→ teacher may edit
→ existing Apply button
→ validateQuestionDraft(editor.form, currentObjectives)
→ createQuestionKey()
→ questions
```

القواعد:

- Accept لا يدخل السؤال مباشرة إلى `questions`.
- `question.key` و`type` يبقيان في المسار الحالي فقط.
- `purpose` يؤخذ من القيمة الحالية التي اختارها المعلم.
- `difficulty` يجوز أن تأتي من AI ضمن القيم المدعومة وتبقى خاضعة للتحقق الحالي.
- لا bypass لـ`validateQuestionDraft`.

---

## 11. السيناريو الأحمر: حذف Objective بعد التوليد وقبل Accept

إذا كان Suggestion Buffer يحتوي Question Suggestion مرتبطًا بـ`objectiveKey`، ثم حذف المعلم ذلك الهدف قبل القبول:

**لا يجوز قبول الاقتراح اعتمادًا على أن الهدف كان موجودًا وقت التوليد.**

وقت القبول يجب إعادة فحص:

```text
isObjectiveKeyAvailable(currentObjectives, suggestion.objectiveKey)
```

إذا لم يعد الهدف موجودًا:

```text
no Form Buffer mutation
no onChange
no question creation
no automatic re-link
```

ويظهر تنبيه مفاهيمي:

> الهدف المرتبط بهذا الاقتراح لم يعد موجودًا. اختر هدفًا حاليًا ثم اطلب اقتراحًا جديدًا.

بعد هذا الحارس يبقى `validateQuestionDraft(candidate, currentObjectives)` خط الدفاع الثاني.

هذه إعادة فحص للحالة الحالية وليست validator AI موازية.

---

## 12. تغيير Objective داخل Form Buffer أثناء الانتظار

إذا غيّر المعلم `editor.form.objectiveKey` يدويًا بينما طلب Question AI معلّق:

- لا يحق للاقتراح القديم إعادة القيمة السابقة بصمت.
- `objectiveKey` جزء من destination snapshot.
- لذلك Accept سيكتشف أن الوجهة تغيرت ويطلب confirmation.
- حتى بعد confirmation يُفحص `suggestion.objectiveKey` مقابل `currentObjectives`.

---

## 13. dirty semantics

- `loading` لا يجعل المسودة dirty.
- `suggested` لا يجعل المسودة dirty.
- `invalid_output` لا يجعل المسودة dirty.
- `unavailable` لا يجعل المسودة dirty.
- Reject لا يجعل المسودة dirty.
- Accept إلى Objective/Question Form Buffer **لا يعدّل `LessonRevisionPayload` بعد**، لذلك لا يجعل payload dirty بحد ذاته.
- Apply اليدوي الحالي هو الذي ينقل Objective/Question إلى payload ويجعل المسودة dirty عبر المسار الحالي.
- Accept للـSummary يكتب في `payload.lesson.summary` مباشرة، ولذلك يجعل المسودة dirty في تلك اللحظة فقط.

---

## 14. Provider injection

يُستخدم نمط الحقن الحالي بدل إنشاء مزوّد داخل كل Component.

المسار:

```text
TeacherWorkspace
  aiProvider?: AiAuthoringProvider
        ↓
TeacherLessonEditor
        ↓
Summary / Objective / Question AI controls
```

في Phase 4-2:

```text
default = DeterministicAiAuthoringProvider
```

في Phase 4-3 يمكن استبدال implementation بالـGateway provider دون إعادة بناء UI.

ممنوع:

```text
new DeterministicAiAuthoringProvider()
```

داخل كل محرر على حدة.

---

## 15. Data minimization في الطلبات

كل target يرسل أقل سياق يحتاجه فقط وفق عقد 4-1.

ممنوع إرسال:

- Revision كاملة بلا حاجة.
- البريد.
- user id.
- profile metadata غير الضرورية.
- review history.
- بيانات الطلاب.
- mastery history.
- session tokens.
- secrets.

ويبقى:

```text
language: 'ar'
```

جزءًا صريحًا من السياق.

---

## 16. UI states

الحالات الأساسية لكل Suggestion Buffer:

```text
idle
loading
suggested
invalid_output
unavailable
```

ويُعامل `aborted` كإنهاء بلا mutation، لا كاقتراح قابل للتطبيق.

أثناء `loading`:

- لا يمنع التأليف اليدوي.
- يجوز للمعلم مواصلة الكتابة.
- لا يعدّل Form Buffer.
- يبدأ snapshot protection عند لحظة الطلب.

عند `suggested`:

- يظهر الاقتراح منفصلًا عن الحقول الحالية.
- يظهر Accept/Reject.
- يجوز للمعلم مواصلة تحرير Form Buffer قبل اتخاذ القرار.

---

## 17. الملفات التنفيذية المقترحة

### ملفات جديدة

```text
src/features/teacher/workspace/useTeacherAiSuggestion.ts
src/features/teacher/workspace/teacher-ai-acceptance.ts
tests/features/teacher/useTeacherAiSuggestion.test.tsx
tests/features/teacher/teacher-ai-acceptance.test.ts
docs/PHASE_4_2_FIELD_LEVEL_AI_UX.md
```

### ملفات يتوقع تعديلها

```text
src/features/teacher/workspace/TeacherWorkspace.tsx
src/features/teacher/workspace/TeacherLessonEditor.tsx
src/features/teacher/workspace/TeacherObjectivesEditor.tsx
src/features/teacher/workspace/TeacherQuestionsEditor.tsx
src/features/teacher/workspace/teacher-workspace.css
```

وقد تُضاف اختبارات UI منفصلة إذا كان ذلك أوضح من توسيع الملفات الحالية.

### ملفات لا تُعدّل

```text
src/services/authoring/**
src/features/teacher/workspace/teacher-lesson-structure.ts
src/features/teacher/workspace/teacher-submission-readiness.ts
src/features/teacher/workspace/useTeacherLessonEditor.ts
src/services/ai-authoring/**
supabase/**
```

إلا إذا كشف اختبار End-to-End خللًا حقيقيًا يتطلب مرحلة مستقلة صريحة.

---

## 18. اختبارات القبول الملزمة

### Suggestion Buffer

- وصول suggestion لا يغيّر Form Buffer.
- Reject لا يغيّر Form Buffer.
- unavailable لا يمس الكتابة اليدوية.
- invalid_output لا يمس الكتابة اليدوية.
- abort لا يمس الكتابة اليدوية.

### Stale / concurrency

- Request A ثم Request B داخل نفس instance، ووصول A أخيرًا لا يستبدل B.
- Summary request لا يجعل Question request stale.
- Objective request لا يجعل Summary request stale.
- تغير context أثناء request يهمل النتيجة.
- تغير هوية المحرر يلغي/يبطل الطلب السابق.
- unmount/navigation يمنع أي late mutation.
- `latencyMs=0` + abort الفوري يبقى آمنًا.
- latency مؤجل + abort يبقى آمنًا.

### Manual overwrite protection

- لا تغيير يدوي منذ request → Accept مباشر.
- تغيير يدوي منذ request → confirmation مطلوب.
- رفض confirmation → لا mutation.
- قبول confirmation → Apply إلى Form Buffer فقط.
- لا merge جزئي للQuestion.

### Objective

- Accept يستخدم `validateObjectiveDraft`.
- AI لا ينشئ key.
- Accept لا يضيف إلى objectives قبل Apply الحالي.

### Question

- `purpose` الحالي للمعلم يبقى كما هو.
- Suggestion لا يملك `purpose`.
- Accept يعيد فحص `isObjectiveKeyAvailable`.
- حذف Objective بعد التوليد وقبل Accept يمنع القبول.
- `validateQuestionDraft` تستخدم بعد القبول.
- Accept لا يدخل السؤال في `questions`.
- Apply الحالي هو الذي ينشئ `question.key`.

### Summary

- Suggestion لا يغيّر summary قبل Accept.
- Accept يكتب summary محليًا فقط.
- لا save/submit تلقائي.

### Architecture

- لا import جديد من `services/ai-authoring` إلى `features/teacher`.
- لا AI secret في client.
- لا Service Role.
- لا Supabase AI call.
- لا trusted publication RPC.
- لا bypass لـAuthoringService.
- لا تعديل للعقود المجمدة.

---

## 19. بوابة التنفيذ

قبل أي commit لـPhase 4-2 يجب تنفيذ:

```text
Prettier
Lint
Build
Targeted Phase 4-2 tests
Full basic test suite
git diff --check
actual full diff review
```

ولا تُعتمد المرحلة من ملخص فقط؛ المرجع النهائي هو:

1. actual applied diff.
2. raw execution log.
3. commit SHA.
4. تطابق `HEAD` مع `origin/main`.

---

## 20. خارج Phase 4-2

مؤجل صراحة:

- AI Gateway حي.
- Gemini/OpenAI/أي provider شبكي.
- Edge Function.
- Rate limiting server-side implementation.
- Secrets.
- SQL/Migration.
- Remote Supabase.
- Provenance persistence.
- Reviewer AI.
- full lesson generation.
- auto-save / auto-submit / auto-publish.

هذه تدخل مراحل لاحقة فقط وفق خارطة Phase 4.

---

## 21. قرار الإغلاق التصميمي

Phase 4-2 تعتمد رسميًا المبادئ التالية:

1. AI مساعد وليس كاتبًا تلقائيًا.
2. Suggestion Buffer منفصل برمجيًا، مدمج بصريًا داخل النموذج الحالي.
3. لا mutation قبل قبول المعلم.
4. لا استبدال صامت لكتابة أحدث.
5. لا merge جزئي لQuestion suggestion.
6. `purpose` ملك المعلم فقط.
7. stale/unmount/Abort محمية دفاعيًا.
8. `objectiveKey` يعاد التحقق منه وقت القبول ضد الحالة الحالية.
9. validators الحالية تبقى مصدر الحقيقة.
10. Provider injection يبقى محايدًا استعدادًا لـ4-3.
11. لا تعديل للعقود المجمدة ولا لطبقة الحفظ/الإرسال.
12. النجاح في AI لا يعني حفظًا ولا إرسالًا ولا نشرًا.

بهذا يصبح تصميم Phase 4-2 جاهزًا للمراجعة النهائية قبل كتابة الكود.
