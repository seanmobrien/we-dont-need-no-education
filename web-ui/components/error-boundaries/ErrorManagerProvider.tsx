'use client';

import dynamic from 'next/dynamic';
import type { ClientErrorManagerConfig } from './ClientErrorManager';

// Dynamically import ClientErrorManager with SSR disabled
const ClientErrorManager = dynamic(
  () => import('./ClientErrorManager').then(mod => ({ default: mod.ClientErrorManager })),
  { 
    ssr: false,
    loading: () => null, // No loading component needed
  }
);

/**
 * Provider wrapper for ClientErrorManager that can be safely used in server components
 * without causing them to become client components
 */
export function ErrorManagerProvider(props: ClientErrorManagerConfig) {
  return <ClientErrorManager {...props} />;
}

/**
 * Default error manager with common configuration
 */
export function DefaultErrorManager() {
  return (
    <ErrorManagerProvider
      surfaceToErrorBoundary={true}
      reportSuppressedErrors={false}
      debounceMs={1000}
    />
  );
}

/**
 * Error manager specifically configured for development
 */
export function DevErrorManager() {
  return (
    <ErrorManagerProvider
      surfaceToErrorBoundary={true}
      reportSuppressedErrors={true} // Show suppressed errors in dev
      debounceMs={500}
    />
  );
}

/**
 * Error manager specifically configured for production
 */
export function ProdErrorManager() {
  return (
    <ErrorManagerProvider
      surfaceToErrorBoundary={true}
      reportSuppressedErrors={false}
      debounceMs={2000} // Longer debounce in production
    />
  );
}