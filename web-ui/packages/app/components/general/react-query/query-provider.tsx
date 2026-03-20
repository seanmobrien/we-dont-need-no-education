'use client';
import { QueryClient, QueryClientProvider } from '@compliance-theater/react-query-compat/runtime';
import { ReactQueryDevtools } from '@compliance-theater/react-query-compat/devtools';
import type { FC, ReactNode } from 'react';
import React from 'react';
interface DataGridQueryProviderProps {
  children: ReactNode;
  showDevtools?: boolean;
}
let queryClient: QueryClient | undefined = undefined;

// Conditionally import the production devtools
const ReactQueryDevtoolsProduction = React.lazy(() =>
  import('@compliance-theater/react-query-compat/devtools/production').then((d) => ({
    default: d.ReactQueryDevtoolsProduction,
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
      {showDevToolsState &&
        (process.env.NODE_ENV === 'development' ? (
          <ReactQueryDevtools initialIsOpen={false} />
        ) : (
          <React.Suspense fallback={null}>
            <ReactQueryDevtoolsProduction initialIsOpen={false} />
          </React.Suspense>
        ))}
    </QueryClientProvider>
  );
};

export default QueryProvider;
