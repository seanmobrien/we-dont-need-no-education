/**
 * Type branding utilities for creating nominal types in TypeScript
 */

export const TypeBrandSymbol: unique symbol = Symbol('TypeBrandSymbol');

/**
 * Type guard to check if an object has a specific type brand
 */
export const isTypeBranded = <TResult>(
  check: unknown,
  brand: symbol,
): check is TResult => {
  return (
    typeof check === 'object' &&
    check !== null &&
    TypeBrandSymbol in check &&
    (check as Record<symbol, symbol>)[TypeBrandSymbol] === brand
  );
};
