import { QueryClient } from '@tanstack/react-query';

/**
 * Create a QueryClient instance with basic options optimized for chat operations.
 * Provides retry logic and error handling for improved reliability.
 */
export const createChatQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors like rate limits)
          if (error instanceof Error && 'status' in error) {
            const status = (error as Error & { status: number }).status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          // Retry up to 2 times for network errors
          return failureCount < 2;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
    },
  });
};

// Global query client instance
export const chatQueryClient = createChatQueryClient();