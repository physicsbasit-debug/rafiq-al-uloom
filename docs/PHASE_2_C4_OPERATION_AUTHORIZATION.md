# Phase 2-C4: Protected Operations + Access Guards

## الحالة

- وثيقة عقد عمليات وصلاحيات معتمدة قبل أي كود تنفيذي في C4-A أو اختبارات تجاوز واجهة في C4-B.
- تعتمد على نقطة الاستقرار البرمجية بعد إغلاق Phase 2-C3:

```text
commit: 0c2cf40
376/376 basic tests
32/32 Supabase integration tests
```

- لا تنشئ Migration جديدة.
- لا تفتح أي صلاحية كتابة جديدة.
- لا تضيف واجهة معلم أو مراجع فعلية.
- لا تعدل عقود C0 أو C1 أو C2 أو C3.
- يتضمن Fix 1 تصحيح اسم حالة التهيئة إلى `loading` وإضافة سبب الرفض `session_error` داخل عقد C4 فقط.

## 1. الهدف

إنشاء عقد مركزي يحدد هل يستطيع المستخدم تنفيذ عملية تطبيقية معينة بناء على:

```text
AuthState
+
AuthorizationState
+
profile.role
+
profile.status
+
حالة توفر العملية نفسها
```

مع فصل واضح بين أربع طبقات:

```text
App.tsx
→ يختار الشاشة العامة ومسار الزائر

authorization.policy.ts
→ يصدر قرار العملية

RequireCapability
→ يطبق القرار في واجهة React

GRANT / REVOKE + RLS + القيود
→ الحماية الأمنية الفعلية للبيانات
```

القاعدة الملزمة:

> إخفاء زر أو مكون في React يحسن تجربة المستخدم، لكنه لا يمنح حماية أمنية ولا يحل محل RLS أو صلاحيات قاعدة البيانات.

## 2. نقطة الأساس

عند بدء C4:

- Supabase Auth والجلسة مكتملان في C1.
- `public.profiles` وRLS المحتوى مكتملان في C2-A.
- قراءة `UserProfile` و`AuthorizationState` مكتملة في C2-B.
- واجهات الدخول والخروج وحالات الحساب مكتملة في C3.
- الأدوار المعتمدة فقط:

```text
student
teacher
reviewer
```

- حالات الحساب المعتمدة فقط:

```text
pending
active
suspended
```

- الحساب النشط يقرأ المحتوى المعتمد فقط.
- لا يملك أي مستخدم تطبيقي صلاحيات كتابة على جداول المحتوى في هذه المرحلة.
- لا يملك المستخدم تعديل `profiles` أو تغيير `role` أو `status`.

## 3. تقسيم Phase 2-C4

تقسم المرحلة إلى ثلاث دفعات داخلية:

```text
2-C4-0  Operation Authorization Contract
2-C4-A  Authorization Policy + React Guards
2-C4-B  UI Bypass + Backend Enforcement Tests
```

### 3.1 Phase 2-C4-0

توثيق:

- العمليات المعروفة.
- الأدوار المؤهلة.
- حالات الرفض.
- حدود App وPolicy وReact Guard وRLS.
- العمليات غير المتاحة بعد.
- معايير اختبارات C4-A وC4-B.

### 3.2 Phase 2-C4-A

تنفيذ:

- اتحاد العمليات.
- محرك القرار المركزي.
- `RequireCapability`.
- Hook قرار التفويض.
- استبدال الفحص القديم في `App.tsx`.
- اختبارات الوحدة وReact.

### 3.3 Phase 2-C4-B

إثبات أن تجاوز React لا يمنح صلاحية عبر:

- طلبات PostgREST مباشرة.
- عملاء مستخدمين حقيقيين.
- اختبارات كتابة مرفوضة.
- مقارنة البيانات قبل الطلب وبعده.

هذه الدفعات ليست مراحل مستقلة في خارطة المشروع، ولا تغير حدود Phase 2-C.

## 4. المصطلحات الملزمة

### 4.1 العملية

العملية هي فعل تطبيقي محدد يحتاج قرار صلاحية، مثل:

```text
access_student_experience
access_teacher_workspace
access_reviewer_workspace
author_content
review_content
```

لا تستخدم Strings حرة في المكونات.

### 4.2 أهلية الدور

