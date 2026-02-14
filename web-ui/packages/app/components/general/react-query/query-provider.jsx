'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import React from 'react';
let queryClient = undefined;
const ReactQueryDevtoolsProduction = React.lazy(() => import('@tanstack/react-query-devtools/production').then((d) => ({
    default: d.ReactQueryDevtools,
})));
import { useKonamiCode } from '@/lib/hooks/use-konami-code';
export const QueryProvider = ({ children, showDevtools = process.env.NODE_ENV === 'development', }) => {
    const [showDevToolsState, setShowDevToolsState] = React.useState(showDevtools === true);
    useKonamiCode(() => {
        setShowDevToolsState(true);
    });
    queryClient ??= new QueryClient({});
    return (<QueryClientProvider client={queryClient}>
      {children}
      {showDevToolsState &&
            (process.env.NODE_ENV === 'development' ? (<ReactQueryDevtools initialIsOpen={false}/>) : (<React.Suspense fallback={null}>
            <ReactQueryDevtoolsProduction initialIsOpen={false}/>
          </React.Suspense>))}
    </QueryClientProvider>);
};
export default QueryProvider;
//# sourceMappingURL=query-provider.jsx.map