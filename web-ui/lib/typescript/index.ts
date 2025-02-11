/**
 * @module @suetheschool/typescript
 *
 * This module serves as a collection of utility functions and types for the application.
 * It contains typeguars, type predicates, and other utility functions that are essential
 * for ensuruig code reusability and consistency.
 *
 * @remarks
 * Funtionality is divided into the following categories:
 * - _guards - TypeGuards used to ensure type safety
 * - _generics - Generic utility functions.
 * - _types - Magical utility types that allow for type manipulation and extraction.
 */
export * from './_guards';
export type * from './_types';
export * from './_record-decorators';
