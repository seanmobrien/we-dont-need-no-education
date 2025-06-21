import type {
  GridRowId,
  GridRowIdGetter,
  GridRowModel,
  GridValidRowModel,
} from '@mui/x-data-grid-pro';

/**
 * Application-global map of grid id getters from fiven fields
 */
const GridRowGetterDictionary = new Map<string, GridRowIdGetter>();

/**
 * Returns a memoized row ID getter function for a specified field.
 *
 * This hook retrieves a function that extracts the row ID from a given row object
 * using the provided field name. The getter function is cached for each unique field
 * to avoid unnecessary re-creation and improve performance.
 *
 * @param field - The name of the field in the row object to use as the row ID.
 * @returns A function that takes a row and returns its ID based on the specified field.
 * @throws If the row does not contain the required field.
 */
export const useGetRowId = (
  field: string,
): GridRowIdGetter<GridValidRowModel> => {
  let ret = GridRowGetterDictionary.get(field);
  if (!ret) {
    ret = (row: GridRowModel): GridRowId => {
      const rowId = row?.[field] as string;
      if (!rowId) {
        throw new Error(`Row is missing required field: ${field}`);
      }
      return rowId as GridRowId;
    };
    // Cache the getter for future use
    // This allows us to avoid creating a new function every time this hook is called
    // and instead re-uses the same function instance for a given field name.
    GridRowGetterDictionary.set(field, ret);
  }
  return ret;
};
