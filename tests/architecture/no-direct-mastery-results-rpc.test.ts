import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const APPROVED_RPC_OWNER = 'src/services/mastery-results/supabase-mastery-results.repository.ts';

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

describe('architecture: mastery results RPC boundary', () => {
  it('يحصر اسم RPC داخل Supabase repository المعتمدة', () => {
    const root = process.cwd();
    const owners = collectTypeScriptFiles(resolve(root, 'src'))
      .filter((filePath) => readFileSync(filePath, 'utf8').includes('submit_mastery_attempt'))
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
});
