/**
 * A type that excludes `null` and `undefined` from a given type `K`.
 *
 * @template K - The type to be checked.
 *
 * @example
 * ```typescript
 * type NonNullableString = IsNotNull<string | null | undefined>; // Result is string
 * type NonNullableNumber = IsNotNull<number | null>; // Result is number
 * type NonNullableBoolean = IsNotNull<boolean | undefined>; // Result is boolean
 * type NonNullableObject = IsNotNull<{ a: number } | null | undefined>; // Result is { a: number }
 * ```
 */
export type IsNotNull<K> = K extends null
    ? never
    : K extends undefined
    ? never
    : K;