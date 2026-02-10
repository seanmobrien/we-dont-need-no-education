'use client'; // Error boundaries must be Client Components

import { RenderErrorBoundaryFallback } from '@/components/error-boundaries/render-fallback';
import { useProcessedError } from '@/lib/error-monitoring/use-processed-error';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Root-level error boundary that catches errors throughout the app
 * This provides a fallback UI for any unhandled errors in the app router
 */
const Error = ({ error, reset }: ErrorProps) => {
  const { processedError } = useProcessedError({
    error,
    resetAction: reset,
  });
  return (
    <>
    {!!processedError ? (
      <div>
        <RenderErrorBoundaryFallback
          error={processedError}
          resetErrorBoundaryAction={reset}   
        />
    </div>
    ) : (
      <div>
        <p>An unexpected error occurred. Please try again later.</p>
      </div>
    )}
    </>
  );
};

export default Error;
