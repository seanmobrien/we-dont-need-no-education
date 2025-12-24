'use client';

import { useCallback, useEffect, useRef } from 'react';
import { LoggedError } from '../errors';
import { isError } from '../utility-methods';
import { log } from '@/lib/logger';

type UseInEffectRecordResolver = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
};

type UseInEffectRecord = [() => Promise<unknown>, UseInEffectRecordResolver];
type PendingUseInEffectRecord = {
  record: UseInEffectRecord;
  operation: Promise<unknown>;
};

export const useInEffect = () => {
  const refQueue = useRef<{
    queue: Array<UseInEffectRecord>;
    pending?: PendingUseInEffectRecord;
    isProcessing: boolean;
    mountedEffects: number;
  }>({ queue: [], isProcessing: false, mountedEffects: 0 });

  useEffect(() => {
    let currentTimeout: NodeJS.Timeout | undefined;
    let thisIsActive = true;
    const { current: thisQueue } = refQueue;
    thisQueue.mountedEffects += 1;
    if (thisQueue.mountedEffects > 1) {
      log((l) =>
        l.warn(`useInEffect: Multiple mounts detected, this is not expected.`, {
          mountedEffects: thisQueue.mountedEffects,
        }),
      );
    }
    let processPendingItem: (() => void) | undefined = undefined;
    const processNextItem = () => {
      const debouncePendingItem = () => {
        if (processPendingItem) {
          // If there's a pending item, we process it
          processPendingItem();
        } else {
          // If there's no pending item, we just debounce until the next tick
          currentTimeout = setTimeout(debouncePendingItem, 20);
        }
      };
      if (!thisIsActive) {
        // If the component is no longer active, we just exit out and let the currently mounted instance handle it.
        return;
      }
      if (thisQueue.pending) {
        // If there's already a pending operation, process it
        debouncePendingItem();
        return;
      }
      // If there's no pending operation, we can process the next item in the queue
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
      // If we are still active then set a timer to check the queue again later
      if (thisIsActive) {
        // If there's no more items in the queue, we set a timeout to check again later
        thisQueue.isProcessing = false;
        currentTimeout = setTimeout(processNextItem, 100);
      }
    };
    processPendingItem = () => {
      if (!thisQueue.pending) {
        return;
      }
      // We don't want to check isActive here - we always want to unwind a pending op, we just may not process the result
      const {
        record: [
          ,
          { resolve: thisPendingResolver, reject: thisPendingRejector },
        ],
        operation: thisPendingOperation,
      } = thisQueue.pending;
      // Regardless of whether the previous operation was resolved or rejected, we basically do the same thing:
      // - If the previous operation was resolved, we resolve the pending operation
      // - If the previous operation was rejected, we reject the pending operation
      // - If there's another operation in the queue then we process it
      // - Otherwise we set a timeout and check again later
      const resolveOrReject =
        (action: 'resolve' | 'reject') => (value: unknown) => {
          const forwardResult =
            action === 'resolve' ? thisPendingResolver : thisPendingRejector;
          if (!thisIsActive) {
            // If the component is no longer active, we just exit out and let the currently mounted instance handle it.
            return;
          }
          // Clear out the pending operation so that we don't try to resolve it again
          thisQueue.pending = undefined;
          // Use resolve/reject to forward the response to whoever cares
          try {
            forwardResult(value);
          } catch (e) {
            LoggedError.isTurtlesAllTheWayDownBaby(e, {
              message: `Error processing ${action} on pending operation in useInEffect: ${isError(e) ? e.message : String(e)}`,
              log: true,
              cause: e,
            });
          }
          // Handle the next item in the queue
          processNextItem();
        };
      // chain the operation back so that subsequent mounts can resolve if necessary
      thisQueue.pending.operation = thisPendingOperation.then(
        resolveOrReject('resolve'),
        resolveOrReject('reject'),
      );
    };
    // First check to see if something was queued up on a previous mount
    if (thisQueue.pending) {
      // If there's a pending operation, we process it
      processPendingItem();
    } else {
      // Otherwise, check the next item in the queue.  This will either process an item or
      // set a timeout to circle back and check again later.
      processNextItem();
    }
    // On demount we set is active to false and clear any pending timeouts
    return () => {
      thisIsActive = false;
      thisQueue.mountedEffects -= 1;
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
    };
  });

  const enqueue = useCallback(
    // Using any here makes the callback more flexible, allowing any function that returns a Promise to be queued.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <TArgs extends any[], TResult>(
      operation: (...args: TArgs) => Promise<TResult>,
      ...args: TArgs
    ) => {
      const thisQueue = refQueue.current.queue;
      if (thisQueue) {
        return new Promise<TResult>((resolveInArgs, reject) => {
          const resolve = resolveInArgs as (value: unknown) => void;
          thisQueue.push([() => operation(...args), { resolve, reject }]);
        });
      } else {
        throw new Error(
          'useInEffect: Queue is not initialized. This should never happen.',
        );
      }
    },
    [],
  );
  return {
    enqueue,
  };
};
