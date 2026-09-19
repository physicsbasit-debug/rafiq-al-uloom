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
  it('keeps service diagnostics allowlisted and never forwards the original cause', () => {
    const bridge = read('src/services/runtime/service-diagnostic-bridge.ts');

    expect(bridge).toContain('SERVICE_DIAGNOSTIC_ALLOWLIST');
    expect(bridge).toContain("kind: 'service_error'");
    expect(bridge).toContain("source: 'service'");
    expect(bridge).toContain("operation: 'unknown'");
    expect(bridge).toContain("reason: 'unknown'");
    expect(bridge).not.toContain('error.cause');
    expect(bridge).not.toContain('error.stack');
    expect(bridge).not.toContain('JSON.stringify(error)');
  });

  it('wires the five default service boundaries into the central diagnostic bridge', () => {
    const targets = [
      ['src/services/auth/auth.service.ts', "createServiceDiagnosticReporter('auth')"],
      ['src/services/auth/profile.service.ts', "createServiceDiagnosticReporter('profile')"],
      [
        'src/services/auth/authorization.service.ts',
        "createServiceDiagnosticReporter('authorization')",
      ],
      [
        'src/services/authoring/supabase-authoring.repositories.ts',
        "createServiceDiagnosticReporter('authoring')",
      ],
      [
        'src/services/mastery-results/supabase-mastery-results.repository.ts',
        "createServiceDiagnosticReporter('mastery_results')",
      ],
    ] as const;

    for (const [target, expectedBridge] of targets) {
      const source = read(target);
      expect(source).toContain(
        "import { createServiceDiagnosticReporter } from '@services/runtime/service-diagnostic-bridge';"
      );
      expect(source).toContain(`reportDiagnostic: ${expectedBridge}`);
    }
  });

  it('extends runtime diagnostics with service metadata without adding raw message fields', () => {
    const diagnostics = read('src/services/runtime/runtime-diagnostics.ts');

    expect(diagnostics).toContain("| 'service_error';");
    expect(diagnostics).toContain(
      "export type RuntimeDiagnosticSource = 'react' | 'browser' | 'service';"
    );
    expect(diagnostics).toContain('readonly service: RuntimeServiceName;');
    expect(diagnostics).toContain('readonly operation: string;');
    expect(diagnostics).toContain('readonly reason: string;');
    expect(diagnostics).not.toContain('readonly message: string;');
    expect(diagnostics).not.toContain('readonly cause:');
  });
  it('carries one opaque request id from browser transport into the Edge boundary', () => {
    const browserProvider = read('src/services/ai-authoring/gateway-ai-authoring.provider.ts');
    const edgeHandler = read('supabase/functions/ai-authoring-gateway/gateway-handler.ts');
    expect(browserProvider).toContain("'x-rafiq-request-id': requestId");
    expect(browserProvider).toContain('safeRequestId(this.#createRequestId)');
    expect(edgeHandler).toContain('resolveEdgeRequestId(request)');
    expect(edgeHandler).toContain('[EDGE_REQUEST_ID_HEADER]: requestId');
  });

  it('keeps Edge logging bounded to operational metadata', () => {
    const observability = read(
      'supabase/functions/ai-authoring-gateway/edge-request-observability.ts'
    );
    expect(observability).toContain("event: 'ai_gateway_request'");
    expect(observability).toContain('requestId: sanitizeRequestId(input.requestId)');
    expect(observability).toContain('outcome: sanitizeOutcome(input.outcome)');
    expect(observability).toContain('target: sanitizeTarget(input.target)');
    expect(observability).toContain('statusCode: sanitizeStatusCode(input.statusCode)');
    expect(observability).not.toContain('request.body');
    expect(observability).not.toContain('GEMINI_API_KEY');
    expect(observability).not.toContain('access_token');
  });
});
