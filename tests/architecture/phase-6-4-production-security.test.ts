import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const WORKFLOWS_DIR = resolve(ROOT, '.github/workflows');

const CHECKOUT_SHA = 'd23441a48e516b6c34aea4fa41551a30e30af803';
const SETUP_NODE_SHA = '820762786026740c76f36085b0efc47a31fe5020';

function read(path: string): string {
  return readFileSync(resolve(ROOT, path), 'utf8');
}

function workflowFiles(): readonly string[] {
  return readdirSync(WORKFLOWS_DIR)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .sort();
}

function externalUses(text: string): readonly string[] {
  return [...text.matchAll(/^\s*-\s+uses:\s+([^\s#]+)/gm)]
    .map((match) => match[1])
    .filter((value) => !value.startsWith('./') && !value.startsWith('docker://'));
}

describe('Phase 6-4A production security: GitHub Actions pinning', () => {
  it('pins every external workflow action to a full immutable 40-character commit SHA', () => {
    const violations = workflowFiles().flatMap((name) => {
      const text = read(`.github/workflows/${name}`);
      return externalUses(text)
        .filter((value) => !/@[0-9a-f]{40}$/i.test(value))
        .map((value) => `${name}: ${value}`);
    });

    expect(violations).toEqual([]);
  });

  it('pins checkout v6.1.0 and setup-node v7.0.0 to the reviewed official commits', () => {
    const workflow = read('.github/workflows/ci.yml');

    expect(workflow.match(new RegExp(`actions/checkout@${CHECKOUT_SHA}`, 'g'))).toHaveLength(2);
    expect(workflow.match(new RegExp(`actions/setup-node@${SETUP_NODE_SHA}`, 'g'))).toHaveLength(2);
    expect(workflow.match(/# v6\.1\.0/g)).toHaveLength(2);
    expect(workflow.match(/# v7\.0\.0/g)).toHaveLength(2);
  });

  it('does not reintroduce moving major, minor, branch, or latest refs for external actions', () => {
    const workflowText = workflowFiles()
      .map((name) => read(`.github/workflows/${name}`))
      .join('\n');

    expect(workflowText).not.toMatch(
      /\buses:\s+[^#\s]+@(v\d+(?:\.\d+){0,2}|main|master|latest)\b/i
    );
  });

  it('keeps the CI token least-privilege contract unchanged', () => {
    const workflow = read('.github/workflows/ci.yml');

    expect(workflow).toContain('permissions:');
    expect(workflow).toContain('contents: read');
    expect(workflow).not.toContain('contents: write');
    expect(workflow).not.toContain('id-token: write');
    expect(workflow).not.toContain('${{ secrets.');
  });
});
