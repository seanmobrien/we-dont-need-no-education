/* @jest-environment node */

import { AuthorizationService } from '@/lib/auth/resources/authorization-service';
import { fetch } from '@/lib/nextjs-util/server';
import { decodeToken } from '@/lib/auth/utilities';

jest.mock('@/lib/nextjs-util/server');
jest.mock('@/lib/auth/utilities');
jest.mock('@compliance-theater/env', () => ({
  env: jest.fn((key) => {
    if (key === 'AUTH_KEYCLOAK_ISSUER') return 'http://keycloak/realm';
    if (key === 'AUTH_KEYCLOAK_CLIENT_ID') return 'client-id';
    return 'value';
  }),
}));

describe('AuthorizationService', () => {
  const service = AuthorizationService.Instance;
  const mockFetch = fetch as jest.Mock;
  const mockDecodeToken = decodeToken as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserEntitlements', () => {
    const token = 'valid-token';

    it('should return entitlements when RPT exchange is successful', async () => {
      // Mock successful fetch response
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValue({ access_token: 'rpt-token' }),
        text: jest.fn().mockResolvedValue(''),
      });

      // Mock decodeToken
      mockDecodeToken.mockResolvedValue({
        authorization: {
          permissions: [
            { rsname: 'res1', scopes: ['s1'] },
            { rsname: 'res2', scopes: ['s2'] },
          ],
        },
      });

      const entitlements = await service.getUserEntitlements(token);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/token'),
        expect.objectContaining({
          method: 'POST',
          body: expect.any(URLSearchParams)
        })
      );

      const body = (mockFetch.mock.calls[0][1].body as URLSearchParams);
      expect(body.get('grant_type')).toBe('urn:ietf:params:oauth:grant-type:uma-ticket');
      // Verify NO permission param is sent
      expect(body.has('permission')).toBe(false);

      expect(entitlements).toHaveLength(2);
      expect(entitlements[0].rsname).toBe('res1');
    });

    it('should return empty array when fetch fails', async () => {
      mockFetch.mockResolvedValue({
        status: 400,
        ok: false,
        text: jest.fn().mockResolvedValue('Bad Request'),
      });

      const entitlements = await service.getUserEntitlements(token);

      expect(entitlements).toEqual([]);
    });

    it('should handle missing authorization claim in token', async () => {
      mockFetch.mockResolvedValue({
        status: 200,
        ok: true,
        json: jest.fn().mockResolvedValue({ access_token: 'rpt-token' }),
      });

      mockDecodeToken.mockResolvedValue({}); // No authorization claim

      const entitlements = await service.getUserEntitlements(token);

      expect(entitlements).toEqual([]);
    });
  });
});
