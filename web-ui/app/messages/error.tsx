'use client'; // Error boundaries must be Client Components

import { RenderErrorBoundaryFallback } from '@/components/error-boundaries/renderFallback';
import { errorReporter, ErrorSeverity } from '@/lib/error-monitoring';
import { useEffect } from 'react';

type ErrorWithDigest = Error & { digest?: string };

export default function Error({
  error,
  reset,
}: {
  error: ErrorWithDigest;
  reset: () => void;
}) {
  useEffect(() => {
    if (error) {
      errorReporter.reportBoundaryError(
        error,
        {
          errorBoundary: 'MessagesError',
        },
        ErrorSeverity.MEDIUM,
      );
    }
  }, [error]);

  return (
    <div>
      <RenderErrorBoundaryFallback error={error} resetErrorBoundary={reset} />
    </div>
  );
}
