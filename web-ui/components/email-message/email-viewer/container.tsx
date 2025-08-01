'use client';
import React from 'react';
import {
  Card,
  CardContent,
} from '@mui/material';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { ErrorBoundary } from 'react-error-boundary';
import { EmailViewerProps } from './types';
import { LoadingEmail } from './loading'
import { EmailBody } from './email-body';
import { RenderErrorBoundaryFallback } from '@/components/error-boundaries/renderFallback';

const EmailViewer: React.FC<EmailViewerProps> = ({ emailId }) => {

  return (
    <Card>
      <CardContent>
        <QueryErrorResetBoundary>
        {({ reset }) => (
        <ErrorBoundary
          fallbackRender={RenderErrorBoundaryFallback}
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

