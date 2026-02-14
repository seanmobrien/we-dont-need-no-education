'use client';
import * as React from 'react';
import { RenderErrorBoundaryFallback } from '@/components/error-boundaries/render-fallback';
import { FlagProvider } from '@compliance-theater/feature-flags/components/flag-provider';
import { ClientWrapper } from '@/lib/react-util';
import { useProcessedError } from '@/lib/error-monitoring/use-processed-error';
import Link from 'next/link';
const StableGlobalErrorStyles = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fafafa',
};
const GlobalError = ({ error, reset }) => {
    const { processedError } = useProcessedError({
        error,
        resetAction: reset,
    });
    return (<html lang="en">
      <head>
        <title>Application Error - School Case Tracker</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
      </head>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif' }}>
        
        <div style={StableGlobalErrorStyles}>
        {processedError ? (<ClientWrapper>
            <FlagProvider>          
              <RenderErrorBoundaryFallback error={processedError} resetErrorBoundaryAction={reset}/>          
            </FlagProvider>   
          </ClientWrapper>) : (<Link href={'/'}>Go to Home</Link>)}
        </div>
      </body>
    </html>);
};
export default GlobalError;
//# sourceMappingURL=global-error.jsx.map