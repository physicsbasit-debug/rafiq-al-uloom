/**
 * Permanent cross-path reservation guard.
 *
 * This extends the original Golden guard with a fifth key: contextKey.
 * It also allows explanation moments to reserve their context/visual/cognitive role
 * before review, activities, games, and mastery are authored.
 *
 * skill is intentionally NOT a conflict key: spaced practice may revisit the same skill
 * when the question, visual, cognitive function, and context are genuinely different.
 */
export type LearningExperienceReservationPath =
  'explanation' | 'review' | 'activity' | 'game' | 'mastery';

export interface LearningExperienceReservation {
  readonly id: string;
  readonly path: LearningExperienceReservationPath;
  readonly questionKey?: string;
  readonly visualKey?: string;
  readonly cognitiveFunction?: string;
  readonly contextKey?: string;
  readonly skill?: string;
}

export type LearningExperienceReservationConflictKind =
  'question' | 'visual' | 'cognitive' | 'context';

export interface LearningExperienceReservationConflict {
  readonly kind: LearningExperienceReservationConflictKind;
  readonly key: string;
  readonly firstId: string;
  readonly secondId: string;
  readonly firstPath: LearningExperienceReservationPath;
  readonly secondPath: LearningExperienceReservationPath;
}

interface ConflictField {
  readonly kind: LearningExperienceReservationConflictKind;
  readonly field: 'questionKey' | 'visualKey' | 'cognitiveFunction' | 'contextKey';
}

const CONFLICT_FIELDS: readonly ConflictField[] = [
  { kind: 'question', field: 'questionKey' },
  { kind: 'visual', field: 'visualKey' },
  { kind: 'cognitive', field: 'cognitiveFunction' },
  { kind: 'context', field: 'contextKey' },
] as const;

function normalizedKey(value: string | undefined): string | null {
  if (value === undefined) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function findLearningExperienceReservationConflicts(
  reservations: readonly LearningExperienceReservation[]
): LearningExperienceReservationConflict[] {
  const conflicts: LearningExperienceReservationConflict[] = [];

  for (let firstIndex = 0; firstIndex < reservations.length; firstIndex += 1) {
    const first = reservations[firstIndex];
    if (!first) continue;

    for (let secondIndex = firstIndex + 1; secondIndex < reservations.length; secondIndex += 1) {
      const second = reservations[secondIndex];
      if (!second || first.path === second.path) continue;

      for (const { kind, field } of CONFLICT_FIELDS) {
        const firstKey = normalizedKey(first[field]);
        const secondKey = normalizedKey(second[field]);
        if (!firstKey || !secondKey || firstKey !== secondKey) continue;

        conflicts.push({
          kind,
          key: firstKey,
          firstId: first.id,
          secondId: second.id,
          firstPath: first.path,
          secondPath: second.path,
        });
      }
    }
  }

  return conflicts;
}

export function hasLearningExperienceReservationConflicts(
  reservations: readonly LearningExperienceReservation[]
): boolean {
  return findLearningExperienceReservationConflicts(reservations).length > 0;
}
