'use client'; // Error boundaries must be Client Components

import { RenderErrorBoundaryFallback } from '@/components/error-boundaries/render-fallback';
import { useProcessedError } from '@/lib/error-monitoring/use-processed-error';

type ErrorWithDigest = Error & { digest?: string };

export type ErrorMessageProps = {
  error: ErrorWithDigest;
  resetAction: () => void;
}

export default function Error({
  error,
  resetAction,
}: ErrorMessageProps) {
  const { processedError } = useProcessedError({
    error,
    resetAction,
    errorBoundary: 'MessagesError',
  });

  return (<>
  {processedError && ( <div>
      <RenderErrorBoundaryFallback
        error={processedError}
        resetErrorBoundaryAction={resetAction}
      />
    </div>)}</>);
}
