import { getStackTrace } from '@/lib/nextjs-util/get-stack-trace';
export class TimeoutError extends Error {
    constructor(message) {
        super(message ?? 'A timeout has occurred');
        this.name = 'TimeoutError';
        this.stack = getStackTrace({ skip: 2 });
    }
    static isTimeoutError(error) {
        return error instanceof TimeoutError;
    }
}
//# sourceMappingURL=timeout-error.js.map