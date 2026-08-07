import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const USER_ROLES = new Set(['student', 'teacher', 'reviewer']);

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

function stringLiteralValue(node: ts.Expression): string | null {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : null;
}

function isRoleAccess(node: ts.Expression): boolean {
  return (
    (ts.isPropertyAccessExpression(node) && node.name.text === 'role') ||
    (ts.isElementAccessExpression(node) &&
      node.argumentExpression !== undefined &&
      stringLiteralValue(node.argumentExpression) === 'role')
  );
}

function findInlineRoleDecisions(filePath: string): number[] {
  const source = readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    filePath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );
  const lines: number[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isBinaryExpression(node) &&
      [
        ts.SyntaxKind.EqualsEqualsToken,
        ts.SyntaxKind.EqualsEqualsEqualsToken,
        ts.SyntaxKind.ExclamationEqualsToken,
        ts.SyntaxKind.ExclamationEqualsEqualsToken,
      ].includes(node.operatorToken.kind)
    ) {
      const leftRole = isRoleAccess(node.left);
      const rightRole = isRoleAccess(node.right);
      const leftValue = stringLiteralValue(node.left);
      const rightValue = stringLiteralValue(node.right);

      if (
        (leftRole && rightValue !== null && USER_ROLES.has(rightValue)) ||
        (rightRole && leftValue !== null && USER_ROLES.has(leftValue))
      ) {
        lines.push(sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return lines;
}

describe('architecture: centralized authorization decisions', () => {
  it('لا تستخدم App أو أي feature شروط أدوار لاتخاذ قرار صلاحية', () => {
    const root = process.cwd();
    const files = [
      resolve(root, 'src/App.tsx'),
      ...collectTypeScriptFiles(resolve(root, 'src/features')),
    ];

    const violations = files.flatMap((filePath) =>
      findInlineRoleDecisions(filePath).map((line) => `${relative(root, filePath)}:${line}`)
    );

    expect(violations).toEqual([]);
  });

  it('لا تستدعي ملفات الحارس Supabase مباشرة', () => {
    const root = process.cwd();
    const guardFiles = [
      'src/features/auth/RequireCapability.tsx',
      'src/features/auth/useAuthorizationDecision.ts',
    ];

    const violations = guardFiles.filter((filePath) => {
      const source = readFileSync(resolve(root, filePath), 'utf8');
      return (
        source.includes('@supabase/supabase-js') ||
        source.includes('supabase.from(') ||
        source.includes('supabase.auth.')
      );
    });

    expect(violations).toEqual([]);
  });

  it('لا يعيد App إنشاء قرار authorized محليًا', () => {
    const source = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    expect(source).not.toMatch(/const\s+authorized\s*=/);
    expect(source).not.toMatch(/const\s+showStudentExperience\s*=/);
    expect(source).toContain('RequireCapability');
  });

  it('لا تستخدم ملفات C4 الاسم القديم initializing', () => {
    const root = process.cwd();
    const files = [
      'src/services/auth/authorization.policy.ts',
      'src/features/auth/RequireCapability.tsx',
      'src/features/auth/useAuthorizationDecision.ts',
    ];

    expect(
      files.filter((filePath) =>
        readFileSync(resolve(root, filePath), 'utf8').includes('initializing')
      )
    ).toEqual([]);
  });
});
