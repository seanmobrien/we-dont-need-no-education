'use client';
import { useCallback, useEffect, useRef } from 'react';
import { isError } from '../utility-methods';
import { log, LoggedError } from '@compliance-theater/logger';
export const useInEffect = () => {
    const refQueue = useRef({ queue: [], isProcessing: false, mountedEffects: 0 });
    useEffect(() => {
        let currentTimeout;
        let thisIsActive = true;
        const { current: thisQueue } = refQueue;
        thisQueue.mountedEffects += 1;
        if (thisQueue.mountedEffects > 1) {
            log((l) => l.warn(`useInEffect: Multiple mounts detected, this is not expected.`, {
                mountedEffects: thisQueue.mountedEffects,
            }));
        }
        let processPendingItem = undefined;
        const processNextItem = () => {
            const debouncePendingItem = () => {
                if (processPendingItem) {
                    processPendingItem();
                }
                else {
                    currentTimeout = setTimeout(debouncePendingItem, 20);
                }
            };
            if (!thisIsActive) {
                return;
            }
            if (thisQueue.pending) {
                debouncePendingItem();
                return;
            }
            const thisRecord = thisQueue.queue.shift();
            if (thisRecord) {
                const [thisOperation] = thisRecord;
                thisQueue.pending = {
                    record: thisRecord,
                    operation: thisOperation(),
                };
                debouncePendingItem();
                return;
            }
            if (thisIsActive) {
                thisQueue.isProcessing = false;
                currentTimeout = setTimeout(processNextItem, 100);
            }
        };
        processPendingItem = () => {
            if (!thisQueue.pending) {
                return;
            }
            const { record: [, { resolve: thisPendingResolver, reject: thisPendingRejector },], operation: thisPendingOperation, } = thisQueue.pending;
            const resolveOrReject = (action) => (value) => {
                const forwardResult = action === 'resolve' ? thisPendingResolver : thisPendingRejector;
                if (!thisIsActive) {
                    return;
                }
                thisQueue.pending = undefined;
                try {
                    forwardResult(value);
                }
                catch (e) {
                    LoggedError.isTurtlesAllTheWayDownBaby(e, {
                        message: `Error processing ${action} on pending operation in useInEffect: ${isError(e) ? e.message : String(e)}`,
                        log: true,
                        cause: e,
                    });
                }
                processNextItem();
            };
            thisQueue.pending.operation = thisPendingOperation.then(resolveOrReject('resolve'), resolveOrReject('reject'));
        };
        if (thisQueue.pending) {
            processPendingItem();
        }
        else {
            processNextItem();
        }
        return () => {
            thisIsActive = false;
            thisQueue.mountedEffects -= 1;
            if (currentTimeout) {
                clearTimeout(currentTimeout);
            }
        };
    });
    const enqueue = useCallback((operation, ...args) => {
        const thisQueue = refQueue.current.queue;
        if (thisQueue) {
            return new Promise((resolveInArgs, reject) => {
                const resolve = resolveInArgs;
                thisQueue.push([() => operation(...args), { resolve, reject }]);
            });
        }
        else {
            throw new Error('useInEffect: Queue is not initialized. This should never happen.');
        }
    }, []);
    return {
        enqueue,
    };
};
//# sourceMappingURL=useInEffect.js.map