import {
  GridFilterModel,
  GridGetRowsResponse,
  GridSortModel,
} from '@mui/x-data-grid-pro';
import type { CancelledFetchGridRowsResponse } from './types';

/**
 * Type guard to check if a given value is a valid `GridSortModel`.
 *
 * A `GridSortModel` is expected to be a non-empty array where every item is a non-null object
 * containing a `field` property.
 *
 * @param check - The value to check.
 * @returns `true` if the value is a non-empty array of objects each containing a `field` property, otherwise `false`.
 */
export const isGridSortModel = (check: unknown): check is GridSortModel => {
  if (!Array.isArray(check)) return false;
  if (check.length === 0) return false;
  return check.every(
    (item) => typeof item === 'object' && item !== null && 'field' in item,
  );
};

/**
 * Type guard to determine if a given value is a `GridFilterModel`.
 *
 * Checks that the input is a non-null object (not an array) and contains an `items` property,
 * which must be an array of objects where each object has both `field` and `operator` properties.
 *
 * @param check - The value to check.
 * @returns `true` if the value is a `GridFilterModel`, otherwise `false`.
 */
export const isGridFilterModel = (check: unknown): check is GridFilterModel => {
  if (
    check == undefined ||
    check == null ||
    typeof check !== 'object' ||
    Array.isArray(check)
  )
    return false;
  if ('items' in check) {
    return (
      Array.isArray(check.items) &&
      check.items.every(
        (item) =>
          typeof item === 'object' &&
          item !== null &&
          'field' in item &&
          'operator' in item,
      )
    );
  }
  return false;
};

/**
 * Type guard to determine if a given response is a valid `GridGetRowsResponse`.
 *
 * Checks that the response is a non-null object containing a `rows` property,
 * where `rows` is an array and every element in the array is a non-null object.
 *
 * @param response - The value to check.
 * @returns `true` if the response matches the `GridGetRowsResponse` structure, otherwise `false`.
 */
export const isGetGridRowsResponse = (
  response: unknown,
): response is GridGetRowsResponse =>
  typeof response === 'object' &&
  response !== null &&
  'rows' in response &&
  Array.isArray(response.rows) &&
  response.rows.every((row) => typeof row === 'object' && row !== null);

/**
 * Type guard to determine if a given response is a `CancelledFetchGridRowsResponse`.
 *
 * Checks if the provided `response` is an object with a `cancelled` property set to `true`.
 *
 * @param response - The response object to check.
 * @returns `true` if the response is a `CancelledFetchGridRowsResponse`, otherwise `false`.
 */
export const isCancelledGridRowsResponse = (
  response: unknown,
): response is CancelledFetchGridRowsResponse => {
  if (typeof response === 'object' && response !== null) {
    return 'cancelled' in response && response.cancelled === true;
  }
  return false;
};
