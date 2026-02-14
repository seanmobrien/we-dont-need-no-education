import { resourceService } from '@/lib/auth/resources/resource-service';
import { authorizationService } from '@/lib/auth/resources/authorization-service';
import { fetch } from '@/lib/nextjs-util/server';
import { decodeToken } from '@/lib/auth/utilities';
import { hideConsoleOutput } from '@/__tests__/test-utils-server';
jest.mock('@/lib/nextjs-util/server', () => ({
    fetch: jest.fn(),
}));
jest.mock('@/lib/auth/utilities', () => ({
    decodeToken: jest.fn(),
}));
jest.mock('@compliance-theater/env', () => ({
    env: jest.fn((key) => {
        if (key === 'AUTH_KEYCLOAK_ISSUER')
            return 'https://keycloak.example.com/realms/test';
        if (key === 'AUTH_KEYCLOAK_CLIENT_ID')
            return 'client-id';
        return 'value';
    }),
}));
describe('ResourceService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        const service = resourceService();
        if (service.cache) {
            service.cache.clear();
        }
    });
    describe('getProtectionApiToken', () => {
        it('should fetch and cache a PAT', async () => {
            const mockToken = 'mock-pat-token';
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ access_token: mockToken, expires_in: 300 }),
            });
            const token = await resourceService().getProtectionApiToken();
            expect(token).toBe(mockToken);
            expect(fetch).toHaveBeenCalledWith('https://keycloak.example.com/realms/test/protocol/openid-connect/token', expect.objectContaining({
                method: 'POST',
                body: expect.any(URLSearchParams),
            }));
        });
        it('should return cached token on second call (cached check)', async () => {
            const mockToken = 'mock-pat-token';
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({ access_token: mockToken, expires_in: 300 }),
            });
            const token1 = await resourceService().getProtectionApiToken();
            const token2 = await resourceService().getProtectionApiToken();
            expect(token1).toBe(mockToken);
            expect(token2).toBe(mockToken);
            expect(fetch).toHaveBeenCalledTimes(1);
        });
    });
    describe('findAuthorizedResource', () => {
        it('should find a resource by name', async () => {
            const mockPat = 'mock-pat-token';
            resourceService().cache.set('pat', mockPat);
            const mockResource = { _id: 'res-123', name: 'case-file:1' };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ['res-123'],
            });
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResource,
            });
            const result = await resourceService().findAuthorizedResource('case-file:1');
            expect(result).toEqual(mockResource);
        });
    });
    describe('getAuthorizedResource', () => {
        it('should get a resource by id', async () => {
            const mockPat = 'mock-pat-token';
            resourceService().cache.set('pat', mockPat);
            const mockResource = { _id: 'res-123', name: 'case-file:1' };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResource,
            });
            const result = await resourceService().getAuthorizedResource('res-123');
            expect(result).toEqual(mockResource);
            expect(fetch).toHaveBeenCalledWith('https://keycloak.example.com/realms/test/authz/protection/resource_set/res-123', expect.objectContaining({
                headers: { Authorization: `Bearer ${mockPat}` },
            }));
        });
        it('should return null if resource not found', async () => {
            const mockPat = 'mock-pat-token';
            resourceService().cache.set('pat', mockPat);
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
            });
            const result = await resourceService().getAuthorizedResource('res-123');
            expect(result).toBeNull();
        });
        it('should throw error on fetch failure', async () => {
            hideConsoleOutput().setup();
            const mockPat = 'mock-pat-token';
            resourceService().cache.set('pat', mockPat);
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
            });
            await expect(resourceService().getAuthorizedResource('res-123')).rejects.toThrow('Failed to get resource details: Internal Server Error');
        });
    });
});
describe('AuthorizationService', () => {
    const service = authorizationService();
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('checkResourceFileAccess', () => {
        it('should return success if UMA returns 200 and no specific permissions checked', async () => {
            const mockRpt = {
                access_token: 'new-access-token',
            };
            fetch.mockResolvedValueOnce({
                status: 200,
                json: async () => mockRpt,
            });
            decodeToken.mockResolvedValue({
                authorization: {
                    permissions: [{ rsid: 'resource-123', scopes: ['case-file:read'] }],
                },
            });
            const result = await service.checkResourceFileAccess({
                resourceId: 'resource-123',
                scope: 'case-file:read',
                bearerToken: 'user-token',
            });
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.accessToken).toBe('new-access-token');
                expect(result.permissions['resource-123']).toEqual(['case-file:read']);
            }
        });
        it('should return success if permissions matches required scopes', async () => {
            const mockRpt = { access_token: 'rpt-token' };
            fetch.mockResolvedValueOnce({
                status: 200,
                json: async () => mockRpt,
            });
            decodeToken.mockResolvedValueOnce({
                authorization: {
                    permissions: [{ rsid: 'resource-123', scopes: ['read', 'write'] }],
                },
            });
            const result = await service.checkResourceFileAccess({
                resourceId: 'resource-123',
                permissions: ['write'],
                bearerToken: 'user-token',
            });
            expect(result.success).toBe(true);
        });
        it('should return 403 if required scope is missing in RPT', async () => {
            const mockRpt = { access_token: 'rpt-token' };
            fetch.mockResolvedValueOnce({
                status: 200,
                json: async () => mockRpt,
            });
            decodeToken.mockResolvedValueOnce({
                authorization: {
                    permissions: [{ rsid: 'resource-123', scopes: ['read'] }],
                },
            });
            const result = await service.checkResourceFileAccess({
                resourceId: 'resource-123',
                permissions: ['write'],
                bearerToken: 'user-token',
            });
            expect(result.success).toBe(false);
            expect(result.code).toBe(403);
        });
        it('should return 403 if resource ID is missing in RPT permissions', async () => {
            const mockRpt = { access_token: 'rpt-token' };
            fetch.mockResolvedValueOnce({
                status: 200,
                json: async () => mockRpt,
            });
            decodeToken.mockResolvedValueOnce({
                authorization: {
                    permissions: [{ rsid: 'other-resource', scopes: ['read'] }],
                },
            });
            const result = await service.checkResourceFileAccess({
                resourceId: 'resource-123',
                permissions: ['read'],
                bearerToken: 'user-token',
            });
            expect(result.success).toBe(false);
            expect(result.code).toBe(403);
        });
        it('should handle 401 from Keycloak', async () => {
            fetch.mockResolvedValueOnce({
                status: 401,
                statusText: 'Unauthorized',
            });
            const result = await service.checkResourceFileAccess({
                resourceId: 'resource-123',
                bearerToken: 'invalid-token',
            });
            expect(result.success).toBe(false);
            expect(result.code).toBe(401);
        });
        it('should handle 403 from Keycloak (UMA denied)', async () => {
            fetch.mockResolvedValueOnce({
                status: 403,
                statusText: 'Forbidden',
            });
            const result = await service.checkResourceFileAccess({
                resourceId: 'resource-123',
                bearerToken: 'user-token',
            });
            expect(result.success).toBe(false);
            expect(result.code).toBe(403);
        });
        it('should return 401 if no bearer token provided', async () => {
            const result = await service.checkResourceFileAccess({
                resourceId: 'resource-123',
            });
            expect(result.success).toBe(false);
            expect(result.code).toBe(401);
        });
    });
});
//# sourceMappingURL=resource-service.test.js.map