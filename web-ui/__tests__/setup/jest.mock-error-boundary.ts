 
/**
 * Test utility: Simple Error Boundary component for Jest/RTL scenarios.
 *
 * This lightweight implementation mimics the essential behavior of an error boundary
 * so tests can verify error rendering, fallback behavior, and reset flows without
 * pulling in additional dependencies.
 *
 * Features:
 * - Captures render-time errors via `getDerivedStateFromError` and `componentDidCatch`.
 * - Supports a `fallbackRender` render-prop to render a custom fallback UI.
 * - Exposes `resetErrorBoundary` to clear the error state and optionally invoke `onReset`.
 * - Invokes `onError` with the thrown error and a minimal `componentStack` payload.
 *
 * Notes:
 * - Designed for tests; not intended for production usage.
 * - Uses private class fields to keep test state isolated.
 */
import { Component, createElement  } from 'react';

/**
 * Minimal, test-focused Error Boundary.
 *
 * Usage (in tests):
 *
 * ```tsx
 * render(
 *   <ErrorBoundary
 *     fallbackRender={({ error, resetErrorBoundary }) => (
 *       <div>
 *         <span role="alert">{String(error)}</span>
 *         <button onClick={resetErrorBoundary}>Try again</button>
 *       </div>
 *     )}
 *     onError={(err) => capture(err)}
 *     onReset={() => console.log('reset')}
 *   >
 *     <ComponentThatMayThrow />
 *   </ErrorBoundary>
 * );
 * ```
 */
export default class ErrorBoundary extends Component<
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {},
  { hasError: boolean; error: Error | null }
> {
  /**
   * Optional render-prop used to produce a fallback UI when an error is captured.
   * Receives the original `error` and a `resetErrorBoundary` callback that clears
   * the error state and triggers the optional `onReset` callback.
   */
  #fallbackRender?: (props: {
    error: unknown;
    resetErrorBoundary: () => void;
  }) => React.ReactNode;
  /**
   * Children to render under normal operation (no error state).
   */
  #children: React.ReactNode;
  /** Optional callback invoked after the boundary has been reset. */
  #onReset?: () => void;
  /** Optional callback invoked when an error is caught by the boundary. */
  #onError?: (error: Error, errorInfo: { componentStack: string }) => void;

  /**
   * Create a new ErrorBoundary instance.
   *
   * @param props.children React children to render when no error is present.
   * @param props.fallbackRender Render-prop that renders the fallback UI.
   *   Receives the thrown error and a `resetErrorBoundary` function.
   * @param props.onReset Callback executed after the boundary is reset via the fallback.
   * @param props.onError Callback invoked when an error is caught with a minimal `componentStack`.
   */
  constructor(props: {
    children?: React.ReactNode;
    fallbackRender?: (props: {
      error: unknown;
      resetErrorBoundary: () => void;
    }) => React.ReactNode;
    onReset?: () => void;
    onError?: (error: Error, errorInfo: { componentStack: string }) => void;
  }) {
    super(props);
    const { fallbackRender, onReset, onError } = props;
    this.#fallbackRender = fallbackRender;
    this.#onReset = onReset;
    this.#onError = onError;
    this.#children = props.children;
    this.state = { hasError: false, error: null as Error | null };
  }

  /**
   * React error lifecycle: derive boundary state from a thrown error during render.
   *
   * @param error The error thrown by a descendant component.
   * @returns Partial state setting `hasError` and storing the `error`.
   */
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  /**
   * React error lifecycle: handle caught errors and notify test callbacks.
   *
   * @param error The error thrown by a descendant component.
   * @param errorInfo Optional React component stack info; substituted with a minimal
   * `componentStack` when not provided to simplify test assertions.
   */
  componentDidCatch(error: any, errorInfo: any) {
    if (this.#onError) {
      this.#onError(
        error,
        errorInfo || { componentStack: 'test-component-stack' },
      );
    }
  }

  /**
   * Render either the children or a fallback UI when an error is present.
   * Includes a try/catch to also catch synchronous errors thrown during this render phase
   * for deterministic testing.
   */
  render() {
    try {
      if ('hasError' in this.state && this.state.hasError) {
        const error =
          'error' in this.state && !!this.state.error
            ? this.state.error
            : new Error('An error occurred');

        if (this.#fallbackRender) {
          const FallbackWrapper = () =>
            this.#fallbackRender!({
              error,
              resetErrorBoundary: () => {
                this.setState({ hasError: false, error: null });
                this.#onReset?.();
              },
            });
          return createElement(FallbackWrapper);
        }

        return createElement('div', { role: 'alert' }, String(error));
      }
      return this.#children;
    } catch (error) {
      // Catch errors during render and trigger error boundary behavior
      if (!this.state.hasError) {
        this.setState({ hasError: true, error: error as Error });
        if (this.#onError) {
          this.#onError(error as Error, {
            componentStack: 'test-component-stack',
          });
        }
      }
      return createElement('div', { role: 'alert' }, String(error));
    }
  }
}
