/**
 * Converts various input types to a boolean "truthy" value.
 * This is a lightweight utility to parse environment variables.
 */
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
