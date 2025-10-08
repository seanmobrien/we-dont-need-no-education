// General utility methods used across React components
// and other parts of the application.

// Pseudo-random ID generator for lightweight unique IDs.
// Not cryptographically secure; suitable for client-side use.
export const generateUniqueId = (): string => {
  return Math.random().toString(36).slice(2, 9);
};

// Type guard to check if a value is an instance of Error
// or at least has the basic shape of an Error object.
export const isError = (value: unknown): value is Error => {
  return (
    !!value &&
    typeof value === 'object' &&
    (value instanceof Error || ('message' in value && 'name' in value))
  );
};

export type SafeProgressEvent<T extends EventTarget = EventTarget> = Event & {
  /**
   * The **`ProgressEvent.lengthComputable`** read-only property is a boolean flag indicating if the resource concerned by the A boolean.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ProgressEvent/lengthComputable)
   */
  readonly lengthComputable: boolean;
  /**
   * The **`ProgressEvent.loaded`** read-only property is a number indicating the size of the data already transmitted or processed.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ProgressEvent/loaded)
   */
  readonly loaded: number;
  readonly target: T | null;
  /**
   * The **`ProgressEvent.total`** read-only property is a number indicating the total size of the data being transmitted or processed.
   *
   * [MDN Reference](https://developer.mozilla.org/docs/Web/API/ProgressEvent/total)
   */
  readonly total: number;
};

// Type guard to check if a value is an XMLHttpRequest
export const isXmlHttpRequest = (value: unknown): value is XMLHttpRequest => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'readyState' in value &&
    'status' in value &&
    'timeout' in value &&
    'upload' in value &&
    'response' in value &&
    'open' in value &&
    typeof value.open === 'function' &&
    'send' in value &&
    typeof value.send === 'function'
  );
};

// Type guard to check if a value is a ProgressEvent from an XMLHttpRequest
export const isProgressEvent = (
  value: unknown,
): value is SafeProgressEvent<XMLHttpRequest> =>
  typeof value === 'object' &&
  !!value &&
  'target' in value &&
  isXmlHttpRequest(value.target) &&
  'loaded' in value &&
  'total' in value &&
  'lengthComputable' in value;

// Type guard to check if a value is an Abort error
// (i.e., not null, not an array, and of type 'object').
export const isAbortError = (value: unknown): value is Error => {
  return value instanceof DOMException && value.name === 'AbortError';
};

// Type guard to check if a value is a TemplateStringsArray
export const isTemplateStringsArray = (
  value: unknown,
): value is TemplateStringsArray => {
  return Array.isArray(value) && 'raw' in value;
};

// Converts various input types to a boolean "truthy" value.
export const isTruthy = (
  value: unknown,
  defaultValue: boolean = false,
): boolean => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'string') {
    const trimmedValue = value.trim().toLowerCase();
    return (
      trimmedValue === 'true' ||
      trimmedValue === '1' ||
      trimmedValue === 'yes' ||
      trimmedValue === 'y'
    );
  } else if (Array.isArray(value)) {
    return value.length > 0;
    // If we have a completely empty object that's as good as false, and certainly not truthy
  } else if (typeof value === 'object' && Object.keys(value).length === 0) {
    return false;
  }
  return Boolean(value);
};

// Type guard to check if a value is a non-null object (not an array).
export const isRecord = (check: unknown): check is Record<string, unknown> => {
  return check !== null && typeof check === 'object';
};

// Unique symbol used for branding types
export const TypeBrandSymbol: unique symbol = Symbol('TypeBrandSymbol');

// Type guard to check if an object has a specific type brand
export const isTypeBranded = <TResult>(
  check: unknown,
  brand: symbol,
): check is TResult =>
  typeof check === 'object' &&
  check !== null &&
  TypeBrandSymbol in check &&
  check[TypeBrandSymbol] === brand;

// Type for categorized promise results
type CategorizedPromiseResult<T> = {
  fulfilled: Array<T>;
  rejected: Array<unknown>;
  pending: Array<Promise<T>>;
};

// Function to categorize promises into fulfilled, rejected, and pending (timed out)
// based on a specified timeout duration.
export const getResolvedPromises = async <T>(
  promises: Promise<T>[],
  timeoutMs: number = 60 * 1000,
): Promise<CategorizedPromiseResult<T>> => {
  // Use a unique symbol to identify timeouts
  const TIMEOUT_SYMBOL = Symbol('timeout');

  // Race each promise against a timeout that RESOLVES with the symbol
  const racedPromises = promises.map((promise) =>
    Promise.race([
      promise,
      new Promise<typeof TIMEOUT_SYMBOL>((resolve) =>
        setTimeout(() => resolve(TIMEOUT_SYMBOL), timeoutMs),
      ),
    ]),
  );

  // Wait for all races to complete
  const results = await Promise.allSettled(racedPromises);

  // Categorize results with clear logic
  return results.reduce(
    (acc, result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value === TIMEOUT_SYMBOL) {
          // This promise timed out, still pending
          acc.pending.push(promises[index]);
        } else {
          // This promise resolved (even if value is null/undefined)
          acc.fulfilled.push(result.value);
        }
      } else {
        // This promise rejected
        acc.rejected.push(result.reason);
      }
      return acc;
    },
    { fulfilled: [], rejected: [], pending: [] } as CategorizedPromiseResult<T>,
  );
};
