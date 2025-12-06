/**
 * @fileoverview Domain-specific error for missing model resources (provider or model).
 */

declare module '@/lib/ai/services/chat/errors/resource-not-found-error' {
  /**
   * Extendable union of resource categories that can be "not found" in AI services
   */
  export type ModelResourceType =
    | 'provider'
    | 'model'
    | 'tool'
    | 'model-quota';

  export interface ModelResourceNotFoundOptions {
    /** The kind of resource missing */
    resourceType: ModelResourceType;
    /** Normalized value used for the lookup (e.g., provider name, providerId:modelName) */
    normalized: unknown;
    /** Raw, unnormalized input that led to the lookup */
    inputRaw: unknown;
    /** Short message describing the source of the failure */
    message: string;
    /** Optional inner error to preserve original exception */
    cause?: unknown;
  }

  /**
   * Custom error thrown when a requested model resource cannot be found.
   *
   * This error is used to handle scenarios where a specific provider, model, tool,
   * or quota record is requested but does not exist in the system.
   *
   * @class ResourceNotFoundError
   * @extends Error
   */
  export class ResourceNotFoundError extends Error {
    /**
     * The name of the error class, always set to 'ResourceNotFoundError'.
     */
    readonly name: string;

    /**
     * The type of resource that was not found.
     */
    readonly resourceType: ModelResourceType;

    /**
     * The normalized identifier used for the lookup.
     */
    readonly normalized: unknown;

    /**
     * The raw input that resulted in the failed lookup.
     */
    readonly inputRaw: unknown;

    /**
     * A short description of the error.
     */
    readonly shortMessage: string;

    /**
     * Creates a new ResourceNotFoundError instance.
     *
     * @param options - Configuration options for the error
     */
    constructor(options: ModelResourceNotFoundOptions);
  }

  /**
   * Type guard for ResourceNotFoundError supporting instance and duck-typed detection.
   */
  export function isResourceNotFoundError(
    e: unknown,
  ): e is ResourceNotFoundError;
}
