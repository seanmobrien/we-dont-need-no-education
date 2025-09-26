import { MemoryClient } from './lib/client/mem0';
import type { MemoryOptions, Message } from './lib/client/types';
import type { Impersonation } from '@/lib/auth/impersonation';
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
  impersonation?: Impersonation;
};

/**
 * A specialized MemoryClient for SchoolLawywer use cases.
 *
 * @class SchoolLawywerMemoryClient
 * @extends MemoryClient
 * @private #defaultOptions - Default memory options for the client.
 * @private #impersonation - Optional impersonation instance for authenticated calls.
 */
class SchoolLawywerMemoryClient extends MemoryClient {
  readonly #defaultOptions: MemoryOptions;
  readonly #impersonation?: Impersonation;

  /**
   * Constructs a new SchoolLawywerMemoryClient instance.
   *
   * @param defaults - Default memory options.
   * @param projectId - The ID of the project.
   * @param orgId - The ID of the organization.
   * @param impersonation - Optional impersonation instance.
   * @param ops - Additional client options.
   */
  constructor({
    defaults,
    projectId,
    orgId,
    impersonation,
    ...ops
  }: ClientOptions) {
    // Determine authentication method - prefer impersonation over API key
    const authOptions = impersonation
      ? { bearerToken: undefined } // Will be set dynamically
      : { apiKey: env('MEM0_API_KEY') };

    super({
      ...ops,
      ...authOptions,
      projectId: (projectId ? projectId : env('MEM0_PROJECT_ID')) ?? undefined,
      organizationId: (orgId ? orgId : env('MEM0_ORG_ID')) ?? undefined,
      host: env('MEM0_API_HOST'),
    });

    this.#defaultOptions = {
      ...(defaults ?? {}),
    };
    this.#impersonation = impersonation;

    // Log authentication method being used
    if (impersonation) {
      log((l) =>
        l.debug('MemoryClient configured with impersonation', {
          userId: impersonation.getUserContext().userId,
          hasApiKey: !!env('MEM0_API_KEY'),
        }),
      );
    }
  }

  /**
   * Updates the authorization header with an impersonated token if available.
   * @private
   */
  private async updateAuthorizationIfNeeded(): Promise<void> {
    if (this.#impersonation) {
      try {
        const impersonatedToken =
          await this.#impersonation.getImpersonatedToken();
        const authHeader = `Bearer ${impersonatedToken}`;

        // Update both the headers property and the axios client
        this.headers.Authorization = authHeader;
        this.client.defaults.headers.Authorization = authHeader;

        log((l) =>
          l.debug('Updated mem0 client with impersonated token', {
            userId: this.#impersonation!.getUserContext().userId,
          }),
        );
      } catch (error) {
        log((l) =>
          l.warn(
            'Failed to update mem0 client with impersonated token, using fallback',
            error,
          ),
        );
        // Fallback to API key if available
        if (env('MEM0_API_KEY')) {
          const fallbackAuth = `Token ${env('MEM0_API_KEY')}`;
          this.headers.Authorization = fallbackAuth;
          this.client.defaults.headers.Authorization = fallbackAuth;
        }
      }
    }
  }

  /**
   * Override HTTP methods to ensure impersonated token is current
   */
  override async _fetchWithErrorHandling(
    url: string,
    options: any,
  ): Promise<any> {
    await this.updateAuthorizationIfNeeded();
    return super._fetchWithErrorHandling(url, options);
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
      ...this.#defaultOptions,
      ...options,
    });
  }

  /**
   * Prepares the parameters for memory operations.
   *
   * @param options - Memory options to include in the parameters.
   * @returns The prepared parameters object.
   */
  override _prepareParams(options: MemoryOptions): object {
    return super._prepareParams({
      ...this.#defaultOptions,
      ...options,
    });
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
 * const client = memoryClientFactory({ impersonation });
 *
 * // Create with API key (fallback)
 * const client = memoryClientFactory({});
 * ```
 */
export const memoryClientFactory = (options: ClientOptions): MemoryClient => {
  const ret = new SchoolLawywerMemoryClient(options);
  return ret;
};
