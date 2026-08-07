# رفيق العلوم — المعمارية

## الحالة المعمارية عند v0.5 المجمد

رفيق العلوم تطبيق React + Vite + TypeScript strict. طبقة الطالب الحالية تعمل خلف عقد بيانات غير متزامن واحد، ويمكن تشغيلها بمزوّد محلي أو Supabase دون تغيير واجهات الطالب.

منظومة Auth والصلاحيات مجمّدة بالوسم `v0.4-auth-security-complete`. وحفظ نتائج الإتقان السحابي مجمّد عند:

```text
v0.5-mastery-results-cloud-complete
→ c99ecf69a5225a03108798476dc69e75987d7595
```

وقد اجتاز أمر الإغلاق الموحد 508 اختبارًا أساسيًا و89 اختبار تكامل Supabase، أي 597 اختبارًا فريدًا، مع Composition 2/2 وParity 10/10. المرحلة التالية هي Phase 3، وتبدأ بعقد Teacher Dashboard قبل أي كتابة محتوى جديدة.

## القرارات المعمارية المعتمدة

| القرار            | الاعتماد الحالي                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------ |
| Frontend          | React + Vite + TypeScript strict                                                           |
| Styling           | Tailwind v4 + design-system داخلي                                                          |
| التنقل الحالي     | آلة حالات بسيطة داخل `App.tsx` باستخدام `useState` و`Step` discriminated union             |
| React Router      | غير مستخدم في النسخة الحالية، ولا يُضاف قبل وجود حاجة فعلية للروابط العميقة أو سجل المتصفح |
| عقد البيانات      | `ContentRepository` غير متزامن                                                             |
| المزوّد المحلي    | `asyncLocalContentRepository`                                                              |
| المزوّد السحابي   | `createSupabaseContentRepository(client?)` + كائن جاهز كسول                                |
| اختيار المزوّد    | `getContentRepository()` مركزي وكسول                                                       |
| الافتراضي         | `VITE_CONTENT_PROVIDER` غائب أو `local` ⇒ المزوّد المحلي                                   |
| Supabase          | Schema + RLS + Seed + عميل + Repository + تكافؤ محلي مكتملة                                |
| Auth والصلاحيات   | مكتملة ومجمّدة بالوسم `v0.4-auth-security-complete`                                        |
| Cloud Persistence | نتائج الإتقان السحابية مكتملة عبر Service + Repository + RPC + RLS + idempotency + parity  |
| لوحة المعلم       | Phase 3                                                                                    |
| AI                | Phase 4                                                                                    |
| الاختبارات        | Vitest + React Testing Library + اختبار تكامل Supabase منفصل                               |

## مسار البيانات

```text
Features / Query Hooks
        ↓
getContentRepository()
        ↓
ContentRepository
   ├── asyncLocalContentRepository
   └── SupabaseContentRepository
        ↓
Runtime Mappers
        ↓
Supabase Data API / PostgreSQL
```

### قواعد اختيار المزوّد

- القراءة من `VITE_CONTENT_PROVIDER` كسولة عند أول استخدام فعلي.
- مجرد استيراد ملف المصنع لا يهيئ Supabase ولا يتحقق من متغيراته.
- القيم المقبولة فقط: `local` و`supabase`.
- أي قيمة أخرى تفشل برسالة واضحة، بلا fallback صامت.
- لا تستورد `features` أو `src/services/queries` المزوّد المحلي مباشرة؛ الاستهلاك يمر عبر المصنع المركزي.

## Supabase

### المخطط والمحتوى

المخطط الحالي يتكون من عشرة جداول محتوى مترابطة:

- `grades`
- `semesters`
- `subjects`
- `units`
- `lessons`
- `objectives`
- `questions`
- `games`
- `game_objectives`
- `experiments`

### الأمن

- RLS مفعّلة على الجداول العشرة.
- `anon` و`authenticated` يملكان `SELECT` فقط وفق سياسات الصفوف.
- `service_role` يملك `SELECT` فقط على الجداول العشرة لأغراض اختبار التكافؤ المحلي، مع إلغاء الصلاحيات الزائدة الافتراضية.
- المحتوى الحالي كله `draft`، لذلك يظهر للعميل العام الفهرس العام فقط، بينما يُحجب المحتوى التفصيلي.
- مفاتيح `service_role` وSecret لا تدخل كود التطبيق الأمامي.

### البيانات والبذور

- مصدر الحقيقة للمحتوى الحالي هو `src/content/seed/`.
- `scripts/generate-supabase-seed.ts` يولد `supabase/seed.sql` حتميًا.
- `npx supabase db reset` هو مسار إعادة البناء المعتمد.
- `scripts/verify-supabase-local.sh` يتحقق من GRANT + RLS + Data API + أعداد البيانات.

## المصادقة والتفويض

المسار التشغيلي المعتمد:

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

### الحدود والمسؤوليات

