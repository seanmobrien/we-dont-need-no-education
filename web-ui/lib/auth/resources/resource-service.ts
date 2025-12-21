/**
 * @fileoverview Generic Resource Service for Keycloak Authorization Services
 *
 * This service provides generic methods for managing Keycloak resources, including
 * obtaining Protection API Tokens (PAT) with caching, finding resources by name,
 * and creating new authorized resources.
 *
 * @module lib/auth/resources/resource-service
 */

import { env } from '@/lib/site-util/env';
import { fetch } from '@/lib/nextjs-util/server';
import { LoggedError } from '@/lib/react-util/errors/logged-error';
import { LRUCache } from 'lru-cache';
import { SingletonProvider } from '@/lib/typescript';
import { serviceInstanceOverloadsFactory } from '@/lib/typescript/_generics';

/**
 * Configuration for the ResourceService cache
 */
const CACHE_OPTIONS = {
  max: 100, // Maximum number of items in cache
  ttl: 1000 * 60 * 5, // 5 minutes TTL (Keycloak tokens usually last longer, but this is safe)
};

/**
 * Service for managing Keycloak resources
 */
export class ResourceService {
  private cache: LRUCache<string, string>;

  private constructor() {
    this.cache = new LRUCache(CACHE_OPTIONS);
  }

  /**
   * Gets the singleton instance of ResourceService
   */
  public static get Instance(): ResourceService {
    const ret = SingletonProvider.Instance.getOrCreate(
      "@no-education/lib/auth/resources/resource-service",
      () => new ResourceService()
    );
    if (!ret) {
      throw LoggedError.isTurtlesAllTheWayDownBaby(
        new Error('Unable to get singleton instance of ResourceService'),
        {
          log: true,
          source: "ResourceService",
        }
      );
    }
    return ret;
  }

  /**
   * Gets the Keycloak token endpoint URL
   */
  private getTokenEndpoint(): string {
    return `${env('AUTH_KEYCLOAK_ISSUER')}/protocol/openid-connect/token`;
  }

  /**
   * Obtains a Protection API Token (PAT) for service account operations
   *
   * This method uses client credentials to obtain a token that can be used
   * to call Keycloak's Protection API. The token is cached to reduce
   * load on Keycloak.
   *
   * @returns The access token (PAT)
   * @throws {Error} If token retrieval fails
   */
  public async getProtectionApiToken(): Promise<string> {
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

      // Cache the token
      // Use expires_in from response if available, otherwise default TTL
      const ttl = json.expires_in ? json.expires_in * 1000 - 30000 : CACHE_OPTIONS.ttl; // Buffer of 30s
      this.cache.set(cacheKey, token, { ttl: Math.max(ttl, 0) });

      return token;
    } catch (error) {
      throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'ResourceService.getProtectionApiToken',
        msg: 'Failed to retrieve Protection API Token',
      });
    }
  }

  /**
   * Finds an authorized resource by name
   *
   * @param name - The name of the resource to find
   * @returns The resource if found, null otherwise
   */
  public async findAuthorizedResource<TResource>(name: string): Promise<TResource | null> {
    try {
      const pat = await this.getProtectionApiToken();
      const resourcesUrl = `${env('AUTH_KEYCLOAK_ISSUER')}/authz/protection/resource_set?name=${encodeURIComponent(name)}`;

      const resourcesResponse = await fetch(resourcesUrl, {
        headers: {
          Authorization: `Bearer ${pat}`,
        },
      });

      if (!resourcesResponse.ok) {
        if (resourcesResponse.status === 404) {
          return null;
        }
        throw new Error(`Failed to search resources: ${resourcesResponse.statusText}`);
      }

      const resourceIds = await resourcesResponse.json();
      if (!resourceIds || resourceIds.length === 0) {
        return null;
      }

      // Get the full resource details

      const resourceId = resourceIds[0];
      const resourceUrl = `${env('AUTH_KEYCLOAK_ISSUER')}/authz/protection/resource_set/${resourceId}`;
      const resourceResponse = await fetch(resourceUrl, {
        headers: {
          Authorization: `Bearer ${pat}`,
        },
      });

      if (!resourceResponse.ok) {
        throw new Error(`Failed to get resource details: ${resourceResponse.statusText}`);
      }

      const resource = await resourceResponse.json();
      return resource as TResource;
    } catch (error) {
      throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'ResourceService.findAuthorizedResource',
        msg: 'Failed to find authorized resource',
        include: { resourceName: name },
      });
    }
  }

  /**
   * Creates a new authorized resource
   *
   * @param resource - The resource to create
   * @returns The created resource
   */
  public async createAuthorizedResource<TResource extends { _id?: string; name: string }>(resource: TResource): Promise<TResource> {
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

      const createdResource = await createResponse.json();
      return { ...resource, _id: createdResource._id };
    } catch (error) {
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
