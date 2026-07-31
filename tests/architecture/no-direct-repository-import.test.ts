import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const FORBIDDEN_MODULE = '@services/data/local-content.repository';

function collectSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(fullPath));
      continue;
    }

    if (
      entry.isFile() &&
      !entry.name.endsWith('.d.ts') &&
      (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))
    ) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

/**
 * Uses the TypeScript AST deliberately instead of regular expressions.
 * Regex-based scanning can misread commented-out imports or comment-like
 * text inside strings and template literals.
 */
function findForbiddenImports(source: string, filePath: string): boolean {
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  for (const statement of sourceFile.statements) {
    if (
      (ts.isImportDeclaration(statement) || ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === FORBIDDEN_MODULE
    ) {
      return true;
    }

    if (
      ts.isImportEqualsDeclaration(statement) &&
      ts.isExternalModuleReference(statement.moduleReference) &&
      statement.moduleReference.expression &&
      ts.isStringLiteral(statement.moduleReference.expression) &&
      statement.moduleReference.expression.text === FORBIDDEN_MODULE
    ) {
      return true;
    }
  }

  return false;
}

describe('architecture: no direct repository import', () => {
  it('لا يستورد أي ملف داخل src/features مباشرة من local-content.repository', () => {
    const projectRoot = process.cwd();
    const featuresDir = resolve(projectRoot, 'src/features');
    const files = collectSourceFiles(featuresDir);

    const violations = files
      .filter((filePath) => {
        const source = readFileSync(filePath, 'utf8');
        return findForbiddenImports(source, filePath);
      })
      .map((filePath) => relative(projectRoot, filePath))
      .sort();

    expect(violations).toEqual([]);
  });
});
