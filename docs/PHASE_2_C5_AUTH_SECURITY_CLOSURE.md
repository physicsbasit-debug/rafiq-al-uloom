# Phase 2-C5: Auth Integration Tests & Security Closure

## الحالة

أُنجزت الدفعات البرمجية والتشغيلية حتى C5-C1، وأصبحت C5-C2 مرشح التجميد النهائي:

```text
2-C5-0  Security Closure Contract & Gap Audit       ✅
2-C5-A  Auth Lifecycle Integration Hardening        ✅
2-C5-B  Real Supabase Auth Composition Tests        ✅
2-C5-C1 Operational Closure Verification            ✅
2-C5-C2 Final Documentation & Tag                    🔄
```

نقطة الأساس النهائية قبل C5-C2:

```text
commit: f0ddb3b
447/447 basic tests
61/61 Supabase integration tests
508 total tests
npm run verify:auth-closure passed
main synchronized with origin/main
working tree clean
```

لا تصبح Phase 2-C مغلقة رسميًا بمجرد إضافة وثائق C5-C2. يحدث الإغلاق عند نجاح
الأمر الموحد على التزام C5-C2 النهائي، ثم إنشاء الوسم
`v0.4-auth-security-complete` على الالتزام نفسه والتحقق منه محليًا وعن بعد.

## 1. الهدف

إغلاق مسار المصادقة والتفويض قبل إدخال بيانات تشغيلية دائمة مرتبطة بالمستخدم في Phase 2-D.

يجب إثبات أن الطبقات التالية تعمل معًا بعقد واحد بلا فجوة بين الجلسة وProfile وقرار الواجهة وقرار قاعدة البيانات:

```text
Supabase Auth
→ auth.service
→ AuthSessionProvider
→ authorization.service
→ profile.service
→ authorization.policy
→ RequireCapability
→ App.tsx
→ GRANT / REVOKE + RLS
```

Phase 2-C5 لا تضيف أدوارًا أو عمليات محمية جديدة. دورها هو الاختبار التكاملي، وإغلاق حالات السباق والفشل والاستعادة، وتوثيق التشغيل، ثم تجميد مسار Phase 2-C.

## 2. تقسيم Phase 2-C5

تقسم المرحلة إلى أربع دفعات داخلية:

```text
2-C5-0  Security Closure Contract & Gap Audit
2-C5-A  Auth Lifecycle Integration Hardening
2-C5-B  Real Supabase Auth Composition Tests
2-C5-C  Operational Closure & Auth Freeze
```

هذه الدفعات ليست مراحل مستقلة في خارطة المشروع.

### 2.1 Phase 2-C5-0

توثيق:

- مصفوفة أحداث Auth المعتمدة.
- سياسة قراءة Profile وإعادة مزامنتها.
- فرضيات الفجوات التي تحتاج اختبارًا فاشلًا أولًا.
- سياسة الاستعادة وتسجيل الخروج وتبديل المستخدم.
- حدود C5 وما يؤجل إلى المراحل التالية.
- معايير التجميد النهائي.

لا تحتوي C5-0 كود إنتاجي أو اختبارات جديدة أو SQL.

### 2.2 Phase 2-C5-A

اختبارات تكامل دورة الحياة داخل Vitest وReact Testing Library باستخدام خدمات قابلة للتحكم، ثم أقل تعديل إنتاجي لازم فقط إذا أثبت اختبار فاشل وجود فجوة حقيقية.

### 2.3 Phase 2-C5-B

اختبارات تركيب حقيقية على Supabase المحلية تربط Auth وProfile وAuthorization باستخدام عملاء حقيقيين، من دون واجهة React ومن دون تجاوز عقود الخدمات الإنتاجية.

### 2.4 Phase 2-C5-C

توثيق التشغيل، وفحص الأسرار، وأمر تحقق موحد، وتحديث المعمارية والخارطة، ثم إنشاء نقطة تجميد لمسار Auth بعد نجاح جميع المعايير.

## 3. نقطة الأساس الملزمة

عند بدء C5:

- `AuthState` له الحالات الفعلية فقط:

```text
loading
guest
authenticated
error
```

- `AuthorizationState` له الحالات:

```text
loading_profile
authorized
pending
suspended
profile_error
```

