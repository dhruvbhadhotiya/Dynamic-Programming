import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    const { children, fallback, title } = this.props;
    const { hasError } = this.state;

    if (!hasError) {
      return children;
    }

    if (fallback !== undefined) {
      return fallback;
    }

    return (
      <div role="alert" className="mx-auto max-w-2xl rounded-2xl border border-bad/30 bg-surface p-8">
        <p className="text-sm font-bold uppercase tracking-wider text-bad">
          <span aria-hidden>⚠️ </span>Something went wrong
        </p>
        <h2 className="mt-2 text-3xl font-bold">{title ?? 'This page hit a snag.'}</h2>
        <p className="mt-3 text-muted">
          Something went wrong while loading this page. Try again or head back to the playground.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-lg bg-brand px-4 py-2 font-semibold text-white"
          >
            Try again
          </button>
          <Link
            to="/"
            className="inline-block rounded-lg border border-line bg-surface px-4 py-2 font-semibold text-ink hover:border-brand"
          >
            Back to the playground
          </Link>
        </div>
      </div>
    );
  }
}
