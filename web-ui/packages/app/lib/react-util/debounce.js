import { log, LoggedError } from '@compliance-theater/logger';
import { isError } from './utility-methods';
export const debounce = (func, delay) => {
    const wait = typeof delay === 'number' ? delay : delay.wait;
    const timeout = typeof delay === 'object' && delay.timeout ? delay.timeout : 500;
    let timeoutId = null;
    let maxDebounceTimeoutId = null;
    let rejectPending = null;
    const cancelTimeout = (reason = '') => {
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        if (maxDebounceTimeoutId) {
            clearTimeout(maxDebounceTimeoutId);
            maxDebounceTimeoutId = null;
        }
        if (rejectPending) {
            if (reason !== '') {
                rejectPending(reason);
            }
            rejectPending = null;
        }
    };
    const cb = (...args) => {
        cancelTimeout('Deferred');
        const when = new Promise((resolve, reject) => {
            rejectPending = reject;
            maxDebounceTimeoutId = setTimeout(() => cancelTimeout('Timeout'), wait + timeout);
            timeoutId = setTimeout(async () => {
                try {
                    timeoutId = null;
                    const resolved = await func(...args);
                    cancelTimeout();
                    resolve(resolved);
                }
                catch (error) {
                    cancelTimeout(error);
                }
            }, wait);
        });
        when.catch((reason) => {
            if (isError(reason)) {
                LoggedError.isTurtlesAllTheWayDownBaby(reason, {
                    message: 'Debounced function failed',
                    context: {
                        functionName: func.name,
                        args,
                        wait,
                    },
                    log: true,
                });
            }
            else {
                log((l) => l.silly('Debounced function timed out or was deferred:', reason));
            }
        });
        return when;
    };
    cb.cancel = () => {
        cancelTimeout('Cancelled');
    };
    return cb;
};
//# sourceMappingURL=debounce.js.map