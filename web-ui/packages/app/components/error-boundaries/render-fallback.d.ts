import type React from 'react';
import type { FallbackProps } from 'react-error-boundary';

/**
 * Type declarations for error boundary fallback UI component.
 *
 * This module provides the main React component for rendering user-friendly error
 * dialogs when errors are caught by React Error Boundaries. Implements
 * Material-UI based error recovery UI with contextual recovery actions.
 *
 * Key features:
 * - **Material-UI Dialog**: Full-screen mobile, modal desktop presentation
 * - **Error Classification**: Automatically categorizes errors (network, validation, etc.)
 * - **Recovery Actions**: Contextual recovery options based on error type
 * - **Technical Details**: Collapsible stack trace for debugging
 * - **Auto-reset**: Closes dialog and resets error boundary on action
 * - **Responsive Design**: Adapts to screen size with fullScreen on mobile
 * - **Accessibility**: ARIA labels and keyboard navigation support
 * - **Memoization**: Optimized re-renders with useMemo for complex UI elements
 *
 * This is a Next.js client component ('use client' directive) that can be used
 * directly or wrapped by the RenderFallbackFromBoundary adapter for server-side
 * error boundary integration.
 *
 * @module components/error-boundaries/render-fallback
 */

declare module '@/components/error-boundaries/render-fallback' {
  /**
   * Props for RenderErrorBoundaryFallback component.
   *
   * Defines the interface for error information and reset callback passed
   * to the error fallback UI component.
   */
  export interface RenderErrorBoundaryFallbackProps {
    /**
     * The error that was caught by the error boundary.
     *
     * Can be any type thrown by application code:
     * - Error instances (standard JavaScript errors)
     * - LoggedError instances (custom error class with context)
     * - Strings (from throw "message")
     * - Other values (objects, numbers, etc.)
     *
     * @example
     * ```typescript
     * // Error instance
     * error = new Error('Failed to fetch user data');
     *
     * // LoggedError with context
     * error = new LoggedError('Validation failed', { field: 'email' });
     *
     * // String error
     * error = 'Network timeout';
     * ```
     */
    error: unknown;

    /**
     * Callback to reset the error boundary and retry rendering.
     *
     * Invoked when user selects a recovery action or closes the dialog.
     * Should clear error state and attempt to re-render the component tree.
     * Called after a 300ms delay to allow dialog close animation.
     *
     * @param args - Optional arguments passed to reset handler
     *
     * @example
     * ```typescript
     * const resetAction = () => {
     *   console.log('Resetting error boundary');
     *   // Clear error state
     *   // Re-render component tree
     * };
     * ```
     */
    resetErrorBoundaryAction: (...args: unknown[]) => void;
  }

  /**
   * Render a comprehensive error dialog with recovery options.
   *
   * Primary error fallback UI component providing:
   * - Error classification and contextual messaging
   * - Up to 3 prioritized recovery actions based on error type
   * - Collapsible technical details (error message and stack trace)
   * - Report issue and retry buttons
   * - Full-screen mobile layout, modal desktop layout
   * - Automatic error boundary reset on dialog close
   *
   * **Recovery Actions**:
   * The component uses `getRecoveryActions()` and `getDefaultRecoveryAction()`
   * from the error monitoring system to provide contextual recovery options:
   * - Network errors: Retry request, check connection, use cached data
   * - Validation errors: Clear form, edit input, contact support
   * - Permission errors: Re-authenticate, contact admin
   * - Generic errors: Reload page, clear cache, report bug
   *
   * **Error Classification**:
   * Automatically categorizes errors as:
   * - `network_error`: Fetch failures, timeouts, connection issues
   * - `validation_error`: Form validation, data integrity issues
   * - `permission_error`: Authentication, authorization failures
   * - `unknown_error`: Uncategorized errors
   *
   * **Dialog Behavior**:
   * - Cannot be dismissed with Escape key (disableEscapeKeyDown)
   * - Cannot be dismissed by clicking backdrop (onClose={fnNoOp})
   * - Closes only via recovery action buttons
   * - Auto-resets error boundary 300ms after close
   *
   * @param props - Component props containing error and reset callback
   * @returns React element rendering the error dialog
   *
   * @example
   * ```typescript
   * // Used directly in Error Boundary
   * import { ErrorBoundary } from 'react-error-boundary';
   * import { RenderErrorBoundaryFallback } from '@/components/error-boundaries/render-fallback';
   *
   * function App() {
   *   const handleReset = () => {
   *     console.log('Resetting after error');
   *   };
   *
   *   return (
   *     <ErrorBoundary
   *       FallbackComponent={(props) => (
   *         <RenderErrorBoundaryFallback
   *           error={props.error}
   *           resetErrorBoundaryAction={props.resetErrorBoundary}
   *         />
   *       )}
   *       onReset={handleReset}
   *     >
   *       <MyComponent />
   *     </ErrorBoundary>
   *   );
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Custom error boundary implementation
   * class MyErrorBoundary extends React.Component {
   *   state = { error: null };
   *
   *   static getDerivedStateFromError(error: Error) {
   *     return { error };
   *   }
   *
   *   resetError = () => {
   *     this.setState({ error: null });
   *   };
   *
   *   render() {
   *     if (this.state.error) {
   *       return (
   *         <RenderErrorBoundaryFallback
   *           error={this.state.error}
   *           resetErrorBoundaryAction={this.resetError}
   *         />
   *       );
   *     }
   *     return this.props.children;
   *   }
   * }
   * ```
   */
  export function RenderErrorBoundaryFallback(
    props: RenderErrorBoundaryFallbackProps,
  ): React.ReactNode;
}

