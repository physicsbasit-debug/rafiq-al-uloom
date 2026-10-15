# Unified Golden Index — Lesson 1-3

## Concrete source-of-truth files in this Step-0 package

- `00_PRIORITY_AND_GOVERNANCE.md`
- `01_EXPLANATION_L13_FINAL.md`
- `02_REVIEW_L13_FINAL.md`
- `03_ACTIVITIES_B_L13_FINAL.md`
- `04_GAME_C_L13_RACE_CONTRACT.md`
- `05_MASTERY_E_L13_FINAL.md`
- `06_VIRTUAL_LAB_D_REGISTER.md`

These are actual merged files for review. They replace the former placeholder labels such as `REVIEW-L13-FINAL` as implementation references once approved.

## Priority

The correction/latest-value rule is defined in `00_PRIORITY_AND_GOVERNANCE.md`. No older draft may override a newer explicit correction contained in these files.

## Cumulative context reservation

### Explanation

- sprint/marathon.
- independent analog/digital displays.
- manual-response timing scene.
- countdown/anticipated pendulum timing.
- Stage-5 pendulum 1.23 s.
- Stage-6 different, longer-string pendulum 1.36 s.

### Review

- `start-end-event-timeline`.
- `official-tv-25-frames-per-second`.
- `three-trial-short-time-log`.
- `pendulum-left-to-right-student-error`.
- `official-pendulum-period-trials`.

### Activities

- real pendulum.
- body clock/pulse.
- prepared rest/light-activity pulse data.

### Game

- «سباق أجزاء الثانية»: سيارتان رياضيتان مبسطتان، مؤقتان رقميان، وتحديد الزمن الأقل ثم حساب الفرق بين الزمنين.
- الأسماء نصية للتمثيل فقط، والأزمنة افتراضية وغير حقيقية.
- الوظيفة المستقلة للعبة هي حساب الفرق بين زمنين رقميين. حساب المدى في نشاط 2-1 يستخدم طرحًا مشابهًا في سياق مختلف، ومسجل بوصفه `concept-reuse-with-new-action`.
- زمن الاستجابة البشرية والعد التنازلي لا يدخلان اللعبة.

### Mastery

- water fill to mark.
- toy-car digital-timer claim.
- ball-drop five-trial notebook.
- horizontal spring cart.
- flexible vertical platform.

### Virtual Lab

- independent virtual time station and final assessment.

Cross-path context reuse is forbidden unless explicitly registered.

## Functional reservation matrix

| Function                                       | Paths                                                             | Allowed overlap                                                                                    |
| ---------------------------------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| analog/digital timing use                      | Explanation 2, Activities, MQ1                                    | source use + mastery transfer                                                                      |
| human start/stop response effect               | Explanation 3, Explanation 4, Explanation 6, Activities, RQ5, MQ2 | registered source/transfer overlap                                                                 |
| anticipated event timing                       | Explanation 4                                                     | no unregistered reuse                                                                              |
| identify time interval boundaries              | RQ1, MQ1                                                          | review + mastery transfer                                                                          |
| calculate difference between two digital times | Activities 2-1, Game                                              | concept-reuse-with-new-action; standalone game task; excluded from MQ1–MQ5 and mastery diagnostics |
| one event from many cycles                     | Explanation 5, Activities, RQ5, MQ4                               | source overlap + mastery transfer                                                                  |
| meaning/count of complete cycle                | Explanation 5, RQ4, Activities, MQ5                               | source overlap + mastery transfer                                                                  |
| compare one vs many event timing-error effect  | Explanation 6, Activities, RQ5                                    | registered source overlap                                                                          |
| arithmetic mean of repeated short times        | RQ3, Activities, MQ3                                              | source overlap + mastery transfer                                                                  |
| calculate periodic time                        | Explanation 5, Activities, RQ5, MQ4                               | source overlap + mastery transfer                                                                  |
| pendulum lab errors                            | RQ5                                                               | reserved                                                                                           |
| pendulum controlled variables                  | Activities                                                        | reserved                                                                                           |
| body-clock inquiry                             | Activities                                                        | reserved                                                                                           |
| displayed decimals vs measurement accuracy     | Explanation 3, Game report note, MQ2                              | concept overlap; transfer in a new context; no shared race visuals                                 |

