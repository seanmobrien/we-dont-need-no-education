// Prevent importing Next's server runtime helpers which reference web globals
// not present in the Jest/node environment.
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn(),
  },
}));

import { resetLastStrategy } from '@/lib/ai/tools/todo/todo-manager-factory';
// factory is dynamically imported in each test so module-level state can be
// reset between tests (LastStrategy). See each test for the dynamic import.
import { wellKnownFlag } from '@/lib/site-util/feature-flags/feature-flag-with-refresh';

type FlagValue = {
  value: unknown;
  lastError: null;
  expiresAt: number;
  ttlRemaining: number;
  isStale: boolean;
  userId: string;
  isDisposed: boolean;
  forceRefresh: jest.Mock;
  dispose: jest.Mock;
};

// note: the factory now returns config+metadata rather than creating live
// storage. We only need to mock flags below.

jest.mock('@/lib/site-util/feature-flags/feature-flag-with-refresh', () => ({
  wellKnownFlag: jest.fn(),
}));

const createFlag = (value: unknown): FlagValue => ({
  value,
  lastError: null,
  expiresAt: Date.now() + 1000,
  ttlRemaining: 1000,
  isStale: false,
  userId: 'server',
  isDisposed: false,
  forceRefresh: jest.fn(),
  dispose: jest.fn(),
});

describe('createTodoManagerFromFeatureFlag', () => {
  beforeEach(() => {
    resetLastStrategy();
  });

  it('creates redis storage with parsed config and fallback', async () => {
    (wellKnownFlag as jest.Mock).mockImplementation((key: string) => {
      switch (key) {
        case 'todo_storage_strategy':
          return Promise.resolve(createFlag('redis'));
        case 'todo_storage_in_memory_config':
          return Promise.resolve(
            createFlag({ value: { keyPrefix: 'local-prefix' } }),
          );
        case 'todo_storage_redis_config':
          return Promise.resolve(
            createFlag('{"ttl":3600,"keyPrefix":"redis-prefix"}'),
          );
        default:
          throw new Error(`Unexpected flag ${key}`);
      }
    });

    const { createStorageStrategyFromFlags } = jest.requireActual(
      '@/lib/ai/tools/todo/todo-manager-factory',
    );
    const result = await createStorageStrategyFromFlags();

    expect(result.strategy).toBeDefined();
    expect(typeof result.stale).toBe('boolean');
    expect(result.config).toEqual({
      ttl: 3600,
      keyPrefix: 'redis-prefix',
    });
    expect(result.fallback).toEqual({});
  });

  it('disables fallback when redis config specifies enableFallback false', async () => {
    (wellKnownFlag as jest.Mock).mockImplementation((key: string) => {
      switch (key) {
        case 'todo_storage_strategy':
          return Promise.resolve(createFlag('redis'));
        case 'todo_storage_in_memory_config':
          return Promise.resolve(createFlag('{}'));
        case 'todo_storage_redis_config':
          return Promise.resolve(
            createFlag({ value: { enableFallback: false } }),
          );
        default:
          throw new Error(`Unexpected flag ${key}`);
      }
    });
  });
});
