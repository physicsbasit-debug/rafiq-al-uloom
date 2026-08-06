# Phase 2-D0 — تدقيق الحالة الراهنة لنتائج الإتقان

## الحالة

وثيقة تدقيق معمارية معتمدة قبل التطبيق. لا تضيف كود إنتاج، ولا Migration، ولا RLS، ولا RPC.

## نقطة الأساس

```text
main documentation commit: 990471d
Auth freeze tag: v0.4-auth-security-complete
Auth freeze commit: 27c1d7432066e196d66ec3a731594df0a506326e
Verified baseline: 447 basic + 61 Supabase integration = 508 tests
```

## الملفات الفعلية التي بُني عليها التدقيق

```text
src/features/mastery/MasteryTestView.tsx
src/utils/scoring.ts
src/features/mastery/mastery-classifier.ts
src/features/mastery/recommendations.ts
src/types/quiz.types.ts
src/types/mastery.types.ts
src/services/queries/content-query.hooks.ts
src/services/data/content-repository.provider.ts
src/services/data/async-local-content.repository.ts
src/services/data/supabase-content.repository.ts
src/services/data/supabase-content.mappers.ts
src/content/seed/grade10-physics-waves.ts
supabase/migrations/20260731204347_create_content_schema.sql
supabase/migrations/20260801035807_add_content_read_security.sql
supabase/migrations/20260803014500_add_profiles_and_authorization_rls.sql
tests/mastery/scoring.test.ts
tests/features/MasteryTestView.test.tsx
```

## 1. تدفق `MasteryTestView` الحالي

التدفق الفعلي هو:

```text
useMasteryQuestions(lessonId)
→ يعرض جميع الأسئلة التي يعيدها المستودع وبالترتيب نفسه
→ يخزن لكل سؤال selected choice index
→ يمنع تغيير الاختيار الأول
→ يمنع إنهاء الاختبار حتى تُجاب جميع الأسئلة
→ calculateScore()
→ classifyMasteryScore()
→ يعرض نتيجة محلية ومراجعة الإجابات
```

لا يوجد حاليًا:

- اختيار عينة عشوائية.
- خلط للأسئلة.
- حفظ سحابي.
- حفظ محاولة غير مكتملة.
- استئناف محاولة.
- وزن مختلف بين الأسئلة.
- درجات جزئية.

بعد ظهور النتيجة تبقى شبكة الأسئلة ظاهرة، وتبقى جميع الاختيارات معطلة.

## 2. شكل الإجابة الحالي

العقد الفعلي:

```ts
export type AnswersByQuestionId = Record<string, number | undefined>;
```

القيمة هي **فهرس الاختيار**، وليست نص الاختيار.

السؤال الحالي من نوع واحد فقط:

```text
multiple_choice
```

وحقول الهوية الحالية:

```text
Question.id: string
Question.lessonId: string
```

## 3. التسجيل المحلي الحالي

`calculateScore` يحسب:

```text
totalQuestions = questions.length
answeredQuestions = عدد القيم غير undefined
correctAnswers = عدد الاختيارات المطابقة لـ correctAnswerIndex
score = correctAnswers / totalQuestions * 100
```

كل سؤال يساوي نقطة صحيحة أو صفرًا. لا يوجد `maxScore` مستقل أو وزن للسؤال.

مهم: اسم `score` في الكود الحالي يعني **نسبة من 100**، وليس عدد النقاط الخام.

الاختبارات الحالية تثبت، لعينة خمسة أسئلة:

```text
0/5 = 0
1/5 = 20
2/5 = 40
3/5 = 60
4/5 = 80
5/5 = 100
```

كما يَعُد السؤال غير المجاب خاطئًا ويبقي المقام هو العدد الكلي، لكن الواجهة الحالية لا تسمح بالإنهاء أصلًا قبل اكتمال جميع الإجابات.

## 4. التصنيف المحلي الحالي

```text
score >= 80  → متقن
score >= 60  → قريب من الإتقان
score < 60   → يحتاج مراجعة
```

التصنيف والتوصية مشتقان محليًا بعد حساب النسبة.

## 5. `MasteryResult` الحالي ليس سجل حفظ سحابي

الواجهة تنشئ حاليًا قيمًا مؤقتة:

```text
id = mastery-<lessonId>-local-session
studentId = local-session
createdAt = local-session
```

لذلك لا يجوز استخدام `MasteryResult` الحالي مباشرة بوصفه صف قاعدة بيانات أو نتيجة RPC رسمية. Phase 2-D تحتاج نوعًا مستقلًا للنتيجة الرسمية، مع إبقاء نوع العرض المحلي أو ترحيله بوضوح في D2/D3.

## 6. مصدر الأسئلة الحالي

