import type { LessonRevisionPayload } from '@services/authoring';
import { parseDataActivityConfig } from '@shared-types/data-activity.types';
import { parseSimulationConfig } from '@shared-types/simulation.types';

export type TeacherActivityFamily =
  'games' | 'experiments' | 'simulations' | 'inquiries' | 'dataActivities';

export type TeacherActivityValidationMode = 'draft' | 'submission';

export type TeacherActivityStructureIssueKind =
  | 'empty_activity_key'
  | 'duplicate_activity_key'
  | 'missing_objective_link'
  | 'empty_objective_key'
  | 'duplicate_objective_key'
  | 'dangling_objective_key'
  | 'invalid_specialized_config';

export interface TeacherActivityStructureIssue {
  readonly kind: TeacherActivityStructureIssueKind;
  readonly family: TeacherActivityFamily;
  readonly activityIndex: number;
  readonly activityKey: string;
  readonly objectiveIndex?: number;
  readonly objectiveKey?: string;
}

export interface TeacherActivityObjectiveReference {
  readonly family: TeacherActivityFamily;
  readonly activityIndex: number;
  readonly activityKey: string;
}

interface ActivityWithObjectiveKeys {
  readonly key: string;
  readonly objectiveKeys: readonly string[];
}

type SpecializedActivityFamily = 'simulations' | 'dataActivities';

function collectFamilyIssues(
  family: TeacherActivityFamily,
  activities: readonly ActivityWithObjectiveKeys[],
  availableObjectiveKeys: ReadonlySet<string>,
  mode: TeacherActivityValidationMode,
  issues: TeacherActivityStructureIssue[]
): void {
  const activityKeys = new Set<string>();

  activities.forEach((activity, activityIndex) => {
    const activityKey = activity.key;

    if (!activityKey.trim()) {
      issues.push({
        kind: 'empty_activity_key',
        family,
        activityIndex,
        activityKey,
      });
    } else if (activityKeys.has(activityKey)) {
      issues.push({
        kind: 'duplicate_activity_key',
        family,
        activityIndex,
        activityKey,
      });
    } else {
      activityKeys.add(activityKey);
    }

    if (mode === 'submission' && activity.objectiveKeys.length === 0) {
      issues.push({
        kind: 'missing_objective_link',
        family,
        activityIndex,
        activityKey,
      });
      return;
    }

    const seenObjectiveKeys = new Set<string>();

    activity.objectiveKeys.forEach((objectiveKey, objectiveIndex) => {
      if (!objectiveKey.trim()) {
        issues.push({
          kind: 'empty_objective_key',
          family,
          activityIndex,
          activityKey,
          objectiveIndex,
          objectiveKey,
        });
        return;
      }

      if (seenObjectiveKeys.has(objectiveKey)) {
        issues.push({
          kind: 'duplicate_objective_key',
          family,
          activityIndex,
          activityKey,
          objectiveIndex,
          objectiveKey,
        });
        return;
      }

      seenObjectiveKeys.add(objectiveKey);

      if (!availableObjectiveKeys.has(objectiveKey)) {
        issues.push({
          kind: 'dangling_objective_key',
          family,
          activityIndex,
          activityKey,
          objectiveIndex,
          objectiveKey,
        });
      }
    });
  });
}

function hasInvalidSpecializedConfig(family: SpecializedActivityFamily, config: unknown): boolean {
  try {
    if (family === 'simulations') {
      parseSimulationConfig(config);
    } else {
      parseDataActivityConfig(config);
    }
    return false;
  } catch {
    return true;
  }
}

function collectSpecializedConfigIssues(
  payload: LessonRevisionPayload,
  issues: TeacherActivityStructureIssue[]
): void {
  payload.simulations.forEach((activity, activityIndex) => {
    if (!hasInvalidSpecializedConfig('simulations', activity.config)) {
      return;
    }

    issues.push({
      kind: 'invalid_specialized_config',
      family: 'simulations',
      activityIndex,
      activityKey: activity.key,
    });
  });

  payload.dataActivities.forEach((activity, activityIndex) => {
    if (!hasInvalidSpecializedConfig('dataActivities', activity.config)) {
      return;
    }

    issues.push({
      kind: 'invalid_specialized_config',
      family: 'dataActivities',
      activityIndex,
      activityKey: activity.key,
    });
  });
}

export function getActivityStructureIssues(
  payload: LessonRevisionPayload,
  mode: TeacherActivityValidationMode
): readonly TeacherActivityStructureIssue[] {
  const issues: TeacherActivityStructureIssue[] = [];
  const availableObjectiveKeys = new Set(payload.objectives.map((objective) => objective.key));

  collectFamilyIssues('games', payload.games, availableObjectiveKeys, mode, issues);

  collectFamilyIssues('experiments', payload.experiments, availableObjectiveKeys, mode, issues);

  collectFamilyIssues('simulations', payload.simulations, availableObjectiveKeys, mode, issues);

  collectFamilyIssues('inquiries', payload.inquiries, availableObjectiveKeys, mode, issues);

  collectFamilyIssues(
    'dataActivities',
    payload.dataActivities,
    availableObjectiveKeys,
    mode,
    issues
  );

  collectSpecializedConfigIssues(payload, issues);

  return issues;
}

export function getFirstActivityStructureIssue(
  payload: LessonRevisionPayload,
  mode: TeacherActivityValidationMode
): TeacherActivityStructureIssue | null {
  return getActivityStructureIssues(payload, mode)[0] ?? null;
}

function appendObjectiveReferences(
  references: TeacherActivityObjectiveReference[],
  family: TeacherActivityFamily,
  activities: readonly ActivityWithObjectiveKeys[],
  objectiveKey: string
): void {
  activities.forEach((activity, activityIndex) => {
    if (!activity.objectiveKeys.includes(objectiveKey)) {
      return;
    }

    references.push({
      family,
      activityIndex,
      activityKey: activity.key,
    });
  });
}

export function getObjectiveActivityReferences(
  payload: LessonRevisionPayload,
  objectiveKey: string
): readonly TeacherActivityObjectiveReference[] {
  const references: TeacherActivityObjectiveReference[] = [];

  appendObjectiveReferences(references, 'games', payload.games, objectiveKey);

  appendObjectiveReferences(references, 'experiments', payload.experiments, objectiveKey);

  appendObjectiveReferences(references, 'simulations', payload.simulations, objectiveKey);

  appendObjectiveReferences(references, 'inquiries', payload.inquiries, objectiveKey);

  appendObjectiveReferences(references, 'dataActivities', payload.dataActivities, objectiveKey);

  return references;
}

export function isObjectiveReferencedByActivity(
  payload: LessonRevisionPayload,
  objectiveKey: string
): boolean {
  return getObjectiveActivityReferences(payload, objectiveKey).length > 0;
}