Unlisted cross-path cognitive reuse is forbidden.

## Core route

`Explanation → Review → Activities → Game → Mastery`

الدخول مباشر، والترتيب إرشاد بصري فقط ولا يمثل قفلًا بين المسارات.

D is registered but non-blocking until separately reviewed.

## Visual acceptance gates — all pending preview

- Stage 1: exactly 2 male sprint runners; multiple male marathon runners; no stick figures; correct motion/time direction.
- Stage 2: analog geometry visually reads 2:14; digital example independent.
- Stage 6: visibly longer string than Stage 5.
- RQ1: start left, end right, arrow →, RTL labels.
- Game: five visual acceptance states are required before commit/push: before race, during race, after stop, after first error, after second error.
- MQ1: process strip right-to-left; no correctness colors during attempt; touch/reorder alternatives work.
- MQ3: notebook looks like evidence in an assessment item, not an active lab station.
- MQ5: velocity arrow is visible and visually distinct from timeline arrow.
- All: Arabic units; correct numbers; human figures male.

## Step-zero acceptance rule

No code until these merged execution files are reviewed and approved.

## Direct-access amendment — 2026-100

By explicit user request, Review, Activities, Game, and Mastery are directly accessible for Lesson 1-3.

The route:

`Explanation → Review → Activities → Game → Mastery`

remains the recommended visual learning order and guidance only. It is not an unlock chain.

Opening a path does not by itself mark that path complete.

Virtual Lab D remains unavailable pending its separate scientific review and does not gate the other paths.

## Lesson 1-3 game contract retirement note

- `04_GAME_C_L13_FINAL.md` is retired by explicit user decision if the archived file is present.
- The active contract is `04_GAME_C_L13_RACE_CONTRACT.md`.
- Removed Time Window reservations must not be reintroduced by implementation.
- `physicsTeacherReviewed=false` remains the default until the user's final physics review.

## Game visual identity registry

### Race game — proposed tokens

- Primary: `#243B7A`
- Secondary: `#5B3A8A`
- Main text: `#172033`
- Muted text: `#586174`
- Background: `#F7F8FC`
- Cards: `#FFFFFF`
- Motion accent: `#E56B4E`
- Small error text only: `#C0392B`

### Identity verification gate

Before the race UI is built, read the actual color tokens used by the Lesson 1-1 and Lesson 1-2 games from current code and record them here beside the race tokens. Do not write «تم التحقق» until that comparison is completed. If either game uses a nearby purple identity, change the race Secondary before UI implementation.

<!-- RACE_COLOR_AUDIT_START -->

### Verified Lesson 1-1 / 1-2 color comparison

This audit reads actual CSS rules whose selectors belong to each game, plus direct inline SVG hex colors from the game component.

