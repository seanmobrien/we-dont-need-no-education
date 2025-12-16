import { MemoryClient } from './lib/client/mem0';
import type { MemoryOptions, Message } from './lib/client/types';
import type {
  MemoryHealthCheckResponse,
  HealthCheckParams,
} from './types/health-check';
import { fromRequest, ImpersonationService } from '@/lib/auth/impersonation';
import { env } from '@/lib/site-util/env';
import { log } from '@/lib/logger';

/**
 * Options for configuring the MemoryClient instance.
 *
 * @property projectId - The ID of the project to associate with the client.
 * @property orgId - The ID of the organization to associate with the client.
 * @property defaults - Default memory options to use for the client.
 * @property impersonation - Optional impersonation instance for authenticated calls.
 */
type ClientOptions = {
  projectId?: string;
  orgId?: string;
  defaults?: MemoryOptions;
  impersonation?: ImpersonationService;
};

export type ExtendedMemoryClient = MemoryClient & {
  healthCheck: (
    params?: HealthCheckParams,
  ) => Promise<MemoryHealthCheckResponse>;
};

/**
 * A specialized MemoryClient for SchoolLawyer use cases.
 *
 * @class SchoolLawyerMemoryClient
 * @extends MemoryClient
 * @private defaultOptions - Default memory options for the client.
 * @private #impersonation - Optional impersonation instance for authenticated calls.
 */
class SchoolLawyerMemoryClient
  extends MemoryClient
  implements ExtendedMemoryClient {
  readonly defaultOptions: MemoryOptions;

  /**
   * Constructs a new SchoolLawyerMemoryClient instance.
   *
   * @param defaults - Default memory options.
   * @param projectId - The ID of the project.
   * @param orgId - The ID of the organization.
   * @param impersonation - Optional impersonation instance.
   * @param ops - Additional client options.
   */
  constructor({ defaults, projectId, orgId, ...ops }: ClientOptions) {
    super({
      ...ops,
      projectId: (projectId ? projectId : env('MEM0_PROJECT_ID')) ?? undefined,
      organizationId: (orgId ? orgId : env('MEM0_ORG_ID')) ?? undefined,
      host: env('MEM0_API_HOST'),
    });

    this.defaultOptions = {
      ...(defaults ?? {}),
    };
  }

  /**
   * Prepares the payload for memory operations.
   *
   * @param messages - Array of messages to include in the payload.
   * @param options - Memory options to include in the payload.
   * @returns The prepared payload object.
   */
  override _preparePayload(
    messages: Array<Message>,
    options: MemoryOptions,
  ): object {
    return super._preparePayload(messages, {
      ...this.defaultOptions,
      ...options,
    });
  }

  /**
   * Prepares the parameters for memory operations.
   *
   * @param options - Memory options to include in the parameters.
   * @returns The prepared parameters object.
   */
  override _prepareParams(options: MemoryOptions): Record<string, string> {
    return super._prepareParams({
      ...this.defaultOptions,
      ...options,
    });
  }

  /**
   * Performs a health check on the memory service.
   *
   * @param params - Optional parameters for the health check.
   * @returns Promise resolving to the health check response.
   */
  async healthCheck(
    params: HealthCheckParams = {},
  ): Promise<MemoryHealthCheckResponse> {
    const { strict = false, verbose = 1 } = params;
    const searchParams = new URLSearchParams({
      strict: strict.toString(),
      verbose: verbose.toString(),
    });

    const url = `stats/health-check?${searchParams.toString()}`;

    try {
      const response = await this._fetchWithErrorHandling(url, {
        method: 'GET',
        headers: this.headers,
      });

      return response as MemoryHealthCheckResponse;
    } catch (error) {
      log((l) => l.error('Memory health check failed', { error, url }));
      throw error;
    }
  }
}

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
export const memoryClientFactory = async <
  TClient extends MemoryClient = MemoryClient,
>(
  options: ClientOptions,
): Promise<TClient> => {
  const clientOps = {
    ...options,
  };
  if (!options.impersonation) {
    const impersonateService = await fromRequest({});
    if (impersonateService) {
      clientOps.impersonation = impersonateService;
    }
  }
  const ret = new SchoolLawyerMemoryClient(clientOps) as unknown as TClient;
  return ret;
};