تعني أن الدور مناسب نظريًا لعملية مستقبلية.

مثال:

```text
teacher مؤهل مستقبلًا للتأليف
reviewer مؤهل مستقبلًا للمراجعة
```

الأهلية لا تعني أن العملية متاحة الآن.

### 4.3 توفر العملية

تعني أن البنية الكاملة للعملية موجودة، بما فيها:

- واجهة الاستخدام.
- خدمة التنفيذ.
- نموذج الملكية أو الإسناد.
- صلاحيات قاعدة البيانات.
- RLS.
- اختبارات تجاوز الواجهة.

إذا غاب أي جزء جوهري، تعود العملية:

```text
operation_not_available
```

### 4.4 حارس الواجهة

مكون React يمنع عرض واجهة غير مناسبة ويعرض سببًا مفهومًا.

لا يرسل طلبات Supabase، ولا يقرأ Profile بنفسه، ولا يقرر الأدوار داخل JSX.

### 4.5 الحماية الخلفية

هي الحماية التي تستمر حتى عند تجاوز React وإرسال طلب مباشر:

```text
GRANT / REVOKE
RLS
CHECK constraints
Foreign keys
Trusted backend paths
```

## 5. اتحاد العمليات

يعتمد C4-A اتحادًا مغلقًا:

```ts
type AuthorizationOperation =
  | 'access_student_experience'
  | 'access_teacher_workspace'
  | 'access_reviewer_workspace'
  | 'author_content'
  | 'review_content';
```

لا يضاف `manage_accounts` إلى هذا الاتحاد في C4، لأن:

- لا يوجد دور `admin`.
- إدارة الحسابات ليست وظيفة لأي من `student/teacher/reviewer`.
- لا توجد واجهة أو خدمة إدارية معتمدة.

أي عملية جديدة تحتاج قرارًا مكتوبًا وتحديثًا لهذه الوثيقة في الالتزام نفسه.

## 6. عقد AuthorizationDecision

تعيد الدالة المركزية نتيجة مفسرة، لا Boolean مجردًا:

```ts
interface AuthorizationDecision {
  readonly allowed: boolean;
  readonly reason:
    | 'allowed'
    | 'guest'
    | 'profile_loading'
    | 'session_error'
    | 'profile_error'
    | 'account_pending'
    | 'account_suspended'
    | 'role_not_allowed'
    | 'operation_not_available';
}
```

### 6.1 قواعد الاتساق

- `allowed: true` يقترن فقط مع:

```text
reason: allowed
```

- كل سبب آخر يقترن مع:

```text
allowed: false
```

- لا توجد نتيجة `undefined`.
- لا توجد قيمة افتراضية متفائلة.
- أي حالة أو عملية غير معروفة تفشل مغلقة.

### 6.2 reason: guest

`guest` جزء صريح من العقد الدفاعي.

إذا استدعيت الدالة خطأ بحالة زائر:

```ts
authorizeOperation(guestAuthState, null, 'access_student_experience');
```

فالنتيجة الملزمة:

```text
allowed: false
reason: guest
```

لا تعيد الدالة سماحًا محليًا للزائر، لأن مسار الزائر ليس صلاحية حساب.

### 6.3 reason: session_error

إذا كانت حالة Auth الفعلية:

```text
authState.status = error
```

فالنتيجة الملزمة:

```text
allowed: false
reason: session_error
```

يمثل `session_error` فشل تحديد الجلسة أو حالة Auth نفسها، ويختلف دلاليًا عن:

```text
profile_loading
→ التهيئة أو قراءة Profile ما زالت جارية

profile_error
→ الجلسة صحيحة لكن قراءة Profile أو التحقق منها فشل
```

إضافة `session_error` توسع عقد C4 فقط. لا تتطلب أي تعديل على:

```text
AuthState
auth.types.ts
AuthSessionProvider
AccountStatusView
أو أي عقد أو شاشة مكتملة في C1 أو C2 أو C3
```

تظل شاشة `session_error` القائمة في C3 هي شاشة العرض الأساسية لهذه الحالة، بينما يضيف محرك C4 رفضًا دفاعيًا إذا وصلت الحالة إليه بالخطأ.

## 7. المسار المحلي للزائر

مسار الزائر يبقى خارج محرك الصلاحيات في الاستخدام الفعلي داخل `App.tsx`:

