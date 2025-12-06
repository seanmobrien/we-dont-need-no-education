'use client';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { JSX, PropsWithChildren } from 'react';
import { RenderErrorBoundaryFallback } from './renderFallback';
import { useProcessedError } from '@/lib/error-monitoring/use-processed-error';

export const DefaultErrorFallbackRender = ({
  error,
  resetErrorBoundary: reset,
}: FallbackProps): JSX.Element => {
  const { processedError } = useProcessedError({
    error,
    reset,
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
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export const DefaultErrorBoundary = ({ children }: PropsWithChildren<{}>) => {
  return (
    <ErrorBoundary FallbackComponent={DefaultErrorFallbackRender}>
      {children}
    </ErrorBoundary>
  );
};
