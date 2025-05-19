import type { GridDataSource, DataGridProps } from '@mui/x-data-grid';
import type { Dispatch, SetStateAction } from 'react';

/**
 * Extends the `GridDataSource` type by adding an optional error handler.
 *
 * @remarks
 * This type allows you to provide a custom error handling function that will be called
 * when a data source error occurs, such as when fetching or updating rows.  This is useful
 * because we are already memoizing the data source, so it's a natural place for a stabilized
 * version of error handling logic to reside.
 */
export type ExtendedGridDataSource = GridDataSource & {
  /**
   * @property {DataGridProps['onDataSourceError']} onDataSourceError - Optional callback invoked with either a `GridGetRowsError`
   * or a `GridUpdateRowError` when an error occurs in the data source.
   */
  onDataSourceError?: DataGridProps['onDataSourceError'];
};

/**
 * Props for a data source component that handles loading state, error state, and a data URL.
 */
export type DataSourceProps = {
  /**
   * @property {Dispatch<SetStateAction<boolean>>} setIsLoading - Function to update the loading state of the component.
   */
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  /**
   * @property {Dispatch<SetStateAction<string | null>>} setError - Function to update the error state, accepting a string message or null.
   */
  setError: Dispatch<SetStateAction<string | null>>;
  /**
   * @property {string} url - The endpoint URL from which to fetch data.
   */
  url: string;
  getRecordData?: (url: string) => Promise<Response>;
};

export type GetRequestCacheRecordProps = {
  url: string;
  page: number;
  pageSize: number;
  getRecordData?: (url: string) => Promise<Response>;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
};
