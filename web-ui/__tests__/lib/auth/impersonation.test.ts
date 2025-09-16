/**
 * @fileoverview Tests for Keycloak impersonation functionality
 * @jest-environment jsdom
 */

import { jest } from '@jest/globals';
import { Impersonation } from '@/lib/auth/impersonation';

// Mock NextRequest since it's not available in test environment
const mockNextRequest = {
  url: 'https://test.com',
  headers: new Map(),
  cookies: new Map(),
} as any;

// Mock dependencies
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}));

jest.mock('@/lib/site-util/env', () => ({
  env: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  log: jest.fn(),
}));

jest.mock('@/lib/react-util/errors/logged-error', () => ({
  LoggedError: {
    isTurtlesAllTheWayDownBaby: jest.fn(),
  },
}));

jest.mock('@/lib/nextjs-util/fetch', () => ({
  fetch: jest.fn(),
}));

// Mock fetch globally if not available
global.fetch = global.fetch || jest.fn();

describe('Impersonation', () => {
  const mockEnv = require('@/lib/site-util/env').env as jest.MockedFunction<typeof import('@/lib/site-util/env').env>;
  const mockAuth = require('@/auth').auth as jest.MockedFunction<typeof import('@/auth').auth>;
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default env mock
    mockEnv.mockImplementation((key: string) => {
      const envVars: Record<string, string> = {
        'AUTH_KEYCLOAK_ISSUER': 'https://keycloak.example.com/realms/test',
        'AUTH_KEYCLOAK_CLIENT_ID': 'test-client-id',
        'AUTH_KEYCLOAK_CLIENT_SECRET': 'test-client-secret',
        'KEYCLOAK_IMPERSONATION_AUDIENCE': 'test-audience',
      };
      return envVars[key] || '';
    });
  });

  describe('fromRequest', () => {
    it('should return null when no session is available', async () => {
      mockAuth.mockResolvedValue(null);
      
      const result = await Impersonation.fromRequest(mockNextRequest);
      
      expect(result).toBeNull();
    });

    it('should return null when session has no user', async () => {
      mockAuth.mockResolvedValue({ user: null } as any);
      
      const result = await Impersonation.fromRequest(mockNextRequest);
      
      expect(result).toBeNull();
    });

    it('should return null when user has no ID', async () => {
      mockAuth.mockResolvedValue({
        user: { email: 'test@example.com' }
      } as any);
      
      const result = await Impersonation.fromRequest(mockNextRequest);
      
      expect(result).toBeNull();
    });

    it('should return null when Keycloak configuration is incomplete', async () => {
      mockAuth.mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' }
      } as any);
      
      // Mock incomplete config
      mockEnv.mockImplementation((key: string) => {
        if (key === 'AUTH_KEYCLOAK_ISSUER') return 'https://keycloak.example.com';
        return ''; // Missing client ID and secret
      });
      
      const result = await Impersonation.fromRequest(mockNextRequest);
      
      expect(result).toBeNull();
    });

    it('should create Impersonation instance with valid session and config', async () => {
      mockAuth.mockResolvedValue({
        user: { 
          id: 'user-123', 
          email: 'test@example.com', 
          name: 'Test User',
          account_id: 'account-456'
        }
      } as any);
      
      const result = await Impersonation.fromRequest(mockNextRequest);
      
      expect(result).toBeInstanceOf(Impersonation);
      expect(result?.getUserContext()).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        accountId: 'account-456',
      });
    });
  });

  describe('getImpersonatedToken', () => {
    let impersonation: Impersonation;

    beforeEach(() => {
      const userContext = {
        userId: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      const config = {
        issuer: 'https://keycloak.example.com/realms/test',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        audience: 'test-audience',
      };

      impersonation = new Impersonation(userContext, config);
    });

    it('should successfully exchange token', async () => {
      const mockTokenResponse = {
        access_token: 'impersonated-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      } as any);

      const token = await impersonation.getImpersonatedToken();

      expect(token).toBe('impersonated-token-123');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://keycloak.example.com/realms/test/protocol/openid-connect/token',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
          },
          body: expect.stringContaining('grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Atoken-exchange'),
        })
      );
    });

    it('should return cached token when still valid', async () => {
      const mockTokenResponse = {
        access_token: 'cached-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      } as any);

      // First call should fetch token
      const token1 = await impersonation.getImpersonatedToken();
      
      // Second call should return cached token
      const token2 = await impersonation.getImpersonatedToken();

      expect(token1).toBe('cached-token-123');
      expect(token2).toBe('cached-token-123');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should force refresh token when requested', async () => {
      const mockTokenResponse1 = {
        access_token: 'token-1',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      const mockTokenResponse2 = {
        access_token: 'token-2',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse1),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse2),
        } as any);

      const token1 = await impersonation.getImpersonatedToken();
      const token2 = await impersonation.getImpersonatedToken(true); // Force refresh

      expect(token1).toBe('token-1');
      expect(token2).toBe('token-2');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should throw error when token exchange fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('Invalid request'),
      } as any);

      await expect(impersonation.getImpersonatedToken()).rejects.toThrow(
        'Token exchange failed: 400 Bad Request - Invalid request'
      );
    });

    it('should throw error when response missing access_token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ token_type: 'Bearer' }), // Missing access_token
      } as any);

      await expect(impersonation.getImpersonatedToken()).rejects.toThrow(
        'Token exchange response missing access_token'
      );
    });
  });

  describe('utility methods', () => {
    let impersonation: Impersonation;

    beforeEach(() => {
      const userContext = {
        userId: 'user-123',
        email: 'test@example.com',
      };

      const config = {
        issuer: 'https://keycloak.example.com/realms/test',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
      };

      impersonation = new Impersonation(userContext, config);
    });

    it('should return user context', () => {
      const context = impersonation.getUserContext();

      expect(context).toEqual({
        userId: 'user-123',
        email: 'test@example.com',
      });
    });

    it('should clear cache', () => {
      impersonation.clearCache();
      expect(impersonation.hasCachedToken()).toBe(false);
    });

    it('should indicate cached token status', async () => {
      expect(impersonation.hasCachedToken()).toBe(false);

      const mockTokenResponse = {
        access_token: 'test-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      } as any);

      await impersonation.getImpersonatedToken();
      expect(impersonation.hasCachedToken()).toBe(true);

      impersonation.clearCache();
      expect(impersonation.hasCachedToken()).toBe(false);
    });
  });
});