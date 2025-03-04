/**
 * @module _utilities
 *
 * This module provides utility functions for data normalization.
 */

import { URLSearchParams } from 'url';
import { PaginationStats } from './_types';
import {
  EmailPropertyCategoryType,
  EmailPropertyCategoryTypeId,
  EmailPropertyCategoryTypeIdValues,
  EmailPropertyCategoryTypeValues,
  EmailPropertyTypeType,
  EmailPropertyTypeTypeId,
  EmailPropertyTypeTypeIdValues,
  EmailPropertyTypeTypeValues,
} from './api/import/email-message';

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
  value: number | null,
  defaultValue: number | null = null,
  minValue: number = 1
): number | null => ((value ?? 0) > minValue - 1 ? value : defaultValue);

/**
 * Parses pagination statistics from a given request object.
 *
 * @param req - The request object which can be of type URL, URLSearchParams, or PaginationStats.
 * @returns An object containing pagination statistics including page, num, total, and offset.
 *
 * The function extracts the `page` and `num` parameters from the request object.
 * If the request object is of type URL or URLSearchParams, it retrieves these parameters from the search parameters.
 * If the request object is of type PaginationStats, it directly uses the `page` and `num` properties.
 * If the request object is undefined or null, it defaults to page 1 and num 10.
 *
 * The `page` and `num` values are normalized to ensure they are numeric and fall back to default values if necessary.
 * The `offset` is calculated based on the `page` and `num` values.
 *
 * @example
 * ```typescript
 * const url = new URL('https://example.com?page=2&num=20');
 * const stats = parsePaginationStats(url);
 * console.log(stats); // { page: 2, num: 20, total: 0, offset: 20 }
 * ```
 */
export const parsePaginationStats = (
  req: URL | URLSearchParams | (PaginationStats | undefined)
): PaginationStats & { offset: number } => {
  let page: number | string | undefined | null;
  let num: number | string | undefined | null;
  if (!!req && ('searchParams' in req || 'get' in req)) {
    if ('searchParams' in req) {
      req = req.searchParams;
    }
    page = req.get('page');
    num = req.get('num');
  } else {
    if (!req) {
      page = undefined;
      num = undefined;
    } else {
      page = req.page;
      num = req.num;
    }
  }
  page = normalizeNullableNumeric(Number(page), 1) ?? 1;
  num = normalizeNullableNumeric(Number(num), 10) ?? 10;
  return {
    page,
    num,
    total: 0,
    offset: (page - 1) * num,
  };
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
  defaultValue?: Date
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
  propertyType: string | number
): EmailPropertyTypeTypeId | -1 => {
  const index =
    typeof propertyType === 'number'
      ? propertyType
      : EmailPropertyTypeTypeValues.indexOf(
          propertyType as EmailPropertyTypeType
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
  check: unknown
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
  propertyCategory: string | number
): EmailPropertyCategoryTypeId | -1 => {
  const index =
    typeof propertyCategory === 'number'
      ? propertyCategory
      : EmailPropertyCategoryTypeValues.indexOf(
          propertyCategory as EmailPropertyCategoryType
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
  check: unknown
): check is EmailPropertyCategoryType => {
  const isValidCategory =
    typeof check === 'string' && lookupEmailPropertyCategory(check) !== -1;
  return isValidCategory;
};
