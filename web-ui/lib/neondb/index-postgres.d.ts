/**
 * @module db
 * This module provides a connection to the Neon database using the postgres.js driver.
 */

declare module '@/lib/neondb/index-postgres' {
  import type {
    PostgresSql,
    PostgresRowList as RowList,
    PostgresParameterOrFragment as ParameterOrFragment,
    PostgresPendingQuery as PendingQuery,
    PostgresStatement,
  } from './postgres';
  import type { IResultset } from './types';

  export type QueryProps<ResultType extends object = Record<string, unknown>> = {
    transform?: <RecordType extends Record<string, unknown>>(
      result: RecordType,
    ) => ResultType;
    enhanced?: boolean;
  };

  export type TransformedFullQueryResults<
    ResultType extends object = Record<string, unknown>,
  > = {
    statement: string | PostgresStatement;
    fields: string[];
    command: string;
    rowCount: number;
    rows: Array<ResultType>;
  };

  /**
   * Resultset class providing enhanced array functionality with database metadata.
   * Extends Array to provide both standard array operations and database-specific properties.
   */
  export class Resultset<T extends readonly any[] = readonly any[]>
    extends Array<any>
    implements IResultset<T>
  {
    /**
     * Type guard to check if a value is a Resultset or compatible IResultset.
     */
    static isResultset<TRow extends readonly any[] = readonly any[]>(
      check: unknown,
    ): check is IResultset<TRow>;

    /**
     * Type guard to check if a value is a RowList from postgres.js.
     */
    static isRowList<TRow extends readonly any[]>(
      check: unknown,
    ): check is RowList<TRow>;

    constructor(resultset: RowList<T>);
    constructor(resultset: IResultset<T>);

    get fields(): import('postgres').ColumnList<keyof T>;
    get command(): import('postgres').ResultMeta<number>['command'];
    get statement(): string;
    get count(): number;
    get rows(): Array<T>;
  }

  /**
   * SQL Neon Adapter interface for executing queries with flexible syntax.
   */
  export interface ISqlNeonAdapter {
    <T1 extends boolean = false, T2 extends boolean = T1>(
      template: TemplateStringsArray,
      ...parameters: readonly ParameterOrFragment<any[keyof any]>[]
    ): PendingQuery<any>;
    <
      ArrayModeOverride extends boolean = true,
      FullResultsOverride extends boolean = ArrayModeOverride,
    >(
      string: string,
      params?: any[],
    ): PendingQuery<any>;
  }

  /**
   * Creates an adapter function for executing SQL queries.
   * Supports both template literals (safe) and raw strings (unsafe).
   */
  export const sqlNeonAdapter: (sql: SqlDb<any>) => ISqlNeonAdapter;

  /**
   * Type guard for ISqlNeonAdapter.
   */
  export const isSqlNeonAdapter: (check: unknown) => check is ISqlNeonAdapter;

  /**
   * Unwraps the underlying SQL adapter from a wrapped instance.
   */
  export const unwrapAdapter: <
    TModel extends Record<string, unknown> = Record<string, unknown>,
  >(
    adapter: ISqlNeonAdapter,
  ) => SqlDb<TModel>;

  /**
   * Returns SQL database adapter, unwrapping if necessary.
   */
  export const asSql: <
    TModel extends Record<string, unknown> = Record<string, unknown>,
  >(
    adapter: ISqlNeonAdapter | SqlDb<TModel>,
  ) => SqlDb<TModel>;

  /**
   * Executes a query against the Neon database.
   */
  export const query: <
    ResultType extends object = Record<string, unknown>,
  >(
    cb: (sql: ISqlNeonAdapter) => Promise<RowList<any>>,
    props?: QueryProps<ResultType>,
  ) => Promise<Array<ResultType>>;

  /**
   * Executes a query against the Neon database with extended results.
   */
  export const queryExt: <
    ResultType extends object = Record<string, unknown>,
  >(
    cb: (sql: ISqlNeonAdapter) => Promise<RowList<any>>,
    props?: QueryProps<ResultType>,
  ) => Promise<TransformedFullQueryResults<ResultType>>;

  export type SqlDb<TRecord = any> = PostgresSql<TRecord>;

  /**
   * Execute a raw query synchronously (connection must be initialized).
   */
  export const queryRaw: <RecordType = any>(
    cb: (sql: SqlDb<RecordType>) => PendingQuery<RecordType>,
  ) => PendingQuery<RecordType>;

  /**
   * Execute a raw query with async initialization.
   */
  export const safeQueryRaw: <
    RecordType extends Record<string, unknown> = any,
  >(
    cb: (sql: SqlDb<RecordType>) => PendingQuery<RecordType>,
  ) => Promise<PendingQuery<RecordType>>;

  /**
   * Execute a database query and return an IResultset with optional transformation.
   */
  export const db: <
    ResultType extends readonly any[] & Record<string, unknown> = any,
    RecordType extends Record<string, unknown> = ResultType,
  >(
    cb: (sql: SqlDb<RecordType>) => PendingQuery<RecordType>,
    props?: QueryProps<ResultType>,
  ) => Promise<IResultset<ResultType>>;

  export type DbQueryFunction<X extends boolean, Y extends boolean> =
    ISqlNeonAdapter;

  /**
   * Get the database connection (synchronous, must be initialized).
   * @deprecated Use pgDb() instead for better consistency.
   */
  export const sql: () => SqlDb<any>;
}