```text
guest + auth entry closed
→ تجربة الطالب المحلية مباشرة
```

ولا يمر عبر:

```text
authorizeOperation
RequireCapability
```

الحد الفاصل:

```text
الوصول المحلي بلا حساب
→ قرار App الحالي

الوصول المحمي لحساب مصادق
→ authorization.policy.ts
```

### 7.1 سبب الفصل

- الزائر لا يملك Profile.
- الزائر لا يملك AuthorizationState.
- الزائر يستخدم المزوّد المحلي.
- المسار لا يعتمد على Supabase أو RLS السحابية.
- إدخاله في المحرك يخلط بين تجربة محلية وصلاحية حساب.

### 7.2 فحص انحدار إلزامي

يجب أن يثبت اختبار App أن:

- الزائر يعرض تجربة الطالب المحلية.
- `authorizeOperation` لا يستدعى لمسار الزائر الطبيعي.
- استدعاء الدالة مباشرة بحالة Guest يرفض وفق Fail Closed.

## 8. تكامل App.tsx

### 8.1 ما يبقى في App

تبقى فروع اختيار الشاشة العامة:

```text
booting
guest
confirmation_required
session_error
pending
suspended
profile_error
```

هذه حالات واجهة وجلسة، وليست قرارات دور لعملية محمية.

### 8.2 ما يزال من C3

منطق C3 الحالي يتضمن فحصًا مباشرًا يحدد أن المستخدم مصادق وملفه `authorized` قبل عرض تجربة الطالب.

في C4-A يجب **استبدال** هذا القرار بمحرك الصلاحيات المركزي.

لا يضاف `RequireCapability` فوق الفحص القديم.

### 8.3 التكامل المعتمد

المسار المتوقع:

```tsx
<RequireCapability operation="access_student_experience">
  <StudentApplication />
</RequireCapability>
```

ويكون السؤال:

```text
هل المستخدم المصادق النشط يستطيع دخول تجربة الطالب؟
```

مجابًا حصريًا في:

```text
authorization.policy.ts
```

### 8.4 منع الازدواج

بعد C4-A لا يبقى في `App.tsx` شرط مكرر لاتخاذ قرار العملية من نوع:

```ts
const authorized =
  authState.status === 'authenticated' && authorizationState?.status === 'authorized';
```

يجوز لـApp فحص الحالة لاختيار شاشة `pending` أو `suspended`، لكنه لا يكرر مصفوفة الدور أو قرار العملية.

### 8.5 آلة Step

اتحاد `Step` التعليمي يبقى بلا تعديل.

لا تضاف إليه:

```text
access_denied
teacher_workspace
reviewer_workspace
pending
suspended
```

قرار الحارس لا يغير موضع الطالب التعليمي.

## 9. مصفوفة العمليات

| الحالة            | تجربة الطالب          | مساحة المعلم | مساحة المراجع | التأليف       | المراجعة      |
| ----------------- | --------------------- | ------------ | ------------- | ------------- | ------------- |
| Guest             | مسار محلي خارج المحرك | مرفوض        | مرفوض         | مرفوض         | مرفوض         |
| Pending student   | مرفوض                 | مرفوض        | مرفوض         | مرفوض         | مرفوض         |
| Suspended student | مرفوض                 | مرفوض        | مرفوض         | مرفوض         | مرفوض         |
| Active student    | مسموح                 | مرفوض        | مرفوض         | مرفوض         | مرفوض         |
| Active teacher    | مسموح                 | مسموح        | مرفوض         | غير متاحة بعد | مرفوض         |
| Active reviewer   | مسموح                 | مرفوض        | مسموح         | مرفوض         | غير متاحة بعد |
| Session error     | مرفوض                 | مرفوض        | مرفوض         | مرفوض         | مرفوض         |
| Profile error     | مرفوض                 | مرفوض        | مرفوض         | مرفوض         | مرفوض         |

### 9.1 أولوية حالة الحساب

حالة الحساب تسبق الدور:

```text
teacher + pending = مرفوض
teacher + suspended = مرفوض
reviewer + pending = مرفوض
reviewer + suspended = مرفوض
```

لا يمنح الدور المرتفع وصولًا إذا لم تكن الحالة `active`.

