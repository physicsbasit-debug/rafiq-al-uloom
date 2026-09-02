# Phase 5-3 — Interactive Science Simulation Engine

**Baseline:** `a4c91afa36bbe377004e36cbcbd3947e2a864bd7`
**Architecture review:** `PHASE_5_3A_ARCHITECTURE_REVIEW=APPROVED`

Phase 5-3 adds one specialized deterministic simulation engine: `transverse_wave_v1`.

Contract:

- specialized `simulations` + `simulation_objectives`, never a generic `activities` table;
- every student-deliverable simulation has structural objective linkage;
- simulation content contains data/config only, never executable JavaScript or formula DSL;
- compiled TypeScript engine is pure/deterministic/React-free/network-free;
- interaction state remains session-only and does not write Mastery Results;
- App and LessonView remain free of simulation-specific routing;
- renderer registration occurs in the existing Student Activity renderer registry;
- the first seed simulation targets `g10-phy-waves-l2` with objectives `l2-o1` and `l2-o2`;
- `mediumSpeedMps=12` is explicitly labeled in the UI as **"سرعة الموجة في هذا الوسط التعليمي"** to prevent a physical-medium misconception.

Scientific invariants:

1. `λ=v/f`
2. `T=1/f`
3. doubling `f` at fixed `v` halves `λ`
4. amplitude changes do not change `λ` or `T`
5. rendered samples remain within `[-A,+A]`
6. phase changes geometry only
7. non-finite/out-of-range state is rejected
8. equal input produces equal output
