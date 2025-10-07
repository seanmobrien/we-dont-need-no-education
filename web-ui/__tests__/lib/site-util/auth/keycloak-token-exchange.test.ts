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

import {
  KeycloakTokenExchange,
  TokenExchangeError,
} from '../../../../lib/site-util/auth/keycloak-token-exchange';
import axios from 'axios';
import { getToken } from 'next-auth/jwt';

// Mock dependencies
jest.mock('axios');
jest.mock('next-auth/jwt');

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedGetToken = getToken as jest.MockedFunction<typeof getToken>;

describe('KeycloakTokenExchange', () => {
  let tokenExchange: KeycloakTokenExchange;

  beforeEach(() => {
    // jest.clearAllMocks();

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
        data: {
          access_token: 'google-access-token',
          refresh_token: 'google-refresh-token',
          token_type: 'Bearer',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await tokenExchange.exchangeForGoogleTokens({
        subjectToken: 'keycloak-token',
      });

      expect(result).toEqual({
        access_token: 'google-access-token',
        refresh_token: 'google-refresh-token',
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://keycloak.example.com/realms/test/protocol/openid-connect/token',
        expect.stringContaining(
          'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Atoken-exchange',
        ),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000,
        }),
      );
    });

    it('should throw error when exchange fails', async () => {
      mockedAxios.post.mockRejectedValue({
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: 'invalid_grant',
            error_description: 'Token exchange failed',
          },
        },
      });

      await expect(
        tokenExchange.exchangeForGoogleTokens({
          subjectToken: 'invalid-token',
        }),
      ).rejects.toThrow(TokenExchangeError);
    });

    it('should throw error when response is missing tokens', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { token_type: 'Bearer' }, // Missing access_token and refresh_token
      });

      await expect(
        tokenExchange.exchangeForGoogleTokens({
          subjectToken: 'keycloak-token',
        }),
      ).rejects.toThrow('Invalid token response from Keycloak');
    });
  });

  describe('getGoogleTokensFromRequest', () => {
    const mockRequest = {} as any;

    it('should combine extraction and exchange operations', async () => {
      mockedGetToken.mockResolvedValue({
        access_token: 'keycloak-access-token',
      } as any);

      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'google-access-token',
          refresh_token: 'google-refresh-token',
          token_type: 'Bearer',
        },
      });

      const result =
        await tokenExchange.getGoogleTokensFromRequest(mockRequest);

      expect(result).toEqual({
        access_token: 'google-access-token',
        refresh_token: 'google-refresh-token',
      });
    });
  });
});
