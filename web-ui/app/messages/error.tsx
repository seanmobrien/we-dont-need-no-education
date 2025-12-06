'use client'; // Error boundaries must be Client Components

import { RenderErrorBoundaryFallback } from '@/components/error-boundaries/renderFallback';
import { useProcessedError } from '@/lib/error-monitoring/use-processed-error';

type ErrorWithDigest = Error & { digest?: string };

export default function Error({
  error,
  reset,
}: {
  error: ErrorWithDigest;
  reset: () => void;
}) {
  const { processedError } = useProcessedError({
    error,
    reset,
    errorBoundary: 'MessagesError',
  });

  if (!processedError) {
    return <></>;
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