### 9.2 العمليات غير المتاحة

حتى مع الدور المؤهل:

```text
active teacher + author_content
→ allowed: false
→ reason: operation_not_available

active reviewer + review_content
→ allowed: false
→ reason: operation_not_available
```

لا تستخدم `role_not_allowed` في هاتين الحالتين، لأن الدور صحيح مستقبلًا لكن البنية لم تنفذ بعد.

## 10. قواعد authorizeOperation

الواجهة المتوقعة:

```ts
authorizeOperation(
  authState,
  authorizationState,
  operation
): AuthorizationDecision
```

### 10.1 Auth قيد التهيئة

إذا كانت الحالة الفعلية المطابقة لعقد C1:

```text
authState.status = loading
```

فالنتيجة:

```text
allowed: false
reason: profile_loading
```

مصدر الحقيقة الوحيد هو اتحاد `AuthState` الفعلي في C1، والحالة غير المهيأة اسمها `loading`.

### 10.2 Auth error

إذا كانت:

```text
authState.status = error
```

فالنتيجة:

```text
allowed: false
reason: session_error
```

لا تحول هذه الحالة إلى `profile_loading` أو `profile_error`.

### 10.3 Guest

```text
allowed: false
reason: guest
```

هذا مسار دفاعي، لا المسار الطبيعي للزائر داخل App.

### 10.4 مستخدم مصادق وProfile غير جاهزة

إذا كان المستخدم مصادقًا وكانت:

```text
authorizationState = null
```

أو كانت الحالة:

```text
loading_profile
```

فالنتيجة:

```text
allowed: false
reason: profile_loading
```

### 10.5 Profile error

```text
allowed: false
reason: profile_error
```

### 10.6 Pending

```text
allowed: false
reason: account_pending
```

### 10.7 Suspended

```text
allowed: false
reason: account_suspended
```

### 10.8 Authorized

إذا كانت الحالة `authorized`:

1. يفحص توفر العملية.
2. يفحص الدور المسموح.
3. يعيد `allowed` أو سبب الرفض.

### 10.9 ترتيب القرار

الترتيب الملزم يتكون من ثمانية فروع صريحة، ويمنع الرسائل المضللة:

```text
1. authState.status = loading
   → profile_loading

2. authState.status = error
   → session_error

3. authState.status = guest
   → guest

4. authenticated + AuthorizationState فارغة أو loading_profile
   → profile_loading

5. profile_error
   → profile_error

6. pending
   → account_pending

7. suspended
   → account_suspended

8. authorized
   → توفر العملية ثم أهلية الدور ثم allowed
```

مثلًا لا يعاد `role_not_allowed` لمستخدم `suspended`، ولا يعاد `profile_loading` عند فشل الجلسة؛ لأن السبب الحقيقي السابق يجب أن يظل ظاهرًا ودقيقًا.

## 11. تفاصيل العمليات الخمس

### 11.1 access_student_experience

المسموح:

```text
active student
active teacher
active reviewer
```

المرفوض داخل المحرك:

```text
guest
session_error
pending
suspended
profile_error
```

لا يغير هذا مسار الزائر المحلي المستقل.

### 11.2 access_teacher_workspace

المسموح من ناحية العقد:

```text
active teacher
```

المرفوض:

```text
student
reviewer
pending
suspended
profile_error
guest
```

لا تعني هذه العملية وجود لوحة معلم كاملة في C4.

قد تستخدم لاحقًا لحارس نقطة دخول أو Placeholder واضح، لكن لا تفتح كتابة خلفية.

### 11.3 access_reviewer_workspace

المسموح من ناحية العقد:

```text
active reviewer
```

ولا تعني وجود دورة مراجعة محتوى مكتملة في C4.

### 11.4 author_content

تعاد دائمًا في C4:

```text
allowed: false
reason: operation_not_available
```

حتى للمعلّم النشط.

السبب:

- لا توجد واجهة تأليف.
- لا يوجد عقد ملكية مسودة.
- لا توجد خدمة كتابة.
- لا توجد RLS كتابة.
- لا توجد اختبارات تجاوز واجهة للعملية.

### 11.5 review_content

تعاد دائمًا في C4:

```text
allowed: false
reason: operation_not_available
```

حتى للمراجع النشط، للأسباب نفسها.

