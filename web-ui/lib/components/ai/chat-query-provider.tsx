import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';
import { chatQueryClient } from './chat-query-client';

interface ChatQueryProviderProps {
  children: React.ReactNode;
  showDevtools?: boolean;
}

/**
 * Provider component that wraps chat components with React Query context for chat operations.
 *
 * This component provides a QueryClient specifically configured for chat use cases,
 * including optimized retry strategies, error handling, and monitoring capabilities.
 *
 * @param children - The child components to wrap with the chat query provider
 * @param showDevtools - Whether to show React Query DevTools (default: false in production, true in development)
 */
export const ChatQueryProvider: React.FC<ChatQueryProviderProps> = ({
  children,
  showDevtools = process.env.NODE_ENV === 'development',
}) => {
  return (
    <QueryClientProvider client={chatQueryClient}>
      {children}
      {showDevtools && (
        <ReactQueryDevtools 
          initialIsOpen={false}
          buttonPosition="bottom-left"
          position="bottom"
        />
      )}
    </QueryClientProvider>
  );
};