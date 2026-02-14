import { isError } from '@compliance-theater/logger';
export class ResourceNotFoundError extends Error {
    name = 'ResourceNotFoundError';
    resourceType;
    normalized;
    inputRaw;
    shortMessage;
    constructor(options) {
        super(options.message, { cause: options.cause });
        this.resourceType = options.resourceType;
        this.normalized = options.normalized;
        this.inputRaw = options.inputRaw;
        this.shortMessage = options.message;
    }
}
export function isResourceNotFoundError(e) {
    if (!isError(e))
        return false;
    const anyErr = e;
    if (anyErr.name === 'ResourceNotFoundError')
        return true;
    const rt = anyErr.resourceType;
    const hasRT = rt === 'provider' || rt === 'model';
    return (hasRT &&
        'normalized' in anyErr &&
        'inputRaw' in anyErr &&
        typeof anyErr.shortMessage === 'string');
}
//# sourceMappingURL=resource-not-found-error.js.map