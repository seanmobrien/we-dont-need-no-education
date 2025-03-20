/**
 * @module _utility-methods
 *
 * A collection of utility methods for use in React applications.
 */

import { OperationCanceledException } from 'typescript';
import { isOperationCancelledError } from '../typescript';

/**
 * Generates a unique identifier string.
 *
 * @returns {string} A unique identifier consisting of 7 alpha-numeric characters.
 */
export const generateUniqueId = () =>
  Math.random().toString(36).substring(2, 9);

/**
 * Checks if the given value is an instance of the Error object.
 *
 * @param value - The value to check.
 * @returns True if the value is an Error object, otherwise false.
 */
export const isError = (value: unknown): value is Error =>
  typeof value === 'object' &&
  !!value &&
  'message' in value &&
  'stack' in value &&
  typeof value.stack === 'string';

/**
 * Checks if the given value is a DOMException with the name 'AbortError'.
 *
 * @param value - The value to check.
 * @returns True if the value is a DOMException with the name 'AbortError', otherwise false.
 */
export const isAbortError = (
  value: unknown,
): value is DOMException | OperationCanceledException =>
  (isError(value) && value.name === 'AbortError') ||
  value instanceof DOMException ||
  isOperationCancelledError(value);

/**
 * Type guard to check if a value is a TemplateStringsArray.
 *
 * @param value - The value to check.
 * @returns True if the value is a TemplateStringsArray, false otherwise.
 */
export const isTemplateStringsArray = (
  value: unknown,
): value is TemplateStringsArray =>
  Array.isArray(value) &&
  'raw' in value &&
  Array.isArray((value as TemplateStringsArray).raw);

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
export const isTruthy = (
  value: unknown,
  defaultValue: boolean = false,
): boolean => {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return ['true', '1', 'yes', 'y'].includes(normalized);
  }
  if (!!value) {
    if (typeof value === 'object') {
      return Object.keys(value).length > 0;
    }
    return true;
  }
  return false;
};

/**
 * Checks if the given value is an indexable record (aka object)
 *
 * @param check - The value to check.
 * @returns True if the value is an object, otherwise false.
 */
export const isUnknownRecord = (
  check: unknown,
): check is Record<string, unknown> => typeof check === 'object' && !!check;
