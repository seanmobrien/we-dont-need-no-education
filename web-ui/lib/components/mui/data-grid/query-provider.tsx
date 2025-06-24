import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';
import { dataGridQueryClient } from './query-client';

interface DataGridQueryProviderProps {
  children: React.ReactNode;
  showDevtools?: boolean;
}

/**
 * Provider component that wraps the application with React Query context for data grid operations.
 *
 * This component provides a QueryClient specifically configured for data grid use cases,
 * including optimized caching and retry strategies.
 *
 * @param children - The child components to wrap with the query provider
 * @param showDevtools - Whether to show React Query DevTools (default: false in production, true in development)
 */
export const DataGridQueryProvider: React.FC<DataGridQueryProviderProps> = ({
  children,
  showDevtools = process.env.NODE_ENV === 'development',
}) => {
  return (
    <QueryClientProvider client={dataGridQueryClient}>
      {children}
      {showDevtools && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
};

export default DataGridQueryProvider;
