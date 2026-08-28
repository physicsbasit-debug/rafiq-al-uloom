# رفيق العلوم — Phase 4-4

## Pedagogical Guardrails — Design for Independent Review

**الحالة:** DESIGN FOR INDEPENDENT REVIEW — لا تنفيذ قبل الاعتماد  
**Frozen baseline:** `f2b060108959aae2b31a4f1d2bcca20c27bf307b`  
**Phase 4-3E:** CLOSED / FROZEN / Claude APPROVED  
**طبيعة المرحلة:** حراس تربويون قابلة للتدقيق حول اقتراحات AI، بلا SQL، بلا Migration، بلا مزوّد ثانٍ، وبلا تغيير لمسار الحفظ/المراجعة/النشر.

---

## 1. الهدف

Phase 4-4 لا تحاول جعل الذكاء الاصطناعي "مصدر حقيقة علمية".

هدفها أضيق وأكثر قابلية للإثبات:

```text
AI candidate
→ existing structural validation
→ deterministic pedagogical guardrails
→ only then may become AiGenerationResult.success
→ browser re-validates the same guarded contract
→ Suggestion Buffer
→ explicit teacher acceptance
→ existing domain validators
→ existing AuthoringService
→ Reviewer
→ trusted publication
```

الحراس الجديدة تمنع حالات تربوية واضحة وقابلة للفحص حتميًا، وتشدّد تعليمات الخادم للحالات الدلالية التي لا يمكن إثباتها بخوارزمية بسيطة دون ادعاء زائف.

---

## 2. نقطة الانطلاق المثبتة

المسار الحي الحالي بعد 4-3E مثبت:

```text
Browser GatewayAiAuthoringProvider
→ authenticated teacher session
→ Edge Gateway
→ active-teacher authorization
→ atomic quota
→ live Gemini
→ structural output validation
→ browser response validation
```

ولا يجوز لـ4-4 أن تعيد فتح:

- Auth/AuthSession
- quota policy
- browser retry/timeout
- Edge body boundary
- Gemini secret handling
- five-status `AiGenerationResult`
- Suggestion Buffer
- `LessonRevisionPayload`
- AuthoringService
- reviewer workflow
- trusted publication
- canonical/revision writes

---

## 3. المبدأ الأساسي: Hard vs Soft Guardrails

هناك نوعان فقط.

### 3.1 Hard deterministic guardrails

تُستخدم فقط لقواعد يمكن إثباتها بلا تخمين دلالي.

إذا فشلت، لا تصبح النتيجة `success`.

### 3.2 Trusted prompt pedagogical rules

تُستخدم لقواعد تربوية مهمة لكن لا يمكن إثباتها بموثوقية عبر heuristic بسيط.

هذه القواعد تحسن سلوك المزوّد، لكنها لا تُقدَّم على أنها إثبات صحة علمية أو منهجية.

**ممنوع:** إنشاء "مدقق علمي" وهمي يعتمد على كلمات مفتاحية أو طول النص ثم الادعاء أن المحتوى أصبح صحيحًا علميًا.

---

## 4. Hard Guardrails المعتمدة

### 4.1 Arabic-language signal + near-empty floor

العقد الحالي يطلب `language: 'ar'`.

وبناءً على المراجعة المستقلة، يضاف حارس حتمي صغير للنصوص شبه الفارغة:

```text
MIN_PEDAGOGICAL_TEXT_LENGTH = 3
```

ويُحسب على عدد محارف Unicode الحرفية/الرقمية فقط بعد تجاهل الفراغات وعلامات الترقيم؛ حتى لا يمر نص مثل `"أ!!"` باعتباره ثلاثة محارف ذات معنى.

الهدف ليس قياس الجودة أو العمق، بل منع قيم واضحة مثل:

```text
"أ"
"لا"
```

