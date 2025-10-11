import type {
  MemoryStatusHookResult,
  DatabaseHealthResponse,
  ChatHealthHookResponse,
} from '@/lib/hooks/types';

let originalMemoryHook: (() => MemoryStatusHookResult) | undefined = undefined;
let originalDatabaseHook: (() => DatabaseHealthResponse) | undefined =
  undefined;
let originalChatHook: (() => ChatHealthHookResponse) | undefined = undefined;

jest.mock('@/lib/hooks/use-memory-health', () => {
  originalMemoryHook = jest.requireActual(
    '@/lib/hooks/use-memory-health',
  ).useMemoryHealth;
  return {
    useMemoryHealth: jest.fn(
      () =>
        ({
          healthStatus: 'healthy',
          subsystems: {
            db: 'healthy',
            vectorStore: 'healthy',
            graphStore: 'healthy',
            historyStore: 'healthy',
            authService: 'healthy',
          },
          refreshInterval: 60000,
          isLoading: false,
          isFetching: false,
          isError: false,
          error: null,
          data: {
            status: 'healthy',
            subsystems: {
              db: 'healthy',
              vectorStore: 'healthy',
              graphStore: 'healthy',
              historyStore: 'healthy',
              authService: 'healthy',
            },
          },
        }) as MemoryStatusHookResult,
    ),
  };
});

jest.mock('@/lib/hooks/use-database-health', () => {
  originalDatabaseHook = jest.requireActual(
    '@/lib/hooks/use-database-health',
  ).useDatabaseHealth;
  return {
    useDatabaseHealth: jest.fn(
      () =>
        ({
          healthStatus: 'ok',
          refreshInterval: 60000,
          isLoading: false,
          isFetching: false,
          isError: false,
          error: null,
          data: 'ok',
        }) as DatabaseHealthResponse,
    ),
  };
});

jest.mock('@/lib/hooks/use-chat-health', () => {
  originalChatHook = jest.requireActual(
    '@/lib/hooks/use-chat-health',
  ).useChatHealth;
  return {
    useChatHealth: jest.fn(
      () =>
        ({
          healthStatus: 'ok',
          refreshInterval: 60000,
          isLoading: false,
          isFetching: false,
          isError: false,
          error: null,
          data: {
            status: 'ok',
            subsystems: {
              cache: 'ok',
              queue: 'ok',
            },
          },
        }) as ChatHealthHookResponse,
    ),
  };
});

export const getOriginalMemoryHealth = () => originalMemoryHook;
export const getOriginalDatabaseHealth = () => originalDatabaseHook;
export const getOriginalChatHealth = () => originalChatHook;
