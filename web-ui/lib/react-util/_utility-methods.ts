/**
 * @module _utility-methods
 *
 * A collection of utility methods for use in React applications.
 */
/**
 * Generates a unique identifier string.
 *
 * @returns {string} A unique identifier consisting of 7 alpha-numeric characters.
 */
export function generateUniqueId(): string {
  return Math.random().toString(36).slice(2, 9);
}

/**
 * Checks if the given value is an instance of the Error object.
 *
 * @param value - The value to check.
 * @returns True if the value is an Error object, otherwise false.
 */
export function isError(value: unknown): value is Error {
  return (
    !!value &&
    typeof value === 'object' &&
    (value instanceof Error ||
      ('message' in value && 'name' in value && 'stack' in value))
  );
}

/**
 * Checks if the given value is a DOMException with the name 'AbortError'.
 *
 * @param value - The value to check.
 * @returns True if the value is a DOMException with the name 'AbortError', otherwise false.
 */
export function isAbortError(value: unknown): value is Error {
  return value instanceof DOMException && value.name === 'AbortError';
}

/**
 * Type guard to check if a value is a TemplateStringsArray.
 *
 * @param value - The value to check.
 * @returns True if the value is a TemplateStringsArray, false otherwise.
 */
export function isTemplateStringsArray(
  value: unknown,
): value is TemplateStringsArray {
  return Array.isArray(value) && 'raw' in value;
}

/**
 * Determines if a given value is truthy.
 *
 * This function evaluates the provided value and returns a boolean indicating
 * whether the value is considered "truthy". If the value is `undefined` or `null`,
 * the function returns the specified default value.
 *
 * For string values, the function considers the following strings as truthy:
 * - "true"
 * - "1"
 * - "yes"
 * (case insensitive and trimmed)
 *
 * @param value - The value to evaluate.
 * @param defaultValue - The default boolean value to return if the value is `undefined` or `null`. Defaults to `false`.
 * @returns `true` if the value is considered truthy, otherwise `false`.
 */
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

/**
 * Checks if the given value is an indexable record (aka object)
 *
 * @param check - The value to check.
 * @returns True if the value is an object, otherwise false.
 */
export function isRecord(check: unknown): check is Record<string, unknown> {
  return check !== null && typeof check === 'object';
}

/**
 * A unique symbol used for type branding.
 */
export const TypeBrandSymbol: unique symbol = Symbol('TypeBrandSymbol');

/**
 * Checks if the given value is type branded with the specified brand.
 *
 * @param check - The value to check.
 * @param brand - The brand symbol to check against.
 * @returns True if the value is type branded with the specified brand, otherwise false.
 */
export const isTypeBranded = <TResult>(
  check: unknown,
  brand: symbol,
): check is TResult =>
  typeof check === 'object' &&
  check !== null &&
  TypeBrandSymbol in check &&
  check[TypeBrandSymbol] === brand;
