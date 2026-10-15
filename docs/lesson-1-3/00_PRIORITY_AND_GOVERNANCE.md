# STEP 0 — Priority, Governance, and Cross-Path Rules

## Status

- Lesson: Grade 9 Physics, Lesson 1-3 — Time Measurement and Periodic Time.
- This package is **documentation only**. No application code is authorized by this package.
- Review state: **awaiting final review before implementation**.

## Precedence rule

1. This merged Step-0 package takes precedence over any older draft or contract when the same field is specified here.
2. Within this package, a later explicit correction takes precedence over an earlier value.
3. If a detail is absent here but exists in an approved detailed contract, the approved detailed contract remains binding.
4. If two approved sources conflict and this package does not resolve the conflict, implementation must stop and request contract resolution. Do not guess.
5. Examples of superseded values: Stage-2 clock angles, Stage-6 pendulum values, mastery-report status mapping, MQ2 wording.

## Step-zero gate

Before any code:

- Review each execution-contract file in this folder against the complete approval history.
- Mark each file APPROVED or return exact deltas.
- Only after all execution-contract files are approved may implementation begin.

## Core path and unlock logic

Current core path:
`Explanation → Review → Scientific Activities → Learning Game → Mastery`

Mastery unlock is **always**:
`afterGamePathEntered = true`
`scoreRequirement = none`

Virtual Lab D never gates mastery. It uses the shared Grade 9 measurement lab already linked to Lessons 1-1, 1-2, and 1-3, and appears as a non-blocking optional loop.

## Virtual Lab D

- Exists.
- `lessonMode = time`
- Visible stations when linked: `time`, `final-assessment`.
- Card label: `تدريب إضافي`.
- Independent governance: `REVIEW → APPLY → TEST → PREVIEW`.
- Uses the shared Grade 9 measurement lab and does not block the core lesson work.

## Direction rules

- Arabic interface text: RTL.
- Scientific horizontal timelines: left-to-right, `→`.
- Process / thinking flows: right-to-left, `←`.
- Vertical physical motion follows scene geometry and does not receive a forced horizontal timeline arrow.
- Timeline arrows, process arrows, and velocity arrows must be visually distinct.

## Global numeric input normalization

Accept:

- Western digits 0–9.
- Arabic-Indic digits.
- Persian digits.
- Decimal separators `.`, `٫`, `,`.
- Leading decimal such as `.5`.
- Trailing zeros such as `0.50`.

Reject:

- More than one decimal separator.
- Letters.
- Unit text inside numeric field.
- Mixed free text.

Compare normalized values numerically. Show the Arabic unit outside the field.

## Global student-language rules

Student UI must not expose internal labels such as `cognitiveFunction`, `contextKey`, `sourceRelation`, or governance language such as “تداخل مصدري”. Do not show “من دليل المعلم” as interface copy. Content authored by the project must carry internal provenance `من تصميمنا` and must not be attributed to the textbook or guide.

## Human figures

Any human figure used in this lesson is male, per the approved visual contract.

## Pulse privacy

Raw pulse measurements are local-session-only and must never be persisted to the server. Server persistence may contain completion and learning-diagnostic state only.

## Targeted test requirements before implementation can be considered complete

1. Uniqueness of `questionKey`, `visualKey`, and `contextKey` across paths, with an explicit whitelist for registered overlaps only.
2. `clockGeometryValidation`: convert angles back to the analog reading and assert `2:14`.
3. Numeric normalization: accepted digit systems/separators and rejection of repeated decimal separators, letters, units, and mixed text.
4. MQ3 generator: distractors are distinct, median differs from mean by at least one hundredth, diagnostic emits at most one code for one answer.
5. Pulse privacy: raw pulse values never reach the server persistence layer.
6. Cross-path reuse guard: no unregistered question/visual/context/cognitive collision.

## Registered human-response-effect overlap

The concept of human start/stop response effect is intentionally present in:

- Explanation Stage 3: primary explanation owner.
- Explanation Stage 4: source-grounded anticipation/countdown application.
- Explanation Stage 6: source-grounded comparison of one short event vs many events.
- Scientific Activities: method judgement and practical timing procedure.
- Review RQ5: laboratory-error reasoning where applicable.
- Mastery MQ2: transfer to a new claim about displayed decimal places.

These are registered source/transfer overlaps, not accidental repetition.

## Implementation workflow after Step-0 approval

`implementation → targeted tests → full tests → build → lint → git diff --check → visual preview → visual acceptance gates → user approval → commit → push`

Forbidden:

- Commit before visual approval.
- Push before visual approval.
- `git add -A`.
