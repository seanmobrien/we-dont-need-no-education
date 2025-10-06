import type { LikeNextRequest } from '/lib/nextjs-util/types';
import type {
  GridFilterModel,
  GridFilterItem,
  GridSortModel,
} from '@mui/x-data-grid-pro';
import type { Sql } from 'postgres';
import type { ISqlNeonAdapter, SqlDb } from '/lib/neondb';

/**
 * Props for configuring the buildOrderBy function for PostgreSQL.
 */
export type BuildOrderByProps<
  RecordType extends Record<string, unknown> = Record<string, unknown>,
> = {
  /**
   * The PostgreSQL client or adapter instance.
   */
  sql: Sql<RecordType> | ISqlNeonAdapter | SqlDb<RecordType> | unknown;

  /**
   * The request object, typically similar to Next.js's request, URL, or direct sort model.
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
 * Props for configuring the buildPagination function for PostgreSQL.
 */
export type BuildPaginationProps<
  RecordType extends Record<string, unknown> = Record<string, unknown>,
> = {
  /**
   * The PostgreSQL client or adapter instance.
   */
  sql: Sql<RecordType> | ISqlNeonAdapter | SqlDb<RecordType> | unknown;

  /**
   * The request object containing pagination parameters.
   */
  source?: LikeNextRequest | URL | string | undefined;

  /**
   * Default page size if not specified in the request.
   */
  defaultPageSize?: number;

  /**
   * Maximum allowed page size to prevent abuse.
   */
  maxPageSize?: number;

  /**
   * Optional request parameter for backward compatibility.
   */
  req?: unknown;
};

/**
 * Props for configuring the buildQueryFilter function for PostgreSQL.
 */
export type BuildQueryFilterProps<
  RecordType extends Record<string, unknown> = Record<string, unknown>,
> = {
  /**
   * The PostgreSQL client or adapter instance.
   */
  sql: Sql<RecordType> | ISqlNeonAdapter | SqlDb<RecordType> | unknown;

  /**
   * The filter criteria source, typically specifying the fields and values to filter by.
   */
  source: GridFilterModel | LikeNextRequest | URL | string | undefined;

  /**
   * (Optional) A default filter to apply if no specific filter is provided.
   */
  defaultFilter?: GridFilterModel | LikeNextRequest | URL | string;

  /**
   * A mapping or function to translate source column names to database column names.
   */
  columnMap?: ((sourceColumnName: string) => string) | Record<string, string>;

  /**
   * An optional set of additional filters that should be applied to the query.
   */
  additional?: Record<string, Omit<GridFilterItem, 'field'>>;

  /**
   * Optional append parameter for backward compatibility.
   */
  append?: unknown;
};

/**
 * Props for configuring item filter functionality for PostgreSQL.
 */
export type BuildItemFilterProps = {
  /**
   * The filter item from MUI Data Grid.
   */
  item: GridFilterItem;

  /**
   * A mapping or function to translate source column names to database column names.
   */
  columnMap?: ((sourceColumnName: string) => string) | Record<string, string>;
};
