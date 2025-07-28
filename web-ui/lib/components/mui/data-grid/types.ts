import { PaginationStats } from '@/data-models';
import type { ISqlNeonAdapter, SqlDb } from '@/lib/neondb';
import type { LikeNextRequest } from '@/lib/nextjs-util';
export type { LikeNextRequest };
import type { FirstParameter } from '@/lib/typescript';
import type {
  GridDataSource,
  GridSortModel,
  GridFilterModel,
  DataGridProProps,
  GridGetRowsResponse,
  GridFilterItem,
} from '@mui/x-data-grid-pro';
import { MaybeRow } from 'postgres';
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
   * @property {DataGridProProps['onDataSourceError']} onDataSourceError - Optional callback invoked with either a `GridGetRowsError`
   * or a `GridUpdateRowError` when an error occurs in the data source.
   */
  onDataSourceError?: DataGridProProps['onDataSourceError'];
  /**
   * @property {boolean} isLoading - Indicates whether the data source is currently loading data.
   * This can be used to show a loading indicator in the UI.
   * @remarks
   * This property is useful for managing the loading state of the data source, allowing you to
   * provide feedback to the user while data is being fetched or processed.
   */
  isLoading: boolean;
  /**
   * @property {string | null} loadError - Contains an error message if an error occurs while loading data.
   * If no error occurs, it is `null`.
   */
  loadError: string | null;
};

/**
 * Props for configuring a data source in the data grid component.
 *
 * @property setIsLoading - Function to update the loading state of the component.
 * @property setError - Function to update the error state, accepting a string message or null.
 * @property url - The endpoint URL from which to fetch data.
 * @property getRecordData - Optional function to fetch data from a URL. If not provided, the default `fetch` function will be used.
 */
export type DataSourceProps = {
  /**
   * @property {string} url - The endpoint URL from which to fetch data.
   */
  url: string | URL;
  /**
   * @property {(url: string) => Promise<Response>} [getRecordData] - Optional function to fetch data from a URL.
   * If not provided, the default `fetch` function will be used.
   */
  getRecordData?: (props: GetGridRecordDataProps) => Promise<Response>;
};

/**
 * Props containing the parameters needed to retrieve a cache record for a data grid request.
 */
export type RequestCacheRecordProps = {
  /**
   * The endpoint URL for the data request.
   */
  url: string;
  /**
   * The current page number for pagination.
   */
  page: number;
  /**
   * The number of items per page.
   */
  pageSize: number;
  /**
   * The sorting model applied to the returned resultset.
   * @remarks
   * This is an optional property, used is used to determine the order in which the data is displayed
   * in the grid.. If not provided, the default sorting will be applied.
   * The sorting model is an array of objects, each containing the field to sort by and the sort direction.
   * For example:
   * ```typescript
   * const sortModel: GridSortModel = [
   *  { field: 'name', sort: 'asc' },
   *  { field: 'age', sort: 'desc' },
   * ];
   * ```
   * This will sort the data first by `name` in ascending order and then by `age` in descending order.
   */
  sort?: GridSortModel;
  /**
   * An optional filter model to apply to the returned resultset.
   * @remarks
   * This is an optional property, used is used to filter the data displayed in the grid.
   * If not provided, no filtering will be applied.
   * The filter model is an object that contains the filter items, logic operator, and other properties.
   * For example:
   * ```typescript
   * const filterModel: GridFilterModel = {
   *  items: [
   *    { field: 'name', operator: 'contains', value: 'John' },
   *   { field: 'age', operator: '>', value: 30 },
   *  ],
   *  logicOperator: 'and',
   *  quickFilterValues: ['John', 'Doe'],
   *  quickFilterLogicOperator: 'or',
   *  quickFilterExcludeHiddenColumns: true,
   * };
   * ```
   * This will filter the data to include only rows where the `name` contains 'John' and the `age` is greater than 30.
   * * The `logicOperator` determines how the filter items are combined (e.g., 'and' or 'or').
   * * The `quickFilterValues` are used for quick filtering, allowing users to filter the data based on specific values.
   * * The `quickFilterLogicOperator` determines how the quick filter values are combined (e.g., 'and' or 'or').
   * * The `quickFilterExcludeHiddenColumns` specifies whether to exclude hidden columns from the quick filter.
   * * If not provided, no filtering will be applied.
   * * This property is useful for implementing server-side filtering, where the server processes the filter criteria and returns the filtered data.
   * * @see {@link https://mui.com/x/react-data-grid/columns/filtering/#server-side-filtering}
   * @see {@link https://mui.com/x/react-data-grid/columns/sorting/#server-side-sorting}
   * * @default []
   * * @example
   * const filterModel: GridFilterModel = {
   *  items: [
   *   { field: 'name', operator: 'contains', value: 'John' },
   *  { field: 'age', operator: '>', value: 30 },
   * ],
   *  logicOperator: 'and',
   * quickFilterValues: ['John', 'Doe'],
   * quickFilterLogicOperator: 'or',
   * quickFilterExcludeHiddenColumns: true,
   * };
   * * This will filter the data to include only rows where the `name` contains 'John' and the `age` is greater than 30.
   * * The `logicOperator` determines how the filter items are combined (e.g., 'and' or 'or').
   * * The `quickFilterValues` are used for quick filtering, allowing users to filter the data based on specific values.
   * * The `quickFilterLogicOperator` determines how the quick filter values are combined (e.g., 'and' or 'or').
   * * The `quickFilterExcludeHiddenColumns` specifies whether to exclude hidden columns from the quick filter.
   * * If not provided, no filtering will be applied.
   */
  filter?: GridFilterModel;
};

