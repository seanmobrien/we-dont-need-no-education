import { GridFilterModel, GridSortModel } from '@mui/x-data-grid-pro';

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
