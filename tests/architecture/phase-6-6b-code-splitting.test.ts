import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('Phase 6-6B measured code-splitting contract', () => {
  it('uses the frozen 6-6A baseline as the only numeric source of truth', () => {
    const baseline = JSON.parse(read('config/production-performance-baseline.json')) as {
      phase?: string;
      metrics?: { initialJs?: { gzipBytes?: number } };
      policy?: { codeSplitAcceptanceReductionPercent?: number };
    };

    expect(baseline.phase).toBe('6-6A');
    expect(baseline.metrics?.initialJs?.gzipBytes).toBe(182127);
    expect(baseline.policy?.codeSplitAcceptanceReductionPercent).toBe(10);
  });

  it('removes teacher, reviewer, AI provider, and access-token static imports from App', () => {
    const app = read('src/App.tsx');

    expect(app).not.toContain("import { TeacherWorkspace } from '@features/teacher/workspace'");
    expect(app).not.toContain("import { ReviewerWorkspace } from '@features/reviewer/workspace'");
    expect(app).not.toContain(
      "import { GatewayAiAuthoringProvider } from '@services/ai-authoring'"
    );
    expect(app).not.toContain(
      "import { getCurrentAccessToken } from '@services/auth/auth.service'"
    );
    expect(app).toContain("import('@features/teacher/workspace/TeacherWorkspaceSurface')");
    expect(app).toContain("import('@features/reviewer/workspace/ReviewerWorkspace')");
  });

  it('moves teacher-only AI composition inside the deferred teacher surface', () => {
    const surface = read('src/features/teacher/workspace/TeacherWorkspaceSurface.tsx');

    expect(surface).toContain('GatewayAiAuthoringProvider');
    expect(surface).toContain('getCurrentAccessToken');
    expect(surface).toContain('TeacherWorkspace');
    expect(surface).toContain('export default function TeacherWorkspaceSurface');
  });

  it('uses React.lazy + Suspense and a local retryable error boundary', () => {
    const deferred = read('src/features/workspace/DeferredWorkspace.tsx');

    expect(deferred).toContain('lazy(this.props.load)');
    expect(deferred).toContain('this.LazyWorkspace = lazy(this.props.load)');
    expect(deferred).toContain('<Suspense');
    expect(deferred).toContain('WorkspaceChunkErrorBoundary');
    expect(deferred).toContain('تعذر تحميل مساحة العمل');
    expect(deferred).toContain('إعادة المحاولة');
    expect(deferred).toContain('reportRuntimeDiagnostic');
    expect(deferred).toContain('this.setState(({ attempt }) => ({');
    expect(deferred).toContain('attempt: attempt + 1');
    expect(deferred).toContain('key={this.state.attempt}');
  });

  it('proves rejected dynamic import is caught and retried locally', () => {
    const test = read('tests/features/DeferredWorkspace.test.tsx');

    expect(test).toContain(".mockRejectedValueOnce(new Error('chunk 404'))");
    expect(test).toContain("getByRole('button', { name: 'إعادة المحاولة' })");
    expect(test).toContain('expect(load).toHaveBeenCalledTimes(2)');
    expect(test).toContain("findByText('المراجع بعد إعادة المحاولة')");
  });

  it('keeps the official performance script responsible for GO / NO_GO', () => {
    const script = read('scripts/check-production-performance.mjs');
    const pkg = read('package.json');

    expect(script).toContain("'--code-split-decision'");
    expect(script).toContain("CODE_SPLIT_DECISION=${codeSplit.passed ? 'GO' : 'NO_GO'}");
    expect(script).toContain('CODE_SPLIT_REQUIRED_REDUCTION_BYTES');
    expect(pkg).toContain(
      '"verify:code-split": "node scripts/check-production-performance.mjs --code-split-decision"'
    );
  });

  it('records the approved full-revert NO-GO rule and local chunk-failure contract', () => {
    const doc = read('docs/PHASE_6_6B_MEASURED_CODE_SPLITTING.md');

    expect(doc).toContain('NO-GO = تراجع كامل');
    expect(doc).toContain('182127');
    expect(doc).toContain('18213');
    expect(doc).toContain('رفض dynamic import');
    expect(doc).toContain('6-6C');
  });
});