/**
 * Type declarations for error boundary fallback adapter component.
 *
 * This module provides a Next.js-optimized adapter component that wraps
 * RenderErrorBoundaryFallback with server action support for error boundary
 * reset operations in the App Router.
 *
 * Key features:
 * - **Next.js Server Actions**: Wraps reset callback in async server action
 * - **App Router Compatible**: Designed for Next.js 13+ App Router architecture
 * - **react-error-boundary Integration**: Direct adapter for FallbackProps interface
 * - **Seamless Prop Mapping**: Automatically adapts standard props to internal format
 *
 * The component wraps the resetErrorBoundary callback in a Next.js server action
 * using the 'use server' directive, enabling proper error boundary resets in
 * server components and React Server Components (RSC) contexts.
 *
 * @module components/error-boundaries/render-fallback-from-boundary
 */

declare module '@/components/error-boundaries/render-fallback-from-boundary' {
  /**
   * Adapter component for react-error-boundary FallbackProps interface.
   *
   * Thin wrapper around RenderErrorBoundaryFallback that adapts the standard
   * react-error-boundary `FallbackProps` interface to the component's internal
   * props interface. Wraps the reset callback in a Next.js server action for
   * App Router compatibility.
   *
   * **Prop Mapping**:
   * - `error` → `error` (passed through)
   * - `resetErrorBoundary` → `resetErrorBoundaryAction` (wrapped in async server action)
   *
   * **Next.js Server Action Integration**:
   * The component creates an async function with the 'use server' directive,
   * enabling proper error boundary resets in server components and RSC contexts.
   * This ensures error recovery works correctly in Next.js App Router:
   * ```typescript
   * async function resetErrorBoundaryAction() {
   *   'use server'
   *   resetErrorBoundary();
   * }
   * ```
   *
   * This is the recommended component to use with react-error-boundary's
   * ErrorBoundary component in Next.js App Router applications as it matches
   * the expected FallbackComponent signature with server-side support.
   *
   * @param props - Standard react-error-boundary FallbackProps
   * @param props.error - The caught error
   * @param props.resetErrorBoundary - Function to reset the error boundary
   * @returns React element rendering the error dialog
   *
   * @example
   * ```typescript
   * import { ErrorBoundary } from 'react-error-boundary';
   * import { RenderFallbackFromBoundary } from '@/components/error-boundaries/render-fallback-from-boundary';
   *
   * // Direct usage with ErrorBoundary in Next.js App Router (recommended)
   * function App() {
   *   return (
   *     <ErrorBoundary FallbackComponent={RenderFallbackFromBoundary}>
   *       <MyComponent />
   *     </ErrorBoundary>
   *   );
   * }
   * ```
   *
   * @example
   * ```typescript
   * // With onReset handler in Next.js App Router
   * import { ErrorBoundary } from 'react-error-boundary';
   * import { RenderFallbackFromBoundary } from '@/components/error-boundaries/render-fallback-from-boundary';
   *
   * function App() {
   *   const handleReset = (details: { reason: string }) => {
   *     console.log('Error boundary reset:', details);
   *     // Perform cleanup, analytics, etc.
   *   };
   *
   *   return (
   *     <ErrorBoundary
   *       FallbackComponent={RenderFallbackFromBoundary}
   *       onReset={handleReset}
   *       resetKeys={['user', 'locale']} // Reset on these deps change
   *     >
   *       <MyComponent />
   *     </ErrorBoundary>
   *   );
   * }
   * ```
   *
   * @example
   * ```typescript
   * // Programmatic error handling in Next.js client component
   * 'use client';
   * import { useErrorHandler, ErrorBoundary } from 'react-error-boundary';
   * import { RenderFallbackFromBoundary } from '@/components/error-boundaries/render-fallback-from-boundary';
   *
   * function MyComponent() {
   *   const handleError = useErrorHandler();
   *
   *   const fetchData = async () => {
   *     try {
   *       const data = await fetch('/api/data');
   *       // Process data...
   *     } catch (err) {
   *       handleError(err); // Triggers error boundary
   *     }
   *   };
   *
   *   return <button onClick={fetchData}>Load Data</button>;
   * }
   *
   * function App() {
   *   return (
   *     <ErrorBoundary FallbackComponent={RenderFallbackFromBoundary}>
   *       <MyComponent />
   *     </ErrorBoundary>
   *   );
   * }
   * ```
   */
  export function RenderFallbackFromBoundary(
    props: FallbackProps,
  ): React.ReactElement;
}
