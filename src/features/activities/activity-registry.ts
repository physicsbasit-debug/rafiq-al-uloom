import type { LearningActivityKind } from '@shared-types/activity.types';

export type ActivityAvailability = 'available' | 'planned';
export type ActivityInteractionMode = 'interactive' | 'guided';

export interface ActivityRegistryEntry {
  kind: LearningActivityKind;
  label: string;
  displayOrder: number;
  availability: ActivityAvailability;
  interactionMode: ActivityInteractionMode;
  physical: boolean;
  sessionProgress: boolean;
}

export const ACTIVITY_REGISTRY: readonly ActivityRegistryEntry[] = [
  {
    kind: 'matching',
    label: 'مطابقة',
    displayOrder: 10,
    availability: 'available',
    interactionMode: 'interactive',
    physical: false,
    sessionProgress: true,
  },
  {
    kind: 'experiment',
    label: 'تجربة',
    displayOrder: 20,
    availability: 'available',
    interactionMode: 'guided',
    physical: true,
    sessionProgress: false,
  },
  {
    kind: 'simulation',
    label: 'محاكاة',
    displayOrder: 30,
    availability: 'available',
    interactionMode: 'interactive',
    physical: false,
    sessionProgress: true,
  },
  {
    kind: 'inquiry',
    label: 'استقصاء',
    displayOrder: 40,
    availability: 'planned',
    interactionMode: 'guided',
    physical: false,
    sessionProgress: false,
  },
  {
    kind: 'data',
    label: 'بيانات ورسوم',
    displayOrder: 50,
    availability: 'planned',
    interactionMode: 'guided',
    physical: false,
    sessionProgress: false,
  },
];

export function getActivityRegistryEntry(
  kind: LearningActivityKind
): ActivityRegistryEntry | undefined {
  return ACTIVITY_REGISTRY.find((entry) => entry.kind === kind);
}

export function getAvailableActivityRegistryEntries(): ActivityRegistryEntry[] {
  return ACTIVITY_REGISTRY.filter((entry) => entry.availability === 'available');
}
