/**
 * @fileoverview Type Definitions for PostgreSQL Driver
 * 
 * This module provides comprehensive type aliases equivalent to the postgres.Sql<T> type
 * and all its dependencies from the 'postgres' package. These types enable type-safe
 * PostgreSQL operations while maintaining compatibility with the original postgres types.
 * 
 * @module lib/neondb/postgres-types
 * @version 1.0.0
 * @since 2025-07-26
 */

// =============================================================================
// Core PostgreSQL Types and Interfaces
// =============================================================================

/**
 * Represents a PostgreSQL connection configuration.
 * Equivalent to postgres.Options from 'postgres' package.
 */
export interface PostgresConfig {
  /** Database host */
  host?: string;
  /** Database port */
  port?: number;
  /** Database name */
  database?: string;
  /** Username for authentication */
  username?: string;
  /** Password for authentication */
  password?: string;
  /** SSL configuration */
  ssl?: boolean | object;
  /** Maximum number of connections in pool */
  max?: number;
  /** Idle timeout in seconds */
  idle_timeout?: number;
  /** Connection timeout in seconds */
  connect_timeout?: number;
  /** Whether to prepare statements */
  prepare?: boolean;
  /** Transform function for column names */
  transform?: {
    column?: (column: string) => string;
    value?: (value: unknown) => unknown;
    row?: (row: Record<string, unknown>) => Record<string, unknown>;
  };
  /** Custom types configuration */
  types?: Record<string, unknown>;
  /** Debug mode */
  debug?: boolean | ((connection: number, query: string, parameters: unknown[], paramTypes: unknown[]) => void);
  /** Connection parameters */
  connection?: Record<string, unknown>;
  /** Fetch array size */
  fetch_array_size?: number;
  /** Publications for logical replication */
  publications?: string;
  /** Target session attributes */
  target_session_attrs?: 'read-write' | 'read-only' | 'primary' | 'standby' | 'prefer-standby';
}

/**
 * Represents the result metadata from a PostgreSQL query.
 * Equivalent to postgres.ResultMeta<T> from 'postgres' package.
 */
export interface PostgresResultMeta<T = number> {
  /** SQL command that was executed */
  command: string;
  /** Number of rows affected */
  count: T;
  /** Additional meta information */
  [key: string]: unknown;
}

/**
 * Represents a column in a PostgreSQL result set.
 * Equivalent to postgres.Column<T> from 'postgres' package.
 * 
 * @template T - The name of the column
 */
export interface PostgresColumn<T extends string> {
  name: T;
  type: number;
  table: number;
  number: number;
  parser?: ((raw: string) => unknown) | undefined;
}


/**
 * Represents column information from a PostgreSQL result.
 * Equivalent to postgres.ColumnList<T> from 'postgres' package.
 */
export type PostgresColumnList<T> = (T extends string ? PostgresColumn<T> : never)[];


/**
 * Represents a row of data that may or may not exist.
 * Equivalent to postgres.MaybeRow from 'postgres' package.
 */
export type PostgresMaybeRow = Record<string, unknown> | undefined;

interface PostgresResultQueryMeta<T extends number | null, U>
  extends PostgresResultMeta<T> {
  columns: PostgresColumnList<U>;
}

export type PostgresExecutionResult<T> = [] &
  PostgresResultQueryMeta<number, keyof NonNullable<T>>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PostgresValuesRowList<T extends readonly any[]> =
  T[number][keyof T[number]][][] &
    PostgresResultQueryMeta<T['length'], keyof T[number]>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PostgresRawRowList<T extends readonly any[]> = Buffer[][] &
    Iterable<Buffer[][]> &
    PostgresResultQueryMeta<T['length'], keyof T[number]>;
  
  
/**
 * Represents a list of rows returned from a query.
 * Equivalent to postgres.RowList<T> from 'postgres' package.*/
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PostgresRowList<T extends readonly any[]> = T &
    Iterable<NonNullable<T[number]>> &
    PostgresResultQueryMeta<T['length'], keyof T[number]>;


/**
 * Represents a list of rows returned from a query.
 * Equivalent to postgres.RowList<T> from 'postgres' package.
export interface PostgresRowList<T extends Record<string, unknown> = Record<string, unknown>> extends Array<T> {
  /** Query execution command metadata * /
  command: string;
  /** Number of rows returned * /
  count: number;
  /** Column information * /
  columns: PostgresColumnList<keyof T>;
  /** Statement that was executed * /
  statement: PostgresStatement | string;
}
 */


