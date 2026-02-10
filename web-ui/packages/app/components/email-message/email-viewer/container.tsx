'use client';
import React from 'react';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { EmailViewerProps } from './types';
import { LoadingEmail } from './loading';
import { EmailBody } from './email-body';
import { RenderFallbackFromBoundary } from '@/components/error-boundaries/render-fallback-from-boundary';

const EmailViewer: React.FC<EmailViewerProps> = ({ emailId }) => {
  return (
    <Card>
      <CardContent>
        <QueryErrorResetBoundary>
          {({ reset }) => (
            <ErrorBoundary
              fallbackRender={RenderFallbackFromBoundary}
              onReset={reset}
            >
              <React.Suspense fallback={<LoadingEmail />}>
                <EmailBody emailId={emailId} />
              </React.Suspense>
            </ErrorBoundary>
          )}
        </QueryErrorResetBoundary>
      </CardContent>
    </Card>
  );
};

export default EmailViewer;
