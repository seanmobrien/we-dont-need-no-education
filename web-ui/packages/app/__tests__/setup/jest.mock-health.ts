import type {
  MemoryStatusHookResult
} from '@/lib/hooks/types';

let originalMemoryHook: (() => MemoryStatusHookResult) | undefined = undefined;

jest.mock('@/lib/hooks/use-memory-health', () => {
  originalMemoryHook = jest.requireActual(
    '@/lib/hooks/use-memory-health',
  ).useMemoryHealth;
  return {
    useMemoryHealth: jest.fn(
      () =>
        ({
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
        }) as MemoryStatusHookResult,
    ),
  };
});

export const getOriginalMemoryHealth = () => originalMemoryHook;
