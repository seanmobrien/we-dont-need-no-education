/**
 * @jest-environment node
 */
/**
 * @file route.test.ts
 * @description Unit tests for the health check API route at app/api/health/route.ts
 */
import { GET } from '@/app/api/health/route';
import { logger, ILogger } from '@/lib/logger';

describe('app/api/health/route GET', () => {
  let logInstance: ILogger & { info: jest.Mock; error: jest.Mock };

  beforeEach(async () => {
    logInstance = (await logger()) as unknown as ILogger & { info: jest.Mock; error: jest.Mock };
    // jest.clearAllMocks();
    delete process.env.IS_BUILDING;
    delete process.env.NEXT_PHASE;
  });

  it('returns 200 with expected system statuses', async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    // Top-level keys
    expect(json).toHaveProperty('database');
    expect(json).toHaveProperty('chat');
    // Individual system statuses
    expect(json.database.status).toBe('ok');
    expect(json.chat.status).toBe('ok');
    // Nested systems under chat
    expect(json.chat.cache.status).toBe('ok');
    expect(json.chat.queue.status).toBe('ok');
  });

  it('logs route processing (info) via wrapRouteRequest by default', async () => {
    await GET();
    expect(logInstance.info).toHaveBeenCalledTimes(1);
    const firstCallArgs = (logInstance.info as jest.Mock).mock.calls[0];
    expect(firstCallArgs[0]).toContain('Processing route request');
  });

  it('returns build fallback when build phase env vars are set (IS_BUILDING)', async () => {
    process.env.IS_BUILDING = '1';
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('__status', 'Service disabled during build.');
  });

  it('returns build fallback when NEXT_PHASE indicates production build', async () => {
    process.env.NEXT_PHASE = 'phase-production-build';
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('__status', 'Service disabled during build.');
  });
});
