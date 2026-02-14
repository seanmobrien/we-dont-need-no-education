import { env } from '@compliance-theater/env';
import { fetch } from '@/lib/nextjs-util/server';
import { LoggedError, log } from '@compliance-theater/logger';
import { decodeToken } from '../utilities';
import { serviceInstanceOverloadsFactory, SingletonProvider, } from '@compliance-theater/typescript';
import { normalizedAccessToken } from '../access-token';
export class AuthorizationService {
    constructor() { }
    static get Instance() {
        const ret = SingletonProvider.Instance.getOrCreate('@no-education/lib/auth/resources/authorization-service', () => new AuthorizationService());
        if (!ret) {
            throw LoggedError.isTurtlesAllTheWayDownBaby(new Error('Unable to get singleton instance of AuthorizationService'), {
                log: true,
                source: 'AuthorizationService',
            });
        }
        return ret;
    }
    getTokenEndpoint() {
        return `${env('AUTH_KEYCLOAK_ISSUER')}/protocol/openid-connect/token`;
    }
    async checkResourceFileAccess(options) {
        const { resourceId, scope, audience, permissions } = options;
        const normalToken = await normalizedAccessToken(options?.bearerToken);
        if (!normalToken) {
            log((l) => l.warn('No authentication context availbale for authorization check'));
            return { success: false, code: 401 };
        }
        const { accessToken: bearerToken } = normalToken;
        try {
            const permissionParam = scope ? `${resourceId}#${scope}` : resourceId;
            const targetAudience = audience || env('AUTH_KEYCLOAK_CLIENT_ID');
            const body = new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:uma-ticket',
                ...(targetAudience ? { audience: targetAudience } : {}),
                permission: permissionParam,
            });
            const response = await fetch(this.getTokenEndpoint(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Bearer ${bearerToken}`,
                },
                body,
            });
            if (response.status === 200) {
                const rpt = await response.json();
                const accessToken = rpt.access_token;
                let decodedToken = rpt;
                if (accessToken) {
                    decodedToken = await decodeToken(accessToken);
                }
                const tokenPermissionsList = decodedToken.authorization?.permissions || [];
                const mappedPermissions = {};
                for (const perm of tokenPermissionsList) {
                    if (perm.rsid && Array.isArray(perm.scopes)) {
                        mappedPermissions[perm.rsid] = perm.scopes;
                    }
                }
                if (permissions && permissions.length > 0) {
                    const resourcePerms = mappedPermissions[resourceId];
                    if (!resourcePerms) {
                        return { success: false, code: 403 };
                    }
                    const hasAllPermissions = permissions.every((p) => resourcePerms.includes(p));
                    if (!hasAllPermissions) {
                        return { success: false, code: 403 };
                    }
                }
                return {
                    success: true,
                    accessToken: accessToken,
                    permissions: mappedPermissions,
                };
            }
            else if (response.status === 403 || response.status === 401) {
                return { success: false, code: response.status };
            }
            const text = await response.text();
            log((l) => l.warn({
                msg: 'Unexpected response when checking resource access',
                status: response.status,
                response: text,
                resourceId,
                scope,
            }));
            return { success: false, code: response.status };
        }
        catch (error) {
            log((l) => l.error({
                msg: 'Error checking resource access',
                resourceId,
                scope,
                error,
            }));
            return { success: false, code: 500 };
        }
    }
    async getUserEntitlements(reqOrBearerToken, audience) {
        const normalizedInput = await normalizedAccessToken(reqOrBearerToken, {
            skipUserId: true,
        });
        if (!normalizedInput) {
            log((l) => l.warn('No credentials available for entitlement check.'));
            return [];
        }
        const { accessToken: bearerToken } = normalizedInput;
        const targetAudience = audience || env('AUTH_KEYCLOAK_CLIENT_ID');
        try {
            const body = new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:uma-ticket',
                ...(targetAudience ? { audience: targetAudience } : {}),
            });
            const response = await fetch(this.getTokenEndpoint(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: `Bearer ${bearerToken}`,
                },
                body,
            });
            if (response.status !== 200) {
                const text = await response.text();
                log((l) => l.warn({
                    msg: 'Failed to retrieve entitlements',
                    status: response.status,
                    response: text,
                }));
                return [];
            }
            const rpt = await response.json();
            const accessToken = rpt.access_token;
            if (!accessToken) {
                return [];
            }
            const decodedToken = await decodeToken(accessToken);
            const permissions = decodedToken.authorization?.permissions || [];
            return permissions;
        }
        catch (error) {
            log((l) => l.error({
                msg: 'Error retrieving user entitlements',
                error,
            }));
            return [];
        }
    }
}
export const authorizationService = serviceInstanceOverloadsFactory(() => AuthorizationService.Instance);
//# sourceMappingURL=authorization-service.js.map