/**
 * @jest-environment node
 */

// Set up environment variables BEFORE importing the module under test
// This is required because the module exports a default instance that validates config at load time
process.env.AUTH_KEYCLOAK_ISSUER =
  'https://keycloak.example.com/auth/realms/test';
process.env.AUTH_KEYCLOAK_CLIENT_ID = 'test-client';
process.env.AUTH_KEYCLOAK_CLIENT_SECRET = 'test-secret';
process.env.AUTH_SECRET = 'test-auth-secret';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';

// Mock dependencies
jest.mock('@compliance-theater/auth-compat/runtime');
jest.mock('@compliance-theater/feature-flags/server', () => ({
  getFeatureFlag: jest.fn(),
}));
jest.mock('../../../src/lib/access-token', () => ({
  getRequestTokens: jest.fn(),
}));

import {
  KeycloakTokenExchange,
  TokenExchangeError,
} from '../../../src/lib/utilities/keycloak-token-exchange';
import { getRequestTokens } from '../../../src/lib/access-token';
import { getToken } from '@compliance-theater/auth-compat/runtime';
import { getFeatureFlag } from '@compliance-theater/feature-flags/server';
import { resolveService } from '@compliance-theater/types/dependency-injection';

const mockedGetToken = getToken as jest.MockedFunction<typeof getToken>;
const mockedGetRequestTokens = getRequestTokens as jest.MockedFunction<
  typeof getRequestTokens
>;
const mockedGetFeatureFlag = getFeatureFlag as jest.MockedFunction<
  typeof getFeatureFlag
>;

