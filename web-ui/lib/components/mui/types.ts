import {
  GridDataSource,
  GridGetRowsError,
  GridUpdateRowError,
} from '@mui/x-data-grid';

/**
 * Extends the `GridDataSource` type by adding an optional error handler.
 *
 * @remarks
 * This type allows you to provide a custom error handling function that will be called
 * when a data source error occurs, such as when fetching or updating rows.  This is useful
 * because we are already memoizing the data source, so it's a natural place for a stabilized
 * version of error handling logic to reside.
 *
 * @property onDataSourceError - Optional callback invoked with either a `GridGetRowsError`
 * or a `GridUpdateRowError` when an error occurs in the data source.
 */
export type ExtendedGridDataSource = GridDataSource & {
  onDataSourceError?: (error: GridGetRowsError | GridUpdateRowError) => void;
};
