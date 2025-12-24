import { isError } from '@/lib/react-util/utility-methods';

export type ModelResourceType = 'provider' | 'model' | 'tool' | 'model-quota';

export interface ModelResourceNotFoundOptions {
  resourceType: ModelResourceType;
  normalized: unknown;
  inputRaw: unknown;
  message: string;
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
