"use client";
import { ErrorBoundary } from 'react-error-boundary';
import { PropsWithChildren } from "react";
import { RenderErrorBoundaryFallback } from './renderFallback';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export const DefaultErrorBoundary = ({children}: PropsWithChildren<{}>) => {
  return (
    <ErrorBoundary FallbackComponent={RenderErrorBoundaryFallback}>
      {children}
    </ErrorBoundary>
  );
};
