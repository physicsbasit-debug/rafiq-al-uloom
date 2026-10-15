# Execution Contract — Mastery E — Lesson 1-3

## Global mastery behavior
Five questions = five different situations, contextKeys, and visualKeys.
No hints, correctness reveal, or green/red correctness colors during the attempt. Student may revise before final submit. Feedback appears after final submission.

Mastery unlock: always after game path has been entered, with no score threshold. Virtual Lab D never gates mastery.

## MQ1 — Analog assigned timer: fill vessel to a mark
- `questionKey: mastery-analog-timer-water-fill-procedure`
- `visualKey: g9-l13-mastery-water-fill-analog-v2`
- `cognitiveFunction: construct-assigned-analog-timing-procedure`
- `contextKey: mastery-water-fill-to-mark`
- `skill: operate-and-describe-assigned-analog-timer`

Scene establishes:
- closed faucet above empty vessel.
- clear target-level mark.
- faucet closure occurs **after** the water reaches the mark, so “stop at faucet closure” cannot be defended as correct.

Candidate steps = 6. Student selects 4 and orders them.
Correct:
A. reset timer to zero.
B. start at first visible water exiting faucet.
C. stop when water surface reaches target mark.
D. read time and record in `ثانية`.
Distractors:
E. start when water reaches the mark → `incorrect-start-boundary`.
F. stop when faucet is closed → `incorrect-end-boundary`.

Scoring: 1 point only if correct four are selected **and** exact order A-B-C-D.
If correct set but wrong order: `procedural-order-error` and record first mismatch index with expected vs actual step.

Accessible reorder controls:
- drag/drop.
- tap-select-then-move.
- move up/down buttons.
- keyboard reorder.

Process strip direction: right-to-left `←`.

Registered overlap:
- activities: reuse of ordered assigned-timer procedure in a new situation.
- Game R1: shared concept of measurement boundaries, new action and scene.

## MQ2 — Digital display decimal places vs measurement accuracy
- `questionKey: mastery-digital-display-accuracy-claim`
- `visualKey: g9-l13-mastery-toy-car-digital-timer-v1`
- `cognitiveFunction: evaluate-digital-resolution-versus-measurement-accuracy`
- `contextKey: mastery-toy-car-short-ramp`
- `skill: interpret-digital-timer-use-and-limit`

Scene: student manually times a small toy car on a ramp using a digital timer.
Display example: `1.27 ثانية`.
Claim and wording must be different from Explanation Stage 3.

Single-choice, 4 options, comparable length and one grammatical template `[صحيح/غير صحيح]؛ لأن …`.

Final options:
1. `صحيح؛ لأن عرض منزلتين عشريتين يعني دقة القياس حتى 0.01 ثانية.`
2. `غير صحيح؛ لأن التشغيل اليدوي يضيف أثر زمن الاستجابة رغم عرض منزلتين عشريتين.` ✅
3. `غير صحيح؛ لأن المؤقت الرقمي لا يناسب قياس الفترات الزمنية القصيرة.`
4. `صحيح؛ لأن المؤقت الرقمي يلغي أثر استجابة الشخص عند التشغيل.`

No unique hedge such as `وحده` in the correct option. No uniquely long/detail-heavy correct answer.

Review audit: RQ1–RQ5 do not contain a decimal-places-equals-accuracy claim question. RQ5 uses numerical rounding but not this misconception.

Registered overlap: MQ2 ↔ Explanation Stage 3, mastery transfer only.

## MQ3 — Mean from five prepared trials
- `questionKey: mastery-ball-drop-five-trial-mean`
- `visualKey: g9-l13-mastery-ball-drop-notebook-v2`
- `cognitiveFunction: calculate-mean-from-five-repeated-times`
- `contextKey: mastery-ball-drop-five-trial-investigation`
- `skill: calculate-mean-short-time`

Visual: vertical ball-drop investigation plus a lab-notebook page as evidence, not a live lab station.
Manual timing is explicit. No free-fall formula is shown.

Prepared datasets:
### 1.2 m
0.47, 0.58, 0.42, 0.54, 0.49 s
sum 2.50; mean 0.50; median 0.49.
### 0.8 m
0.36, 0.44, 0.38, 0.45, 0.37 s
sum 2.00; mean 0.40; median 0.38.
### 1.8 m
0.55, 0.66, 0.58, 0.67, 0.59 s
sum 3.05; mean 0.61; median 0.59.

Rules:
- 5 trials.
- input order intentionally unsorted.
- no outlier removal.
- generated future datasets must separate median and mean by at least one hundredth.
- perform the separation check in integer hundredths, e.g. 0.50→50, 0.49→49, and require absolute difference ≥1.

