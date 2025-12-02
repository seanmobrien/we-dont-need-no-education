/**
 * @file health-check.test.ts
 * @description Unit tests for memory health check types and utility functions
 */

import {
  type HealthDetails,
  type AuthServiceHealth,
} from '@/lib/ai/mem0/types/health-check';
import { determineHealthStatus } from '@/lib/api/health/memory';

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
      jwks_url: 'https://example.com/certs',
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

});
