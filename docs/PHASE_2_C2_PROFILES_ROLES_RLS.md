# Phase 2-C2: Profiles + Roles + Authorization RLS

## الحالة

- وثيقة تصميم أمني وتنفيذي رسمية لمرحلة `Phase 2-C2`.
- تعتمد على القرارات الملزمة في `Phase 2-C0` وعلى طبقة Auth المنفذة والمختبرة في `Phase 2-C1`.
- لا تحتوي هذه الدفعة Migration تنفيذية ولا تعدّل قاعدة البيانات.
- لا تُعلن المرحلة مكتملة قبل تطبيق Migration مستقلة واختبارات Auth وRLS الفعلية.

## 1. نقطة الأساس

نقطة الأساس البرمجية المعتمدة قبل C2:

```text
Phase 2-C1: Implemented & Verified
Commit: 9a27d89
Test files: 27 passed
Tests: 309 passed
```

تجيب C1 عن السؤال:

> هل توجد جلسة Auth صالحة، ومن هو المستخدم؟

وتجيب C2 عن السؤال:

> هل يوجد Profile مطابق، وما دور المستخدم وحالة حسابه، وما البيانات المسموح له بقراءتها؟

لا تعني الجلسة الصالحة وحدها أن المستخدم مخوّل.

## 2. الهدف

إنشاء أساس التفويض التطبيقي عبر:

```text
auth.users
    ↓ id
public.profiles
    ↓ role + status
AuthorizationState + RLS
```

مع ضمان ما يلي:

1. لكل مستخدم Auth صف Profile واحد مطابق.
2. إنشاء المستخدم وProfile عملية ذرية.
3. لا يستطيع المستخدم إنشاء Profile أو حذفه أو تعديله من العميل.
4. لا يستطيع المستخدم تغيير `role` أو `status` أو ترقية نفسه.
5. الحساب `pending` أو `suspended` لا يصل إلى المحتوى السحابي المحمي.
6. الحساب `active` يصل فقط إلى النطاق المسموح في C2.
7. لا يعتمد التفويض على Metadata قابلة لتعديل المستخدم.
8. تُمنح `service_role` الصلاحيات المطلوبة صراحة، دون وضع مفتاحها في المتصفح.

## 3. القرارات الملزمة الموروثة

### 3.1 الأدوار

الأدوار الوحيدة المعتمدة في C2:

```text
student
teacher
reviewer
```

لا يوجد دور:

```text
admin
supervisor
```

ولا يُضاف دور جديد دون قرار مكتوب وتحديث مباشر لوثيقة C0 والوثائق المتأثرة.

### 3.2 حالات الحساب

الحالات الوحيدة المعتمدة:

```text
pending
active
suspended
```

### 3.3 مصدر التفويض

المصدر الوحيد للدور والحالة:

```text
public.profiles
```

لا تُستخدم للتفويض:

- `user_metadata`.
- `raw_user_meta_data`.
- البريد الإلكتروني.
- وجود JWT فقط.
- إخفاء عناصر الواجهة.

### 3.4 وضع الزائر

لا يُفعّل Supabase Anonymous Sign-In.

الزائر:

- يستخدم المزوّد المحلي.
- لا يملك مستخدم Auth.
- لا يملك Profile.
- لا يقرأ المحتوى من Supabase Data API في C2.

## 4. نطاق المرحلة

### داخل النطاق

- عقد جدول `public.profiles`.
- القيود والقيم الافتراضية.
- Trigger إنشاء Profile.
- إثبات ذرّية التسجيل وفشل Trigger.
- GRANT وREVOKE الخاصة بـ`profiles`.
- RLS الخاصة بـ`profiles`.
- تحويل قراءة المحتوى السحابي إلى المستخدمين `active` فقط.
- منع `pending` و`suspended` من المحتوى السحابي المحمي.
- عقد `UserProfile` و`AuthorizationState`.
- قارئ Profile للصف الشخصي فقط.
- اختبارات SQL والتكامل السلبية والإيجابية.
- تحديث أدوات التحقق المحلية المتأثرة بسياسات القراءة.