- مصدر الدور وحالة الحساب هو `public.profiles` فقط.
- لا تؤخذ صلاحيات من `user_metadata` أو `app_metadata`.
- `authorization.policy.ts` مصدر قرار العمليات في الواجهة.
- `GRANT / REVOKE` وRLS خط الدفاع الأمني الفعلي.
- الزائر يبقى في التجربة المحلية خارج محرك العمليات.
- Phase 2-C4 أثبتت أن تجاوز React وPostgREST لا يمنح كتابة أو قراءة غير مصرح بها.
- C5 لا تعيد اختبار C2 وC4 بنسخ مكررة، بل تختبر تركيب الطبقات ودورة حياتها.

## 4. مصفوفة أحداث Auth المعتمدة

تحافظ C5 على عقد Phase 2-C2-B ولا تعكسه.

| الحدث | تحديث AuthState | قراءة Profile تلقائيًا | القرار |
| --- | --- | --- | --- |
| `initial_session` | Guest أو Authenticated | نعم للحساب المصادق | تهيئة أولى |
| `signed_in` | Authenticated | نعم عند مستخدم جديد أو Profile غير محملة أو خطأ سابق | مزامنة دخول |
| `signed_out` | Guest | لا | إلغاء الطلب ومسح Authorization |
| `token_refreshed` | تحديث Session للمستخدم نفسه | لا | لا يدل على تغير Profile |
| `user_updated` | تحديث بيانات AuthUser | لا | لا يدل على تغير `public.profiles` |
| `password_recovery` | تحديث حالة Auth حسب الجلسة | لا | لا يمنح صلاحية إضافية |
| `mfa_challenge_verified` | تحديث حالة Auth حسب الجلسة | لا | لا يمنح صلاحية إضافية |
| `unknown` | Fail Closed حسب حالة Auth | لا | لا تحميل تلقائي مبني على حدث مجهول |

### 4.1 قرار عدم إعادة القراءة الدورية

لا تعاد قراءة Profile تلقائيًا عند:

```text
token_refreshed
user_updated
password_recovery
mfa_challenge_verified
unknown
```

السبب:

- تجديد التوكن حدث دوري طبيعي، وليس دليلًا على تغير `role` أو `status`.
- `user_updated` يخص مستخدم Supabase Auth، لا صف `public.profiles`.
- إعادة القراءة عند كل تجديد تضيف طلبات دورية بلا قيمة.
- RLS تطبق تغير الدور أو الحالة إداريًا فورًا على قاعدة البيانات، حتى لو كانت الواجهة تحمل Profile قديمة مؤقتًا.
- تحديث الواجهة يتم عبر `refreshAuthorization()` الصريح أو مسار استعادة محدد ومختبر.

### 4.2 التمييز بين Retry وتجديد التوكن

> تمييز مهم: مسار `retrySession()` وفجوة الاستعادة المحتملة يعالجان غياب استدعاء Authorization بعد استعادة جلسة لم يصدر عنها أي حدث Auth بعد، أي فجوة تهيئة أولى. لا علاقة لذلك بقرار عدم إعادة القراءة عند `token_refreshed` أو `user_updated`، لأن هذه أحداث تصدر عن جلسة مهيأة ومتزامنة بالفعل. الأول عيب تهيئة محتمل يستحق إثباتًا واختبارًا وإصلاحًا في العقد عند ثبوته، والثاني تحسين أداء متعمد لا يستدعي أي تغيير.

هذا الفصل ملزم لمنع استخدام حدث دوري كتعويض عن تهيئة ناقصة.

## 5. سياسة قراءة Profile

تقرأ Profile تلقائيًا فقط عند:

```text
initial_session لمستخدم مصادق
signed_in لمستخدم جديد
signed_in عند غياب Profile محملة
signed_in بعد profile_error عند الحاجة
```

وتقرأ صراحة عند:

```text
refreshAuthorization()
مسار retry محدد إذا أثبت الاختبار حاجته
مسار إداري أو تشغيل مستقبلي معتمد بعقد مستقل
```

لا تعتمد C5:

- Polling دوريًا.
- Cache TTL جديدًا.
- Realtime subscription إلى `profiles`.
- إعادة قراءة عند كل حدث Auth.

## 6. فرضية فجوة استعادة الجلسة

الحالة المرشحة للاختبار:

```text
AuthSessionProvider في session_error
→ المستخدم يضغط Retry
→ getCurrentSession يعيد authenticated
→ لا يصدر INITIAL_SESSION أو SIGNED_IN جديد
→ authorization.service لا يعرف المستخدم الحالي
→ refreshAuthorization() قد لا يحمّل Profile
```

