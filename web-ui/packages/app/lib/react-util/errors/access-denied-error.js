import { getStackTrace } from '@/lib/nextjs-util/get-stack-trace';
export class AccessDeniedError extends Error {
    constructor(message) {
        super(message ?? 'Access denied');
        this.name = 'AccessDeniedError';
        this.stack = getStackTrace({ skip: 2 });
    }
    static isAccessDeniedError(error) {
        return error instanceof AccessDeniedError;
    }
}
//# sourceMappingURL=access-denied-error.js.map