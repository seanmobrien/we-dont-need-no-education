'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { RenderErrorBoundaryFallback } from '@/components/error-boundaries/renderFallback';
import { errorReporter, ErrorSeverity } from '@/lib/error-monitoring';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Root-level error boundary that catches errors throughout the app
 * This provides a fallback UI for any unhandled errors in the app router
 */
export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Report the error with high severity since it reached the root level
    errorReporter.reportBoundaryError(
      error,
      {
        errorBoundary: 'RootError',
      },
      ErrorSeverity.HIGH
    );
  }, [error]);

  return (
    <div>
      <RenderErrorBoundaryFallback error={error} resetErrorBoundary={reset} />
    </div>
  );
}