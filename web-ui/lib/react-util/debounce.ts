import { log } from "../logger";
import { isError } from "./_utility-methods";
import { LoggedError } from "./errors/logged-error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <R, T extends (...args: any[]) => R>(
  func: T,
  delay: number | { wait: number; timeout?: number; }
): ((...args: Parameters<T>) => Promise<R>) & { cancel: () => void; } => {

  const wait = typeof delay === 'number' ? delay : delay.wait;
  const timeout = typeof delay === 'object' && delay.timeout ? delay.timeout : 500;

  let timeoutId: NodeJS.Timeout | number | null = null;
  let maxDebounceTimeoutId: NodeJS.Timeout | null = null;
  let rejectPending: ((reason?: unknown) => void) | null = null;
  const cancelTimeout = (reason: string | unknown = '') => {
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
  const cb = (...args: Parameters<T>) => {
    // Cancel any existing timeout and pending rejection
    cancelTimeout('Deferred');
    const when = new Promise<R>((resolve, reject) => {
      rejectPending = reject;
      maxDebounceTimeoutId = setTimeout(() => cancelTimeout('Timeout'), wait + timeout);
      timeoutId = setTimeout(async () => {
        // Cancelling timeout w/out an error code will clean up the timeout timeout, etc
        try {
          timeoutId = null;
          const resolved = await func(...args);
          cancelTimeout();
          resolve(resolved);
        } catch (error) {
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
      } else {
        log(l => l.silly('Debounced function timed out or was deferred:', reason));
      }
    });
    return when;
  };
  cb.cancel = () => {
    cancelTimeout('Cancelled');
  };
  return cb;
};