## 12. العمليات المؤجلة إلى Phase 3

تدخل العمليات التالية عند بناء وظائفها الفعلية فقط:

- إنشاء درس.
- تعديل درس.
- إنشاء سؤال.
- تعديل سؤال.
- إنشاء لعبة أو تجربة.
- حفظ مسودة.
- إرسال للمراجعة.
- قبول أو رفض المحتوى.
- إرجاع المحتوى للتعديل.

كل عملية كتابة مستقبلية يجب أن تأتي في دفعة واحدة تشمل:

```text
Operation contract
+
Ownership / assignment model
+
Service implementation
+
Migration
+
GRANT / RLS
+
Direct bypass tests
+
React UI
```

لا تفتح صلاحية خلفية قبل وجود العملية كاملة.

## 13. لا Migration جديدة في C4

لا تحتاج C4 Migration مبدئيًا لأن:

- لا توجد عملية كتابة جديدة.
- صلاحيات القراءة الحالية مكتملة.
- `profiles` محمية.
- جداول المحتوى تمنع كتابة المستخدمين.
- C4 تنظم قرار الواجهة ولا تغير نموذج البيانات.

إذا ظهر أثناء التنفيذ أن Migration مطلوبة، يتوقف العمل ويحدث هذا العقد قبل كتابتها.

لا يسمح بإدخال Migration جانبية تحت مسمى Guard.

## 14. الملفات المتوقعة في C4-A

```text
src/services/auth/authorization.operations.ts
src/services/auth/authorization.policy.ts
src/features/auth/RequireCapability.tsx
src/features/auth/useAuthorizationDecision.ts

tests/auth/authorization.policy.test.ts
tests/features/auth/RequireCapability.test.tsx
tests/features/auth/AppAuthorizationGuard.test.tsx

README_PHASE_2_C4_A.md
APPLY_PHASE_2_C4_A.txt
```

وقد يعدل:

```text
src/App.tsx
```

تعديلًا محدودًا لاستبدال القرار القديم.

لا تعديل متوقع في:

```text
src/services/auth/auth.service.ts
src/services/auth/profile.service.ts
src/services/auth/authorization.service.ts
supabase/migrations/*
ContentRepository
اتحاد Step
```

## 15. authorization.policy.ts

هو المصدر الوحيد لقواعد العمليات في C4-A.

يجب ألا:

- يستدعي Supabase.
- ينشئ اشتراكًا.
- يقرأ Local Storage.
- يعتمد على React.
- يعدل الحالة.
- يستخدم وقت الجهاز أو متغيرات بيئة لاتخاذ القرار.

يجب أن يكون Pure Function قابلًا للاختبار بمعزل.

## 16. RequireCapability

الواجهة المتوقعة:

```tsx
<RequireCapability operation="access_student_experience" fallback={<AccessDeniedView />}>
  <StudentApplication />
</RequireCapability>
```

المكون:

- يقرأ الحالة من Provider الحالي.
- يستدعي Hook أو Policy المركزية.
- يعرض `children` عند السماح.
- يعرض `fallback` عند الرفض.
- لا ينفذ Child Component عند الرفض.
- لا يستدعي Supabase.
- لا ينشئ اشتراك Auth إضافيًا.
- لا يكرر شروط `role/status`.

### 16.1 fallback

إذا لم يمرر Fallback صريح، يستخدم مخرجًا مغلقًا وآمنًا، لا يعرض المحتوى المحمي.

لا ينبغي استخدام رسالة واحدة مضللة لكل الأسباب؛ يمكن للواجهة تفسير `reason` دون إعادة اتخاذ قرار الصلاحية.

## 17. useAuthorizationDecision

Hook خفيف يستقبل العملية ويعيد `AuthorizationDecision`.

لا يحتوي مصفوفة أدوار مستقلة.

تنفيذ القرار يظل في:

```text
authorization.policy.ts
```

## 18. منع شروط الأدوار المتناثرة

يجب ألا تظهر داخل مكونات القرار شروط مثل:

```ts
profile.role === 'teacher';
profile.role === 'reviewer';
```

لاتخاذ قرار عرض عملية محمية.

الاستثناء:

- عرض اسم الدور كنص.
- معلومات وصفية بحتة لا تمنح أو تمنع صلاحية.