`useMasteryQuestions` يمر عبر `getContentRepository()`.

اختيار المزوّد:

```text
VITE_CONTENT_PROVIDER غائب → local
VITE_CONTENT_PROVIDER=local → local
VITE_CONTENT_PROVIDER=supabase → Supabase
```

### المزوّد المحلي

يفلتر مصفوفة:

```text
grade10PhysicsWavesMasteryQuestions
```

حسب `lessonId` ويحافظ على ترتيب الـSeed.

الـSeed الحالي يحتوي خمسة أسئلة إتقان لكل درس، وحالتها `draft`.

### مزوّد Supabase

يقرأ من جدول:

```text
public.questions
```

بالشروط:

```text
lesson_id = lessonId
purpose = mastery
ORDER BY id
```

ولا يعيد حقل `purpose` إلى نوع `Question`؛ الفصل بين review/mastery يحدث داخل استدعاء المستودع.

## 7. مخطط المحتوى الحالي

المفاتيح الحالية:

```text
public.lessons.id: text
public.questions.id: text
public.questions.lesson_id: text
public.profiles.id / auth.users.id: uuid
```

جدول `questions` يحتوي:

```text
purpose
choices
correct_answer_index
status
source
```

وقيد `purpose` يسمح فقط بـ:

```text
review
mastery
```

المخطط يمنع `correct_answer_index < 0`، بينما Mapper العميل يتحقق أيضًا أن الفهرس أصغر من عدد الاختيارات.

## 8. حدود القراءة السحابية الحالية

بعد Phase 2-C:

- `anon` لا يقرأ المحتوى السحابي.
- المستخدم المصادق لا يقرأ المحتوى إلا إذا كان Profile بحالة `active` ودور `student` أو `teacher` أو `reviewer`.
- الدرس يجب أن يكون `approved`.
- سؤال الإتقان يجب أن يكون `approved` وينتمي إلى درس `approved`.

بالتالي لا يجوز افتراض أن محاولة مبنية من المزوّد المحلي قابلة للحفظ سحابيًا، لأن Seed المحلي الحالي `draft` وقد لا يطابق المحتوى المعتمد في Supabase.

## 9. المخاطر التي حسمها D0

### خلط النسبة بالنقاط

الكود الحالي يستخدم `score` كنسبة. لذلك عقد الحفظ الجديد يجب أن يستخدم أسماء صريحة:

```text
question_count
correct_count
percentage
```

ولا يضيف `score/max_score` في D1 ما دام العقد الحالي متساوي الوزن وثنائي التصحيح.

### حفظ محتوى محلي غير معتمد

الحفظ السحابي في النطاق الأول لا يعمل إلا عند استخدام المحتوى السحابي القانوني المعتمد. تجربة Guest والمزوّد المحلي تبقيان محليتين.

### الانحراف بين TypeScript وSQL

سيصبح هناك محركان مستقلان للتسجيل. لذلك اختبار التكافؤ ليس فحصًا لمرة واحدة، بل بوابة دائمة في أمر الإغلاق.

### غموض كلمة mismatch

هناك فرق بين:

1. رفض قبل الحفظ بسبب عدم تطابق مجموعة المحتوى أو نسخة عقد التسجيل.
2. نجاح الحفظ ثم اختلاف العرض المحلي عن النتيجة الرسمية.

وثيقة العقد تفصل بينهما بأسماء وحالات مستقلة.

## 10. تحقق المصدر واعتماد D0

تحققت المراجعة مباشرة من الملفات المصدرية التالية عند نقطة الأساس:

```text
src/features/mastery/MasteryTestView.tsx
src/features/mastery/mastery-classifier.ts
src/utils/scoring.ts
src/types/quiz.types.ts
```

وثبتت مباشرة:

- أن `score` نسبة مئوية.
- أن الإجابات مخزنة كفهرس اختيار لكل معرف سؤال.
- أن معرفي السؤال والدرس من نوع `string`.
- أن حدود التصنيف هي 80 و60.
- أن الواجهة تستخدم جميع الأسئلة وتمنع الإنهاء قبل اكتمالها.

بقي تحقق تنفيذي واحد قبل كتابة SQL الفعلي في D1: قراءة `src/features/quiz/quiz-engine.ts` ومطابقة دالة `isCorrectAnswer()` مع قاعدة التسجيل المقترحة. لا يعد هذا رفضًا لـD0، لكنه بوابة إلزامية قبل ترجمة منطق صحة الإجابة إلى RPC.

## 11. نتيجة التدقيق

D0 معتمدة. يمكن الانتقال إلى D1 دون تغيير منطق اختبار الإتقان الحالي، بشرط إغلاق تحقق `quiz-engine.ts` قبل كتابة منطق التسجيل داخل SQL.
