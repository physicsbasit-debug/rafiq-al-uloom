# Phase 2-A3g — ReviewQuestionsView Query Migration

هذه حزمة overlay تحتوي فقط على الملفين المتغيرين:

- `src/features/student/review-questions/ReviewQuestionsView.tsx`
- `tests/features/ReviewQuestionsView.test.tsx`

طبّق محتويات الحزمة فوق جذر المستودع، ثم شغّل:

```bash
npm run build
npm run lint
npm run test
npx prettier --check .
git status
grep -n "local-content.repository" src/features/student/review-questions/ReviewQuestionsView.tsx
```

رسالة commit المقترحة:

```text
feat: migrate review questions view to query hook
```
