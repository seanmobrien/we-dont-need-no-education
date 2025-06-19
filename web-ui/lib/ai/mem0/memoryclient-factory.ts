import { MemoryClient } from './lib/client/mem0';
import type { MemoryOptions, Message } from './lib/client/types';
import { env } from '@/lib/site-util/env';

/**
 * Options for configuring the MemoryClient instance.
 *
 * @property projectId - The ID of the project to associate with the client.
 * @property orgId - The ID of the organization to associate with the client.
 * @property defaults - Default memory options to use for the client.
 */
type ClientOptions = {
  projectId?: string;
  orgId?: string;
  defaults?: MemoryOptions;
};

/**
 * A specialized MemoryClient for SchoolLawywer use cases.
 *
 * @class SchoolLawywerMemoryClient
 * @extends MemoryClient
 * @private #defaultOptions - Default memory options for the client.
 */
class SchoolLawywerMemoryClient extends MemoryClient {
  readonly #defaultOptions: MemoryOptions;

  /**
   * Constructs a new SchoolLawywerMemoryClient instance.
   *
   * @param defaults - Default memory options.
   * @param projectId - The ID of the project.
   * @param orgId - The ID of the organization.
   * @param ops - Additional client options.
   */
  constructor({ defaults, projectId, orgId, ...ops }: ClientOptions) {
    super({
      ...ops,
      projectId: (projectId ? projectId : env('MEM0_PROJECT_ID')) ?? undefined,
      organizationId: (orgId ? orgId : env('MEM0_ORG_ID')) ?? undefined,
      apiKey: env('MEM0_API_KEY'),
      host: env('MEM0_API_HOST'),
    });
    this.#defaultOptions = {
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
 */
export const memoryClientFactory = (options: ClientOptions): MemoryClient => {
  const ret = new SchoolLawywerMemoryClient(options);
  return ret;
};
