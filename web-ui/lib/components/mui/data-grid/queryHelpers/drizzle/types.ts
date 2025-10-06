import type { LikeNextRequest } from '/lib/nextjs-util/types';
import type {
  GridFilterModel,
  GridFilterItem,
  GridSortModel,
} from '@mui/x-data-grid-pro';
import type { NextRequest } from 'next/server';
import type { ColumnBaseConfig, SQL } from 'drizzle-orm';
import type { AnyPgSelect, PgColumn } from 'drizzle-orm/pg-core';

// Type for Drizzle select query builder - simplified to match actual usage
export type DrizzleSelectQueryBase = Pick<
  AnyPgSelect,
  'where' | 'orderBy' | 'offset' | 'limit' | 'prepare' | 'execute' | '_' | 'as'
>;

export type DrizzleSelectQuery =
  | DrizzleSelectQueryBase
  | Array<Record<string, unknown>>;

export type DrizzleSortedQuery = Omit<DrizzleSelectQuery, 'where' | 'orderBy'>;

/**
 * Props for configuring the selectForGrid function.
 */
export type SelectForGridProps<T> = {
  /**
   * The NextRequest object containing URL parameters for filtering, sorting, and pagination.
   */
  req: NextRequest;

  /**
   * The Drizzle select query builder to apply operations to.
   */
  query: DrizzleSelectQuery;

  /**
   * A function to get the actual column object from a column name.
   * This is required because Drizzle needs actual column references for operations.
   *
   * @param columnName - The database column name (after mapping)
   * @returns The Drizzle column object or SQL expression
   */
  getColumn: (columnName: string) => PgColumn | SQL | SQL.Aliased | undefined;

  /**
   * A mapping or function to translate source column names to database column names.
   */
  columnMap?: ((sourceColumnName: string) => string) | Record<string, string>;

  /**
   * Optional transformer function to convert database records to domain objects.
   * If not provided, records are returned as-is.
   */
  recordMapper?: (record: Record<string, unknown>) => T;

  /**
   * The default sort model or column name to use if none is provided.
   */
  defaultSort?: GridSortModel | string | SQL | PgColumn;
};

/**
 * Props for configuring Drizzle order by functionality.
 */
export type BuildDrizzleOrderByProps = {
  /**
   * The Drizzle select query to apply ordering to.
   */
  query: DrizzleSelectQuery;

  /**
   * The request object, typically similar to Next.js's request, URL, or direct sort model.
   */
  source: LikeNextRequest | URL | string | GridSortModel | undefined;

  /**
   * The default sort model or column name to use if none is provided.
   */
  defaultSort?: GridSortModel | string | SQL | SQL.Aliased | PgColumn;

  /**
   * A mapping or function to translate source column names to database column names.
   */
  columnMap?: ((sourceColumnName: string) => string) | Record<string, string>;

  /**
   * A function to get the actual column object from a column name.
   * This is required because Drizzle needs actual column references for orderBy.
   *
   * @param columnName - The database column name (after mapping)
   * @returns The Drizzle column object or SQL expression
   */
  getColumn: (columnName: string) => PgColumn | SQL | SQL.Aliased | undefined;
};

type EmailColumnType = PgColumn<
  ColumnBaseConfig<'string', 'PgUUID'>,
  object,
  object
>;

/**
 * Props for configuring Drizzle attachment or email filter functionality.
 */
export type BuildDrizzleAttachmentOrEmailFilterProps = {
  /**
   * Value used to determine if the filter should include attachments or target only the email.
   * If true, the filter will include attachments; if false, it will target only the email.
   * This value is typically derived from the request URL or query parameters.
   * If not provided, the filter will default to including attachments.
   */
  attachments: boolean | LikeNextRequest | URL | URLSearchParams | undefined;

  /**
   * The email ID to be used in the filter.
   */
  email_id: string | undefined;

  /**
   * The Drizzle column object for the email ID field.
   * 
   * 
   * 
   * getColumn: <
    T extends ColumnBaseConfig<ColumnDataType, string> = ColumnBaseConfig<ColumnDataType, string>,
    TRuntimeConfig extends object = object,
    TConfig extends object = object,
  >(columnName: string) => PgColumn<T, TRuntimeConfig, TConfig> | undefined;
   * 
   * 
   */
  email_id_column: EmailColumnType | SQL.Aliased<EmailColumnType>;

  /**
   * The Drizzle column object for the document ID field.
   */
  document_id_column:
    | PgColumn<ColumnBaseConfig<'number', 'PgInteger'>, object, object>
    | SQL.Aliased<number>;

  /**
   * Function that returns a SQL expression for email_to_document_id conversion.
   * This should be a function that takes an email ID and returns a SQL expression.
   */
  emailToDocumentIdFn?: (emailId: string) => SQL;
};

/**
 * Props for configuring Drizzle item filter functionality.
 */
export type BuildDrizzleItemFilterProps = {
  /**
   * The filter item from MUI Data Grid.
   */
  item: GridFilterItem;

  /**
   * A function to get the actual column object from a column name.
   * This is required because Drizzle needs actual column references for filtering.
   *     Column<ColumnBaseConfig<ColumnDataType, string>, object, object>
   * @param columnName - The database column name (after mapping)
   * @returns The Drizzle column object or SQL expression
   */
  /*
  getColumn: <
    T extends ColumnBaseConfig<ColumnDataType, string> = ColumnBaseConfig<ColumnDataType, string>,
    TRuntimeConfig extends object = object,
    TConfig extends object = object,
  >(columnName: string) => PgColumn<T, TRuntimeConfig, TConfig> | SQL | undefined;
*/
  getColumn: (columnName: string) => PgColumn | SQL | SQL.Aliased | undefined;

  /**
   * A mapping or function to translate source column names to database column names.
   */
  columnMap?: ((sourceColumnName: string) => string) | Record<string, string>;
};

/**
 * Props for configuring Drizzle query filter functionality.
 */
export type BuildDrizzleQueryFilterProps = {
  /**
   * The Drizzle select query to apply filtering to.
   */
  query: DrizzleSelectQuery;

  /**
   * The filter criteria source, typically specifying the fields and values to filter by.
   */
  source: GridFilterModel | LikeNextRequest | URL | string | undefined;

  /**
   * A function to get the actual column object from a column name.
   * This is required because Drizzle needs actual column references for filtering.
   *
   * @param columnName - The database column name (after mapping)
   * @returns The Drizzle column object or SQL expression
   */
  getColumn: (columnName: string) => PgColumn | SQL | SQL.Aliased | undefined;

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
   * This can include any additional criteria that are not part of the main filter model.
   */
  additional?: Record<string, Omit<GridFilterItem, 'field'>>;
};