### خارج النطاق

- واجهة تسجيل الدخول والخروج.
- صفحة تعديل الملف الشخصي.
- تعديل `display_name` من العميل.
- لوحة إدارة المستخدمين.
- تغيير الأدوار أو الحالات من واجهة التطبيق.
- دعوات المستخدمين.
- استعادة كلمة المرور.
- وصول المعلم إلى المسودات بحسب الملكية.
- إسناد محتوى إلى مراجع.
- عمليات إنشاء المحتوى أو مراجعته أو اعتماده.
- `mastery_results` أو أي Cloud Persistence تعليمية.
- استخدام `service_role` في React أو المتصفح.

## 5. عقد جدول public.profiles

البنية المعتمدة:

| العمود         | النوع         | Null | القيمة الافتراضية  | القاعدة                                                             |
| -------------- | ------------- | ---- | ------------------ | ------------------------------------------------------------------- |
| `id`           | `uuid`        | لا   | لا توجد            | مفتاح أساسي ومفتاح خارجي إلى `auth.users.id` مع `ON DELETE CASCADE` |
| `display_name` | `text`        | نعم  | `NULL`             | حقل شخصي غير أمني، ولا يُملأ من Metadata في C2                      |
| `role`         | `text`        | لا   | `student`          | قيد مسمى يحصر القيمة في `student/teacher/reviewer`                  |
| `status`       | `text`        | لا   | `pending`          | قيد مسمى يحصر القيمة في `pending/active/suspended`                  |
| `created_at`   | `timestamptz` | لا   | وقت قاعدة البيانات | لا يرسله العميل                                                     |
| `updated_at`   | `timestamptz` | لا   | وقت قاعدة البيانات | يُحدّث من قاعدة البيانات عند أي تعديل موثوق                         |

### 5.1 سبب استخدام text مع CHECK

تستخدم C2 أعمدة `text` مع قيود `CHECK` مسماة بدل إنشاء PostgreSQL ENUM جديد للأدوار والحالات.

الأسباب:

- التعديل المستقبلي يظل Migration صريحة وقابلة للمراجعة.
- تجنب صعوبة حذف قيم ENUM أو إعادة ترتيبها في Rollback.
- لا تتغير القائمة دون تحديث الوثيقة والقيود معًا.

### 5.2 display_name

في C2:

- `display_name` اختياري.
- لا يُقرأ من `raw_user_meta_data` داخل Trigger.
- لا يُسمح للمستخدم بتعديله.
- لا يحمل أي دلالة أمنية.
- لا يؤدي غيابه إلى فشل التسجيل.

تأجيل إدخال الاسم وتعديله يمنع توسيع C2 إلى UI أو فتح `UPDATE` بلا حاجة حالية.

### 5.3 ما لا يُخزّن في profiles

لا يُكرر الجدول:

- كلمة المرور.
- Access Token أو Refresh Token.
- البريد الإلكتروني بوصفه مصدرًا للتفويض.
- بيانات تعليمية أو نتائج إتقان.
- إعدادات واجهة غير مرتبطة بالهوية.
- معلومات إدارية لا يحتاجها عقد C2.

## 6. القيم الافتراضية الآمنة

أي مستخدم جديد يبدأ بالحالة:

```text
role = student
status = pending
```

السبب:

- `student` أقل الأدوار صلاحية.
- `pending` يمنع الوصول السحابي المحمي حتى التفعيل الإداري.
- لا تُقبل قيمة دور أو حالة من طلب التسجيل أو Metadata العميل.

لا يؤدي تأكيد البريد تلقائيًا إلى تحويل الحالة إلى `active`؛ تأكيد البريد يثبت ملكية البريد، ولا يمنح تفويضًا تطبيقيًا.