/**
 * Represents a parameter or SQL fragment that can be used in queries.
 * Equivalent to postgres.ParameterOrFragment from 'postgres' package.
 */
export type PostgresParameterOrFragment<T = unknown> = 
  | T 
  | PostgresFragment
  | PostgresHelper<T>;

/**
 * Represents a SQL fragment with parameters.
 * Equivalent to postgres.Fragment from 'postgres' package.
 */
export interface PostgresFragment {
  /** The SQL text */
  text: string;
  /** Parameters for the fragment */
  parameters: unknown[];
  /** Parameter types */
  types: number[];
  /** Fragment metadata */
  [key: string]: unknown;
}

/**
 * Represents a helper function for building SQL queries.
 * Equivalent to postgres.Helper<T> from 'postgres' package.
 */
export interface PostgresHelper<T = unknown> {
  /** The helper function */
  (values: T[]): PostgresFragment;
  /** Helper configuration */
  [key: string]: unknown;
}

/**
 * Represents a pending database query.
 * Equivalent to postgres.PendingQuery<T> from 'postgres' package.
 */
export interface PostgresPendingQuery<T = Record<string, unknown>> extends Promise<PostgresRowList<T[]>> {
  /** The SQL statement */
  statement: PostgresStatement;
  /** Execute the query */
  execute(): Promise<PostgresRowList<T[]>>;
  /** Describe the query */
  describe(): Promise<{
    columns: PostgresColumnList<keyof T>;
    parameters: unknown[];
  }>;
  /** Cancel the query */
  cancel(): Promise<void>;
  /** Whether the query is simple (no parameters) */
  simple: boolean;
  /** Query options */
  options: Record<string, unknown>;
}

/**
 * Represents a prepared SQL statement.
 * Equivalent to postgres.Statement from 'postgres' package.
 */
export interface PostgresStatement {
  /** Statement name */
  name: string;
  /** SQL text */
  text: string;
  /** Parameter types */
  types: number[];
  /** Columns returned by statement */
  columns: PostgresColumnList<string>;
  /** Statement metadata */
  [key: string]: unknown;
}

/**
 * Represents an error from PostgreSQL.
 * Equivalent to postgres.PostgresError from 'postgres' package.
 */
export interface PostgresError extends Error {
  /** PostgreSQL error severity */
  severity: string;
  /** PostgreSQL error code */
  code: string;
  /** Detailed error message */
  detail?: string;
  /** Error hint */
  hint?: string;
  /** Position of error in query */
  position?: string;
  /** Internal position */
  internalPosition?: string;
  /** Internal query */
  internalQuery?: string;
  /** Error context */
  where?: string;
  /** Schema name */
  schema?: string;
  /** Table name */
  table?: string;
  /** Column name */
  column?: string;
  /** Data type name */
  dataType?: string;
  /** Constraint name */
  constraint?: string;
  /** Source file */
  file?: string;
  /** Source line */
  line?: string;
  /** Source routine */
  routine?: string;
}

// =============================================================================
// Transaction Types
// =============================================================================

/**
 * Represents a database transaction.
 * Equivalent to postgres transaction types from 'postgres' package.
 */
export interface PostgresTransaction<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Execute a query within the transaction */
  <R extends Record<string, unknown> = T>(
    template: TemplateStringsArray,
    ...parameters: PostgresParameterOrFragment[]
  ): PostgresPendingQuery<R>;

  /** Execute a query within the transaction with explicit typing */
  <R extends Record<string, unknown> = T>(
    query: string,
    parameters?: PostgresParameterOrFragment[]
  ): PostgresPendingQuery<R>;

  /** Create a savepoint */
  savepoint<R>(fn: (sql: PostgresTransaction<T>) => R | Promise<R>): Promise<R>;

  /** Rollback the transaction */
  rollback(): void;

  /** Additional transaction properties */
  [key: string]: unknown;
}

// =============================================================================
// Main SQL Interface Types
// =============================================================================

/**
 * Tagged template function for SQL queries.
 * Core interface for executing PostgreSQL queries with type safety.
 */
export interface PostgresSqlTemplate<T = Record<string, unknown>> {
  /** Execute a parameterized query using template literals */
  <R = T>(
    template: TemplateStringsArray,
    ...parameters: PostgresParameterOrFragment[]
  ): PostgresPendingQuery<R>;

  /** Execute a query with string and parameters */
  <R  = T>(
    query: string,
    parameters?: PostgresParameterOrFragment[]
  ): PostgresPendingQuery<R>;
}

/**
 * Transaction execution interface.
 */
