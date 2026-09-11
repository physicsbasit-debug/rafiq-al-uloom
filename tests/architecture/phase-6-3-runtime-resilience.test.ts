import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

function read(path: string) {
  return readFileSync(resolve(ROOT, path), 'utf8');
}

describe('Phase 6-3 runtime resilience contract', () => {
  it('installs global runtime diagnostics before rendering the application', () => {
    const main = read('src/main.tsx');

    expect(main).toContain('installGlobalRuntimeDiagnostics();');
    expect(main.indexOf('installGlobalRuntimeDiagnostics();')).toBeLessThan(
      main.indexOf("createRoot(document.getElementById('root')!).render")
    );
  });

  it('wraps the application root in the runtime error boundary', () => {
    const main = read('src/main.tsx');

    expect(main).toContain('<RuntimeErrorBoundary>');
    expect(main).toContain('<App />');
    expect(main.indexOf('<RuntimeErrorBoundary>')).toBeLessThan(main.indexOf('<App />'));
  });

  it('keeps runtime diagnostics metadata-only instead of serializing raw errors', () => {
    const diagnostics = read('src/services/runtime/runtime-diagnostics.ts');

    expect(diagnostics).toContain('errorType: classifyErrorType(input.error)');
    expect(diagnostics).not.toContain('message: input.error');
    expect(diagnostics).not.toContain('stack:');
    expect(diagnostics).not.toContain('Authorization');
    expect(diagnostics).not.toContain('access_token');
  });

  it('keeps the crash fallback generic and never renders the caught exception', () => {
    const boundary = read('src/services/runtime/runtime-error-boundary.tsx');

    expect(boundary).toContain('تعذر عرض الصفحة');
    expect(boundary).toContain('الرقم المرجعي:');
    expect(boundary).not.toContain('error.message');
    expect(boundary).not.toContain('error.stack');
  });

  it('does not introduce an external telemetry vendor in 6-3A', () => {
    const packageJson = read('package.json');

    expect(packageJson).not.toMatch(/sentry|datadog|newrelic|rollbar/i);
  });

  it('defines one bounded client deadline policy for reads and AI transport', () => {
    const boundary = read('src/services/runtime/client-async-boundary.ts');

    expect(boundary).toContain('contentQuery: 15_000');
    expect(boundary).toContain('aiGatewayTransport: 30_000');
    expect(boundary).toContain('source: ClientAsyncAbortSource');
    expect(boundary).toContain("'caller' | 'timeout'");
  });

  it('routes content reads through the bounded deadline without replacing stale-write guards', () => {
    const query = read('src/services/queries/use-async-query.ts');

    expect(query).toContain('runWithClientDeadline');
    expect(query).toContain('requestVersionRef');
    expect(query).toContain('controller.abort();');
    expect(query).toContain('timeoutMs = CLIENT_ASYNC_TIMEOUT_MS.contentQuery');
  });

  it('keeps technical query causes away from the public query message', () => {
    const boundary = read('src/design-system/components/QueryBoundary.tsx');

    expect(boundary).toContain('if (!error.cause)');
    expect(boundary).toContain('تعذر تحميل البيانات. حاول مرة أخرى.');
    expect(boundary).toContain('استغرق تحميل البيانات وقتًا أطول من المتوقع. حاول مرة أخرى.');
    expect(boundary).not.toContain('>{error.message}</p>');
  });

  it('bounds browser AI transport above the existing 25-second Edge provider timeout', () => {
    const provider = read('src/services/ai-authoring/gateway-ai-authoring.provider.ts');

    expect(provider).toContain('runWithClientDeadline');
    expect(provider).toContain('CLIENT_ASYNC_TIMEOUT_MS.aiGatewayTransport');
    expect(provider).toContain('transportTimeoutMs');
    expect(provider).not.toMatch(/while\s*\(|for\s*\(.*fetch/);
  });
});
