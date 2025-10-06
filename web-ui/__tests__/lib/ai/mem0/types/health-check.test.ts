/**
 * @file health-check.test.ts
 * @description Unit tests for memory health check types and utility functions
 */

import {
  determineHealthStatus,
  getRefreshInterval,
  type HealthDetails,
  type AuthServiceHealth,
  type HealthStatus,
} from '/lib/ai/mem0/types/health-check';

describe('Memory Health Check Types', () => {
  describe('determineHealthStatus', () => {
    const createMockAuthService = (healthy = true): AuthServiceHealth => ({
      healthy,
      enabled: true,
      server_url: 'https://example.com',
      realm: 'test',
      client_id: 'test-client',
      auth_url: 'https://example.com/auth',
      token_url: 'https://example.com/token',
      jkws_url: 'https://example.com/certs',
    });

    const createMockHealthDetails = (
      overrides: Partial<HealthDetails> = {},
    ): HealthDetails => ({
      client_active: true,
      system_db_available: true,
      vector_enabled: true,
      vector_store_available: true,
      graph_enabled: true,
      graph_store_available: true,
      history_store_available: true,
      auth_service: createMockAuthService(),
      errors: [],
      ...overrides,
    });

    it('should return "error" when client_active is false', () => {
      const healthDetails = createMockHealthDetails({ client_active: false });
      const result = determineHealthStatus(healthDetails);
      expect(result).toBe('error');
    });

    it('should return "healthy" when all services are available', () => {
      const healthDetails = createMockHealthDetails();
      const result = determineHealthStatus(healthDetails);
      expect(result).toBe('healthy');
    });

    it('should return "warning" when system_db_available is false', () => {
      const healthDetails = createMockHealthDetails({
        system_db_available: false,
      });
      const result = determineHealthStatus(healthDetails);
      expect(result).toBe('warning');
    });

    it('should return "warning" when vector_store_available is false', () => {
      const healthDetails = createMockHealthDetails({
        vector_store_available: false,
      });
      const result = determineHealthStatus(healthDetails);
      expect(result).toBe('warning');
    });

    it('should return "warning" when graph_store_available is false', () => {
      const healthDetails = createMockHealthDetails({
        graph_store_available: false,
      });
      const result = determineHealthStatus(healthDetails);
      expect(result).toBe('warning');
    });

    it('should return "warning" when history_store_available is false', () => {
      const healthDetails = createMockHealthDetails({
        history_store_available: false,
      });
      const result = determineHealthStatus(healthDetails);
      expect(result).toBe('warning');
    });

    it('should return "warning" when auth_service is unhealthy', () => {
      const healthDetails = createMockHealthDetails({
        auth_service: createMockAuthService(false),
      });
      const result = determineHealthStatus(healthDetails);
      expect(result).toBe('warning');
    });

    it('should return "warning" when multiple services are unavailable', () => {
      const healthDetails = createMockHealthDetails({
        system_db_available: false,
        vector_store_available: false,
        auth_service: createMockAuthService(false),
      });
      const result = determineHealthStatus(healthDetails);
      expect(result).toBe('warning');
    });

    it('should prioritize "error" over "warning" when client is inactive', () => {
      const healthDetails = createMockHealthDetails({
        client_active: false,
        system_db_available: false,
        vector_store_available: false,
      });
      const result = determineHealthStatus(healthDetails);
      expect(result).toBe('error');
    });
  });

  describe('getRefreshInterval', () => {
    it('should return 3 minutes (180000ms) for healthy status', () => {
      const result = getRefreshInterval('healthy');
      expect(result).toBe(3 * 60 * 1000);
    });

    it('should return 30 seconds (30000ms) for warning status', () => {
      const result = getRefreshInterval('warning');
      expect(result).toBe(30 * 1000);
    });

    it('should return 5 seconds (5000ms) for error status', () => {
      const result = getRefreshInterval('error');
      expect(result).toBe(5 * 1000);
    });

    it('should return 30 seconds (30000ms) for unknown status', () => {
      const result = getRefreshInterval('unknown' as HealthStatus);
      expect(result).toBe(30 * 1000);
    });
  });
});