تضاف اختبارات بنيوية أو بحث مصدر تمنع تسرب القرار إلى Components.

## 19. اختبارات authorization.policy

يجب أن تغطي كل خلية في المصفوفة وترتيب القرار الثماني، ومنها:

1. `authState.status = loading` يرفض بسبب `profile_loading`.
2. `authState.status = error` يرفض بسبب `session_error`.
3. `session_error` لا يتحول إلى `profile_loading`.
4. `session_error` لا يتحول إلى `profile_error`.
5. Guest يرفض دفاعيًا بسبب `guest`.
6. مستخدم مصادق وAuthorization فارغة يرفض بسبب `profile_loading`.
7. `loading_profile` يرفض بسبب `profile_loading`.
8. Active student يدخل تجربة الطالب.
9. Active teacher يدخل تجربة الطالب.
10. Active reviewer يدخل تجربة الطالب.
11. Student لا يدخل مساحة المعلم.
12. Teacher يدخل مساحة المعلم.
13. Reviewer لا يدخل مساحة المعلم.
14. Reviewer يدخل مساحة المراجع.
15. Teacher لا يدخل مساحة المراجع.
16. Pending يمنع كل العمليات المحمية.
17. Suspended يمنع كل العمليات المحمية.
18. Profile error يمنع كل العمليات.
19. Active teacher لا يؤلف في C4 بسبب `operation_not_available`.
20. Active reviewer لا يراجع في C4 بسبب `operation_not_available`.
21. الدور لا يتجاوز حالة الحساب.
22. عملية غير معروفة تفشل مغلقة إذا وصلت من JavaScript غير منضبط وقت التشغيل.
23. لا تنتج حالة `allowed: true` مع سبب غير `allowed`.
24. يستخدم التنفيذ الاسم الفعلي `loading` المطابق لعقد C1 دون أي تسمية بديلة.

## 20. اختبارات RequireCapability

يجب أن تثبت:

- عرض Children عند السماح.
- عرض Fallback عند المنع.
- عدم تنفيذ Child Component عند المنع.
- تغيير AuthorizationState يعيد التقييم.
- Session error لا يعرض المحتوى.
- Pending لا يعرض المحتوى.
- Suspended لا يعرض المحتوى.
- Profile error لا يعرض المحتوى.
- `operation_not_available` لا يعرض Placeholder كأنه ميزة جاهزة.
- لا ينشأ اشتراك Auth أو Authorization جديد داخل كل حارس.
- لا يوجد استدعاء Supabase مباشر.

## 21. اختبارات AppAuthorizationGuard

يجب أن تثبت:

1. الزائر يعرض تجربة الطالب المحلية خارج الحارس.
2. مسار الزائر لا يستدعي `authorizeOperation` في الاستخدام الطبيعي.
3. المستخدم النشط يمر عبر `RequireCapability`.
4. فحص `authorized` القديم لا يبقى مصدر قرار مكرر.
5. Session error يستمر في شاشة C3 الصحيحة قبل الوصول إلى الحارس.
6. Pending وSuspended يستمران في شاشات C3 الصحيحة.
7. Profile error يستمر في شاشة C3 الصحيحة.
8. إزالة السماح من Policy تخفي تجربة الطالب دون تعديل Step.
9. اتحاد Step يبقى مطابقًا لحالة C3.
10. موضع الطالب لا يمسح عند إعادة تقييم الحارس.

## 22. C4-B: إثبات تجاوز الواجهة

تستخدم C4-B عملاء حقيقيين:

```text
anon
pending
suspended
active student
active teacher
active reviewer
service_role
```

وترسل طلبات مباشرة، دون React أو `RequireCapability`.

### 22.1 profiles

يجب أن يثبت استمرار فشل المستخدم في:

```text
INSERT
UPDATE display_name
UPDATE role
UPDATE status
DELETE
```

### 22.2 جداول المحتوى

بالنسبة إلى Active student وActive teacher وActive reviewer، يجب أن تفشل مباشرة:

```text
INSERT
UPDATE
DELETE
```

وجود دور Teacher أو Reviewer لا يفتح الكتابة قبل Phase 3.

### 22.3 القراءة

يجب أن تبقى النتائج:

