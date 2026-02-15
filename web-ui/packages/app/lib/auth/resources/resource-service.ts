/**
 * @fileoverview Generic Resource Service for Keycloak Authorization Services
 *
 * This service provides generic methods for managing Keycloak resources, including
 * obtaining Protection API Tokens (PAT) with caching, finding resources by name,
 * and creating new authorized resources.
 *
 * @module lib/auth/resources/resource-service
 */

import { env } from '@compliance-theater/env';
import { fetch } from '@compliance-theater/nextjs/server';
import { LoggedError } from '@compliance-theater/logger';
import { LRUCache } from 'lru-cache';
import { SingletonProvider } from '@compliance-theater/typescript';
import { serviceInstanceOverloadsFactory } from '@compliance-theater/typescript';

/**
 * Configuration for the ResourceService cache
 */
const CACHE_OPTIONS = {
  max: 100, // Maximum number of items in cache
  ttl: 1000 * 60 * 5, // 5 minutes TTL (Keycloak tokens usually last longer, but this is safe)
};

type BaseAttributes = Record<
  string,
  string | string[] | Record<string, unknown>
>;

export type BasicResourceRecord<
  TAttributes extends BaseAttributes = BaseAttributes,
> = {
  /** Unique resource ID in Keycloak */
  _id: string;
  /** Resource name: case-file:{userId} */
  name: string;
  /** Resource type identifier */
  type?: string;
  /** Keycloak user ID of the owner */
  owner?: string;
  /** Associated scopes for this resource */
  scopes?: string[];
  /** Resource attributes */
  attributes: TAttributes;
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
      '@no-education/lib/auth/resources/resource-service',
      () => new ResourceService(),
    );
    if (!ret) {
      throw LoggedError.isTurtlesAllTheWayDownBaby(
        new Error('Unable to get singleton instance of ResourceService'),
        {
          log: true,
          source: 'ResourceService',
        },
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
      const ttl = json.expires_in
        ? json.expires_in * 1000 - 30000
        : CACHE_OPTIONS.ttl; // Buffer of 30s
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
   * @returns The resource if found, null if no match is found.  Throws an error if the request fails.
   */
  public async findAuthorizedResource<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TResource extends BasicResourceRecord<any>,
    TAttributes extends TResource extends BasicResourceRecord<
      infer TInferAttributes
    >
      ? TInferAttributes
      : never = TResource extends BasicResourceRecord<infer TInferAttributes>
      ? TInferAttributes
      : never,
  >(name: string): Promise<BasicResourceRecord<TAttributes> | null> {
    try {
      const pat = await this.getProtectionApiToken();

      // First find the resource ID by name
      const queryUrl = `${env(
        'AUTH_KEYCLOAK_ISSUER',
      )}/authz/protection/resource_set?name=${encodeURIComponent(name)}`;
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

      // Then get the full resource details using the first ID found
      return await this.getAuthorizedResource<TResource, TAttributes>(
        resourceIds[0],
      );
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
   * Gets an authorized resource by its ID
   *
   * @param id - The ID of the resource to get
   * @returns The resource if found, null if no match is found.  Throws an error if the request fails.
   */
  public async getAuthorizedResource<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TResource extends BasicResourceRecord<any>,
    TAttributes extends TResource extends BasicResourceRecord<
      infer TInferAttributes
    >
      ? TInferAttributes
      : never,
  >(id: string): Promise<BasicResourceRecord<TAttributes> | null> {
    try {
      const pat = await this.getProtectionApiToken();
      const resourceUrl = `${env(
        'AUTH_KEYCLOAK_ISSUER',
      )}/authz/protection/resource_set/${id}`;

      const resourceResponse = await fetch(resourceUrl, {
        headers: {
          Authorization: `Bearer ${pat}`,
        },
      });

      if (!resourceResponse.ok) {
        if (resourceResponse.status === 404) {
          return null;
        }
        throw new Error(
          `Failed to get resource details: ${resourceResponse.statusText}`,
        );
      }
      const resource =
        (await resourceResponse.json()) as BasicResourceRecord<TAttributes>;
      return resource;
    } catch (error) {
      throw LoggedError.isTurtlesAllTheWayDownBaby(error, {
        log: true,
        source: 'ResourceService.getAuthorizedResource',
        msg: 'Failed to get authorized resource',
        include: { resourceId: id },
      });
    }
  }

  /**
   * Creates a new authorized resource
   *
   * @param resource - The resource to create
   * @returns The created resource
   */
  public async createAuthorizedResource<
    TResource extends { _id?: string; name: string },
  >(resource: TResource): Promise<TResource & { _id: string }> {
    try {
      const pat = await this.getProtectionApiToken();
      const resourcesUrl = `${env(
        'AUTH_KEYCLOAK_ISSUER',
      )}/authz/protection/resource_set`;

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
        throw new Error(
          `Failed to create resource: ${createResponse.statusText} - ${errorText}`,
        );
      }

      const createdResource = (await createResponse.json()) as TResource;
      return { ...createdResource, _id: createdResource._id! };
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

export const resourceService = serviceInstanceOverloadsFactory(
  () => ResourceService.Instance,
);
