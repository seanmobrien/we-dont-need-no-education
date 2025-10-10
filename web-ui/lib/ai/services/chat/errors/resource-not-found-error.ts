/**
 * Domain-specific error for missing model resources (provider or model).
 */
import { isError } from '@/lib/react-util/utility-methods';

// Extendable union of resource categories that can be "not found" in AI services
export type ModelResourceType = 'provider' | 'model' | 'tool' | 'model-quota';

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

export class ResourceNotFoundError extends Error {
  readonly name = 'ResourceNotFoundError';
  readonly resourceType: ModelResourceType;
  readonly normalized: unknown;
  readonly inputRaw: unknown;
  readonly shortMessage: string;

  constructor(options: ModelResourceNotFoundOptions) {
    super(options.message, { cause: options.cause });
    this.resourceType = options.resourceType;
    this.normalized = options.normalized;
    this.inputRaw = options.inputRaw;
    this.shortMessage = options.message;
  }
}

/**
 * Type guard for ResourceNotFoundError supporting instance and duck-typed detection.
 */
export function isResourceNotFoundError(
  e: unknown,
): e is ResourceNotFoundError {
  if (!isError(e)) return false;
  const anyErr = e as Partial<{
    name: unknown;
    resourceType: unknown;
    normalized: unknown;
    inputRaw: unknown;
    shortMessage: unknown;
  }>;
  if (anyErr.name === 'ResourceNotFoundError') return true;
  // Duck typing: check required properties
  const rt = anyErr.resourceType;
  const hasRT = rt === 'provider' || rt === 'model';
  return (
    hasRT &&
    'normalized' in anyErr &&
    'inputRaw' in anyErr &&
    typeof anyErr.shortMessage === 'string'
  );
}
