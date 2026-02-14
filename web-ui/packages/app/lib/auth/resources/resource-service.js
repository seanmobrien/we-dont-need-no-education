import { env } from '@compliance-theater/env';
import { fetch } from '@/lib/nextjs-util/server';
import { LoggedError } from '@compliance-theater/logger';
import { LRUCache } from 'lru-cache';
import { SingletonProvider } from '@compliance-theater/typescript';
import { serviceInstanceOverloadsFactory } from '@compliance-theater/typescript';
const CACHE_OPTIONS = {
    max: 100,
    ttl: 1000 * 60 * 5,
};
export class ResourceService {
    cache;
    constructor() {
        this.cache = new LRUCache(CACHE_OPTIONS);
    }
    static get Instance() {
        const ret = SingletonProvider.Instance.getOrCreate('@no-education/lib/auth/resources/resource-service', () => new ResourceService());
        if (!ret) {
            throw LoggedError.isTurtlesAllTheWayDownBaby(new Error('Unable to get singleton instance of ResourceService'), {
                log: true,
                source: 'ResourceService',
            });
        }
        return ret;
    }
    getTokenEndpoint() {
        return `${env('AUTH_KEYCLOAK_ISSUER')}/protocol/openid-connect/token`;
    }
    async getProtectionApiToken() {
        const cacheKey = 'pat';
        const cachedToken = this.cache.get(cacheKey);
        if (cachedToken) {
            return cachedToken;
        }
        const client_id = env('AUTH_KEYCLOAK_CLIENT_ID');
        const client_secret = env('AUTH_KEYCLOAK_CLIENT_SECRET');
        const body = new URLSearchParams({
            grant_type: 'client_credentials',
            ...(client_id ? { client_id } : {}),
            ...(client_secret ? { client_secret } : {}),
            scope: 'uma_protection',
        });
        try {
            const res = await fetch(this.getTokenEndpoint(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body,
            });
            if (!res.ok) {
                throw new Error(`Failed to get PAT: ${res.statusText}`);
            }
            const json = await res.json();
            const token = json.access_token;
            const ttl = json.expires_in
                ? json.expires_in * 1000 - 30000
                : CACHE_OPTIONS.ttl;
            this.cache.set(cacheKey, token, { ttl: Math.max(ttl, 0) });
            return token;
        }
        catch (error) {
            throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'ResourceService.getProtectionApiToken',
                msg: 'Failed to retrieve Protection API Token',
            });
        }
    }
    async findAuthorizedResource(name) {
        try {
            const pat = await this.getProtectionApiToken();
            const queryUrl = `${env('AUTH_KEYCLOAK_ISSUER')}/authz/protection/resource_set?name=${encodeURIComponent(name)}`;
            const queryRes = await fetch(queryUrl, {
                headers: {
                    Authorization: `Bearer ${pat}`,
                },
            });
            if (!queryRes.ok) {
                if (queryRes.status === 404) {
                    return null;
                }
                throw new Error(`Failed to search resources: ${queryRes.statusText}`);
            }
            const resourceIds = await queryRes.json();
            if (!resourceIds || resourceIds.length === 0) {
                return null;
            }
            return await this.getAuthorizedResource(resourceIds[0]);
        }
        catch (error) {
            throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'ResourceService.findAuthorizedResource',
                msg: 'Failed to find authorized resource',
                include: { resourceName: name },
            });
        }
    }
    async getAuthorizedResource(id) {
        try {
            const pat = await this.getProtectionApiToken();
            const resourceUrl = `${env('AUTH_KEYCLOAK_ISSUER')}/authz/protection/resource_set/${id}`;
            const resourceResponse = await fetch(resourceUrl, {
                headers: {
                    Authorization: `Bearer ${pat}`,
                },
            });
            if (!resourceResponse.ok) {
                if (resourceResponse.status === 404) {
                    return null;
                }
                throw new Error(`Failed to get resource details: ${resourceResponse.statusText}`);
            }
            const resource = (await resourceResponse.json());
            return resource;
        }
        catch (error) {
            throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'ResourceService.getAuthorizedResource',
                msg: 'Failed to get authorized resource',
                include: { resourceId: id },
            });
        }
    }
    async createAuthorizedResource(resource) {
        try {
            const pat = await this.getProtectionApiToken();
            const resourcesUrl = `${env('AUTH_KEYCLOAK_ISSUER')}/authz/protection/resource_set`;
            const createResponse = await fetch(resourcesUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${pat}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(resource),
            });
            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                throw new Error(`Failed to create resource: ${createResponse.statusText} - ${errorText}`);
            }
            const createdResource = (await createResponse.json());
            return { ...createdResource, _id: createdResource._id };
        }
        catch (error) {
            throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
                log: true,
                source: 'ResourceService.createAuthorizedResource',
                msg: 'Failed to create authorized resource',
                include: { resourceName: resource.name },
            });
        }
    }
}
export const resourceService = serviceInstanceOverloadsFactory(() => ResourceService.Instance);
//# sourceMappingURL=resource-service.js.map