## 7. Trigger إنشاء Profile

يُنشأ Profile حصريًا عبر Trigger بعد إدخال صف جديد في:

```text
auth.users
```

### 7.1 خصائص الدالة

يجب أن تكون دالة Trigger:

- `SECURITY DEFINER`.
- مملوكة لدور إداري موثوق في قاعدة البيانات.
- ذات `search_path` فارغ أو مقيد صراحة.
- تستخدم أسماء مؤهلة بالكامل مثل `public.profiles`.
- تدرج `id` فقط، وتترك القيم الافتراضية الآمنة لبقية الحقول.
- لا تقرأ `role` أو `status` أو `display_name` من Metadata.
- لا تستخدم `ON CONFLICT DO NOTHING`.
- لا تلتقط الأخطاء ثم تواصل التسجيل.
- لا تنفذ إعادة محاولة صامتة.

### 7.2 فشل Trigger

إذا فشل إنشاء Profile:

- يفشل إنشاء مستخدم Auth.
- تتراجع المعاملة كاملة.
- لا يبقى مستخدم يتيم.
- لا تُنشأ جلسة مؤقتة بلا Profile.
- يعود خطأ تسجيل عام وآمن عبر طبقة C1، دون كشف اسم الجدول أو Trigger.

### 7.3 اختبار الفشل المتعمد

لا يُضاف مسار فشل خاص إلى كود الإنتاج.

يُنفذ الاختبار في قاعدة Supabase المحلية عبر Fixture اختبارية فقط:

1. يضاف Trigger اختبار ثانٍ مؤقت على `auth.users`.
2. يرفع Trigger الاختبار استثناءً لبريد Sentinel معروف للاختبار فقط.
3. يُطلب التسجيل عبر Auth المحلي بهذا البريد.
4. يجب أن يفشل التسجيل.
5. يُفحص عدم وجود البريد داخل `auth.users`.
6. يُفحص عدم وجود Profile مطابق.
7. تزال Fixture أو يعاد `supabase db reset`.

حتى لو نُفذ Trigger إنشاء Profile قبل Trigger الفشل، يجب أن تتراجع العملية كلها داخل المعاملة نفسها.

### 7.4 استعلام المستخدمين اليتامى

يجب أن يعيد هذا الاستعلام صفر صفوف بعد اختبارات النجاح والفشل:

```sql
SELECT au.id
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL;
```

النتيجة المقبولة:

```text
0 rows
```

## 8. صلاحيات profiles

### 8.1 anon

لا يحصل `anon` على أي صلاحية على `public.profiles`.

المطلوب:

```text
SELECT: denied
INSERT: denied
UPDATE: denied
DELETE: denied
```

### 8.2 authenticated

يحصل `authenticated` على:

```text
SELECT فقط
```

ولا يحصل على:

```text
INSERT
UPDATE
DELETE
```

هذا قرار مقصود، لا نقص مؤقت.

في C2 يكون Profile للعميل:

```text
read-only
```

### 8.3 service_role

تُمنح `service_role` صراحة الحد الأدنى المطلوب للمسار الإداري الموثوق:

```text
SELECT
UPDATE
```

ولا تُمنح في C2:

```text
INSERT
DELETE
```

إنشاء Profile مسؤولية Trigger، والحذف يتبع حذف مستخدم Auth عبر `ON DELETE CASCADE`.

رغم أن `service_role` تتجاوز RLS، فإنها تحتاج صلاحيات الجدول الأساسية صراحة. يجب اختبار ذلك، لا افتراضه.

### 8.4 postgres ومالك الدالة

يبقى الدور المالك مسؤولًا عن:

- إنشاء الجدول والقيود.
- تشغيل Trigger ذي الصلاحية المعرّفة.
- إدارة Migrations.

لا تُمنح صلاحيات هذا الدور للعميل.

## 9. RLS على profiles

