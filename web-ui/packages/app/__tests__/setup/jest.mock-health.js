let originalMemoryHook = undefined;
jest.mock('@/lib/hooks/use-memory-health', () => {
    originalMemoryHook = jest.requireActual('@/lib/hooks/use-memory-health').useMemoryHealth;
    return {
        useMemoryHealth: jest.fn(() => ({
            health: {
                memory: {
                    status: 'healthy',
                    subsystems: {
                        db: 'healthy',
                        vectorStore: 'healthy',
                        graphStore: 'healthy',
                        historyStore: 'healthy',
                        authService: 'healthy',
                    },
                },
                chat: {
                    status: 'healthy',
                    subsystems: {
                        cache: 'healthy',
                        queue: 'healthy',
                        tools: 'healthy',
                    },
                },
                database: 'healthy'
            },
            refreshInterval: 60000,
            isLoading: false,
            isFetching: false,
            isError: false,
            error: null,
        })),
    };
});
export const getOriginalMemoryHealth = () => originalMemoryHook;
//# sourceMappingURL=jest.mock-health.js.map