| الهوية          | المحتوى المعتمد            | المسودات                   |
| --------------- | -------------------------- | -------------------------- |
| anon            | مرفوض                      | مرفوض                      |
| pending         | مرفوض                      | مرفوض                      |
| suspended       | مرفوض                      | مرفوض                      |
| active student  | مسموح                      | مرفوض                      |
| active teacher  | مسموح                      | مرفوض                      |
| active reviewer | مسموح                      | مرفوض                      |
| service_role    | وفق المسار الإداري الموثوق | وفق المسار الإداري الموثوق |

### 22.4 سلامة البيانات

لا يكفي توقع خطأ فقط.

لكل محاولة كتابة مرفوضة يجب التحقق من واحد أو أكثر من:

- SQLSTATE المتوقع.
- عدد الصفوف المتأثرة.
- قيمة الصف قبل الطلب وبعده.
- عدم إنشاء صف جديد.
- عدم حذف الصف المستهدف.

## 23. service_role

يبقى `service_role` خارج:

```text
src/
React
VITE_* public environment
حزمة المتصفح
```

يستخدم فقط في:

- اختبارات التكامل المحلية.
- إدارة موثوقة.
- Fixtures وتنظيفها.

لا يستخدم لتجاوز عيب في RLS أو لتقديم عملية للمستخدم النهائي.

## 24. الفحوص البنيوية

يجب أن تمنع الفحوص:

- `supabase.from(...)` داخل مكونات الحراس.
- استدعاء Auth API داخل `RequireCapability`.
- شروط Role متناثرة لاتخاذ القرار.
- إضافة حالات Auth إلى `Step`.
- بقاء فحص `authorized` القديم مصدرًا موازيًا للعملية.
- استخدام أي تسمية بديلة بدل `AuthState.status = loading`.
- غياب الفرع الدفاعي `session_error` لحالة `AuthState.status = error`.
- استخدام `service_role` في كود الإنتاج.

## 25. الرسائل وتجربة المستخدم

`AuthorizationDecision.reason` ليس رسالة واجهة جاهزة.

تترجم طبقة العرض السبب إلى رسالة عربية مناسبة دون:

- كشف معلومات أمنية إضافية.
- ادعاء أن ميزة غير مبنية متاحة قريبًا.
- تحويل Pending إلى Role error.
- تحويل Suspended إلى خطأ شبكة.

أمثلة مبدئية:

```text
profile_loading
→ جارٍ التحقق من صلاحية الحساب.

session_error
→ تعذر التحقق من الجلسة. حاول مرة أخرى.

account_pending
→ الحساب بانتظار التفعيل.

account_suspended
→ هذا الحساب غير متاح حاليًا.

role_not_allowed
→ لا يملك هذا الحساب صلاحية الوصول إلى هذه المساحة.

operation_not_available
→ هذه الوظيفة غير متاحة في الإصدار الحالي.
```

شاشات C3 الحالية تظل المصدر الأساسي لحالات Session Error وPending وSuspended وProfile Error، ولا تستبدلها إضافة السبب الجديد داخل عقد C4.

## 26. حدود C4 مقابل Phase 3

### داخل C4

- عقد العمليات الخمس.
- محرك قرار مركزي.
- React Guard.
- تكامل تجربة الطالب النشط.
- Fail Closed.
- اختبارات تجاوز الواجهة للمنع الحالي.

### خارج C4

- لوحة المعلم الفعلية.
- لوحة المراجع الفعلية.
- إنشاء أو تعديل المحتوى.
- ملكية المسودات.
- إسناد المراجعة.
- تغيير حالة المحتوى.
- سياسات كتابة جديدة.
- إدارة المستخدمين.
- تعديل Role أو Status من التطبيق.
- `mastery_results`.

### قاعدة الانتقال إلى Phase 3

لا تفعل `author_content` أو `review_content` بتغيير Boolean فقط.

يحتاج تفعيل كل عملية تحديثًا مكتوبًا لهذا العقد مع البنية الخلفية الكاملة.

## 27. Rollback

### C4-A

التراجع يعني:

- إزالة `RequireCapability`.
- إعادة نقطة الاستقرار C3 في `App.tsx`.
- حذف ملفات Policy وOperation وHook الجديدة.

لا يتضمن Rollback قاعدة بيانات لأن C4-A لا تنشئ Migration.

### C4-B

اختبارات فقط، ولا تترك Fixtures دائمة.

