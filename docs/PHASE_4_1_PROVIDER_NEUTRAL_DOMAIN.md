# رفيق العلوم — Phase 4-1

## Provider-neutral AI Domain + Deterministic Provider

**Baseline:** `6cb145962b6b1cfaa0790e5879111fc8a56d6dcb`
**يعتمد على:** `docs/PHASE_4_0_AI_AUTHORING_CONTRACT_ARCHITECTURE.md`
**النطاق:** Domain/contract واختبارات فقط. لا AI حي، لا Edge Function، لا SQL، لا Migration، ولا UI.

## الهدف

إنشاء عقد AI محايد عن المزود ومزوّد حتمي قابل للاختبار، مع إبقاء اتجاه الاعتمادية:

```text
features/*
→ services/ai-authoring
→ shared types
```

وليس العكس.

## الملفات التنفيذية

```text
src/services/ai-authoring/
├── ai-authoring.types.ts
├── ai-authoring.provider.ts
├── ai-authoring.contract.ts
├── deterministic-ai-authoring.provider.ts
└── index.ts
```

## العقود

الأهداف الوحيدة في 4-1:

```text
lesson_summary
objective
review_question
mastery_question
```

`purpose` لا يأتي من AI. الهدف `review_question` أو `mastery_question` يحدده طلب المعلم قبل التوليد.

`Difficulty` يستخدم النوع المشترك الحالي من `src/types/quiz.types.ts`، ولا يحتاج نوعًا موازيًا.

اللغة جزء صريح من العقد وليست افتراضًا ضمنيًا: كل `AiLessonContext` يحمل `language: 'ar'`، ويرفض التحقق أي لغة أخرى أو قيمة مفقودة.

غلاف الطلب نفسه يُعامل كمدخل Runtime غير موثوق: يجب أن يكون كائنًا، ولا يسمح إلا بالمفتاحين `target` و`context`. كما يُفحص `target` صراحةً مقابل القيم الأربع المعتمدة فقط، لذلك لا تمر أهداف مجهولة مثل `generate_full_lesson` ولا أنواع خاطئة بسبب سلوك JavaScript العرضي.

حد الثقة مقصود ومركزي: `validateAiGenerationRequest(request: unknown)` هو Runtime boundary الوحيد الذي يحوّل الإدخال غير الموثوق إلى عقد معروف. بعد نجاح هذا الحد، يستهلك `AiAuthoringProvider.generate()` قيمة `AiGenerationRequest` typed؛ ولا يتحول provider نفسه إلى validator موازٍ يقبل `unknown`.

## objectiveKey: فحص ذاتي التناسق فقط

بالنسبة إلى السؤال، يحمل `AiGenerationRequest` الأهداف الحالية اللازمة للسياق. لذلك يتحقق عقد AI أن `objectiveKey` المقترح يساوي أحد المفاتيح المرسلة في **نفس الطلب**.

هذا الفحص لا يستورد ولا يقلد `validateQuestionDraft` من `src/features/teacher`. كما يتحقق عقد الطلب صراحةً من أن `objectives` مصفوفة قبل أي وصول إلى `.length` أو `for...of`، بحيث تعود المدخلات الفاسدة بنتيجة رفض حتمية بدل رمي استثناءات Runtime.

المسار المقصود لاحقًا في 4-2:

```text
AI schema/self-consistency validation
→ local Suggestion Buffer
→ explicit teacher acceptance
→ Teacher Form Buffer adapter
→ existing validateQuestionDraft
→ existing apply path
```

## الحارس البنيوي

`tests/architecture/no-ai-authoring-teacher-feature-imports.test.ts` يمنع أي import من `src/services/ai-authoring/**` إلى `src/features/teacher/**`، بما في ذلك aliases والمسارات النسبية.

## المزوّد الحتمي

`DeterministicAiAuthoringProvider`:

- لا شبكة.
- لا أسرار.
- لا Supabase.
- لا API provider.
- ناتجه ثابت لنفس الطلب.
- يدعم حالات `success`, `invalid_output`, `rejected`, `unavailable`, و`aborted` بصورة قابلة للاختبار.
- يحترم `AbortSignal` قبل الانتظار وبعد أول `await` أيضًا، حتى عند `latencyMs = 0`، لكي لا تضيع نافذة الإلغاء الفوري وتبقى قاعدة unmount/navigation قابلة للبناء فوقها في 4-2.

## شروط القبول

- Build ناجح.
- Lint ناجح.
- Prettier ناجح.
- جميع الاختبارات الأساسية ناجحة.
- اختبارات 4-1 الجديدة ناجحة.
- الحارس البنيوي الجديد ناجح.
- لا import من AI service إلى teacher feature.
- لا تعديل في `LessonRevisionPayload`, `AuthoringService`, validators الحالية، SQL/RPC/RLS، أو واجهات Teacher/Reviewer.
- لا AI حي ولا Secret جديد.

أعداد الاختبارات المنفذة هي المرجع، ولا يُعلن عدد نهائي مسبقًا.