- Lesson 1-1 style sources: `src/features/student/student-experience.css`
- Lesson 1-1 palette: `#004D40`, `#00695C`, `#043E36`, `#045245`, `#063F38`, `#075D50`, `#075E50`, `#086347`, `#086B5B`, `#087162`, `#087260`, `#096548`, `#0A6B4B`, `#0B6658`, `#0B684B`, `#0B7652`, `#0C7B68`, `#0E8B75`, `#123D36`, `#13704E`, `#143F37`, `#153C36`, `#158662`, `#173E37`, `#173F39`, `#179469`, `#203F39`, `#22976A`, `#23463F`, `#243F3A`, `#264942`, `#26966B`, `#274A43`, `#2A9A70`, `#2E7D32`, `#334F49`, `#355A53`, `#3C2F00`, `#50706A`, `#55716B`, `#5B6C68`, `#5E6F6B`, `#667873`, `#6C7B77`, `#6D4F00`, `#6D7D79`, `#72817D`, `#73837F`, `#75570A`, `#795B0B`, `#7E5E00`, `#883B34`, `#8B6500`, `#91D4BC`, `#9A5B00`, `#9B2F29`, `#A53330`, `#A7DFC7`, `#A8DEC8`, `#B0473F`, `#B3261E`, `#B9DDD3`, `#C94139`, `#C9D8D4`, `#CBE5DF`, `#CFDAD7`, `#D04A4A`, `#D07A78`, `#D4E0DD`, `#D7E5E1`, `#D8E6E2`, `#D8E8E3`, `#D9E3E1`, `#DCE7E4`, `#DFF3E9`, `#DFF4E9`, `#E2F5EB`, `#E4DCC5`, `#E8DFC8`, `#E8F7F0`, `#E8F7F2`, `#EAF4F3`, `#EAF8F1`, `#EBF8F2`, `#EDF1F0`, `#EDF7F4`, `#EDF8EE`, `#EDF9F3`, `#EEF3F2`, `#EEF5F3`, `#EEF7F6`, `#EEF8F5`, `#EEFAF5`, `#EF8B8B`, `#EFD98B`, `#F0B7B3`, `#F0FAF5`, `#F0FAF7`, `#F2FAF6`, `#F3FBF7`, `#F3FBF8`, `#F4FAF8`, `#F5C84B`, `#F5FBF9`, `#F6FAF8`, `#F6FAF9`, `#F7FBFA`, `#F8FBFA`, `#F9FCFB`, `#FFF0B8`, `#FFF0D7`, `#FFF1EF`, `#FFF2BF`, `#FFF3F2`, `#FFF4F2`, `#FFF4F4`, `#FFF5DD`, `#FFF6F5`, `#FFF8E8`, `#FFF9E8`, `#FFF9E9`, `#FFF9EC`, `#FFF9ED`, `#FFFAF0`, `#FFFBEC`, `#FFFBEF`, `#FFFDF7`, `#FFFFFF`
- Lesson 1-2 style sources: `src/features/games/precision-engineer/PrecisionEngineerGame.css`
- Lesson 1-2 palette: `#064F45`, `#075E52`, `#086357`, `#0B6B5D`, `#0C6A5D`, `#2E310C`, `#2E7568`, `#2F4E49`, `#315B56`, `#3D7F8A`, `#3F8B72`, `#425A58`, `#455C58`, `#455F63`, `#4D5F62`, `#4D625F`, `#536D72`, `#566B68`, `#5F9B8D`, `#657A7D`, `#67818A`, `#6BAD92`, `#758D91`, `#7C5A2A`, `#7F412F`, `#806516`, `#84C4D1`, `#88CEE0`, `#8A6C18`, `#8D6F32`, `#91C6B4`, `#9FC9BD`, `#B98470`, `#BAD7CE`, `#BFD8D2`, `#C79A55`, `#C8A74D`, `#C8DDD7`, `#C99B34`, `#C9DBD6`, `#CCB976`, `#D3E1DD`, `#D4A42B`, `#D6E0E1`, `#D79580`, `#D7EBE5`, `#D8AD38`, `#D8AD66`, `#D8C7A1`, `#D9A91F`, `#E0C889`, `#E5EFEC`, `#E6F4F0`, `#E7ECEA`, `#E8C580`, `#E9F4F1`, `#EADFC8`, `#EEF6F4`, `#EEF8F4`, `#EEF8FB`, `#F1D69B`, `#F5F8F3`, `#F6D77A`, `#F9F4E4`, `#F9FCFB`, `#FBFEFF`, `#FFF1EC`, `#FFF7DF`, `#FFF8DE`, `#FFF8DF`, `#FFFFFF`
- Race Secondary: `#5B3A8A`

Closest observed token to `#5B3A8A`:

- Lesson 1-1: `#5B6C68` (RGB squared distance `3656`)
- Lesson 1-2: `#4D5F62` (RGB squared distance `3165`)

Purple-family tokens in Lesson 1-1: none.
Purple-family tokens in Lesson 1-2: none.

**Identity verification: تم التحقق.** The race purple remains distinct from both current game identities.
<!-- RACE_COLOR_AUDIT_END -->

<!-- L13_MASTERY_ALIGNMENT_START -->

## Mastery alignment after race replacement

### Entry rule

- Mastery entry is direct and has no lock.
- Entering or completing the game is not a prerequisite for opening mastery.
- Journey ordering is visual guidance only.
- Progress is credited from actual completion, not from entering a stage.

### Game/mastery boundary

- The standalone function `calculate difference between two digital times` belongs to the game.
- `MQ1–MQ5` and their diagnostic branches must not independently ask the learner to subtract two times to obtain their difference.
- MQ1 no longer has any overlap with the retired `Game R1 / measurement boundaries`; its transfer relationships remain with explanation, activities, and relevant review content.

