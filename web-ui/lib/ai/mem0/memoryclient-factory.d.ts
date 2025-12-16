import type { MemoryClient } from './lib/client/mem0';
import type { MemoryOptions } from './lib/client/types';
import type {
  MemoryHealthCheckResponse,
  HealthCheckParams,
} from './types/health-check';
import type { ImpersonationService } from '../../auth/impersonation';


declare module './lib/client/mem0/memoryclient-factory' {
  /**
   * Options for configuring the MemoryClient instance.
   *
   * @property projectId - The ID of the project to associate with the client.
   * @property orgId - The ID of the organization to associate with the client.
   * @property defaults - Default memory options to use for the client.
   * @property impersonation - Optional impersonation instance for authenticated calls.
   */
  export type ClientOptions = {
    projectId?: string;
    orgId?: string;
    defaults?: MemoryOptions;
    impersonation?: ImpersonationService;
  };

  /**
   * Extended MemoryClient with additional methods.
   */
  export type ExtendedMemoryClient = MemoryClient & {
    /**
     * Performs a health check on the memory service.
     *
     * @param params - Optional parameters for the health check.
     * @returns Promise resolving to the health check response.
     *
     * @example
     * ```typescript
     * const client = await memoryClientFactory({});
     * const healthCheckResponse = await client.healthCheck();
     * ```
     */
    healthCheck: (
      params?: HealthCheckParams,
    ) => Promise<MemoryHealthCheckResponse>;
  };

  /**
   * Factory function for creating a MemoryClient instance.
   *
   * @param options - Configuration options for the MemoryClient.
   * @returns A new MemoryClient instance.
   *
   * @example
   * ```typescript
   * // Create with impersonation
   * const impersonation = await Impersonation.fromRequest(request);
   * const client = await memoryClientFactory({ impersonation });
   *
   * // Create with API key (fallback)
   * const client = await memoryClientFactory({});
   * ```
   */
  export const memoryClientFactory: <
    TClient extends MemoryClient = MemoryClient,
  >(options: ClientOptions) => Promise<TClient>;
}