أي Fixture تعدل البيانات تستعيدها داخل `finally` أو تحذفها في `afterAll`.

## 28. الملفات التوثيقية والتنفيذية

### C4-0

```text
docs/PHASE_2_C4_OPERATION_AUTHORIZATION.md
docs/PHASES.md
README_PHASE_2_C4.md
APPLY_PHASE_2_C4.txt
```

### C4-A

```text
src/services/auth/authorization.operations.ts
src/services/auth/authorization.policy.ts
src/features/auth/RequireCapability.tsx
src/features/auth/useAuthorizationDecision.ts
src/App.tsx

tests/auth/authorization.policy.test.ts
tests/features/auth/RequireCapability.test.tsx
tests/features/auth/AppAuthorizationGuard.test.tsx
```

### C4-B

قد تضيف ملف تكامل مستقل أو توسع اختبار التفويض الحالي، بشرط ألا تكرر مصفوفة C2-A كاملة بلا قيمة.

الأسماء النهائية تعتمد على بنية المستودع عند التنفيذ، لكن الحدود الوظيفية ثابتة.

## 29. معايير قبول C4-0

لا تعتمد الوثيقة إلا إذا حسمت:

1. العمليات المعروفة.
2. الأدوار المؤهلة لكل عملية.
3. حالات الحساب السابقة للدور.
4. سبب `guest` الدفاعي.
5. أن الزائر خارج المحرك في App.
6. أن C4-A تستبدل فحص `authorized` ولا تكرره.
7. العمليات غير المتاحة بعد.
8. عدم وجود Migration جديدة.
9. حدود C4 مقابل Phase 3.
10. خطة اختبارات تجاوز الواجهة.

## 30. معايير قبول C4-A

```text
محرك القرار Pure ومركزي
Fail Closed لكل حالة مجهولة
reason: guest موجود ومختبر
اتحاد Step بلا تعديل
مسار Guest خارج الحارس
فحص authorized القديم مستبدل لا مكرر
RequireCapability مستخدم فعليًا
لا Supabase مباشر في الحراس
لا شروط أدوار متناثرة
كل اختبارات C1-C3 السابقة ناجحة
Build / Lint / Prettier ناجحة
```

## 31. معايير قبول C4-B

```text
طلبات PostgREST المباشرة تتجاوز React عمدًا
كتابة profiles مرفوضة للمستخدمين
كتابة المحتوى مرفوضة للأدوار الثلاثة
Pending / Suspended / Anon ممنوعون خلفيًا
المسودات ممنوعة للأدوار التطبيقية
service_role يبقى خارج الإنتاج
البيانات لا تتغير بعد الطلبات المرفوضة
كل اختبارات التكامل السابقة تبقى ناجحة
```

## 32. معيار إغلاق Phase 2-C4

لا تغلق C4 إلا بعد:

```text
C4-0 Documentation approved and committed
C4-A policy and React guards verified
C4-B direct bypass tests verified on PostgreSQL
All prior tests remain green
Git working tree clean
```

## 33. تسلسل العمل

1. اعتماد وثيقة C4-0.
2. تثبيت التوثيق في Git.
3. تجهيز خطة تنفيذ C4-A المحدودة.
4. مراجعة كلاود للكود الفعلي.
5. تشغيل اختبارات الوحدة وReact.
6. تثبيت C4-A.
7. تجهيز اختبارات C4-B.
8. تشغيل PostgreSQL الفعلية.
9. التحقق من عدم تغير البيانات عند الطلبات المرفوضة.
10. تثبيت C4-B.
11. إغلاق C4.
12. الانتقال إلى C5.

## 34. قاعدة التغيير

أي تعديل لاحق على:

- قائمة العمليات.
- مصفوفة الأدوار.
- ترتيب أسباب الرفض.
- أسماء حالات `AuthState` المستخدمة في المحرك.
- أسباب الرفض `session_error` و`profile_error` و`profile_loading`.
- مسار الزائر.
- توفر عمليات التأليف أو المراجعة.
- حدود C4 مقابل Phase 3.

يحتاج قرارًا مكتوبًا وتحديثًا مباشرًا لهذه الوثيقة في الالتزام نفسه.

لا تكفي ملاحظة في المحادثة أو شرط جديد داخل Component.
