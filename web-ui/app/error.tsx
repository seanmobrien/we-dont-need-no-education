'use client'; // Error boundaries must be Client Components

import { RenderErrorBoundaryFallback } from '@/components/error-boundaries/renderFallback';
import { useProcessedError } from '@/lib/error-monitoring/use-processed-error';

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Root-level error boundary that catches errors throughout the app
 * This provides a fallback UI for any unhandled errors in the app router
 */
export default function Error({ error, reset }: ErrorProps) {
  const { processedError } = useProcessedError({
    error,
    reset,
  });

  if (!processedError) {
    return null;
  }
  return (
    <div>
      <RenderErrorBoundaryFallback
        error={processedError}
        resetErrorBoundary={reset}
      />
    </div>
  );
}
