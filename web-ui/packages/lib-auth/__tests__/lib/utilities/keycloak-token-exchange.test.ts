/**
 * @jest-environment node
 */

// Set up environment variables BEFORE importing the module under test
// This is required because the module exports a default instance that validates config at load time
process.env.AUTH_KEYCLOAK_ISSUER =
  'https://keycloak.example.com/auth/realms/test';
process.env.AUTH_KEYCLOAK_CLIENT_ID = 'test-client';
process.env.AUTH_KEYCLOAK_CLIENT_SECRET = 'test-secret';
process.env.NEXTAUTH_SECRET = 'test-nextauth-secret';

// Mock dependencies
jest.mock('@compliance-theater/types/next-auth/jwt');

import {
  KeycloakTokenExchange,
  TokenExchangeError,
} from '../../../src/lib/utilities/keycloak-token-exchange';
import { getToken } from '@compliance-theater/types/next-auth/jwt';
import { resolveService } from '@compliance-theater/types/dependency-injection';

const mockedGetToken = getToken as jest.MockedFunction<typeof getToken>;

describe('KeycloakTokenExchange', () => {
  let tokenExchange: KeycloakTokenExchange;
  let typedMockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // jest.clearAllMocks();
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

    it('should extract token from NextAuth JWT', async () => {
      mockedGetToken.mockResolvedValue({
        access_token: 'keycloak-access-token',
      } as any);

      const token = await tokenExchange.extractKeycloakToken(mockRequest);

      expect(token).toBe('keycloak-access-token');
      expect(mockedGetToken).toHaveBeenCalledWith({
        req: mockRequest,
        secret: 'test-nextauth-secret',
      });
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

    it('should combine extraction and exchange operations', async () => {
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
    });
  });
});
