'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';
import { chatQueryClient } from './chat-query-client';

interface ChatQueryProviderProps {
  children: React.ReactNode;
}

/**
 * Standard QueryClientProvider for chat operations with TanStack Query.
 */
export const ChatQueryProvider: React.FC<ChatQueryProviderProps> = ({
  children,
}) => {
  return (
    <QueryClientProvider client={chatQueryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  );
};