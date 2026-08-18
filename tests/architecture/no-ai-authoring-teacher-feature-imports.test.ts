import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function collectTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) return collectTypeScriptFiles(fullPath);
      if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
        return [fullPath];
      }
      return [];
    })
    .sort();
}

function importedSpecifiers(source: string): readonly string[] {
  const specifiers: string[] = [];
  const pattern = /(?:from\s+|import\s*\()\s*['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(pattern)) {
    if (match[1]) specifiers.push(match[1]);
  }
  return specifiers;
}

function isTeacherFeatureImport(specifier: string): boolean {
  return (
    specifier === '@features/teacher' ||
    specifier.startsWith('@features/teacher/') ||
    specifier.includes('/features/teacher')
  );
}

describe('architecture: AI authoring dependency direction', () => {
  it('لا تعتمد src/services/ai-authoring على src/features/teacher', () => {
    const root = process.cwd();
    const aiAuthoringRoot = resolve(root, 'src/services/ai-authoring');
    const violations = collectTypeScriptFiles(aiAuthoringRoot)
      .flatMap((filePath) =>
        importedSpecifiers(readFileSync(filePath, 'utf8'))
          .filter(isTeacherFeatureImport)
          .map((specifier) => `${relative(root, filePath)} -> ${specifier}`)
      )
      .sort();

    expect(violations).toEqual([]);
  });
});