/**
 * Props for managing or caching get request and it's parameters.
 */
export type GetRequestCacheRecordProps = RequestCacheRecordProps & {
  /**
   * A function to fetch record data given a URL, returning a Promise of a Response.
   */
  getRecordData?: (
    props: Omit<GetRequestCacheRecordProps, 'getRecordData' | 'setIsLoading'>,
  ) => Promise<Response>;
  /**
   * A state setter to indicate loading status.
   */
  setIsLoading: Dispatch<SetStateAction<boolean>>;

  /**
   * An optional AbortSignal to cancel the request if needed.
   * This can be used to abort the request if the component is unmounted or if the
   * request is no longer needed.
   */
  signal?: AbortSignal;
};

/**
 * Type for the callback function to fetch record data.
 *
 * @remarks
 * This type is used to define the shape of the function that will be called to fetch
 * record data, including the URL and other parameters.
 */
export type GetGridRecordDataCallback =
  Required<GetRequestCacheRecordProps>['getRecordData'];

/**
 * Represents the properties passed to the `GetGridRecordDataCallback` function.
 * This type is derived from the first parameter of the `GetGridRecordDataCallback` type.
 */
export type GetGridRecordDataProps = FirstParameter<GetGridRecordDataCallback>;

/**
 * Properties used to build an executable SQL fragment out of a GridSortModel.
 *
 * @template RecordType - The type of the record, extending Record<string, ResultType>.
 */
export type BuildOrderByProps<
  RecordType extends MaybeRow = Exclude<MaybeRow, undefined>,
> = {
  /**
   * The SQL database instance used to build the query.
   */
  sql: SqlDb<Exclude<RecordType, undefined>> | ISqlNeonAdapter;

  /**
   * The request object, typically similar to Next.js's request.
   */
  source: LikeNextRequest | URL | string | GridSortModel | undefined;

  /**
   * The default sort model or column name to use if none is provided.
   */
  defaultSort?: GridSortModel | string;

  /**
   * A mapping or function to translate source column names to database column names.
   */
  columnMap?: ((sourceColumnName: string) => string) | Record<string, string>;
};

/**
 * Represents a request for a paginated grid list, extending {@link PaginationStats}
 * with optional sorting and filtering capabilities.
 *
 * @template T - The type of the pagination key (e.g., number for page index).
 * @property {GridFilterModel} [filter] - Optional filter model to apply to the grid data.
 * @property {GridSortModel} [sort] - Optional sort model to specify sorting of the grid data.
 * @extends PaginationStats
 */
