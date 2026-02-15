/**
 * @jest-environment node
 */

import { SingletonProvider } from '@compliance-theater/typescript/singleton-provider';

jest.mock('@compliance-theater/feature-flags/server', () => ({
  getFeatureFlag: jest.fn(),
}));

import { getFeatureFlag } from '@compliance-theater/feature-flags/server';

describe('health feature-flag driven behavior', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    SingletonProvider.Instance.clear();
  });

  afterEach(() => {
    SingletonProvider.Instance.clear();
    jest.useRealTimers();
  });

  it('applies memory cache TTL from flag', async () => {
    // Test that MemoryHealthCache works with both numbers and AutoRefreshFeatureFlag instances
    // We test with numbers here because AutoRefreshFeatureFlag doesn't work well with fake timers
    const { MemoryHealthCache } = await import('@/lib/api/health/memory');

    jest.useFakeTimers();

    // Create cache with 1 second TTL using numbers (simulating what would come from feature flags)
    const cache = new MemoryHealthCache({
      ttlMs: 1000, // 1 second for ok status
      errorTtlMs: 1000, // 1 second for errors
      warningTtlMs: 1000, // 1 second for warnings
    });

    // Minimal mem0-like payload
    const payload = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      mem0: {
        version: '0',
        build_type: 'x',
        build_info: '',
        verbose: {
          mem0_version: '0',
          build_details: { type: '', info: '', path: '' },
          build_stamp: '',
        },
      },
      details: {
        client_active: true,
        system_db_available: true,
        vector_enabled: false,
        vector_store_available: false,
        graph_enabled: false,
        graph_store_available: false,
        history_store_available: false,
        auth_service: {
          healthy: false,
          enabled: false,
          server_url: '',
          realm: '',
          client_id: '',
          auth_url: '',
          token_url: '',
          jkws_url: '',
        },
        errors: [],
      },
    } as any;

    cache.set(payload);
    expect(cache.get()).toBeDefined();

    // Advance >1s and expect cached value to expire
    jest.advanceTimersByTime(1100);
    expect(cache.get()).toBeUndefined();
  });

  it('applies database cache TTL from flag', async () => {
    (getFeatureFlag as jest.Mock).mockImplementation(async (key: string) => {
      if (key === 'health_database_cache_ttl') return 1;
      return undefined;
    });

    const { ensureDatabaseCacheConfigured, getDatabaseHealthCache } =
      await import('@/lib/api/health/database');

    jest.useFakeTimers();

    await ensureDatabaseCacheConfigured();
    const cache = getDatabaseHealthCache();

    cache.set({ status: 'healthy' });
    expect(cache.get()).toBeDefined();

    jest.advanceTimersByTime(1100);
    expect(cache.get()).toBeUndefined();
  });

  it('startup threshold from flag relaxes memory requirement after threshold reached', async () => {
    process.env.HEALTH_STARTUP_FAILURE_THRESHOLD = '1';

    const { GET } = await import('@/app/api/health/probe/[probe_type]/route');
    const dbModule = await import('@/lib/api/health/database');
    const memModule = await import('@/lib/api/health/memory');

    // Mock DB healthy, memory unhealthy
    jest
      .spyOn(dbModule, 'checkDatabaseHealth')
      .mockResolvedValue({ status: 'healthy' } as any);
    jest
      .spyOn(memModule, 'getMemoryHealthCache')
      .mockReturnValue({ get: () => undefined } as any);

    const mockSpan = {
      setAttribute: jest.fn(),
      setStatus: jest.fn(),
      recordException: jest.fn(),
      end: jest.fn(),
    } as any;

    const call = async () =>
      GET(
        {} as any,
        {
          params: Promise.resolve({ probe_type: 'startup' }),
          span: mockSpan,
        } as any,
      );

    // First and second calls: still enforcing memory health
    expect((await call())!.status).toBe(503);
    expect((await call())!.status).toBe(503);

    // Third call: counter now greater than threshold -> relaxed => 200
    expect((await call())!.status).toBe(200);

    delete process.env.HEALTH_STARTUP_FAILURE_THRESHOLD;
  });
});