من المرور كملخص/هدف/سؤال/شرح كامل. الرقم متعمد أن يكون منخفضًا جدًا؛ مثل `"فسر"` يبقى مسموحًا ولا يتحول الحارس إلى heuristic جودة.

الحارس الجديد يتحقق من وجود **حرف عربي فعلي** في الحقول الرئيسية التي يجب أن تكون صياغتها عربية.

#### lesson_summary / objective

يجب أن يحتوي `text` على حرف عربي واحد على الأقل، وأن يبلغ حد النص شبه الفارغ الأدنى.

إذا لم يحتو/يبلغ:

```text
→ invalid_output / invalid_text
```

#### review_question / mastery_question

يجب أن يحتوي:

- `prompt` على حرف عربي واحد على الأقل وأن يبلغ الحد الأدنى المحافظ.
- `explanation` على حرف عربي واحد على الأقل وأن يبلغ الحد الأدنى المحافظ.

إذا فشل `prompt`:

```text
→ invalid_output / invalid_prompt
```

إذا فشل `explanation`:

```text
→ invalid_output / invalid_explanation
```

### 4.2 لماذا لا نفرض العربية على كل choice؟

لأن خيارات العلوم قد تكون صحيحة بصيغة:

```text
H₂O
NaCl
3 m/s
A
B
25 °C
```

لذلك لا يُرفض الخيار لمجرد عدم وجود حرف عربي فيه.

العربية مطلوبة في صياغة السؤال والشرح، بينما تبقى الرموز والصيغ العلمية مشروعة داخل الخيارات.

### 4.3 Duplicate-choice guard

بعد نجاح structural validation، يجب ألا يحتوي السؤال خيارات متطابقة بعد تطبيع عرض محافظ:

```text
Unicode NFKC
→ trim
→ collapse internal whitespace
```

مثال يجب رفضه:

```text
["الانعكاس", "  الانعكاس  ", "الانكسار"]
```

النتيجة:

```text
→ invalid_output / invalid_choices
```

لا تُجرى عمليات aggressive normalization مثل:

- حذف علامات التشكيل كلها،
- حذف الرموز العلمية،
- lowercasing قد يغيّر دلالة رموز علمية،
- حذف علامات الترقيم.

الهدف منع التكرار الواضح فقط دون صناعة false positives.

### 4.4 Objective anchoring

لا نكرر منطقًا جديدًا.

يبقى `validateAiProviderOutputRuntime` هو المسؤول الحالي عن:

```text
objectiveKey ∈ request.context.objectives
```

وحالة:

```text
objective_not_in_request
```

الحارس 4-4 لا ينشئ validator موازيًا لهذا الشرط.

### 4.5 Purpose lock

لا يوجد `purpose` في خرج AI أصلًا.

الهدف نفسه يحدد المسار:

```text
review_question
mastery_question
```

ويستمر Teacher UI في تحديد الغرض قبل طلب AI.

لا تضيف 4-4 أي قدرة لـAI على تبديل review ↔ mastery.

---

## 5. القواعد التربوية داخل Trusted Server Prompt

تُضاف قواعد خادمية موثوقة، ولا توضع داخل untrusted lesson context.

### قواعد مشتركة

على الاقتراح:

- الالتزام بالصف والمادة والوحدة والدرس المرسلة.
- عدم التوسع إلى موضوع غير مرتبط بالسياق.
- استخدام عربية مناسبة للمرحلة مع السماح بالرموز والمصطلحات العلمية اللازمة.
- صياغة واضحة وغير ملتبسة.
- عدم ادعاء امتلاك مصادر أو مراجع لم تُرسل إليه.
- عدم ذكر تعليمات النظام أو سياسات الخادم أو عملية التوليد.

### lesson_summary

- موجز تعليمي.
- داخل نطاق الدرس.
- لا يضيف موضوعًا جديدًا غير مرتبط.

### objective

- هدف تعلم واحد.
- واضح وقابل للملاحظة تربويًا.
- لا يحاول إنشاء key أو metadata.