describe('KeycloakTokenExchange', () => {
  let tokenExchange: KeycloakTokenExchange;
  let typedMockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockedGetToken.mockReset();
    mockedGetRequestTokens.mockReset();
    mockedGetFeatureFlag.mockReset();
    mockedGetRequestTokens.mockResolvedValue(undefined);
    mockedGetFeatureFlag.mockResolvedValue(false);
    typedMockFetch = resolveService('fetch').fetch as jest.MockedFunction<typeof fetch>;

    // Mock environment variables
    /*
    process.env.AUTH_KEYCLOAK_ISSUER = 'https://keycloak.example.com/auth/realms/test';
    process.env.AUTH_KEYCLOAK_CLIENT_ID = 'test-client';
    process.env.AUTH_KEYCLOAK_CLIENT_SECRET = 'test-secret';
    process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';
    */
    tokenExchange = new KeycloakTokenExchange();
  });

  afterEach(() => {
    /*
    delete process.env.AUTH_KEYCLOAK_ISSUER;
    delete process.env.AUTH_KEYCLOAK_CLIENT_ID;
    delete process.env.AUTH_KEYCLOAK_CLIENT_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    */
  });

  describe('constructor', () => {
    it('should throw error when configuration is missing', () => {
      delete process.env.AUTH_KEYCLOAK_ISSUER;

      expect(() => new KeycloakTokenExchange()).toThrow(TokenExchangeError);
      expect(() => new KeycloakTokenExchange()).toThrow(
        'Missing required Keycloak configuration',
      );
    });

    it('should accept configuration overrides', () => {
      const customConfig = {
        issuer: 'https://custom.keycloak.com',
        clientId: 'custom-client',
        clientSecret: 'custom-secret',
      };

      expect(() => new KeycloakTokenExchange(customConfig)).not.toThrow();
    });
  });

  describe('extractKeycloakToken', () => {
    const mockRequest = {} as any;

    it('should prefer request-resolved access tokens before JWT lookup', async () => {
      mockedGetRequestTokens.mockResolvedValue({
        access_token: 'db-keycloak-access-token',
        refresh_token: 'db-refresh-token',
        providerAccountId: 'subject-123',
        userId: 3,
        expires_at: 123,
        refresh_expires_at: 456,
      });

      const token = await tokenExchange.extractKeycloakToken(mockRequest);

      expect(token).toBe('db-keycloak-access-token');
      expect(mockedGetToken).not.toHaveBeenCalled();
    });

    it('should extract token from NextAuth JWT', async () => {
      mockedGetToken.mockResolvedValue({
        access_token: 'keycloak-access-token',
      } as any);

      const token = await tokenExchange.extractKeycloakToken(mockRequest);

      expect(token).toBe('keycloak-access-token');
      expect(mockedGetToken).toHaveBeenCalledWith({
        req: mockRequest,
        secret: 'test-auth-secret',
      });
    });

    it('falls back to NEXTAUTH_SECRET when AUTH_SECRET is unset', async () => {
      const originalAuthSecret = process.env.AUTH_SECRET;
      delete process.env.AUTH_SECRET;
      mockedGetToken.mockResolvedValue({
        access_token: 'keycloak-access-token',
      } as any);

      try {
        const token = await tokenExchange.extractKeycloakToken(mockRequest);

        expect(token).toBe('keycloak-access-token');
        expect(mockedGetToken).toHaveBeenCalledWith({
          req: mockRequest,
          secret: 'test-nextauth-secret',
        });
      } finally {
        process.env.AUTH_SECRET = originalAuthSecret;
      }
    });

    it('falls back to NEXTAUTH_SECRET when AUTH_SECRET is empty', async () => {
      const originalAuthSecret = process.env.AUTH_SECRET;
      process.env.AUTH_SECRET = '';
      mockedGetToken.mockResolvedValue({
        access_token: 'keycloak-access-token',
      } as any);

      try {
        const token = await tokenExchange.extractKeycloakToken(mockRequest);

        expect(token).toBe('keycloak-access-token');
        expect(mockedGetToken).toHaveBeenCalledWith({
          req: mockRequest,
          secret: 'test-nextauth-secret',
        });
      } finally {
        process.env.AUTH_SECRET = originalAuthSecret;
      }
    });

    it('should throw error when no JWT token found', async () => {
      mockedGetToken.mockResolvedValue(null);

      await expect(
        tokenExchange.extractKeycloakToken(mockRequest),
      ).rejects.toThrow(TokenExchangeError);
    });

    it('should throw error when no access_token in JWT', async () => {
      mockedGetToken.mockResolvedValue({} as any);

      await expect(
        tokenExchange.extractKeycloakToken(mockRequest),
      ).rejects.toThrow('No Keycloak access token found in JWT');
    });
  });

  describe('exchangeForGoogleTokens', () => {
    it('should successfully exchange tokens', async () => {
      const mockResponse = {
        access_token: 'google-access-token',
        refresh_token: 'google-refresh-token',
        token_type: 'Bearer',
      };

      typedMockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () => JSON.stringify(mockResponse),
      } as unknown as Response);

      const result = await tokenExchange.exchangeForGoogleTokens({
        subjectToken: 'keycloak-token',
      });

      expect(result).toEqual({
        access_token: 'google-access-token',
        refresh_token: 'google-refresh-token',
      });

      expect(typedMockFetch).toHaveBeenCalledWith(
        'https://keycloak.example.com/realms/test/protocol/openid-connect/token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: expect.any(String),
          signal: expect.any(AbortSignal),
        }),
      );

      const requestInit = typedMockFetch.mock.calls[0]?.[1] as RequestInit;
      const body = typeof requestInit?.body === 'string' ? requestInit.body : '';
      const params = new URLSearchParams(body);
      expect(params.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:token-exchange');
      expect(params.get('subject_token')).toBe('keycloak-token');
    });

    it('should throw error when exchange fails', async () => {
      typedMockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () =>
          JSON.stringify({
            error: 'invalid_grant',
            error_description: 'Token exchange failed',
          }),
      } as unknown as Response);

      await expect(
        tokenExchange.exchangeForGoogleTokens({
          subjectToken: 'invalid-token',
        }),
      ).rejects.toThrow(TokenExchangeError);
    });

    it('should throw error when response is missing tokens', async () => {
      typedMockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () =>
          JSON.stringify({
            token_type: 'Bearer',
          }),
      } as unknown as Response);

      await expect(
        tokenExchange.exchangeForGoogleTokens({
          subjectToken: 'keycloak-token',
        }),
      ).rejects.toThrow('Invalid token response from Keycloak');
    });

    it('should handle got-style object error payloads', async () => {
      typedMockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () =>
          JSON.stringify({
            error_description: 'Token exchange failed',
          }),
      } as unknown as Response);

      await expect(
        tokenExchange.exchangeForGoogleTokens({
          subjectToken: 'invalid-token',
        }),
      ).rejects.toThrow(TokenExchangeError);
    });
  });

  describe('getGoogleTokensFromRequest', () => {
    const mockRequest = {} as any;

    beforeEach(() => {
      mockedGetFeatureFlag.mockResolvedValue(true);
    });

    it('uses legacy token exchange flow when broker v2 flag is disabled', async () => {
      mockedGetFeatureFlag.mockResolvedValue(false);
      mockedGetToken.mockResolvedValue({
        access_token: 'keycloak-access-token',
      } as any);
      typedMockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () =>
          JSON.stringify({
            access_token: 'google-access-token',
            refresh_token: 'google-refresh-token',
            token_type: 'Bearer',
          }),
      } as unknown as Response);

      const result = await tokenExchange.getGoogleTokensFromRequest(
        mockRequest,
        'google'
      );

      expect(result).toEqual({
        access_token: 'google-access-token',
        refresh_token: 'google-refresh-token',
      });
      expect(typedMockFetch).toHaveBeenCalledTimes(1);
      expect(typedMockFetch).toHaveBeenCalledWith(
        'https://keycloak.example.com/realms/test/protocol/openid-connect/token',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });

    it('should prefer broker token retrieval before token exchange', async () => {
      mockedGetToken.mockResolvedValue({
        access_token: 'keycloak-access-token',
      } as any);

      typedMockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        text: async () =>
          JSON.stringify({
            access_token: 'google-access-token',
            refresh_token: 'google-refresh-token',
            token_type: 'Bearer',
          }),
      } as unknown as Response);

      const result =
        await tokenExchange.getGoogleTokensFromRequest(mockRequest);

      expect(result).toEqual({
        access_token: 'google-access-token',
        refresh_token: 'google-refresh-token',
      });

      expect(typedMockFetch).toHaveBeenCalledWith(
        'https://keycloak.example.com/realms/test/broker/google/token',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer keycloak-access-token',
          }),
        }),
      );
    });

    it('falls back to broker-style token exchange when broker token retrieval fails', async () => {
      mockedGetToken.mockResolvedValue({
        access_token: 'keycloak-access-token',
      } as any);

      typedMockFetch
        .mockRejectedValueOnce(
          Object.assign(new Error('Not Found'), {
            response: {
              statusCode: 404,
              body: JSON.stringify({
                error: 'not_found',
                error_description: 'No broker token available',
              }),
            },
          }),
        )
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () =>
            JSON.stringify({
              access_token: 'google-access-token',
              refresh_token: 'google-refresh-token',
              token_type: 'Bearer',
            }),
        } as unknown as Response);

      const result =
        await tokenExchange.getGoogleTokensFromRequest(mockRequest);

      expect(result).toEqual({
        access_token: 'google-access-token',
        refresh_token: 'google-refresh-token',
      });

      const requestInit = typedMockFetch.mock.calls[1]?.[1] as RequestInit;
      const body = typeof requestInit?.body === 'string' ? requestInit.body : '';
      const params = new URLSearchParams(body);
      expect(params.get('requested_issuer')).toBe('google');
      expect(params.get('audience')).toBeNull();
    });

    it('discovers the google provider alias when the default alias fails', async () => {
      mockedGetToken.mockResolvedValue({
        access_token: 'keycloak-access-token',
      } as any);

      typedMockFetch
        .mockRejectedValueOnce(
          Object.assign(new Error('Not Found'), {
            response: {
              statusCode: 404,
              body: JSON.stringify({
                error: 'not_found',
                error_description: 'Unknown provider alias',
              }),
            },
          }),
        )
        .mockRejectedValueOnce(
          Object.assign(new Error('Bad Request'), {
            response: {
              statusCode: 400,
              body: JSON.stringify({
                error: 'invalid_request',
                error_description: 'Requested issuer not found',
              }),
            },
          }),
        )
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () =>
            JSON.stringify([
              { alias: 'google-workspace', providerId: 'google' },
            ]),
        } as unknown as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          statusText: 'OK',
          text: async () =>
            JSON.stringify({
              access_token: 'google-access-token',
              refresh_token: 'google-refresh-token',
              token_type: 'Bearer',
            }),
        } as unknown as Response);

      const result =
        await tokenExchange.getGoogleTokensFromRequest(mockRequest);

      expect(result).toEqual({
        access_token: 'google-access-token',
        refresh_token: 'google-refresh-token',
      });

      expect(typedMockFetch).toHaveBeenNthCalledWith(
        3,
        'https://keycloak.example.com/admin/realms/test/identity-provider/instances',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer keycloak-access-token',
          }),
        }),
      );
      expect(typedMockFetch).toHaveBeenNthCalledWith(
        4,
        'https://keycloak.example.com/realms/test/broker/google-workspace/token',
        expect.objectContaining({
          method: 'GET',
        }),
      );
    });
  });
});