هذه فرضية وليست عيبًا مثبتًا.

### 6.1 منهجية الحسم

1. يكتب اختبار تكاملي يفشل أولًا ويعيد السيناريو بلا حدث Auth جديد.
2. إذا نجح السلوك الحالي، تغلق الفرضية بلا تعديل إنتاجي.
3. إذا فشل، يعدل العقد بأقل تغيير جذري يضمن مزامنة المستخدم المصادق.

الحلول الممكنة لا تعتمد قبل الاختبار، وقد تشمل عملية صريحة مثل:

```text
ensureAuthorizationForUser(userId)
```

أو توسيعًا منضبطًا لعقد `refreshAuthorization` كي يستقبل هوية المستخدم المصادق.

الممنوع:

- نسخ منطق Profile إلى `AuthSessionProvider`.
- تعديل Authorization يدويًا داخل `App.tsx`.
- انتظار حدث Supabase غير مضمون.
- إضافة Timeout يخفي التعليق بدل إصلاح سببه.
- إعادة تحميل Profile عند كل `token_refreshed` لتعويض الفجوة.

## 7. سياسة Session Error

تبقى القاعدة:

```text
session_error ≠ guest
```

فشل تحديد الجلسة لا يثبت غيابها.

عند `AuthState.status = error`:

- لا تعرض تجربة الزائر تلقائيًا.
- لا تعرض محتوى محميًا.
- لا تمنح وصولًا سحابيًا.
- تعرض واجهة خطأ عامة بلا رسالة Supabase خام.
- تتيح Retry وSign Out وفق عقد C3.
- يبقى `authorizeOperation` رافضًا بسبب `session_error` إذا وصلته الحالة دفاعيًا.

لا تضيف C5 وضع متابعة محليًا عند تعطل Supabase. هذا قرار منتج مستقل.

## 8. سياسة تسجيل الخروج

### 8.1 النجاح

عند نجاح Sign Out:

```text
AuthState → guest
AuthorizationState → null
Auth entry → closed
confirmationEmail → null
```

مع:

- إلغاء طلب Profile الجاري.
- منع وصول نتيجة Profile متأخرة.
- عدم بقاء دور أو حالة المستخدم السابق.
- الحفاظ على `Step` التعليمية الحالية، لأنها لا تحتوي بيانات شخصية في C5.

### 8.2 الفشل

إذا فشل Sign Out:

- لا يتحول التطبيق إلى Guest كذبًا.
- لا تمسح الحالة المحلية على افتراض نجاح لم يحدث.
- تبقى الواجهة متوافقة مع الجلسة الفعلية المعروفة.
- تعرض رسالة عامة قابلة لإعادة المحاولة.
- لا تسرب رسالة Supabase الداخلية.

أي تعديل إنتاجي في هذا المسار يحتاج اختبارًا فاشلًا يثبت الفجوة أولًا.

## 9. سياسة تبديل المستخدم والطلبات المتأخرة

يجب أن يضمن العقد:

```text
User A authenticated
→ Profile A pending
→ User B becomes current
→ Profile A returns late
→ result A ignored
```

القاعدة:

> آخر مستخدم حالي وآخر طلب صالح فقط يملكان حق تحديث AuthorizationState.

ويجب اختبار:

- طلب Profile ثم Sign Out.
- طلب Profile ثم Unmount.
- طلب Profile A ثم مستخدم B.
- Refresh أثناء طلب جارٍ.
- نتيجة قديمة بعد طلب أحدث.
- حدث Auth أحدث أثناء Retry.

لا يجوز ظهور صلاحيات A مع جلسة B ولو لحظة واحدة.

## 10. سياسة الاشتراكات والتنظيف

يجب الحفاظ على:

- اشتراك Supabase Auth مركزي واحد.
- اشتراك Authorization مركزي واحد.
- عدم إنشاء اشتراكات جديدة لكل مستمع React.
- إزالة الاشتراك عند إزالة آخر مستمع وفق العقد الحالي.
- إلغاء طلب Profile الجاري عند عدم وجود مستمعين.
- منع تحديث React بعد Unmount.

لا تضيف C5 Event Bus جديدًا أو مكتبة State Management.

## 11. سياسة Step التعليمية

في C5 تبقى `Step` محفوظة عبر:

- فتح وإغلاق واجهة Auth.
- Sign In وSign Up.
- Sign Out.
- Pending وSuspended وProfile Error.
- Retry وإعادة تسجيل الدخول.

السبب أن الحالة الحالية تمثل موضعًا تعليميًا محليًا فقط.

يجب توثيق قيد مستقبلي:

> عند إدخال نتائج أو تقدم مرتبط بـ`user_id` في Phase 2-D، تعاد مراجعة سياسة الحفاظ على Step عند Sign Out أو تبديل المستخدم، لمنع انتقال بيانات تشغيلية تخص مستخدمًا إلى مستخدم آخر.

لا تحل C5 هذا القرار قبل وجود البيانات المرتبطة بالمستخدم.

## 12. نطاق Phase 2-C5-A

### 12.1 الهدف

اختبار تكامل خدمات Auth وAuthorization وProvider والواجهة داخل الذاكرة، مع التحكم في ترتيب الأحداث والوعود المتأخرة.

### 12.2 الملفات المرشحة

قد توسع الاختبارات الحالية:

```text
tests/auth/authorization.service.test.ts
tests/features/auth/AuthSessionProvider.test.tsx
tests/features/auth/AppAuthFlow.test.tsx
```

وقد يضاف ملف جامع عند الحاجة:

```text
tests/features/auth/AuthSessionLifecycle.test.tsx
```

لا يعدل ملف إنتاجي إلا بعد اختبار فاشل يثبت الحاجة.

### 12.3 سيناريوهات البدء

- لا جلسة: `loading → guest` بلا Profile request.
- جلسة Active: `loading → authenticated → loading_profile → authorized` بلا وميض Guest.
- جلسة Pending: شاشة انتظار التفعيل.
- جلسة Suspended: شاشة الإيقاف.
- Session Error: لا Guest ولا محتوى محمي.

### 12.4 سيناريوهات الاستعادة

- `session_error → retry → guest`.
- `session_error → retry → authenticated → Authorization` بلا حدث Auth جديد.
- `profile_error → refreshAuthorization → authorized/pending/suspended`.
- نتيجة Retry قديمة لا تستبدل حدث Auth أحدث.
- الضغط المتكرر أثناء Busy لا ينشئ طلبات متوازية غير منضبطة.

### 12.5 أحداث الجلسة

يختبر C5-A أن:

- `signed_out` الخارجي يمسح Authorization ويخفي المحتوى المحمي.
- `token_refreshed` يحدث Session فقط ولا يعيد Profile.
- `user_updated` يحدث AuthUser فقط ولا يقرأ Profile ولا يأخذ الدور من Metadata.
- `password_recovery` و`mfa_challenge_verified` لا يمنحان صلاحية جديدة ولا يعيدان Profile تلقائيًا.
- `unknown` لا يبدأ تحميل Profile جديدًا ولا يمنح وصولًا.

### 12.6 UX الأمنية

- لا محتوى محمي أثناء `loading` أو `session_error` أو `loading_profile`.
- لا محتوى محمي لـPending أوSuspended.
- لا رسائل Supabase خام.
- فشل Sign Out لا ينتج Guest وهميًا.
- رسائل الحالات تستخدم خصائص الوصول المناسبة.
- RTL يبقى محفوظًا.

## 13. نطاق Phase 2-C5-B

### 13.1 الهدف

اختبار التركيب الحقيقي:

```text
Supabase Auth
→ AuthService
→ ProfileService
→ AuthorizationService
→ AuthorizationState
```

على Supabase المحلية، بلا React وبلا Mocks لعميل Supabase.

### 13.2 الملف المتوقع

```text
tests/integration/supabase-auth-lifecycle.integration.ts
```

مع إعادة استخدام:

```text
tests/integration/helpers/supabase-auth-fixtures.ts
```

لا يعدل الـHelper إلا لإضافة وظيفة عامة مثبتة الحاجة.

### 13.3 السيناريوهات الحقيقية

- Active: تسجيل الدخول ثم `authorized`.
- Pending: Auth ينجح وAuthorization تصبح `pending`.
- Suspended: Auth ينجح وAuthorization تصبح `suspended`.
- Sign Out: حدث `signed_out` ثم Guest وAuthorization فارغة.
- Missing Profile: Auth ينجح وAuthorization تصبح `profile_error`، مع استعادة Profile داخل `finally`.
- Status change: RLS تمنع فورًا، ثم `refreshAuthorization()` تحدث الواجهة إلى `suspended`.
- Role change: تعديل إداري موثوق، ثم Refresh يقرأ الدور من Profile لا Metadata.