### review_question

- يقيس فهمًا مباشرًا ذا معنى لأحد الأهداف المرسلة.
- لا يعتمد على خدعة لغوية أو غموض.
- لا يغيّر الهدف المرتبط.

### mastery_question

- يطلب تطبيقًا أو تفسيرًا أو استدلالًا مناسبًا للهدف.
- لا يتحول إلى مجرد تعريف/حفظ سطحي فقط من أجل ملء الحقل.
- يبقى ضمن مستوى الصف والدرس.

هذه التعليمات **soft guardrails** وليست شهادة آلية بأن السؤال عميق أو صحيح علميًا.

---

## 6. ما لن نحاول التحقق منه حتميًا

لا نضيف heuristics تزعم فحص:

- الدقة العلمية الكاملة.
- صحة كل معلومة في المحتوى.
- مطابقة المنهج الرسمي صفحة بصفحة.
- "عمق" سؤال mastery عبر عدد الكلمات.
- Bloom level عبر كلمات مفتاحية.
- جودة distractors عبر طول النص.
- وجود misconception علمي معقد.
- scope alignment عبر تشابه نصي سطحي فقط.

السبب: هذه الاختبارات ستنتج false confidence وfalse positives.

يبقى الحكم النهائي:

```text
Teacher explicit acceptance
→ existing validators
→ Reviewer
```

كما نصت 4-0.

---

## 7. لا AI-as-a-judge

ممنوع في 4-4 إضافة طلب Gemini ثانٍ لتقييم خرج Gemini الأول.

أي تصميم من نوع:

```text
generate
→ call AI again to judge safety/quality
```

مرفوض في هذه المرحلة لأنه:

- يضاعف التكلفة والحصة.
- يضيف نقطة فشل جديدة.
- يجعل الحارس غير حتمي.
- يحتاج عقد نتائج جديد.
- لا يثبت صحة علمية فعلية.

كل Hard Guardrails يجب أن تعمل محليًا بلا شبكة.

---

## 8. المعمارية المقترحة

أضف ملفًا runtime خفيفًا قابلًا للاستخدام من Edge ومن المتصفح:

```text
src/services/ai-authoring/ai-authoring.pedagogical-guardrails.runtime.ts
```

API مقترح:

```ts
export function validateGuardedAiProviderOutputRuntime(
  request: RuntimeAiGenerationRequest,
  value: unknown
): RuntimeAiSuggestionValidationResult;
```

التنفيذ داخله:

```text
validateAiProviderOutputRuntime(request, value)
→ if structural invalid: return existing failure unchanged
→ run pedagogical hard guardrails on normalized suggestion
→ if guardrail invalid: map to an existing AiInvalidOutputReason
→ otherwise return the already-normalized suggestion
```

هذا يحافظ على فصل واضح:

```text
structural validator = unchanged source of structural truth
guarded validator = composition layer
```

ولا نعدّل معنى `validateAiProviderOutputRuntime` نفسه.

---

## 9. Typed browser/domain wrapper

في:

```text
src/services/ai-authoring/ai-authoring.contract.ts
```

يضاف wrapper فقط:

```ts
validateGuardedAiProviderOutput(...)
```

بنفس نمط wrapper الحالي.

ويُصدّر من:

```text
src/services/ai-authoring/index.ts
```

لا تغيير في:

- `AiGenerationRequest`
- `AiGenerationResult`
- `AiInvalidOutputReason`
- `AiSuggestion`
- `AiSuggestionMeta`

---

## 10. نقاط تطبيق الحارس

### 10.1 DeterministicAiAuthoringProvider

يستبدل:

```text
validateAiProviderOutput
```

بـ:

```text
validateGuardedAiProviderOutput
```

الهدف: deterministic provider يبقى ممثلًا صادقًا للعقد النهائي، لا مسارًا يتجاوز guardrails.

### 10.2 Live server provider