تُفعّل RLS على `public.profiles`.

### سياسة القراءة الوحيدة للمستخدم

يستطيع المستخدم المصادق عليه قراءة صفه فقط:

```text
auth.uid() = profiles.id
```

لا تشترط سياسة قراءة Profile أن تكون الحالة `active`، لأن التطبيق يحتاج قراءة الصف ليعرف أن الحساب:

- `pending`.
- `active`.
- `suspended`.

### لا توجد سياسات كتابة للمستخدم

لا تُنشأ سياسات:

- `INSERT`.
- `UPDATE`.
- `DELETE`.

ولا توجد سياسة عامة من نوع:

```text
USING (true)
```

على `profiles`.

## 10. سبب استبعاد Column-Level Privileges

لا تعتمد C2 على:

```text
GRANT UPDATE (display_name)
```

أو أي صلاحيات تحديث على مستوى العمود.

الأسباب:

- `authenticated` لا يحتاج UPDATE أصلًا في C2.
- منع UPDATE بالكامل أبسط وأكثر أمانًا من حماية أعمدة داخل عملية غير مطلوبة.
- صلاحيات الأعمدة تزيد عبء الاستعلامات وتفرض قوائم أعمدة صريحة في مواضع متعددة.
- تعديل الاسم يؤجل حتى توجد واجهة وحاجة فعلية ومسار محدود قابل للاختبار.

## 11. نوع فشل محاولات التحديث

محاولات المستخدم العادي لتحديث:

```text
display_name
role
status
```

يجب أن تفشل على مستوى صلاحية الجدول، قبل الوصول إلى سياسة RLS.

النتيجة المتوقعة في PostgreSQL أو Data API:

```text
SQLSTATE 42501
permission denied for table profiles
```

لا يكفي في الاختبار التأكد من أن عدد الصفوف المتأثرة يساوي صفرًا.

يجب التحقق من:

1. نوع الخطأ أو رمزه.
2. عدم تغير القيمة داخل قاعدة البيانات.
3. أن سبب الرفض هو غياب `GRANT UPDATE`، لا سياسة أخرى بالمصادفة.

## 12. AuthorizationState

تضيف C2 طبقة مستقلة فوق `AuthState`:

```ts
type AppRole = 'student' | 'teacher' | 'reviewer';

type AccountStatus = 'pending' | 'active' | 'suspended';

interface UserProfile {
  readonly id: string;
  readonly displayName: string | null;
  readonly role: AppRole;
  readonly status: AccountStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

type AuthorizationState =
  | { status: 'loading_profile'; user: AuthUser; session: AuthSession }
  | { status: 'authorized'; user: AuthUser; session: AuthSession; profile: UserProfile }
  | { status: 'pending'; user: AuthUser; session: AuthSession; profile: UserProfile }
  | { status: 'suspended'; user: AuthUser; session: AuthSession; profile: UserProfile }
  | {
      status: 'profile_error';
      user: AuthUser;
      session: AuthSession;
      error: PublicAuthorizationError;
    };
```

### قواعد التحويل

- `profile.status = active` ينتج `authorized`.
- `profile.status = pending` ينتج `pending`.
- `profile.status = suspended` ينتج `suspended`.
- غياب Profile مع وجود جلسة ينتج `profile_error`، ولا يعامل كزائر.
- قيمة Role أو Status غير معروفة تنتج `profile_error`، ولا تستخدم قيمة افتراضية صامتة.
- لا تُعرض واجهة محمية أثناء `loading_profile`.

## 13. قارئ Profile في العميل

تنفيذ C2 البرمجي اللاحق يضيف عملية قراءة واحدة فقط:

```text
قراءة صف المستخدم الحالي من public.profiles
```

القواعد:

