import { Component, type ReactNode } from 'react';

import { reportRuntimeDiagnostic, type RuntimeDiagnosticReporter } from './runtime-diagnostics';

interface RuntimeErrorBoundaryProps {
  readonly children: ReactNode;
  readonly reportDiagnostic?: RuntimeDiagnosticReporter;
  readonly reloadPage?: () => void;
}

interface RuntimeErrorBoundaryState {
  readonly hasError: boolean;
  readonly referenceId: string | null;
}

export class RuntimeErrorBoundary extends Component<
  RuntimeErrorBoundaryProps,
  RuntimeErrorBoundaryState
> {
  state: RuntimeErrorBoundaryState = {
    hasError: false,
    referenceId: null,
  };

  static getDerivedStateFromError(): Partial<RuntimeErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    const reporter = this.props.reportDiagnostic ?? reportRuntimeDiagnostic;
    const referenceId = reporter({
      kind: 'react_render_error',
      source: 'react',
      error,
    });

    if (referenceId !== this.state.referenceId) {
      this.setState({ referenceId });
    }
  }

  private readonly reload = () => {
    const reloadPage = this.props.reloadPage ?? (() => window.location.reload());
    reloadPage();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main dir="rtl" className="min-h-screen bg-slate-50 px-4 py-12 text-slate-900">
        <section
          role="alert"
          aria-live="assertive"
          className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h1 className="text-xl font-bold">تعذر عرض الصفحة</h1>
          <p className="mt-3 leading-7 text-slate-700">
            حدث خطأ غير متوقع أثناء تشغيل التطبيق. أعد تحميل الصفحة للمتابعة.
          </p>

          {this.state.referenceId ? (
            <p className="mt-4 text-sm text-slate-600">
              الرقم المرجعي:{' '}
              <code className="font-mono" data-testid="runtime-reference-id">
                {this.state.referenceId}
              </code>
            </p>
          ) : null}

          <button
            type="button"
            onClick={this.reload}
            className="mt-5 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white"
          >
            إعادة تحميل التطبيق
          </button>
        </section>
      </main>
    );
  }
}
