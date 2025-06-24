import { QueryClient } from '@tanstack/react-query';

/**
 * Create a QueryClient instance with default options optimized for chat operations.
 *
 * This configuration is specifically tuned for chat functionality with:
 * - Aggressive caching to reduce duplicate requests
 * - Smart retry policies for streaming endpoints
 * - Error handling optimized for chat scenarios
 * - Background refetching disabled for real-time chat streams
 */
export const createChatQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0, // Chat messages are always fresh
        gcTime: 10 * 60 * 1000, // Keep chat data in cache for 10 minutes
        retry: (failureCount, error) => {
          // Handle rate limiting errors - don't retry immediately
          if (error instanceof Error && error.message.includes('Rate limit')) {
            return false;
          }
          
          // Don't retry on 4xx errors (client errors)
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
        refetchOnWindowFocus: false, // Don't refetch chat on focus
        refetchOnReconnect: true, // Refetch when connection is restored
        refetchInterval: false, // No automatic polling for chat
      },
      mutations: {
        retry: (failureCount, error) => {
          // Don't retry chat mutations on rate limit errors
          if (error instanceof Error && error.message.includes('Rate limit')) {
            return false;
          }
          
          // Don't retry mutations on 4xx errors
          if (error instanceof Error && 'status' in error) {
            const status = (error as Error & { status: number }).status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          
          // Retry up to 1 time for other errors (conservative for chat)
          return failureCount < 1;
        },
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      },
    },
  });
};

// Global query client instance for chat operations
export const chatQueryClient = createChatQueryClient();