- تستخدم عميل Supabase الحالي.
- لا تنشئ عميلًا ثانيًا.
- لا تحتوي دوال تعديل Profile.
- تختار الأعمدة الستة المعتمدة صراحة.
- تتحقق من العقد في وقت التشغيل قبل إنتاج `UserProfile`.
- لا تعتبر الخطأ أو الصف المفقود حالة `guest`.
- لا تعرض رسالة Supabase الخام للمستخدم.
- لا تستخدم `service_role`.

## 14. RLS المحتوى في C2

تغيّر C2 القراءة السحابية للمحتوى من قراءة عامة عبر `anon` إلى قراءة للمستخدمين النشطين فقط.

> **تحذير ترحيل ملزم:** لا يجوز إضافة سياسات C2 الجديدة بجانب سياسات Phase 2-B2b القديمة. سياسات `SELECT` الحالية سياسات `PERMISSIVE`، ويجمع PostgreSQL السياسات المنطبقة على العملية نفسها بمنطق `OR`. لذلك فإن بقاء أي سياسة قديمة تسمح بالقراءة العامة سيُبقي الوصول القديم فعالًا حتى لو أضيفت سياسة أحدث تشترط Profile نشطًا. يجب حذف السياسات القديمة أولًا، ثم سحب صلاحيات `anon`، ثم إنشاء السياسات الجديدة واختبار النتيجة الفعلية.

### 14.1 الجداول المرجعية

الجداول:

```text
grades
semesters
subjects
units
```

تُقرأ من Supabase فقط عندما يوجد Profile يحقق:

```text
id = auth.uid()
status = active
role IN (student, teacher, reviewer)
```

### 14.2 الجداول التفصيلية

الجداول:

```text
lessons
objectives
questions
games
game_objectives
experiments
```

تُقرأ عندما:

1. يكون المستخدم `active` ودوره معتمدًا.
2. يكون المحتوى والدرس الأب `approved` وفق القيود الحالية.

### 14.3 المسودات

في C2 لا يستطيع أي دور قراءة المحتوى `draft` أو `pending_review` عبر العميل العام.

يشمل ذلك مؤقتًا:

- `teacher`.
- `reviewer`.

السبب:

- لا توجد في المخطط الحالي ملكية للمسودة.
- لا يوجد إسناد مراجعة.
- فتح جميع المسودات للمعلم أو المراجع سيكون توسعًا غير مبرر.

تُضاف ملكية المحتوى وإسناد المراجعة وسياسات العمليات في C4 عبر Migration وعقد مستقلين.

بهذا حُسمت تفاصيل المسودات في C2:

> لا وصول إلى المسودات حتى وجود بيانات ملكية وإسناد صريحة.

### 14.4 anon بعد C2

تُسحب صلاحيات قراءة المحتوى السحابي من `anon`.

لا يكسر ذلك وضع الزائر المعتمد، لأن الزائر يستخدم المزوّد المحلي لا Supabase.

### 14.5 pending وsuspended

لا يقرأ الحساب `pending` أو `suspended` أي محتوى سحابي محمي.

يستطيع قراءة Profile الخاص به فقط حتى يستطيع التطبيق عرض حالة الحساب.

### 14.6 service_role

تحتفظ `service_role` بصلاحيات القراءة الصريحة اللازمة للاختبارات أو العمليات الخلفية الموثوقة، مع تجاوز RLS وفق سلوك Supabase المعروف.

لا تُستخدم في التطبيق العميل.

### 14.7 استبدال سياسات Phase 2-B2b القديمة

تحتوي Migration الحالية `20260801035807_add_content_read_security.sql` على عشر سياسات قراءة عامة يجب استبدالها، لا مراكمة سياسات جديدة فوقها:

```sql
DROP POLICY "public read grades" ON public.grades;
DROP POLICY "public read semesters" ON public.semesters;
DROP POLICY "public read subjects" ON public.subjects;
DROP POLICY "public read units" ON public.units;
DROP POLICY "public read approved lessons" ON public.lessons;
DROP POLICY "public read objectives of approved lessons" ON public.objectives;
DROP POLICY "public read approved questions of approved lessons" ON public.questions;
DROP POLICY "public read approved games of approved lessons" ON public.games;
DROP POLICY "public read approved experiments of approved lessons" ON public.experiments;
DROP POLICY "public read objectives of approved games and lessons" ON public.game_objectives;
```