export type PaginatedGridListRequest = PaginationStats<number> & {
  /**
   * @property {GridFilterModel} [filter] - Optional filter model to apply to the grid data.
   * @remarks
   * This property is used to filter the data displayed in the grid.
   * If not provided, no filtering will be applied.
   * The filter model is an object that contains the filter items, logic operator, and other properties.
   * For example:
   * ```typescript
   * const filterModel: GridFilterModel = {
   *  items: [
   *   { field: 'name', operator: 'contains', value: 'John' },
   *  { field: 'age', operator: '>', value: 30 },
   * ],
   */
  filter?: GridFilterModel;
  /**
   * @property {GridSortModel} [sort] - Optional sort model to specify sorting of the grid data.
   * @remarks
   * This property is used to determine the order in which the data is displayed
   * in the grid.
   * If not provided, the default sorting will be applied.
   * The sorting model is an array of objects, each containing the field to sort by and the sort direction.
   * For example:
   * ```typescript
   * const sortModel: GridSortModel = [
   * { field: 'name', sort: 'asc' },
   * { field: 'age', sort: 'desc' },
   * ];
   * ```
   */
  sort?: GridSortModel;
};

/**
 * Type representing the source of a filter, which can be a GridFilterModel,
 * LikeNextRequest, or undefined.
 *
 * @remarks
 * This type is used to define the source of the filter criteria for data grid components.
 * It can be a GridFilterModel object, a LikeNextRequest object, or undefined if no filter is applied.
 */
export type FilterBySourceType = GridFilterModel | LikeNextRequest | undefined;

/**
 * Properties for building a query filter for data grid components.
 *
 * @property source - The filter criteria source, typically specifying the fields and values to filter by.
 * @property sql - The SQL adapter or database instance used to build and execute the query.
 * @property defaultFilter - (Optional) A default filter to apply if no specific filter is provided.
 * @property append - (Optional) If true, appends the filter to the existing filter using an AND keyword;
 *                    if false or not provided, creates a new filter using the WHERE keyword.
 */
export type BuildQueryFilterProps = {
  /**
   * The filter criteria source, typically specifying the fields and values to filter by.
   */
  source: FilterBySourceType;
  /**
   * The SQL adapter or database instance used to build and execute the query.
   */
  sql: ISqlNeonAdapter | SqlDb<Record<string, unknown>>;
  /**
   * (Optional) A default filter to apply if no specific filter is provided.
   */
  defaultFilter?: FilterBySourceType;
  /**
   * If true, the filter will be appended to the existing filter - eg and AND keyword will be used.
   * If false or not provided, the filter will create a new filter - eg the WHERE keyword will be used.
   */
  append?: boolean;
  /**
   * A mapping or function to translate source column names to database column names.
   */
  columnMap?: ((sourceColumnName: string) => string) | Record<string, string>;
  /**
   * An optional set of additional filters that should be applied to the query.
   * This can include any additional criteria that are not part of the main filter model.
   */
  additional?: Record<string, Omit<GridFilterItem, 'field'>>;
};

/**
 * Represents the response returned when a fetch operation for grid rows is cancelled.
 *
 * Extends {@link GridGetRowsResponse} and indicates that the operation was cancelled by setting `cancelled` to `true`.
 * The `rowCount` property is omitted in this case.
 * Optionally includes `pageInfo` with `hasNextPage` set to `true` if there are more pages available.
 */
export type CancelledFetchGridRowsResponse = GridGetRowsResponse & {
  cancelled?: true;
  rowCount?: never;
  pageInfo?:
    | {
        hasNextPage: true;
      }
    | undefined;
};

/**
 * Represents the response from fetching rows for a data grid.
 *
 * This type can either be:
 * - A successful response extending `GridGetRowsResponse` (with an optional `cancelled` property explicitly set to `undefined`), or
 * - A `CancelledFetchGridRowsResponse` indicating that the fetch operation was cancelled.
 *
 * Use this type to handle both successful and cancelled fetch scenarios in data grid operations.
 */
export type FetchGridRowsResponse =
  | (GridGetRowsResponse & {
      cancelled?: never;
    })
  | CancelledFetchGridRowsResponse;
