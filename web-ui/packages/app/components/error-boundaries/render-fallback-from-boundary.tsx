'use client';

import type { FallbackProps } from 'react-error-boundary';
import { RenderErrorBoundaryFallback } from './render-fallback';

export const RenderFallbackFromBoundary = ({
  error,
  resetErrorBoundary,
}: FallbackProps) => {
  return (
    <RenderErrorBoundaryFallback
      resetErrorBoundaryAction={resetErrorBoundary}
      error={error}
    />
  );
};