يجب أن تسبق هذه الحذوفات إنشاء أي سياسة قراءة جديدة في C2.

القواعد التنفيذية الملزمة:

- لا يكفي تغيير `GRANT` وحده، لأن `authenticated` سيظل خاضعًا للسياسات القديمة إن بقيت.
- لا يكفي إضافة سياسات جديدة، لأن السياسات `PERMISSIVE` المتعددة تُجمع بمنطق `OR`.
- يجب استخدام أسماء السياسات والجداول الفعلية أعلاه في Migration التنفيذية.
- يُفضّل ألا تستخدم Migration النهائية `IF EXISTS` لهذه السياسات المعروفة؛ غياب سياسة متوقعة يدل على اختلاف في نقطة الأساس ويجب أن يوقف التطبيق للمراجعة بدل إخفائه بصمت.
- بعد الحذف وسحب صلاحيات `anon`، تُنشأ سياسات C2 الجديدة فقط، ثم تُختبر هويات `anon` و`pending` و`active` و`suspended` فعليًا.

## 15. تجنب RLS recursion

لا تنشئ سياسة `profiles` استعلامًا على `profiles` نفسه.

سياسة Profile تعتمد مباشرة على:

```text
auth.uid() = id
```

يجوز لسياسات جداول المحتوى الاستعلام عن Profile المستخدم الحالي، لأن الجدول المستهدف مختلف، وسياسة Profile تسمح للمستخدم بقراءة صفه فقط.

قبل الاعتماد يجب اختبار عدم ظهور:

```text
infinite recursion detected in policy
```

لا تُنشأ دالة `SECURITY DEFINER` لقراءة الدور إلا إذا أثبت التنفيذ الفعلي أن السياسات المباشرة غير مناسبة. عند الحاجة إليها لاحقًا يجب توثيق مالكها و`search_path` و`EXECUTE` واختبارها مستقلًا.

## 16. مصفوفة اختبارات profiles

| الاختبار                                | النتيجة المطلوبة                             | طبقة الحماية المتوقعة     |
| --------------------------------------- | -------------------------------------------- | ------------------------- |
| إنشاء مستخدم جديد                       | Profile واحد بدور `student` وحالة `pending`  | Trigger + defaults        |
| حذف مستخدم Auth                         | حذف Profile تلقائيًا                         | FK `ON DELETE CASCADE`    |
| مستخدم يقرأ Profile الخاص به            | نجاح                                         | GRANT SELECT + RLS        |
| مستخدم يقرأ Profile مستخدم آخر          | لا صف ظاهر                                   | RLS                       |
| anon يقرأ profiles                      | رفض                                          | GRANT                     |
| مستخدم ينشئ Profile                     | `42501 permission denied`                    | غياب INSERT GRANT         |
| مستخدم يغير display_name                | `42501 permission denied` وعدم تغير القيمة   | غياب UPDATE GRANT         |
| مستخدم يغير role                        | `42501 permission denied` وعدم تغير القيمة   | غياب UPDATE GRANT         |
| مستخدم يغير status                      | `42501 permission denied` وعدم تغير القيمة   | غياب UPDATE GRANT         |
| مستخدم يحذف Profile                     | `42501 permission denied`                    | غياب DELETE GRANT         |
| service_role تقرأ Profile               | نجاح                                         | GRANT SELECT + bypass RLS |
| service_role تغير role/status           | نجاح ثم استعادة Fixture                      | GRANT UPDATE + bypass RLS |
| service_role تنشئ أو تحذف Profile في C2 | رفض                                          | غياب INSERT/DELETE GRANT  |
| قيمة role غير معتمدة عبر مسار إداري     | فشل قيد CHECK                                | constraint                |
| قيمة status غير معتمدة عبر مسار إداري   | فشل قيد CHECK                                | constraint                |
| Trigger يفشل عمدًا                      | فشل التسجيل وعدم وجود مستخدم أو Profile يتيم | transaction atomicity     |
| استعلام المستخدمين اليتامى              | صفر صفوف                                     | integration invariant     |