### MQ2 transfer registration

- MQ2 may use one toy car on a ramp and one digital timer.
- Its relationship to the race game is conceptual only: the game report reminds the learner that displayed decimal places do not by themselves determine measurement accuracy.
- This is recorded as `concept-overlap-with-transfer-in-new-context`.
- MQ2 must not reuse the race visual family or mention the two race cars.

### Forbidden mastery visual family

Do not reuse the race scene in mastery:

- two-lane race track;
- finish line;
- two adjacent digital timers for competing cars;
- two sports cars racing;
- the race labels `السيارة 1` and `السيارة 2` as competitors.

### Numeric input boundary

- Mastery must reuse/extract the numeric normalizer already proven by the race implementation rather than duplicate its parsing rules.
- Use exact integer-domain comparison whenever the item permits it.
- MQ3 may reserve `±0.004 s` tolerance only for its mean-answer path; the tolerance must be justified and RED-tested before implementation.

### Implementation gate

`contract -> item data review -> RED -> engine -> UI -> visual previews -> user approval`

No mastery question implementation begins before the updated `05_MASTERY_L13_CONTRACT.md` is approved.

<!-- L13_MASTERY_VARIANT_REGISTRY_START -->

## L13 mastery variant/context reservation registry

These reservations belong to mastery only. They must not be reused by explanation, review, activities, or the game.

| MQ  | variantKey                   | contextKey                                 | visualKey                                   | status |
| --- | ---------------------------- | ------------------------------------------ | ------------------------------------------- | ------ |
| MQ1 | `water-vessel-target-mark`   | `mastery-water-fill-to-mark`               | `g9-l13-mastery-water-fill-analog-v2`      | base   |
| MQ1 | `sand-funnel-target-mark`    | `mastery-sand-funnel-fill-to-mark`  | `g9-l13-mastery-sand-funnel-analog-v1`     | NEW    |
| MQ2 | `ramp-release-1_27`          | `mastery-toy-car-short-ramp`               | `g9-l13-mastery-toy-car-digital-timer-v1`        | base   |
| MQ2 | `ramp-two-marks-2_43`        | `mastery-toy-car-two-mark-ramp`              | `g9-l13-mastery-toy-car-two-mark-digital-v1`        | NEW    |
| MQ3 | `ball-drop-1_8m`             | `mastery-ball-drop-five-trial-investigation`        | `g9-l13-mastery-ball-drop-notebook-v2`     | base   |
| MQ3 | `ball-drop-1_2m`             | `mastery-ball-drop-five-trial-1-2m`        | `g9-l13-mastery-ball-drop-notebook-v2b`     | NEW    |
| MQ3 | `ball-drop-0_8m`             | `mastery-ball-drop-five-trial-0-8m`        | `g9-l13-mastery-ball-drop-notebook-v2c`     | NEW    |
| MQ4 | `spring-cart-8-in-5_92`      | `mastery-horizontal-spring-cart-period`  | `g9-l13-mastery-horizontal-spring-cart-v1` | base   |
| MQ4 | `spring-cart-10-cycles-7_30`     | `mastery-horizontal-spring-cart-ten-cycles` | `g9-l13-mastery-horizontal-spring-cart-v1b` | NEW    |
| MQ5 | `flex-platform-reference-up` | `mastery-flexible-platform-vertical-cycle`  | `g9-l13-mastery-flex-platform-cycle-v1`    | base   |
| MQ5 | `spring-seat-reference-down` | `mastery-spring-seat-vertical-cycle`  | `g9-l13-mastery-spring-seat-cycle-v1`      | NEW    |

Rules:

- `variantKey`, `contextKey`, and `visualKey` are internal only.
- `physicsTeacherReviewed=false` until explicit user review.
- Prefer unseen variants first.
- Never repeat `lastVariantKey` immediately when another variant exists.
- MQ3 dataset rotation and distractor rotation are independent.
- Student-visible units use Arabic wording such as `ثانية`.

<!-- L13_MASTERY_VARIANT_REGISTRY_END -->

<!-- L13_MASTERY_ALIGNMENT_END -->
