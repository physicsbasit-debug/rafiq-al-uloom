import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ACTIVITY_REGISTRY,
  getAvailableActivityRegistryEntries,
} from '@features/activities/activity-registry';

describe('activity registry', () => {
  it('يسجل كل kind مرة واحدة وبترتيب deterministic', () => {
    const kinds = ACTIVITY_REGISTRY.map((entry) => entry.kind);
    const orders = ACTIVITY_REGISTRY.map((entry) => entry.displayOrder);

    expect(new Set(kinds).size).toBe(kinds.length);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('يجعل inquiry متاحة ويبقي data مخططة', () => {
    expect(getAvailableActivityRegistryEntries().map((entry) => entry.kind)).toEqual([
      'matching',
      'experiment',
      'simulation',
      'inquiry',
    ]);

    expect(ACTIVITY_REGISTRY.find((entry) => entry.kind === 'inquiry')).toMatchObject({
      availability: 'available',
      interactionMode: 'guided',
      physical: false,
      sessionProgress: true,
    });
    expect(ACTIVITY_REGISTRY.find((entry) => entry.kind === 'data')?.availability).toBe('planned');
  });

  it('يبقي Domain Registry خاليًا من React', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/features/activities/activity-registry.ts'),
      'utf8'
    );

    expect(source).not.toMatch(/from ['"]react['"]/);
    expect(source).not.toContain('ReactNode');
    expect(source).not.toContain('.tsx');
  });
});