## 17. مصفوفة اختبارات RLS المحتوى

| الهوية والحالة   | Catalog | Approved details | Draft / pending review | Profile الشخصي |
| ---------------- | ------- | ---------------- | ---------------------- | -------------- |
| anon             | مرفوض   | مرفوض            | مرفوض                  | مرفوض          |
| student pending  | مرفوض   | مرفوض            | مرفوض                  | مسموح          |
| student active   | مسموح   | مسموح            | مرفوض                  | مسموح          |
| teacher active   | مسموح   | مسموح            | مرفوض في C2            | مسموح          |
| reviewer active  | مسموح   | مسموح            | مرفوض في C2            | مسموح          |
| أي دور suspended | مرفوض   | مرفوض            | مرفوض                  | مسموح          |
| service_role     | مسموح   | مسموح            | مسموح وفق صلاحياتها    | مسموح          |

## 18. الاختبارات البرمجية

إضافة إلى اختبارات SQL والتكامل، يجب اختبار طبقة TypeScript اللاحقة:

- تحويل صف Profile صحيح إلى `UserProfile`.
- رفض Role غير معروف.
- رفض Status غير معروف.
- تحويل `active` إلى `authorized`.
- تحويل `pending` إلى حالة `pending`.
- تحويل `suspended` إلى حالة `suspended`.
- Profile مفقود مع جلسة ينتج `profile_error`.
- خطأ شبكة لا يتحول إلى `guest`.
- الاستيراد المجرد لا يهيئ Supabase.
- لا توجد دوال كتابة أو ترقية دور في خدمة العميل.

## 19. تحديث أدوات التحقق المحلية

لأن C2 تسحب القراءة السحابية من `anon`، يجب تحديث اختبارات Supabase الحالية وأداة:

```text
scripts/verify-supabase-local.sh
```

بحيث تختبر هويات فعلية منفصلة:

- anon.
- pending user.
- active student.
- active teacher.
- active reviewer.
- suspended user.
- service_role.

لا يجوز إبقاء اختبار قديم يفترض أن المفتاح العام يرى Catalog بعد C2.

## 20. ترتيب Migration المستقبلية

تُنشأ Migration جديدة، ولا تُعدّل Migrations المطبقة.

الترتيب المنطقي داخل Migration التنفيذية:

1. إنشاء جدول `profiles` والقيود.
2. إعداد قيم الوقت وتحديث `updated_at`.
3. إنشاء دالة Trigger الآمنة.
4. ربط Trigger بـ`auth.users`.
5. تنفيذ `REVOKE` الصريح على `profiles`.
6. منح `GRANT` الأدنى على `profiles` للأدوار المعتمدة.
7. تفعيل RLS على `profiles`.
8. إنشاء سياسة قراءة الصف الشخصي.
9. حذف سياسات Phase 2-B2b العشر القديمة بالاسم وعلى جداولها المحددة كما ورد في القسم 14.7.
10. سحب `SELECT` عن `anon` من جداول المحتوى العشرة، وضبط منح `authenticated` و`service_role` صراحة وفق عقد C2.
11. إنشاء سياسات قراءة المحتوى الجديدة التي تشترط Profile بحالة `active` ودورًا معتمدًا، مع الإبقاء على شروط `approved` للجداول التفصيلية.
12. اختبار عدم بقاء أي سياسة قراءة قديمة أو `GRANT` عام، واختبار مصفوفة الهويات قبل اعتماد Migration.
13. إضافة Comments توضح الحدود الأمنية عند الحاجة.

