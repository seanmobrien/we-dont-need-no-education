export function generateUniqueId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function isError(value: unknown): value is Error {
  return (
    !!value &&
    typeof value === 'object' &&
    (value instanceof Error ||
      ('message' in value && 'name' in value))
  );
}

export function isAbortError(value: unknown): value is Error {
  return value instanceof DOMException && value.name === 'AbortError';
}

export function isTemplateStringsArray(
  value: unknown,
): value is TemplateStringsArray {
  return Array.isArray(value) && 'raw' in value;
}

export function isTruthy(
  value: unknown,
  defaultValue: boolean = false,
): boolean {
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
}

export function isRecord(check: unknown): check is Record<string, unknown> {
  return check !== null && typeof check === 'object';
}

export const TypeBrandSymbol: unique symbol = Symbol('TypeBrandSymbol');

export const isTypeBranded = <TResult>(
  check: unknown,
  brand: symbol,
): check is TResult =>
  typeof check === 'object' &&
  check !== null &&
  TypeBrandSymbol in check &&
  check[TypeBrandSymbol] === brand;

type CategorizedPromiseResult<T> = {
  fulfilled: Array<T>;
  rejected: Array<unknown>;
  pending: Array<Promise<T>>;
};

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


