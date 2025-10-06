/**
 * @jest-environment node
 */
/**
 * @file route.test.ts
 * @description Unit tests for the health check API route at app/api/health/route.ts
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import { hideConsoleOutput } from '/__tests__/test-utils';
import { GET } from '/app/api/health/route';

// Mock the memory client factory
jest.mock('/lib/ai/mem0/memoryclient-factory', () => ({
  memoryClientFactory: jest.fn(() =>
    Promise.resolve({
      healthCheck: jest.fn(),
    }),
  ),
}));

const mockConsole = hideConsoleOutput();

describe('app/api/health/route GET', () => {
  beforeEach(() => {
    delete process.env.IS_BUILDING;
    delete process.env.NEXT_PHASE;
  });
  afterEach(() => {
    mockConsole.dispose();
  });

  it('returns 200 with expected system statuses including memory', async () => {
    const {
      memoryClientFactory,
    } = require('/lib/ai/mem0/memoryclient-factory');
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

    memoryClientFactory.mockResolvedValue({
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
    const {
      memoryClientFactory,
    } = require('/lib/ai/mem0/memoryclient-factory');
    mockConsole.setup();
    const mockHealthCheck = jest
      .fn()
      .mockRejectedValue(new Error('Memory service unavailable'));

    memoryClientFactory.mockResolvedValue({
      healthCheck: mockHealthCheck,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json).toHaveProperty('memory');
    expect(json.memory.status).toBe('error');
  });

  it('returns memory warning status when some services are unavailable', async () => {
    const {
      memoryClientFactory,
    } = require('/lib/ai/mem0/memoryclient-factory');
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

    memoryClientFactory.mockResolvedValue({
      healthCheck: mockHealthCheck,
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json).toHaveProperty('memory');
    expect(json.memory.status).toBe('warning');
  });

  it('logs route processing (info) via wrapRouteRequest by default', async () => {
    const {
      memoryClientFactory,
    } = require('/lib/ai/mem0/memoryclient-factory');
    const { logger } = require('/lib/logger');

    memoryClientFactory.mockResolvedValue({
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

    const logInstance = await logger();
    await GET();
    expect(logInstance.info).toHaveBeenCalledWith(
      expect.stringContaining('Processing route request'),
      expect.any(Object),
    );
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