export interface PostgresTransactionFunction {
  /** Execute a function within a database transaction */
  <T>(fn: (sql: PostgresTransaction) => T | Promise<T>): Promise<T>;
  /** Execute with specific transaction options */
  <T>(
    options: {
      isolation?: 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable';
      readonly?: boolean;
      deferrable?: boolean;
    },
    fn: (sql: PostgresTransaction) => T | Promise<T>
  ): Promise<T>;
}

/**
 * Helper functions for building complex queries.
 */
export interface PostgresHelpers {
  /** Create a helper for inserting multiple rows */
  insert<T extends Record<string, unknown>>(
    columns: (keyof T)[],
    options?: { onConflict?: string }
  ): PostgresHelper<T>;

  /** Create a helper for updating multiple rows */
  update<T extends Record<string, unknown>>(
    columns: (keyof T)[],
    where?: string
  ): PostgresHelper<T>;

  /** Create a VALUES helper */
  values<T extends Record<string, unknown>>(
    rows: T[],
    columns?: (keyof T)[]
  ): PostgresFragment;

  /** Create an IN helper for array parameters */
  in<T>(values: T[]): PostgresFragment;

  /** Create a JSON helper */
  json(value: unknown): PostgresFragment;

  /** Create an identifier helper */
  identifier(name: string): PostgresFragment;

  /** Create a raw SQL helper */
  raw(sql: string): PostgresFragment;
}

/**
 * Connection and utility functions.
 */
export interface PostgresUtilities {
  /** End all connections and clean up */
  end(): Promise<void>;

  /** Get connection information */
  options: PostgresConfig;

  /** Reserve a connection for multiple queries */
  reserve(): Promise<PostgresReservedConnection>;

  /** Listen for PostgreSQL notifications */
  listen(
    channel: string,
    fn: (payload: string) => void
  ): Promise<{ unlisten: () => Promise<void> }>;

  /** Send a notification */
  notify(channel: string, payload?: string): Promise<void>;

  /** Execute COPY FROM STDIN */
  copyFrom(query: string, options?: { 
    format?: 'text' | 'csv' | 'binary';
    delimiter?: string;
    null?: string;
    header?: boolean;
  }): NodeJS.WritableStream;

  /** Execute COPY TO STDOUT */
  copyTo(query: string, options?: {
    format?: 'text' | 'csv' | 'binary';
    delimiter?: string;
    null?: string;
    header?: boolean;
  }): NodeJS.ReadableStream;

  /** Get query execution statistics */
  stats(): {
    successful: number;
    errored: number;
    connecting: number;
    connected: number;
    ended: number;
    ending: number;
  };
}

/**
 * Reserved connection interface for exclusive use.
 */
export interface PostgresReservedConnection extends PostgresSqlTemplate {
  /** Release the reserved connection back to the pool */
  release(): void;
}

// =============================================================================
// Main Sql Interface - Equivalent to postgres.Sql<T>
// =============================================================================

/**
 * Main PostgreSQL database interface.
 * This is the complete type-equivalent alias for postgres.Sql<T> from the 'postgres' package.
 * 
 * @template T - The default record type for query results
 * 
 * @example
 * ```typescript
 * // Use as a complete replacement for postgres.Sql<T>
 * const sql: PostgresSql<{ id: number; name: string }> = getConnection();
 * 
 * // Execute queries with type safety
 * const users = await sql<User>`SELECT * FROM users WHERE active = ${true}`;
 * 
 * // Use transactions
 * const result = await sql.begin(async sql => {
 *   await sql`INSERT INTO users (name) VALUES (${name})`;
 *   return sql<User>`SELECT * FROM users WHERE name = ${name}`;
 * });
 * 
 * // Use helpers
 * const insertUsers = sql.helpers.insert(['name', 'email']);
 * await sql`${insertUsers(userArray)}`;
 * ```
 */
