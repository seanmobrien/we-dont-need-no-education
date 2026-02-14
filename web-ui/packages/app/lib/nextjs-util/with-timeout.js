import { log, safeSerialize } from '@compliance-theater/logger';
import { TimeoutError } from '../react-util/errors/timeout-error';
export const withTimeout = (promise, timeoutMs, operation) => {
    const OP_TIMEOUT = Symbol('OP_TIMEOUT');
    let resolved = false;
    return Promise.race([
        promise.catch((error) => {
            if (resolved) {
                log((l) => l.warn(`${operation ?? 'Operation'} threw an error after timeout expired.\n\tDetails: ${safeSerialize(error)}`));
                return OP_TIMEOUT;
            }
            throw error;
        }),
        new Promise((resolve) => {
            setTimeout(() => {
                if (!resolved) {
                    log((l) => l.warn(`${operation ?? 'Operation'} timed out after ${timeoutMs}ms`));
                }
                resolved = true;
                resolve(OP_TIMEOUT);
            }, timeoutMs);
        }),
    ]).then((result) => {
        resolved = true;
        if (typeof result === 'symbol' && result === OP_TIMEOUT) {
            return {
                timedOut: true,
            };
        }
        return {
            value: result,
        };
    });
};
export const withTimeoutAsError = async (promise, timeoutMs, operation) => {
    const result = await withTimeout(promise, timeoutMs, operation);
    if (result.timedOut) {
        throw new TimeoutError(`${operation ?? 'Operation'} timed out after ${timeoutMs}ms`);
    }
    return result.value;
};
//# sourceMappingURL=with-timeout.js.map