### 13.4 الحدود

لا تختبر C5-B:

- مرور ساعة فعلية لانتهاء Token.
- عدة تبويبات متصفح حقيقية.
- OAuth.
- MFA Provider فعلي.
- إرسال البريد.
- Rate limiting خارجي.
- Browser localStorage الفعلي.

تؤجل هذه البنود إلى Phase 6 أو اختبار متصفح مستقل عند وجود حاجة.

## 14. نطاق Phase 2-C5-C

### 14.1 أمر التحقق الموحد

يضاف أمر مثل:

```text
npm run verify:auth-closure
```

يشغل بصورة معلنة:

```text
build
lint
basic tests
Prettier check
Supabase db reset
Supabase integration tests
secret and bundle checks
git diff --check
```

لا يبدأ Docker خفية، ولا يخفي متطلبات البيئة.

### 14.2 فحص الأسرار

يمنع وجود:

```text
SUPABASE_SERVICE_ROLE_KEY
VITE_SUPABASE_SERVICE_ROLE_KEY
PostgreSQL password
JWT signing secret
service-role secret value
```

داخل:

```text
src/
public/
dist/
```

يسمح داخل العميل بـ:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

لأن Anon Key مفتاح عميل عام يعتمد أمانه على RLS.

### 14.3 الفحوص البنيوية

يستمر منع:

- التفويض من `user_metadata` أو `app_metadata`.
- استدعاء `supabase.auth.*` خارج خدمة Auth المعتمدة.
- الكتابة إلى `profiles` من الواجهة.
- استدعاء Supabase من حراس React.
- شروط الأدوار المتناثرة خارج Policy.
- إدخال Service Role إلى تطبيق العميل.

### 14.4 وثيقة التشغيل

تغطي `docs/AUTH_OPERATIONS.md` لاحقًا:

- متغيرات البيئة.
- التشغيل المحلي.
- حالات الحساب.
- المسار الإداري الموثوق لتغيير `role/status`.
- Session Error وProfile Error.
- Pending وSuspended.
- فشل Sign Out.
- تعطل Supabase.
- النشر وفحص Bundle.

## 15. ما لا تنفذه C5

- Password reset UI.
- Resend confirmation email.
- MFA enrollment.
- OAuth providers.
- Account deletion.
- Account management UI.
- Admin dashboard.
- Realtime Profile subscription.
- Audit logs التشغيلية.
- مراقبة أخطاء خارجية.
- Cloud persistence.
- `mastery_results`.
- مزامنة الأجهزة.
- Teacher/reviewer workspace.
- صلاحيات كتابة محتوى.
- Bundle code splitting.
- تحديثات اعتماديات عامة غير مرتبطة بفجوة C5.

هذه حدود مؤجلة معلنة، وليست عيوبًا مخفية.

## 16. عدم تكرار أدلة C2 وC4

لا تعيد C5 إنشاء اختبارات مكررة لـ:

- إنشاء Profile الذري.
- منع orphan users.
- منع تعديل `role/status/display_name`.
- GRANT وRLS على المحتوى.
- تجاوز React عبر PostgREST.
- قراءة approved للأدوار النشطة.
- منع draft.
- منع الكتابة.

تبقى اختبارات C2 وC4 ضمن سلسلة القبول وتعمل كأدلة رسمية.

C5 تضيف اختبار دورة الحياة والتركيب والاستعادة فقط.

## 17. نقطة التجميد

بعد اكتمال C5-0/A/B/C ونجاح المعايير، يكون اسم الوسم المقترح:

```text
v0.4-auth-security-complete
```

لا ينشأ الوسم في C5-0 ولا قبل:

- نجاح كل الاختبارات.
- اكتمال وثائق التشغيل والمعمارية.
- تحديث `docs/PHASES.md`.
- Working tree نظيف.
- تطابق `main` مع `origin/main`.

بعد التجميد، لا تعدل عقود Auth أو Profile أو Authorization في Phase 2-D إلا بعقد جديد واختبارات مستقلة مرتبطة بحفظ البيانات الشخصية.

## 18. معايير القبول النهائية

لا تغلق Phase 2-C5 ولا Phase 2-C كاملة إلا عند:

