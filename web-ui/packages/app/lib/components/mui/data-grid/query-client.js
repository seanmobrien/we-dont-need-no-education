import { QueryClient } from '@tanstack/react-query';
export const createDataGridQueryClient = () => {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30 * 1000,
                gcTime: 5 * 60 * 1000,
                retry: (failureCount, error) => {
                    if (error instanceof Error && 'status' in error) {
                        const status = error.status;
                        if (status >= 400 && status < 500) {
                            return false;
                        }
                    }
                    return failureCount < 3;
                },
                refetchOnWindowFocus: false,
                refetchOnReconnect: true,
            },
            mutations: {
                retry: (failureCount, error) => {
                    if (error instanceof Error && 'status' in error) {
                        const status = error.status;
                        if (status >= 400 && status < 500) {
                            return false;
                        }
                    }
                    return failureCount < 2;
                },
            },
        },
    });
};
export const dataGridQueryClient = createDataGridQueryClient();
//# sourceMappingURL=query-client.js.map