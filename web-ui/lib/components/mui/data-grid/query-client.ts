import { QueryClient } from '@tanstack/react-query';

/**
 * Create a QueryClient instance with default options for data grid queries.
 *
 * This configuration is optimized for data grid use cases with:
 * - Short stale times to ensure data freshness
 * - Longer cache times for better performance
 * - Retry policies suitable for grid data fetching
 */
export const createDataGridQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 60 seconds - align with cache timeout
        gcTime: 5 * 60 * 1000, // 5 minutes - keep in cache for 5 minutes
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error instanceof Error && 'status' in error) {
            const status = (error as Error & { status: number }).status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        refetchOnWindowFocus: false, // Don't refetch when window gains focus
        refetchOnReconnect: true, // Refetch when connection is restored
      },
      mutations: {
        retry: (failureCount, error) => {
          // Don't retry mutations on 4xx errors
          if (error instanceof Error && 'status' in error) {
            const status = (error as Error & { status: number }).status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          // Retry up to 2 times for other errors
          return failureCount < 2;
        },
      },
    },
  });
};

// Global query client instance for data grid operations
export const dataGridQueryClient = createDataGridQueryClient();