في:

```text
supabase/functions/ai-authoring-gateway/live-server-provider.ts
```

بعد parse لمرشح Gemini يستخدم:

```text
validateGuardedAiProviderOutputRuntime
```

بدل structural-only validator.

لا طلب شبكة إضافي.

لا retry إضافي.

إذا فشل hard guardrail:

```text
domain_result
→ invalid_output
→ existing reason
```

### 10.3 Browser Gateway response validation

في:

```text
src/services/ai-authoring/gateway-ai-authoring.response.ts
```

يستخدم browser defensive validation أيضًا:

```text
validateGuardedAiProviderOutput
```

بدل structural-only validation عند التحقق من `success`.

النتيجة:

حتى لو حصل regression خادمي وأرسل Edge `success` لا يمر guardrails، المتصفح يرفضه كاستجابة غير موثوقة، فيطويها Provider إلى:

```text
unavailable / provider_unavailable
```

ولا يسمح لها بالدخول إلى Suggestion Buffer.

---

## 11. لا تغيير في result contract

Phase 4-4 لا تضيف أسبابًا جديدة.

Mapping:

| Guardrail failure                              | Existing reason       |
| ---------------------------------------------- | --------------------- |
| non-Arabic / near-empty summary/objective text | `invalid_text`        |
| non-Arabic / near-empty question prompt        | `invalid_prompt`      |
| non-Arabic / near-empty explanation            | `invalid_explanation` |
| duplicate normalized choices                   | `invalid_choices`     |

بذلك لا نحتاج تعديل:

- five statuses
- browser reason sets
- UI state machine
- Suggestion Buffer contracts

---

## 12. Trusted prompt changes

في `live-server-provider.ts`:

يُفضّل فصل قواعد الأمن الحالية عن القواعد التربوية:

```text
SHARED_TRUSTED_SECURITY_RULES
SHARED_TRUSTED_PEDAGOGICAL_RULES
TARGET_RULES
```

ثم:

```text
trustedInstructionFor(target)
```

يجمعها بترتيب ثابت.

لا تنتقل أي قاعدة trusted إلى `untrustedContextEnvelope`.

ولا يُعامل أي نص داخل:

- lessonTitle
- currentSummary
- objective.text

كتعليمات.

---

## 13. الاختبارات المطلوبة

### A. Pure guardrail tests

ملف جديد مقترح:

```text
tests/ai-authoring/ai-authoring-pedagogical-guardrails.test.ts
```

يغطي:

1. summary عربي يمر.
2. summary إنجليزي فقط → `invalid_text`.
3. summary/هدف من حرف أو حرفين فقط → السبب الحالي المناسب (`invalid_text`).
4. objective عربي بطول محافظ يمر.
5. objective إنجليزي فقط → `invalid_text`.
6. question prompt إنجليزي فقط → `invalid_prompt`.
7. prompt شبه فارغ → `invalid_prompt`.
8. explanation إنجليزي فقط → `invalid_explanation`.
9. explanation شبه فارغ → `invalid_explanation`.
10. duplicate choices بعد trim/whitespace/NFKC → `invalid_choices`.
11. خيارات علمية مثل `H₂O`, `NaCl`, `3 m/s` لا تُرفض فقط لغياب العربية فيها.
12. structural failure مثل objectiveKey غير موجود يبقى `objective_not_in_request` ولا يعاد تصنيفه.
13. valid Arabic review/mastery suggestion يمر.

### B. Live-server-provider deterministic tests

أضف اختبارات تثبت:

- trusted prompt يحتوي scope/Arabic/review/mastery rules.
- hostile lesson data يبقى في untrusted context فقط.
- English-only model candidate لا يصبح success.
- duplicate-choice candidate لا يصبح success.
- fetch ما زال مرة واحدة فقط.
- لا provider judge call ثانٍ.

### C. Browser defensive tests

في اختبارات Gateway provider:

