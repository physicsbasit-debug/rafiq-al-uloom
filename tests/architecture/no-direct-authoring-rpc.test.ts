import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const APPROVED_RPC_OWNER = 'src/services/authoring/supabase-authoring.repositories.ts';
const AUTHORING_RPCS = [
  'create_lesson_revision',
  'save_lesson_revision',
  'submit_lesson_revision',
  'review_lesson_revision',
] as const;
const FORBIDDEN_IMPLEMENTATION_IMPORT = '@services/authoring/supabase-authoring.repositories';

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectTypeScriptFiles(fullPath);
      }

      if (
        entry.isFile() &&
        !entry.name.endsWith('.d.ts') &&
        (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))
      ) {
        return [fullPath];
      }

      return [];
    })
    .sort();
}

describe('architecture: authoring client boundaries', () => {
  it.each(AUTHORING_RPCS)('يحصر RPC %s داخل Supabase repository المعتمدة', (rpcName) => {
    const root = process.cwd();
    const owners = collectTypeScriptFiles(resolve(root, 'src'))
      .filter((filePath) => readFileSync(filePath, 'utf8').includes(rpcName))
      .map((filePath) => relative(root, filePath));

    expect(owners).toEqual([APPROVED_RPC_OWNER]);
  });

  it('لا تستدعي أي مكوّن React rpc مباشرة', () => {
    const root = process.cwd();
    const violations = collectTypeScriptFiles(resolve(root, 'src'))
      .filter((filePath) => filePath.endsWith('.tsx'))
      .filter((filePath) => /\.rpc\s*\(/.test(readFileSync(filePath, 'utf8')))
      .map((filePath) => relative(root, filePath));

    expect(violations).toEqual([]);
  });

  it('لا تستورد features تنفيذ Supabase authoring repository مباشرة', () => {
    const root = process.cwd();
    const violations = collectTypeScriptFiles(resolve(root, 'src/features'))
      .filter((filePath) =>
        readFileSync(filePath, 'utf8').includes(FORBIDDEN_IMPLEMENTATION_IMPORT)
      )
      .map((filePath) => relative(root, filePath));

    expect(violations).toEqual([]);
  });
});
