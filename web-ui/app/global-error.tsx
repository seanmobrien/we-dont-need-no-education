'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import { errorReporter, ErrorSeverity } from '@/lib/error-monitoring';
import { RenderErrorBoundaryFallback } from '@/components/error-boundaries/renderFallback';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Global error boundary that catches errors in the root layout
 * This is a last resort fallback for critical application errors
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Report the critical error - this is the last line of defense
    errorReporter.reportBoundaryError(
      error,
      {
        errorBoundary: 'GlobalError',
      },
      ErrorSeverity.CRITICAL
    );
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Application Error - School Case Tracker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {/* Use the same beautiful error dialog but in a minimal layout */}
        <div style={{ 
          minHeight: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: '#fafafa'
        }}>
          <RenderErrorBoundaryFallback 
            error={error} 
            resetErrorBoundary={reset} 
          />
        </div>
      </body>
    </html>
  );
}