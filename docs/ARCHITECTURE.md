# رفيق العلوم — المعمارية

## القرارات المعمارية

| القرار             | الاعتماد                              |
| ------------------ | ------------------------------------- |
| Frontend           | React + Vite + TypeScript strict      |
| Styling            | Tailwind v4 عبر @tailwindcss/vite     |
| المحتوى في Phase 1 | Local TypeScript Seed                 |
| قاعدة البيانات     | Supabase مؤجل إلى Phase 2             |
| لوحة المعلم        | مؤجلة إلى Phase 3                     |
| AI                 | مؤجل إلى Phase 4                      |
| الاختبارات         | Vitest + React Testing Library لاحقًا |

## القاعدة الحمراء

- لا استيراد متبادل بين `features/student` و`features/teacher`.
- لا استيراد من `services/ai` قبل Phase 4.
- لا Supabase أو Auth قبل Phase 2.
- لا منطق Quiz أو Game أو Mastery في Phase 0-B.

## حدود حجم الملفات

| النوع       | الحد                           |
| ----------- | ------------------------------ |
| مكوّن واجهة | لا يتجاوز 250 سطرًا            |
| ملف منطق    | لا يتجاوز 300 سطر              |
| ملف Seed    | يمكن أن يكون أطول بشرط التنظيم |
| أي تجاوز    | يحتاج مبررًا مكتوبًا           |

## بنية المشروع

- `docs/`
- `src/app/`
- `src/content/seed/`
- `src/features/student/`
- `src/features/lesson/`
- `src/features/quiz/`
- `src/features/games/`
- `src/features/experiments/`
- `src/features/mastery/`
- `src/features/teacher/`
- `src/services/data/`
- `src/services/ai/`
- `src/design-system/`
- `src/types/`
- `src/utils/`
- `tests/`