- Supabase Auth يثبت الهوية والجلسة فقط، ولا يقرر الدور التطبيقي.
- `public.profiles` هو مصدر `role` و`status`.
- `authorization.service` يقرأ Profile ويحوّلها إلى `AuthorizationState`.
- `authorization.policy.ts` هو مصدر قرار العمليات المحمية في الواجهة.
- `RequireCapability` طبقة UX دفاعية، وليس حاجز الأمان النهائي.
- GRANT وRLS هما الحماية الفعلية عند تجاوز React وPostgREST مباشرة.
- وضع الزائر المحلي يبقى خارج محرك الصلاحيات.
- `retrySession()` يستعيد الجلسة ثم يستدعي `ensureAuthorizationForUser(userId)` صراحةً.
- `token_refreshed` و`user_updated` وبقية أحداث الجلسة المهيأة لا تعيد قراءة Profile تلقائيًا.
- تحديث الواجهة بعد تغيير إداري يتم عبر `refreshAuthorization()`، بينما RLS تطبق التغيير فورًا.
- استدعاءات Supabase Auth المباشرة محصورة في `src/services/auth/auth.service.ts`.
- لا يدخل Service Role أو Database Password أو JWT signing secret إلى تطبيق العميل.

### الأدلة الحالية

```text
447 basic tests
61 Supabase integration tests
508 total tests
npm run verify:auth-closure passed at f0ddb3b
```

اختبارات C4-B تثبت تجاوز الواجهة، واختبارات C5-B تثبت تركيب Auth وProfile وAuthorization الحقيقي، بما في ذلك انتقال `active → suspended` أثناء التشغيل.

## حفظ نتائج الإتقان السحابي

المسار المعماري المعتمد:

```text
MasteryTestView
→ useMasteryResultPersistence
→ MasteryResultsService
→ SupabaseMasteryResultsRepository
→ submit_mastery_attempt RPC
→ PostgreSQL
   ├── mastery_attempts
   └── mastery_attempt_answers
```

### عقد السلوك

- النتيجة المحلية تظهر فورًا ولا تنتظر الشبكة.
- حالات الحفظ الرسمية: `idle` و`saving` و`saved` و`failed` و`not_applicable`.
- الزائر أو المزوّد المحلي لا يرسلان نتيجة سحابية ويستخدمان `not_applicable`.
- التفويض يمر عبر العملية `submit_own_mastery_result` قبل الحفظ.
- `submissionId` يُجمّد عند أول إنهاء ويُعاد استخدامه في retry المسموح.
- RPC هي صاحبة النتيجة الرسمية المخزنة؛ العميل يصالح العرض معها دون تغيير الحمولة المجمدة.
- `already_saved` يعيد المحاولة الرسمية نفسها دون إنشاء سجل مكرر.
- ترتيب الأسئلة والبصمة يخضعان لترتيب PostgreSQL نفسه.
- مطابقة النسبة تستخدم عتبة `1e-9` فقط بعد تطابق `questionCount` و`correctCount` تطابقًا تامًا، لعزل فروق IEEE-754 غير الدلالية.

### حدود الوصول

- اسم RPC `submit_mastery_attempt` مملوك فقط لـ`src/services/mastery-results/supabase-mastery-results.repository.ts`.
- لا `.rpc()` مباشر داخل مكونات React.
- لا كتابة مباشرة من العميل إلى `mastery_attempts` أو `mastery_attempt_answers`.
- RLS وRPC وقواعد التفويض تبقى الحماية الفعلية، ولا يعتمد الأمان على حالة زر أو شاشة.
- `scripts/check-mastery-results-client-boundaries.mjs` يثبت هذه الحدود ويمنع النجاح الكاذب إذا اختفى استدعاء RPC المعتمد كليًا.

### أدلة الإغلاق الحالية

```text
508/508 basic tests
89/89 Supabase integration tests
Composition 2/2
Parity 10/10
597 unique tests
npm run verify:mastery-results-closure → PASS at c99ecf69a5225a03108798476dc69e75987d7595
```

Composition وParity جزء من اختبارات Supabase الـ89، ويعاد تشغيلهما صراحةً كبوابتي إغلاق إلزاميتين؛ لذلك لا يضافان مرة ثانية إلى العدد الفريد 597.

## Phase 3: Teacher Dashboard — الحدود المعمارية المقترحة

Phase 3 لا تحول جداول المحتوى المنشور إلى مساحة تحرير. العقد المقترح في 3-0 يفصل بين:

```text
Canonical Published Content
→ الجداول الحالية التي يقرأها ContentRepository والطالب

Authoring Plane
→ Revisions مملوكة للمعلم + سجل مراجعة + انتقالات موثوقة
```

المسار المقترح:

```text
Teacher Workspace
→ AuthoringService
→ AuthoringRepository
→ revision storage / submit transition

Reviewer Workspace
→ ReviewService
→ ReviewRepository
→ approve/reject transition

approved revision
→ trusted atomic publish transaction
→ canonical content tables
→ existing ContentRepository
→ Student Experience
```

القواعد قبل أي تنفيذ:

