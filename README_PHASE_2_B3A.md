# Phase 2-B3a — Supabase Row Types and Runtime Mappers

## Scope

This phase adds pure, network-free mapping infrastructure for Supabase content rows.

### Added

- `src/services/data/supabase-content.rows.ts`
- `src/services/data/supabase-content.mappers.ts`
- `tests/data/supabase-content.mappers.test.ts`

### Guarantees

- Row interfaces mirror the Phase 2-B2a PostgreSQL schema.
- Mappers validate runtime values before returning domain entities.
- `games.items` is validated structurally without an unsafe cast.
- `Lesson.objectiveIds` and `Game.objectiveIds` are provided separately and preserve input order.
- No mapper imports a Supabase client, React, hooks, query modules, or environment variables.

## Explicitly out of scope

- Supabase network queries
- `createSupabaseContentRepository`
- Provider selection
- Integration tests
- Feature or hook changes
