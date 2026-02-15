'use client'; // Error boundaries must be Client Components - thankfully, we have WithClient ;)

import * as React from 'react';
import { RenderErrorBoundaryFallback } from '@/components/error-boundaries/render-fallback';
import { FlagProvider } from '@/components/general/flags/flag-provider';
import { ClientWrapper } from '@compliance-theater/react';
import { useProcessedError } from '@/lib/error-monitoring/use-processed-error';
import Link from 'next/link';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

const StableGlobalErrorStyles: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
  } as const;
/**
 * Global error boundary that catches errors in the root layout
 * This is a last resort fallback for critical application errors
 */
const GlobalError = ({ error, reset }: GlobalErrorProps) => {
  const { processedError } = useProcessedError({
    error,
    resetAction: reset,
  });
  return (
    <html lang="en">
      <head>
        <title>Application Error - School Case Tracker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        {/* Provide feature flags context so the error UI and any children can call */}
        <div
            style={StableGlobalErrorStyles}
          >
{processedError ? (
          <ClientWrapper>
            <FlagProvider>          
              <RenderErrorBoundaryFallback
                  error={processedError}
                  resetErrorBoundaryAction={reset}
                />          
            </FlagProvider>   
          </ClientWrapper>           
            ) : (
              <Link href={'/'}>Go to Home</Link>
            )}
        </div>
      </body>
    </html>
  );
};

export default GlobalError;