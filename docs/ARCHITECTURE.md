# رفيق العلوم — المعمارية

## الحالة المعمارية عند نقطة التجميد

رفيق العلوم تطبيق React + Vite + TypeScript strict. طبقة الطالب الحالية تعمل خلف عقد بيانات غير متزامن واحد، ويمكن تشغيلها بمزوّد محلي أو Supabase دون تغيير واجهات الطالب.

## القرارات المعمارية المعتمدة

| القرار | الاعتماد الحالي |
| --- | --- |
| Frontend | React + Vite + TypeScript strict |
| Styling | Tailwind v4 + design-system داخلي |
| التنقل الحالي | آلة حالات بسيطة داخل `App.tsx` باستخدام `useState` و`Step` discriminated union |
| React Router | غير مستخدم في النسخة الحالية، ولا يُضاف قبل وجود حاجة فعلية للروابط العميقة أو سجل المتصفح |
| عقد البيانات | `ContentRepository` غير متزامن |
| المزوّد المحلي | `asyncLocalContentRepository` |
| المزوّد السحابي | `createSupabaseContentRepository(client?)` + كائن جاهز كسول |
| اختيار المزوّد | `getContentRepository()` مركزي وكسول |
| الافتراضي | `VITE_CONTENT_PROVIDER` غائب أو `local` ⇒ المزوّد المحلي |
| Supabase | Schema + RLS + Seed + عميل + Repository + تكافؤ محلي مكتملة |
| Auth والصلاحيات | Phase 2-C، غير منفذة بعد |
| Cloud Persistence | Phase 2-D، وتشمل `mastery_results` في الحد الأدنى |
| لوحة المعلم | Phase 3 |
| AI | Phase 4 |
| الاختبارات | Vitest + React Testing Library + اختبار تكامل Supabase منفصل |

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

تعمل بإعداد Vitest منفصل، وتقارن دوال `ContentRepository` الثلاث عشرة مقارنة عميقة بين المزوّد المحلي وSupabase.

## القاعدة الحمراء

- لا استيراد متبادل بين `features/student` و`features/teacher`.
- لا استيراد من `services/ai` قبل Phase 4.
- لا Auth أو منطق صلاحيات واجهات قبل Phase 2-C.
- لا كتابة محتوى إلى Supabase قبل تصميم مسار التأليف والمراجعة.
- لا وصول مباشر إلى Repository من `features` أو queries خارج المصنع والعقد المعتمدين.
- لا تعديل migration مطبقة؛ أي تصحيح لاحق يُضاف كـmigration جديدة.

## حدود حجم الملفات

| النوع | الحد الإرشادي |
| --- | --- |
| مكوّن واجهة | 250 سطرًا |
| ملف منطق | 300 سطر |
| ملف Seed أو Migration | قد يكون أطول بشرط التنظيم |
| أي تجاوز | يحتاج مبررًا مكتوبًا وخطة تقسيم إذا استمر النمو |

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
