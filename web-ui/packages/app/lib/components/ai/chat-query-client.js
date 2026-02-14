import { QueryClient } from '@tanstack/react-query';
export const createChatQueryClient = () => {
    return new QueryClient({
        defaultOptions: {
            queries: {
                retry: (failureCount, error) => {
                    if (error instanceof Error && 'status' in error) {
                        const status = error.status;
                        if (status >= 400 && status < 500) {
                            return false;
                        }
                    }
                    return failureCount < 2;
                },
                retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
                refetchOnWindowFocus: false,
                refetchOnReconnect: true,
            },
        },
    });
};
export const chatQueryClient = createChatQueryClient();
//# sourceMappingURL=chat-query-client.js.map