/**
 * @module _utilities
 *
 * This module provides utility functions for data normalization.
 */

import type { PaginationStats } from './_types';
import type {
  EmailPropertyCategoryType,
  EmailPropertyCategoryTypeId,
  EmailPropertyTypeType,
  EmailPropertyTypeTypeId,
} from './api/email-properties/property-type';
import {
  EmailPropertyCategoryTypeIdValues,
  EmailPropertyCategoryTypeValues,
  EmailPropertyTypeTypeIdValues,
  EmailPropertyTypeTypeValues,
} from './api/email-properties/property-type';


/**
 * Normalizes a nullable numeric value.
 *
 * If the provided value is null or less than or equal to zero, it returns null.
 * Otherwise, it returns the original value.
 *
 * @param value - The numeric value to normalize, which can be null.
 * @returns The normalized numeric value or null.
 */
export const normalizeNullableNumeric = (
  value: number | null | undefined,
  defaultValue: number | null = null,
  minValue: number = 1,
): number | null => ((value ?? 0) > minValue - 1 ? value ?? null : defaultValue);



/**
 * Checks if the given value is of type `PaginationStats`.
 *
 * @param check - The value to check.
 * @returns `true` if the value is a `PaginationStats` object, otherwise `false`.
 */
export const isPaginationStats = (check: unknown): check is PaginationStats => {
  if (check && typeof check === 'object') {
    const { page, num } = check as PaginationStats;
    return (
      typeof page === 'number' && typeof num === 'number' && page > 0 && num > 0
    );
  }
  return false;
};

/**
 * Normalizes a date and time input to an ISO string format.
 *
 * If the input is invalid, it returns the default value or the current date and time.
 *
 * @param {string | Date} input - The date and time input to normalize.
 * @param {Date} [defaultValue] - The default value to return if the input is invalid.
 * @returns {string} The normalized date and time in ISO string format.
 */
export const normalizeDateAndTime = (
  input: string | Date,
  defaultValue?: Date,
) => {
  let date: Date;
  try {
    date = new Date(input);
    if (isNaN(date.valueOf())) {
      date = defaultValue ?? new Date();
    }
  } catch {
    date = defaultValue ?? new Date();
  }
  return date.toISOString().slice(0, 16);
};

/**
 * Looks up the email property type ID within known {@link EmailPropertyTypeTypeId} values
 * based on the provided property type string.  Note that this is only looking at well-known
 * values and does not account for custom property types.
 *
 * @param {string} propertyType - The property type string to look up.
 * @returns {EmailPropertyTypeTypeId | -1} The email property type ID or -1 if not found.
 */
export const lookupEmailPropertyType = (
  propertyType: string | number,
): EmailPropertyTypeTypeId | -1 => {
  const index =
    typeof propertyType === 'number'
      ? propertyType
      : EmailPropertyTypeTypeValues.indexOf(
          propertyType as EmailPropertyTypeType,
        );
  return index === -1 ? -1 : EmailPropertyTypeTypeIdValues[index];
};

/**
 * Checks if the provided value is a valid {@link EmailPropertyTypeType} value.
 *
 * @param {unknown} check - The value to check.
 * @returns {check is EmailPropertyTypeType} True if the value is a valid email property type, false otherwise.
 */
export const isEmailPropertyType = (
  check: unknown,
): check is EmailPropertyTypeType =>
  typeof check === 'string' && lookupEmailPropertyType(check) !== -1;

/**
 * Looks up the {@link EmailPropertyCategoryTypeId} value based on the provided input.
 * Note that this only handles well-known categories and does not account for custom property categories.
 *
 * @param {string} propertyCategory - The property category string to look up.
 * @returns {EmailPropertyCategoryTypeId | -1} The email property category ID or -1 if not found.
 */
export const lookupEmailPropertyCategory = (
  propertyCategory: string | number,
): EmailPropertyCategoryTypeId | -1 => {
  const index =
    typeof propertyCategory === 'number'
      ? propertyCategory
      : EmailPropertyCategoryTypeValues.indexOf(
          propertyCategory as EmailPropertyCategoryType,
        );
  return index === -1 ? -1 : EmailPropertyCategoryTypeIdValues[index];
};

/**
 * Checks if the provided value is a valid {@link EmailPropertyCategoryType} value.
 *
 * @param {unknown} check - The value to check.
 * @returns {check is EmailPropertyCategoryType} True if the value is a valid email property category type, false otherwise.
 */
export const isEmailPropertyCategory = (
  check: unknown,
): check is EmailPropertyCategoryType => {
  const isValidCategory =
    typeof check === 'string' && lookupEmailPropertyCategory(check) !== -1;
  return isValidCategory;
};
