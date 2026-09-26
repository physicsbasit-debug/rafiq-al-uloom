import { Component, Suspense, lazy, type ComponentType, type ReactNode } from 'react';

import { reportRuntimeDiagnostic } from '@services/runtime/runtime-diagnostics';

export interface DeferredWorkspaceModule {
  readonly default: ComponentType;
}

export type DeferredWorkspaceLoader = () => Promise<DeferredWorkspaceModule>;

interface WorkspaceChunkErrorBoundaryProps {
  readonly children: ReactNode;
  readonly onRetry: () => void;
}

interface WorkspaceChunkErrorBoundaryState {
  readonly hasError: boolean;
  readonly referenceId: string | null;
}

class WorkspaceChunkErrorBoundary extends Component<
  WorkspaceChunkErrorBoundaryProps,
  WorkspaceChunkErrorBoundaryState
> {
  state: WorkspaceChunkErrorBoundaryState = {
    hasError: false,
    referenceId: null,
  };

  static getDerivedStateFromError(): Partial<WorkspaceChunkErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    const referenceId = reportRuntimeDiagnostic({
      kind: 'react_render_error',
      source: 'react',
      error,
    });

    if (referenceId !== this.state.referenceId) {
      this.setState({ referenceId });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <section
        dir="rtl"
        role="alert"
        aria-live="assertive"
        style={{
          border: '1px solid #cbd5e1',
          borderRadius: '1rem',
          background: '#ffffff',
          padding: '1rem',
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: '1.1rem' }}>تعذر تحميل مساحة العمل</h2>

        <p style={{ lineHeight: 1.7 }}>تحقق من الاتصال ثم حاول مرة أخرى.</p>

        {this.state.referenceId ? (
          <p style={{ fontSize: '0.875rem' }}>
            الرقم المرجعي: <code>{this.state.referenceId}</code>
          </p>
        ) : null}

        <button
          type="button"
          onClick={this.props.onRetry}
          style={{
            minHeight: '42px',
            borderRadius: '0.75rem',
            border: '1px solid currentColor',
            background: 'transparent',
            padding: '0.55rem 0.9rem',
            cursor: 'pointer',
            font: 'inherit',
          }}
        >
          إعادة المحاولة
        </button>
      </section>
    );
  }
}

interface DeferredWorkspaceProps {
  readonly workspaceLabel: string;
  readonly load: DeferredWorkspaceLoader;
}

interface DeferredWorkspaceState {
  readonly attempt: number;
}

export class DeferredWorkspace extends Component<DeferredWorkspaceProps, DeferredWorkspaceState> {
  state: DeferredWorkspaceState = {
    attempt: 0,
  };

  private LazyWorkspace = lazy(this.props.load);

  private readonly retry = () => {
    this.LazyWorkspace = lazy(this.props.load);

    this.setState(({ attempt }) => ({
      attempt: attempt + 1,
    }));
  };

  render() {
    const LazyWorkspace = this.LazyWorkspace;

    return (
      <WorkspaceChunkErrorBoundary key={this.state.attempt} onRetry={this.retry}>
        <Suspense
          fallback={
            <p dir="rtl" role="status" aria-live="polite">
              جارٍ تحميل {this.props.workspaceLabel}...
            </p>
          }
        >
          <LazyWorkspace />
        </Suspense>
      </WorkspaceChunkErrorBoundary>
    );
  }
}
