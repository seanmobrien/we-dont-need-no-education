'use server';

import type { FallbackProps } from 'react-error-boundary';
import { RenderErrorBoundaryFallback } from './render-fallback';

export const RenderFallbackFromBoundary = async ({ error, resetErrorBoundary }: FallbackProps) => {
  async function resetErrorBoundaryAction() {
    'use server';
    resetErrorBoundary();
  }

  return <RenderErrorBoundaryFallback 
    resetErrorBoundaryAction={resetErrorBoundaryAction} 
    error={error}
    />
};