- الأدوار تبقى `student | teacher | reviewer`.
- teacher يؤلف ولا يعتمد.
- reviewer يراجع ويعتمد ولا يعدل Payload المؤلف.
- `author_content` و`review_content` الموجودتان أصلًا تبقيان `operation_not_available` حتى وجود حماية backend واختبارات تجاوز مباشرة.
- لا `INSERT/UPDATE/DELETE` مباشر من teacher/reviewer على canonical content tables.
- أي تعديل على محتوى منشور يتم عبر Revision جديدة، ولا يستبدل النسخة المنشورة حتى الاعتماد.
- هوية المؤلف والمراجع تُشتق خادميًا من `auth.uid()` و`profiles`، لا من حقول موثوقة يرسلها العميل.
- Phase 4 AI قد تنتج Draft مستقبلًا فقط؛ لا تملك مسار نشر مباشر.

التفاصيل الملزمة في `docs/PHASE_3_0_TEACHER_DASHBOARD_CONTRACT.md`.

## Mappers وحدود البيانات

- صفوف قاعدة البيانات معرفة بأنواع `snake_case` مستقلة.
- التحويل إلى أنواع المجال يتم عبر runtime mappers نقية.
- لا cast أعمى لـ`games.items` أو أي `jsonb` مركب.
- `Lesson.objectiveIds` و`Game.objectiveIds` حقول مشتقة، لا أعمدة مخزنة مباشرة.
- الاستعلامات التابعة تُنفذ دفعيًا وتُجمع في الذاكرة؛ لا N+1 للدروس أو الألعاب.
- ترتيب `objectiveIds` يحافظ على ترتيب الطلب أو `game_objectives.position` حسب السياق.

## AbortSignal ومعالجة الأخطاء

- كل استعلام شبكي يقبل `AbortSignal` اختياريًا ويمرره إلى Supabase.
- `AbortError` يُعاد رميه كما هو ولا يتحول إلى خطأ محتوى عام.
- الأخطاء الأخرى تُغلف باسم العملية وتحفظ الخطأ الأصلي في `cause`.
- لا تُستبدل الأخطاء بمصفوفات فارغة صامتة.

## الاختبارات

### الاختبارات الافتراضية

```bash
npm run test
```

تبقى مستقلة عن Docker والشبكة.

### اختبارات Supabase التكاملية

```bash
npx supabase db reset
npm run test:supabase
```

تعمل بإعداد Vitest منفصل وتشمل اختبارات المحتوى وAuth والصلاحيات وحفظ نتائج الإتقان والتركيب الحقيقي والتكافؤ الحسابي.

### بوابة إغلاق نتائج الإتقان

```bash
npm run verify:mastery-results-closure
```

تشغّل Build وLint و508 اختبارات أساسية وPrettier وفاحصي الحدود و`db reset` و89 اختبار Supabase، ثم تعيد Composition 2/2 وParity 10/10 صراحةً، وتتحقق أخيرًا من `git diff --check` ونظافة Git وتطابق `HEAD` مع `origin/main`.

## القاعدة الحمراء

- لا استيراد متبادل بين `features/student` و`features/teacher`.
- لا استيراد من `services/ai` قبل Phase 4.
- لا كتابة محتوى تعليمي جديدة قبل اعتماد عقد Phase 3-0 وتنفيذ 3-1؛ حفظ نتائج الطالب في Phase 2-D مسار مستقل ومجمد.
- لا وصول مباشر إلى Content Repository من `features` أو queries خارج المصنع والعقد المعتمدين.
- لا استدعاء مباشر لـ`submit_mastery_attempt` خارج Mastery Results Repository المعتمدة.
- لا تعديل migration مطبقة؛ أي تصحيح لاحق يُضاف كـmigration جديدة.

## حدود حجم الملفات

| النوع                 | الحد الإرشادي                                   |
| --------------------- | ----------------------------------------------- |
| مكوّن واجهة           | 250 سطرًا                                       |
| ملف منطق              | 300 سطر                                         |
| ملف Seed أو Migration | قد يكون أطول بشرط التنظيم                       |
| أي تجاوز              | يحتاج مبررًا مكتوبًا وخطة تقسيم إذا استمر النمو |

`supabase-content.repository.ts` استثناء توثيقي حالي لأنه يطبق عقدًا من ثلاث عشرة دالة ويجمع منطق الاستعلامات المشتركة. لا يُستخدم هذا الاستثناء لتوسيع الملف بوظائف الكتابة أو Auth؛ أي نمو من هذا النوع يُفصل إلى وحدات مستقلة.

## بنية المشروع الأساسية

- `docs/`
- `src/content/seed/`
- `src/features/student/`
- `src/features/lesson/`
- `src/features/quiz/`
- `src/features/games/`
- `src/features/experiments/`
- `src/features/mastery/`
- `src/features/teacher/`
- `src/services/data/`
- `src/services/queries/`
- `src/services/ai/`
- `src/design-system/`
- `src/types/`
- `src/utils/`
- `scripts/`
- `supabase/`
- `tests/`