ترتيب الخطوات 9 إلى 11 ملزم: **حذف القديم، ثم تعديل الصلاحيات، ثم إنشاء الجديد**. عكس هذا الترتيب أو إضافة السياسات الجديدة دون حذف القديمة يُبقي القراءة السابقة فعالة بسبب جمع سياسات `PERMISSIVE` بمنطق `OR`.

يجب مراجعة SQL الفعلية قبل تطبيقها.

## 21. Rollback

خطة Rollback يجب أن تكون موثقة قبل التنفيذ، وتشمل بالترتيب العكسي:

- إعادة سياسات المحتوى السابقة إذا كان Rollback مقصودًا للبيئة المحلية فقط.
- حذف سياسة Profile.
- حذف Trigger من `auth.users`.
- حذف دالة Trigger.
- حذف جدول `profiles` بعد التأكد من أن البيئة غير إنتاجية أو وجود نسخة احتياطية.

لا يُنفذ Rollback مدمر في بيئة إنتاجية دون قرار منفصل وخطة بيانات.

## 22. الملفات المتوقعة في التنفيذ اللاحق

الأسماء النهائية تُحسم بعد مراجعة المستودع وقت التنفيذ، لكن النطاق المتوقع:

```text
supabase/migrations/<timestamp>_add_profiles_and_authorization_rls.sql
tests/integration/<profiles-and-authorization tests>
scripts/verify-supabase-local.sh
src/services/auth/<profile and authorization types/service>
tests/auth/<authorization tests>
docs/PHASES.md
README_PHASE_2_C2_IMPLEMENTATION.md
APPLY_PHASE_2_C2_IMPLEMENTATION.txt
```

لا تُنشأ UI ضمن هذه الملفات.

## 23. معايير القبول

لا تُغلق Phase 2-C2 إلا عند تحقق جميع الآتي:

1. `profiles` موجود بالعقد المعتمد.
2. الأدوار محصورة في `student/teacher/reviewer`.
3. الحالات محصورة في `pending/active/suspended`.
4. المستخدم الجديد يبدأ `student + pending`.
5. Profile يُنشأ آليًا دون الاعتماد على Metadata أمنية.
6. فشل Trigger يلغي إنشاء المستخدم كاملًا.
7. استعلام المستخدمين اليتامى يعيد صفر صفوف.
8. المستخدم يقرأ صفه فقط.
9. `authenticated` لا يملك INSERT أو UPDATE أو DELETE.
10. اختبارات تعديل الحقول الثلاثة تتحقق من خطأ `42501` ومن ثبات البيانات.
11. `service_role` تملك SELECT وUPDATE صراحة وتنجح اختبارات المسار الموثوق.
12. `service_role` لا تملك INSERT أو DELETE في C2.
13. anon لا يقرأ profiles أو المحتوى السحابي.
14. pending وsuspended لا يقرآن المحتوى السحابي المحمي.
15. active roles تقرأ المحتوى المعتمد فقط.
16. لا يقرأ teacher أو reviewer المسودات في C2.
17. لا توجد RLS recursion.
18. `AuthorizationState` تفصل الجلسة عن التفويض.
19. لا يوجد `service_role` أو Secret في كود العميل.
20. build وlint والاختبارات وPrettier ناجحة.

## 24. قاعدة التغيير

أي تغيير على:

- أسماء الأدوار.
- حالات الحساب.
- القيم الافتراضية.
- صلاحيات `authenticated` أو `service_role`.
- وصول المسودات.
- حدود C2.

يحتاج قرارًا مكتوبًا وتحديثًا مباشرًا لهذه الوثيقة والوثائق المتأثرة في الالتزام نفسه.

---

**Phase 2-C2 Documentation: جاهزة للمراجعة، ولا تسمح ببدء SQL قبل اعتمادها.**