export interface PostgresSql<T >
  extends PostgresSqlTemplate<T>,
          PostgresUtilities {

  // =============================================================================
  // Transaction Management
  // =============================================================================

  /** Begin a new transaction */
  begin: PostgresTransactionFunction;

  // =============================================================================
  // Query Helpers
  // =============================================================================

  /** Helper functions for building complex queries */
  helpers: PostgresHelpers;

  // =============================================================================
  // Type Management
  // =============================================================================

  /** Register custom PostgreSQL types */
  types: {
    /** Add a custom type parser */
    setTypeParser<R>(
      oid: number | string,
      parser: (value: string) => R
    ): void;
    
    /** Get the parser for a type */
    getTypeParser(oid: number | string): ((value: string) => unknown) | undefined;
  };

  // =============================================================================
  // Connection Pool Management
  // =============================================================================

  /** Current connection pool parameters */
  parameters: Record<string, string>;

  /** Connection pool options */
  options: PostgresConfig;

  // =============================================================================
  // Query Building and Execution
  // =============================================================================

  /** Create a prepared statement */
  prepare<R  = T>(
    name: string,
    query: string,
    types?: number[]
  ): {
    /** Execute the prepared statement */
    <P  = R>(
      ...parameters: PostgresParameterOrFragment[]
    ): PostgresPendingQuery<P>;
  };

  /** Execute an unsafe query (bypasses escaping) */
  unsafe<R  = T>(
    query: string,
    parameters?: unknown[]
  ): PostgresPendingQuery<R>;

  // =============================================================================
  // File Operations
  // =============================================================================

  /** Load and execute SQL from a file */
  file<R  = T>(
    path: string,
    parameters?: PostgresParameterOrFragment[]
  ): PostgresPendingQuery<R>;

  // =============================================================================
  // Event Handling
  // =============================================================================

  /** Add event listeners */
  on(event: 'connect', listener: (connection: unknown) => void): this;
  on(event: 'error', listener: (error: PostgresError) => void): this;
  on(event: 'close', listener: () => void): this;
  on(event: 'notice', listener: (notice: PostgresError) => void): this;
  on(event: string, listener: (...args: unknown[]) => void): this;

  /** Remove event listeners */
  off(event: string, listener: (...args: unknown[]) => void): this;

  // =============================================================================
  // Additional Utility Properties
  // =============================================================================

  /** Check if the connection is closed */
  closed: boolean;

  /** Current number of active connections */
  totalCount: number;

  /** Number of idle connections */
  idleCount: number;

  /** Number of connections being created */
  connectingCount: number;

  /** Current transaction depth */
  transactionDepth?: number;

  /** Custom properties for extension */
  [key: string]: unknown;
}

// =============================================================================
// Factory Function Type
// =============================================================================

/**
 * Factory function type for creating PostgreSQL connections.
 * Equivalent to the default export from 'postgres' package.
 * 
 * @example
 * ```typescript
 * const postgres: PostgresFactory = require('postgres');
 * const sql = postgres('postgresql://localhost/mydb');
 * ```
 */
export interface PostgresFactory {
  /** Create a new PostgreSQL connection */
  <T extends Record<string, unknown> = Record<string, unknown>>(
    connectionString: string,
    options?: PostgresConfig
  ): PostgresSql<T>;

  /** Create a new PostgreSQL connection with options only */
  <T extends Record<string, unknown> = Record<string, unknown>>(
    options: PostgresConfig
  ): PostgresSql<T>;
}

// =============================================================================
// Driver Interface for Compatibility
// =============================================================================

/**
 * PostgreSQL driver interface for compatibility with existing code.
 * Equivalent to postgres.PgDbDriver from connection utilities.
 */
export interface PostgresDriver<T extends Record<string, unknown> = Record<string, unknown>> {
  /** The underlying SQL interface */
  sql: PostgresSql<T>;
  
  /** Create a new instance */
  getInstance(): Promise<PostgresSql<T>>;
  
  /** Additional driver properties */
  [key: string]: unknown;
}

// =============================================================================
// Utility Type Exports
// =============================================================================

/**
 * Re-export all types with postgres prefix for clarity and compatibility.
 */
export type {
  PostgresConfig as PostgresOptions,
  PostgresResultMeta as ResultMeta,
  PostgresColumnList as ColumnList,
  PostgresMaybeRow as MaybeRow,
  PostgresRowList as RowList,
  PostgresParameterOrFragment as ParameterOrFragment,
  PostgresFragment as Fragment,
  PostgresHelper as Helper,
  PostgresPendingQuery as PendingQuery,
  PostgresStatement as Statement,
  //PostgresError as PostgresError,
  PostgresTransaction as Transaction,
  //PostgresSql as Sql,
  PostgresFactory as Postgres,
};

// =============================================================================
// Default Export - Main Type Alias
// =============================================================================

/**
 * Main type alias equivalent to postgres.Sql<T>.
 * This is the primary export that can be used as a drop-in replacement.
 * 
 * @template T - The default record type for query results
 */
export type Sql<T extends Record<string, unknown> = Record<string, unknown>> = PostgresSql<T>;

/**
 * Default export - equivalent to postgres default export.
 */
export default PostgresFactory;
