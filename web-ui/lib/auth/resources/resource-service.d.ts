import type { ServiceInstanceOverloads } from '../../typescript/_generics';

/**
 * Resource Service module declaration
 * @module @/lib/auth/resources/resource-service
 */

declare module '@/lib/auth/resources/resource-service' {
  /**
   * Service for managing Keycloak resources
   */
  export class ResourceService {
    private constructor();

    /**
     * Gets the singleton instance of ResourceService
     */
    public static get Instance(): ResourceService;

    /**
     * Obtains a Protection API Token (PAT) for service account operations
     *
     * @description This method uses client credentials to obtain a token that can be used
     * to call Keycloak's Protection API. The token is cached to reduce
     * load on Keycloak.
     *
     * @returns {Promise<string>} The access token (PAT)
     * @throws {Error} If token retrieval fails
     */
    public getProtectionApiToken(): Promise<string>;

    /**
     * Finds an authorized resource by name
     *
     * @template TResource
     * @param {string} name - The name of the resource to find
     * @returns {Promise<TResource | null>} The resource if found, null otherwise
     */
    public findAuthorizedResource<TResource>(name: string): Promise<TResource | null>;

    /**
     * Gets an authorized resource by its ID
     *
     * @template TResource
     * @param {string} id - The ID of the resource to get
     * @returns {Promise<TResource | null>} The resource if found, null otherwise
     */
    public getAuthorizedResource<TResource>(id: string): Promise<TResource | null>;

    /**
     * Creates a new authorized resource
     *
     * @template TResource
     * @param {TResource} resource - The resource to create
     * @returns {Promise<TResource>} The created resource
     */
    public createAuthorizedResource<TResource extends { _id?: string; name: string }>(resource: TResource): Promise<TResource>;
  }

  /**
   * Singleton instance of ResourceService
   */
  export const resourceService: ServiceInstanceOverloads<ResourceService>;
}
