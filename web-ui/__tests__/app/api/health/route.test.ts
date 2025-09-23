/**
 * @jest-environment node
 */
/**
 * @file route.test.ts
 * @description Unit tests for the health check API route at app/api/health/route.ts
 */
import { GET } from '@/app/api/health/route';
import { logger, ILogger } from '@/lib/logger';

// Mock the memory client factory
jest.mock('@/lib/ai/mem0/memoryclient-factory', () => ({
  memoryClientFactory: jest.fn(() => ({
    healthCheck: jest.fn(),
  })),
}));

describe('app/api/health/route GET', () => {
  let logInstance: ILogger & { info: jest.Mock; error: jest.Mock };

  beforeEach(async () => {
    logInstance = (await logger()) as unknown as ILogger & { info: jest.Mock; error: jest.Mock };
    // jest.clearAllMocks();
    delete process.env.IS_BUILDING;
    delete process.env.NEXT_PHASE;
  });

  it('returns 200 with expected system statuses including memory', async () => {
    const { memoryClientFactory } = require('@/lib/ai/mem0/memoryclient-factory');
    const mockHealthCheck = jest.fn().mockResolvedValue({
      details: {
        client_active: true,
        system_db_available: true,
        vector_enabled: true,
        vector_store_available: true,
        graph_enabled: true,
        graph_store_available: true,
        history_store_available: true,
        auth_service: { healthy: true },
        errors: [],
      },
    });
    
    memoryClientFactory.mockReturnValue({
      healthCheck: mockHealthCheck,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    
    // Top-level keys
    expect(json).toHaveProperty('database');
    expect(json).toHaveProperty('chat');
    expect(json).toHaveProperty('memory');
    
    // Individual system statuses
    expect(json.database.status).toBe('ok');
    expect(json.chat.status).toBe('ok');
    expect(json.memory.status).toBe('ok');
    
    // Nested systems under chat
    expect(json.chat.cache.status).toBe('ok');
    expect(json.chat.queue.status).toBe('ok');
  });

  it('returns memory error status when memory client fails', async () => {
    const { memoryClientFactory } = require('@/lib/ai/mem0/memoryclient-factory');
    const mockHealthCheck = jest.fn().mockRejectedValue(new Error('Memory service unavailable'));
    
    memoryClientFactory.mockReturnValue({
      healthCheck: mockHealthCheck,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    
    expect(json).toHaveProperty('memory');
    expect(json.memory.status).toBe('error');
  });

  it('returns memory warning status when some services are unavailable', async () => {
    const { memoryClientFactory } = require('@/lib/ai/mem0/memoryclient-factory');
    const mockHealthCheck = jest.fn().mockResolvedValue({
      details: {
        client_active: true,
        system_db_available: false, // This will cause warning status
        vector_enabled: true,
        vector_store_available: true,
        graph_enabled: true,
        graph_store_available: true,
        history_store_available: true,
        auth_service: { healthy: true },
        errors: [],
      },
    });
    
    memoryClientFactory.mockReturnValue({
      healthCheck: mockHealthCheck,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    
    expect(json).toHaveProperty('memory');
    expect(json.memory.status).toBe('warning');
  });

  it('logs route processing (info) via wrapRouteRequest by default', async () => {
    const { memoryClientFactory } = require('@/lib/ai/mem0/memoryclient-factory');
    memoryClientFactory.mockReturnValue({
      healthCheck: jest.fn().mockResolvedValue({
        details: {
          client_active: true,
          system_db_available: true,
          vector_enabled: true,
          vector_store_available: true,
          graph_enabled: true,
          graph_store_available: true,
          history_store_available: true,
          auth_service: { healthy: true },
          errors: [],
        },
      }),
    });

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