Dynamic distractor diagnostics, only when the answer is wrong, using ordered `else if`, max one code:
- approximately sum → used total instead of mean.
- approximately median → used median instead of mean.
- approximately sum/(n−1) → divided by too few trials.
- approximately sum/(n+1) → divided by too many trials.
- else → generic mean-calculation error.

Numeric tolerance: `0.004 ثانية`.
Distractors must be pairwise distinct and distinct from the correct mean.

Registered overlap: MQ3 ↔ RQ3 + scientific activities, mastery transfer.

## MQ4 — Period from a horizontal spring-cart
- `questionKey: mastery-horizontal-spring-cart-period`
- `visualKey: g9-l13-mastery-horizontal-spring-cart-v1`
- `cognitiveFunction: derive-period-from-repeated-cycles`
- `contextKey: mastery-horizontal-spring-cart-period`
- `skill: calculate-period-from-multiple-events`

Scene: small non-automated cart attached to a horizontal spring, moving back and forth around equilibrium.
Student text defines: `الدورة الكاملة هي حركة العربة من موضع البداية ثم عودتها إلى موضع البداية نفسه.`
Do not use the pendulum term `تأرجح` for this cart context.

Base data:
- 8 complete cycles.
- total 5.92 s.
- correct period 0.74 s.

Post-submit diagnostics:
- 5.92 → used total time.
- 47.36 → multiplied instead of divided.
- about 1.351 → reversed division.
- other → generic period-calculation error.

Registered overlap: MQ4 ↔ Explanation Stage 5 + RQ5 + activities, mastery transfer.

## MQ5 — Complete cycle on a flexible vertical platform
- `questionKey: mastery-flexible-platform-complete-cycle`
- `visualKey: g9-l13-mastery-flex-platform-cycle-v1`
- `cognitiveFunction: identify-complete-period-boundary-in-new-context`
- `contextKey: mastery-flexible-platform-vertical-cycle`
- `skill: identify-one-complete-period`

Male student stands on a flexible platform moving vertically. Start: platform at a fixed reference mark and moving upward. Show an explicit velocity-direction arrow at the platform, visually distinct from timeline arrows.

Single-choice, 4 options, shuffled while preserving diagnostic mapping:
- highest position → extreme-point confusion.
- reference mark moving down → correct position, wrong direction.
- lowest position → opposite extreme-point confusion.
- reference mark moving up → correct complete cycle.

Registered overlap: MQ5 ↔ Explanation Stage 5 + RQ4 + activities, mastery transfer. No pendulum visual/language reuse.

## Score and report
One point per question. MQ1 all-or-nothing. Total `n/5`.

Descriptor:
- 5/5 → `إتقان مرحلي متقدم`.
- 4/5 → `جيد`.
- 3/5 → `قيد التثبيت`.
- 0–2/5 → `يحتاج مراجعة مركزة`.

Internal level:
- 5/5 `advanced_mastery`.
- 4/5 `good`.
- 3/5 `consolidating`.
- 0–2/5 `focused_review`.

Skill axes:
1. use of timing devices: MQ1+MQ2.
2. mean of repeated measurements: MQ3.
3. periodic time: MQ4+MQ5.

Objective 2-1 status:
- both MQ1/MQ2 correct → mastered.
- exactly one → needs_reinforcement.
- both wrong → needs_review.

Mean axis:
- MQ3 correct → mastered.
- wrong → needs_review.

Period axis:
- MQ4+MQ5 both correct → mastered.
- exactly one → needs_reinforcement.
- both wrong → needs_review.

Objective 3-1:
- mastered iff mean axis and period axis mastered.
- needs_reinforcement iff mean mastered and period needs_reinforcement.
- needs_review if either axis needs_review.

`allObjectivesMastered = true` only if both objective statuses are mastered.

Report must show:
- n/5.
- descriptor.
- skill analysis.
- specific next action, e.g. review timer procedure, decimal-place misconception, mean, complete cycle, or period calculation.

## Persistence
Persist:
- scoreNof5.
- lessonMasteryLevel.
- allObjectivesMastered.
- objective2_1Status.
- objective3_1Status.
- diagnosticCodes.
- attemptCount.
- completedAt.
- variantHistory for MQ1–MQ5.

Do not need to persist raw free-response text after diagnostics are extracted.

## Retake rotation
Each MQ has genuine variants. Prefer never-seen variant; after pool exhaustion use least-recently-seen; never repeat same variant on consecutive attempts.
MQ3 height/data variants must remain physically coherent and keep the declared height tied to the prepared data.
