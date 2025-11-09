/**
 * @jest-environment node
 */
/**
 * @file route.test.ts
 * @description Unit tests for the health check API route at app/api/health/route.ts
 */

import { auth } from '@/auth';
import { hideConsoleOutput } from '@/__tests__/test-utils';
import { GET } from '@/app/api/health/route';
import { NextRequest } from 'next/server';

// Mock the memory client factory
jest.mock('@/lib/ai/mem0/memoryclient-factory', () => ({
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
    jest.useFakeTimers();
  });
  afterEach(() => {
    mockConsole.dispose();
    jest.advanceTimersToNextTimer();
    jest.clearAllTimers();
    jest.useRealTimers();
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

  it('caches error states to prevent cascading failures during outages', async () => {
    const {
      memoryClientFactory,
    } = require('/lib/ai/mem0/memoryclient-factory');
    
    // First call returns error
    const mockHealthCheck = jest.fn().mockResolvedValue({
      status: 'error',
      message: 'service unavailable',
      timestamp: new Date().toISOString(),
      service: 'mem0',
      mem0: {
        version: '0',
        build_type: 'unknown',
        build_info: '',
        verbose: {
          mem0_version: '0',
          build_details: { type: '', info: '', path: '' },
          build_stamp: '',
        },
      },
      details: {
        client_active: false,
        system_db_available: false,
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
          jwks_url: '',
        },
        errors: ['Service unavailable'],
      },
    });

    memoryClientFactory.mockResolvedValue({
      healthCheck: mockHealthCheck,
    });

    // First request - should call healthCheck
    await GET();
    expect(mockHealthCheck).toHaveBeenCalledTimes(1);

    // Second request within cache TTL - should NOT call healthCheck again
    // Error states have 10 second TTL, so advance time by 5 seconds (still cached)
    jest.advanceTimersByTime(5000);
    await GET();
    expect(mockHealthCheck).toHaveBeenCalledTimes(1); // Should still be 1

    // Third request after cache expiry - should call healthCheck again
    jest.advanceTimersByTime(6000); // Total 11 seconds - past 10 second error TTL
    await GET();
    expect(mockHealthCheck).toHaveBeenCalledTimes(2); // Now should be 2
  });

  it('caches warning states with shorter TTL than ok states', async () => {
    const {
      memoryClientFactory,
    } = require('/lib/ai/mem0/memoryclient-factory');
    
    const mockHealthCheck = jest.fn().mockResolvedValue({
      status: 'warning',
      message: 'partial service availability',
      timestamp: new Date().toISOString(),
      service: 'mem0',
      mem0: {
        version: '1.0.0',
        build_type: 'production',
        build_info: '',
        verbose: {
          mem0_version: '1.0.0',
          build_details: { type: 'production', info: '', path: '' },
          build_stamp: '',
        },
      },
      details: {
        client_active: true,
        system_db_available: false, // This causes warning
        vector_enabled: true,
        vector_store_available: true,
        graph_enabled: true,
        graph_store_available: true,
        history_store_available: true,
        auth_service: {
          healthy: true,
          enabled: true,
          server_url: 'http://auth',
          realm: 'test',
          client_id: 'test',
          auth_url: 'http://auth/auth',
          token_url: 'http://auth/token',
          jwks_url: 'http://auth/jwks',
        },
        errors: [],
      },
    });

    memoryClientFactory.mockResolvedValue({
      healthCheck: mockHealthCheck,
    });

    // First request
    await GET();
    expect(mockHealthCheck).toHaveBeenCalledTimes(1);

    // Second request within cache TTL (warning TTL is 30 seconds)
    jest.advanceTimersByTime(20000);
    await GET();
    expect(mockHealthCheck).toHaveBeenCalledTimes(1); // Should still be cached

    // Third request after cache expiry
    jest.advanceTimersByTime(15000); // Total 35 seconds - past 30 second warning TTL
    await GET();
    expect(mockHealthCheck).toHaveBeenCalledTimes(2);
  });
});