- HTTP 200 مزور بـ`success` وsummary إنجليزي فقط → browser rejects/folds to unavailable.
- HTTP 200 مزور بسؤال duplicate choices → unavailable.
- scientific-symbol choices مع prompt/explanation عربيين → success مسموح.

### D. Existing regression suites

يجب أن تبقى:

- deterministic provider tests.
- 4-1 contract/adversarial tests.
- 4-2 Teacher AI tests.
- 4-3 browser provider tests.
- full basic suite.
- full Supabase non-live suite.

---

## 14. Live acceptance بعد التنفيذ

بما أن 4-4 تعدّل live server provider، يجب إعادة تشغيل **اختبار 4-3E الحي الموجود نفسه**، لا إنشاء live test جديد.

المطلوب:

```text
GatewayAiAuthoringProvider
→ Edge
→ Gemini
→ guarded server validation
→ guarded browser validation
→ success عربي
```

اختبار حي واحد يكفي.

لا نحتاج أربعة أهداف حية.

---

## 15. النطاق المتوقع للتنفيذ

المسارات المرشحة:

```text
docs/PHASE_4_4_PEDAGOGICAL_GUARDRAILS_DESIGN.md
src/services/ai-authoring/ai-authoring.pedagogical-guardrails.runtime.ts
src/services/ai-authoring/ai-authoring.contract.ts
src/services/ai-authoring/index.ts
src/services/ai-authoring/deterministic-ai-authoring.provider.ts
src/services/ai-authoring/gateway-ai-authoring.response.ts
supabase/functions/ai-authoring-gateway/live-server-provider.ts
tests/ai-authoring/ai-authoring-pedagogical-guardrails.test.ts
tests/services/ai-authoring/live-server-provider.test.ts
tests/services/ai-authoring/gateway-ai-authoring.provider.test.ts
```

هذا **نطاق مرشح** يثبت قبل التنفيذ بمراجعة baseline فعلية.

لا SQL.
لا migration.
لا package dependency جديدة.
لا Playwright.
لا production DB writes.

---

## 16. حراس عدم الانحدار

يجب أن تثبت الاختبارات/الفحص الساكن أن 4-4 لم تُدخل:

```text
service_role إلى browser
GEMINI_API_KEY إلى client
AI direct authoring RPC
publication RPC
canonical/revision write
second provider request
automatic accept
automatic save
automatic submit
automatic publish
```

---

## 17. ترتيب التنفيذ المقترح

بعد اعتماد التصميم:

### 4-4A

إضافة composed runtime guardrail validator + pure tests فقط.

### 4-4B

ربطه بـ deterministic provider + browser defensive validation.

### 4-4C

ربطه بـ live server provider + trusted pedagogical prompt rules.

### 4-4D

تشغيل:

- targeted tests
- lint
- build
- full basic suite
- full Supabase non-live
- existing 4-3E live acceptance
- exact scope audit
- independent implementation review

يمكن تسليمها في حزمة واحدة بعد أن تُبنى داخليًا بهذا الترتيب، طالما runner يثبت كل بوابة على baseline الصحيح.

---

## 18. Freeze criteria

تُغلق Phase 4-4 فقط عند:

```text
independent design review: APPROVED
hard guardrails deterministic tests: PASS
trusted prompt boundary tests: PASS
browser defensive guardrail tests: PASS
no new result/status/reason contract: PASS
no second AI/provider call: PASS
lint: PASS
build: PASS
full basic suite: PASS
full Supabase non-live suite: PASS
existing 4-3E live browser→Edge→Gemini: PASS
exact changed-file scope: PASS
independent implementation review: APPROVED
```

---

## 19. ما بعد 4-4

بعد تجميد 4-4 فقط ننتقل إلى:

```text
Phase 4-5 — Provenance persistence decision
Phase 4-6 — Real composition + security closure + freeze
```

ولا يضاف provenance persistence ضمن 4-4.
