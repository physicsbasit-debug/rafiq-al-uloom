# رفيق العلوم — نموذج البيانات

## الأنواع المشتركة

- ContentStatus: draft | pending_review | approved
- ContentSource: ai_generated | teacher_authored | curriculum_seed
- SafetyLevel: safe_home | teacher_supervised | lab_only | not_allowed

## الكيانات

### Grade

- id
- name
- order

### Subject

- id
- gradeId
- name
- themeColor

### Unit

- id
- subjectId
- title
- order

### Objective

- id
- lessonId
- text

### Lesson

- id
- unitId
- title
- order
- objectiveIds
- summary
- keyConcepts
- examples
- misconceptions
- status
- source

### Question

- id
- lessonId
- type
- prompt
- choices
- correctAnswerIndex
- explanation
- objectiveId
- difficulty
- status
- source

### Game

- id
- lessonId
- type
- title
- instructions
- items
- objectiveIds
- status
- source

### Experiment

- id
- lessonId
- title
- objective
- tools
- steps
- safetyNotes
- safetyLevel
- observationPrompt
- conclusionPrompt
- homeAlternative
- status
- source

### MasteryResult

- id
- studentId
- lessonId
- score
- classification
- recommendation
- createdAt

## عتبات الإتقان

| الدرجة           | التصنيف         |
| ---------------- | --------------- |
| 80 فأعلى         | متقن            |
| 60 إلى أقل من 80 | قريب من الإتقان |
| أقل من 60        | يحتاج مراجعة    |
