/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import type { JWTPayload } from 'jose';

// Mock jose using the __mocks__ folder
jest.mock('jose');

// Import mocked functions after jest.mock
import { decodeJwt, jwtVerify, createRemoteJWKSet } from 'jose';

// Mock LRU cache
const mockGet = jest.fn();
const mockSet = jest.fn();
jest.mock('lru-cache', () => ({
  LRUCache: jest.fn().mockImplementation(() => ({
    get: mockGet,
    set: mockSet,
  })),
}));

// Import after mocks are set
import { decodeToken } from '@/lib/auth/utilities';

describe('decodeToken', () => {
  const validToken = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0In0.signature';
  const issuerUrl = 'https://auth.example.com/realms/test';

  beforeEach(() => {
    jest.clearAllMocks();
    mockGet.mockReturnValue(undefined);
    process.env.AUTH_KEYCLOAK_ISSUER = issuerUrl;
  });

  afterEach(() => {
    delete process.env.AUTH_KEYCLOAK_ISSUER;
  });

  describe('Decode without verification', () => {
    it('should decode token without verification when verify=false', async () => {
      const mockPayload: JWTPayload = {
        sub: '1234',
        account_id: 5678,
        iat: 1234567890,
      };
      (decodeJwt as jest.Mock).mockReturnValue(mockPayload);

      const result = await decodeToken({
        token: validToken,
        verify: false,
      });

      expect(result).toEqual(mockPayload);
      expect(decodeJwt).toHaveBeenCalledWith(validToken);
      expect(jwtVerify).not.toHaveBeenCalled();
      expect(createRemoteJWKSet).not.toHaveBeenCalled();
    });

    it('should decode token without verification when verify is omitted', async () => {
      const mockPayload: JWTPayload = { sub: '1234' };
      (decodeJwt as jest.Mock).mockReturnValue(mockPayload);

      const result = await decodeToken({ token: validToken });

      expect(result).toEqual(mockPayload);
      expect(decodeJwt).toHaveBeenCalledWith(validToken);
      expect(jwtVerify).not.toHaveBeenCalled();
    });

    it('should handle decoding errors gracefully', async () => {
      (decodeJwt as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token format');
      });

      await expect(
        decodeToken({ token: 'invalid-token', verify: false }),
      ).rejects.toThrow('Invalid token format');
    });
  });

  describe('Decode with verification', () => {
    it('should verify and decode token using AUTH_KEYCLOAK_ISSUER', async () => {
      const mockPayload: JWTPayload = {
        sub: '1234',
        account_id: 5678,
        iss: issuerUrl,
      };
      const mockJwks = { keys: [] };
      (createRemoteJWKSet as jest.Mock).mockReturnValue(mockJwks);
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      } as unknown as never);

      const result = await decodeToken({
        token: validToken,
        verify: true,
      });

      expect(result).toEqual(mockPayload);
      expect(mockGet).toHaveBeenCalledWith(issuerUrl);
      expect(createRemoteJWKSet).toHaveBeenCalledWith(expect.any(URL));
      expect(mockSet).toHaveBeenCalledWith(issuerUrl, mockJwks);
      expect(jwtVerify).toHaveBeenCalledWith(validToken, mockJwks, {
        issuer: issuerUrl,
      });
    });

    it('should use custom issuer when provided', async () => {
      const customIssuer = 'https://custom-auth.example.com/realms/custom';
      const mockPayload: JWTPayload = { sub: '1234', iss: customIssuer };
      const mockJwks = { keys: [] };
      (createRemoteJWKSet as jest.Mock).mockReturnValue(mockJwks);
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      } as unknown as never);

      const result = await decodeToken({
        token: validToken,
        verify: true,
        issuer: customIssuer,
      });

      expect(result).toEqual(mockPayload);
      expect(mockGet).toHaveBeenCalledWith(customIssuer);
      expect(createRemoteJWKSet).toHaveBeenCalledWith(expect.any(URL));
      const jwksUrl = (createRemoteJWKSet as jest.Mock).mock.calls[0][0] as URL;
      expect(jwksUrl.toString()).toContain('/protocol/openid-connect/certs');
    });

    it('should use cached JWKS if available', async () => {
      const mockPayload: JWTPayload = { sub: '1234' };
      const cachedJwks = { keys: ['cached'] };
      mockGet.mockReturnValue(cachedJwks);
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      } as unknown as never);

      const result = await decodeToken({
        token: validToken,
        verify: true,
      });

      expect(result).toEqual(mockPayload);
      expect(mockGet).toHaveBeenCalledWith(issuerUrl);
      expect(createRemoteJWKSet).not.toHaveBeenCalled();
      expect(mockSet).not.toHaveBeenCalled();
      expect(jwtVerify).toHaveBeenCalledWith(validToken, cachedJwks, {
        issuer: issuerUrl,
      });
    });

    it('should throw error when issuer is not provided and AUTH_KEYCLOAK_ISSUER is not set', async () => {
      delete process.env.AUTH_KEYCLOAK_ISSUER;

      await expect(
        decodeToken({
          token: validToken,
          verify: true,
        }),
      ).rejects.toThrow(/Issuer URL required/);

      expect(jwtVerify).not.toHaveBeenCalled();
    });

    it('should handle JWKS fetch errors', async () => {
      (createRemoteJWKSet as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to fetch JWKS');
      });

      await expect(
        decodeToken({
          token: validToken,
          verify: true,
        }),
      ).rejects.toThrow('Failed to fetch JWKS');
    });

    it('should handle verification errors', async () => {
      const mockJwks = { keys: [] };
      (createRemoteJWKSet as jest.Mock).mockReturnValue(mockJwks);
      (jwtVerify as jest.Mock).mockRejectedValue(
        new Error('Signature verification failed') as unknown as never,
      );

      await expect(
        decodeToken({
          token: validToken,
          verify: true,
        }),
      ).rejects.toThrow('Signature verification failed');
    });

    it('should construct correct JWKS URL with trailing slash in issuer', async () => {
      const issuerWithSlash = 'https://auth.example.com/realms/test/';
      const mockPayload: JWTPayload = { sub: '1234' };
      const mockJwks = { keys: [] };
      (createRemoteJWKSet as jest.Mock).mockReturnValue(mockJwks);
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      } as unknown as never);

      await decodeToken({
        token: validToken,
        verify: true,
        issuer: issuerWithSlash,
      });

      expect(createRemoteJWKSet).toHaveBeenCalledWith(expect.any(URL));
      const jwksUrl = (createRemoteJWKSet as jest.Mock).mock.calls[0][0] as URL;
      expect(jwksUrl.pathname).not.toContain('//protocol');
      expect(jwksUrl.pathname).toContain('/protocol/openid-connect/certs');
    });
  });

  describe('Cache behavior', () => {
    it('should cache JWKS for subsequent requests with same issuer', async () => {
      const mockPayload: JWTPayload = { sub: '1234' };
      const mockJwks = { keys: [] };

      // First call - cache miss
      mockGet.mockReturnValueOnce(undefined);
      (createRemoteJWKSet as jest.Mock).mockReturnValue(mockJwks);
      (jwtVerify as jest.Mock).mockResolvedValue({
        payload: mockPayload,
      } as unknown as never);

      await decodeToken({ token: validToken, verify: true });

      expect(createRemoteJWKSet).toHaveBeenCalledTimes(1);
      expect(mockSet).toHaveBeenCalledWith(issuerUrl, mockJwks);

      // Second call - cache hit
      mockGet.mockReturnValueOnce(mockJwks);

      await decodeToken({ token: validToken, verify: true });

      // Should not create new JWKS
      expect(createRemoteJWKSet).toHaveBeenCalledTimes(1);
      expect(jwtVerify).toHaveBeenCalledTimes(2);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle token with resource_access claim', async () => {
      const mockPayload: JWTPayload = {
        sub: '1234',
        account_id: 5678,
        resource_access: {
          'mcp-tool': ['read', 'write'],
        },
      };
      (decodeJwt as jest.Mock).mockReturnValue(mockPayload);

      const result = await decodeToken({
        token: validToken,
        verify: false,
      });

      expect(result).toEqual(mockPayload);
      expect(result.resource_access).toBeDefined();
    });

    it('should handle token with standard claims', async () => {
      const mockPayload: JWTPayload = {
        sub: '1234',
        iss: issuerUrl,
        aud: 'my-app',
        exp: 1234567890,
        iat: 1234567800,
        nbf: 1234567800,
      };
      (decodeJwt as jest.Mock).mockReturnValue(mockPayload);

      const result = await decodeToken({
        token: validToken,
        verify: false,
      });

      expect(result.sub).toBe('1234');
      expect(result.iss).toBe(issuerUrl);
      expect(result.aud).toBe('my-app');
    });
  });
});