```text
جميع أحداث Auth موثقة ومختبرة
قرار C2-B بعدم القراءة عند token_refreshed محفوظ
retry authenticated لا يعلق بلا Authorization إذا ثبتت الفجوة
signed_out الخارجي يمسح Authorization
تبديل المستخدم لا يقبل Profile قديمة
الطلبات المتأخرة لا تعيد صلاحيات مستخدم سابق
فشل Sign Out لا ينتج Guest وهميًا
لا وميض لمحتوى محمي
لا رسائل Supabase خام
لا دور أو status من Metadata
لا Service Role داخل src أو dist
اختبارات C2 وC4 تبقى ناجحة
اختبارات Supabase Auth composition تنجح
build ناجح
lint ناجح
Prettier ناجح
db reset ناجح
test:supabase ناجح
verify:auth-closure ناجح
وثيقة التشغيل مكتملة
قائمة المؤجلات مكتوبة
Git نظيف ومتزامن
الوسم النهائي يشير إلى commit الإغلاق
```

## 19. سياسة الأرقام

لا يثبت رقم نهائي للاختبارات قبل كتابة الملفات الفعلية.

النطاق التقديري فقط:

```text
15–25 basic tests جديدة
6–10 Supabase integration tests جديدة
```

عدد الاختبارات ليس معيار القبول. تغطية السيناريوهات ومنع الانحدار هما المعيار.

## 20. تسلسل التنفيذ

```text
1. مراجعة واعتماد وثيقة C5-0.
2. تثبيت الوثائق في Git.
3. بناء اختبارات C5-A قبل تعديل الإنتاج.
4. إثبات الفجوات أو إغلاق الفرضيات.
5. تطبيق أقل تعديل إنتاجي لازم إن ثبتت فجوة.
6. مراجعة diff وتشغيل السلسلة الأساسية.
7. بناء C5-B فوق Supabase المحلية.
8. db reset وتشغيل اختبارات التركيب الحقيقي.
9. بناء C5-C للتشغيل والتوثيق.
10. تشغيل verify:auth-closure كاملًا.
11. تحديث المعمارية والخارطة.
12. تثبيت Git والتحقق من النظافة والتزامن.
13. إنشاء v0.4-auth-security-complete.
14. إغلاق Phase 2-C.
15. بدء تخطيط Phase 2-D.
```

## 21. قاعدة التغيير

أي تغيير لاحق في:

- مصفوفة أحداث Auth.
- سياسة قراءة Profile.
- معنى Retry أو Refresh.
- سياسة Sign Out.
- حدود C5.

يحتاج قرارًا مكتوبًا وتحديثًا مباشرًا لهذه الوثيقة في الالتزام نفسه.

لا تعتمد قرارات المصادقة على رسائل محادثة أو ذاكرة تنفيذية غير موثقة.

## 22. سجل القبول التشغيلي النهائي لـC5-C1

نجح الأمر الموحد على الالتزام `f0ddb3b` بالأدلة التالية:

```text
39 basic test files passed
447 basic tests passed
5 Supabase integration test files passed
61 Supabase integration tests passed
508 total tests passed
Build passed
Lint passed
Prettier passed
Auth client boundary scan passed
Supabase database reset passed
Supabase API readiness passed
Git diff check passed
Auth closure verification passed
```

تحذير Vite الخاص بحجم Chunk ليس فشلًا أمنيًا أو وظيفيًا، ويؤجل إلى تحسين أداء
مستقل. كما لا تُحدّث Supabase CLI داخل التجميد لمجرد ظهور إصدار أحدث.

## 23. عقد C5-C2 والوسم النهائي

اسم الوسم:

```text
v0.4-auth-security-complete
```

يجب أن يشير الوسم إلى التزام C5-C2 النهائي الذي يحقق جميع الشروط:

```text
npm run verify:auth-closure passed
git status --short is empty
HEAD equals origin/main
git rev-list -n 1 v0.4-auth-security-complete equals HEAD
origin tag resolves to the same commit
```

لا ينشئ سكربت التحقق الوسم تلقائيًا، ولا يُحرك وسم منشور بصمت إذا أُنشئ على
التزام خاطئ. بعد تحقق الوسم تصبح Phase 2-C وPhase 2-C5 مغلقتين رسميًا، وتبدأ
مرحلة التخطيط لـPhase 2-D الخاصة بالحفظ السحابي و`mastery_results`.
