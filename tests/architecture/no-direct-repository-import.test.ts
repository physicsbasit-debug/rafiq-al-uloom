import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const SYNC_LOCAL_REPOSITORY = '@services/data/local-content.repository';
const ASYNC_LOCAL_REPOSITORY = '@services/data/async-local-content.repository';

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

function findForbiddenImports(source: string, filePath: string, modules: Set<string>): boolean {
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
      modules.has(statement.moduleSpecifier.text)
    ) {
      return true;
    }

    if (
      ts.isImportEqualsDeclaration(statement) &&
      ts.isExternalModuleReference(statement.moduleReference) &&
      statement.moduleReference.expression &&
      ts.isStringLiteral(statement.moduleReference.expression) &&
      modules.has(statement.moduleReference.expression.text)
    ) {
      return true;
    }
  }

  return false;
}

function findViolations(projectRoot: string, directories: string[], modules: string[]): string[] {
  const forbiddenModules = new Set(modules);

  return directories
    .flatMap((directory) => collectSourceFiles(resolve(projectRoot, directory)))
    .filter((filePath) => {
      const source = readFileSync(filePath, 'utf8');
      return findForbiddenImports(source, filePath, forbiddenModules);
    })
    .map((filePath) => relative(projectRoot, filePath))
    .sort();
}

describe('architecture: no direct repository import', () => {
  it('لا يستورد أي ملف داخل src/features مباشرة من local-content.repository', () => {
    const projectRoot = process.cwd();

    expect(findViolations(projectRoot, ['src/features'], [SYNC_LOCAL_REPOSITORY])).toEqual([]);
  });

  it('تستخدم features وqueries المزود المركزي بدل asyncLocalContentRepository مباشرة', () => {
    const projectRoot = process.cwd();

    expect(
      findViolations(
        projectRoot,
        ['src/features', 'src/services/queries'],
        [ASYNC_LOCAL_REPOSITORY]
      )
    ).toEqual([]);
  });
});
