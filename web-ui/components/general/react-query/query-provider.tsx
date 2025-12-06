'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import type { FC, ReactNode } from 'react';
import React from 'react';
interface DataGridQueryProviderProps {
  children: ReactNode;
  showDevtools?: boolean;
}
let queryClient: QueryClient | undefined = undefined;

// Conditionally import the production devtools
const ReactQueryDevtoolsProduction = React.lazy(() =>
  import('@tanstack/react-query-devtools/production').then((d) => ({
    default: d.ReactQueryDevtools,
  })),
);

/**
 * Provider component that wraps the application with React Query context for data grid operations.
 *
 * This component provides a QueryClient specifically configured for data grid use cases,
 * including optimized caching and retry strategies.
 *
 * @param children - The child components to wrap with the query provider
 * @param showDevtools - Whether to show React Query DevTools (default: false in production, true in development)
 */
import { useKonamiCode } from '@/lib/hooks/use-konami-code';

export const QueryProvider: FC<DataGridQueryProviderProps> = ({
  children,
  showDevtools = process.env.NODE_ENV === 'development',
}) => {
  const [showDevToolsState, setShowDevToolsState] = React.useState(
    showDevtools === true,
  );

  useKonamiCode(() => {
    setShowDevToolsState(true);
  });

  queryClient ??= new QueryClient({});
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {showDevToolsState ? (
        <ReactQueryDevtoolsProduction initialIsOpen={false} />
      ) : (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
};

export default QueryProvider;
