'use client'; // Error boundaries must be Client Components

import * as React from 'react';
import { RenderErrorBoundaryFallback } from '@/components/error-boundaries/renderFallback';
import { FlagProvider } from '@/components/general/flags/flag-provider';
import { useProcessedError } from '@/lib/error-monitoring/use-processed-error';
import Link from 'next/link';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Global error boundary that catches errors in the root layout
 * This is a last resort fallback for critical application errors
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const { processedError } = useProcessedError({
    error,
    reset,
  });

  if (!processedError) {
    return null;
  }

  return (
    <html lang="en">
      <head>
        <title>Application Error - School Case Tracker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {/* Provide feature flags context so the error UI and any children can call */}
        <FlagProvider>
          <div
            style={{
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#fafafa',
            }}
          >
            {processedError ? (
              <RenderErrorBoundaryFallback
                error={processedError}
                resetErrorBoundary={reset}
              />
            ) : (
              <>
                <Link href={'/'}>Go to Home</Link>
              </>
            )}
          </div>
        </FlagProvider>
      </body>
    </html>
  );
}
