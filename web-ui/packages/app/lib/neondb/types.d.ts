/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Type definitions for PostgreSQL query results
 * @module @/lib/neondb/types
 */

declare module '@/lib/neondb/types' {
  import { ColumnList, ResultMeta } from 'postgres';

  /**
   * Command metadata type extracted from PostgreSQL result metadata
   */
  export type CommandMeta = ResultMeta<number>['command'];

  /**
   * Represents a result set from a database query.
   *
   * This type extends ReadonlyArray and adds metadata properties for comprehensive
   * query result introspection. It provides information about the executed SQL statement,
   * columns, and row counts in addition to the actual result data.
   *
   * **Properties:**
   * - `statement`: The SQL statement that was executed
   * - `command`: Metadata about the executed command (INSERT, SELECT, UPDATE, etc.)
   * - `fields`: Column information including names, types, and parsers
   * - `count`: Number of rows in the result (**deprecated** - use `length` instead)
   * - `rows`: The result rows (**deprecated** - access via array syntax instead)
   *
   * **Deprecated Properties:**
   * The `count` and `rows` properties are maintained for backward compatibility
   * but should not be used in new code. Use standard array operations instead:
   * - Use `resultset.length` instead of `resultset.count`
   * - Use `resultset[index]` or `resultset.map()` instead of `resultset.rows`
   *
   * @template T - The type of records in the result set (must be a readonly array)
   *
   * @example
   * ```typescript
   * type User = { id: number; email: string; name: string };
   * const resultset: IResultset<User[]> = await db`SELECT * FROM users`;
   *
   * // Access metadata
   * console.log(resultset.statement); // "SELECT * FROM users"
   * console.log(resultset.command);   // "SELECT"
   * console.log(resultset.fields);    // [{ name: 'id', type: 23, ... }, ...]
   *
   * // Access results (recommended)
   * console.log(resultset.length);       // Number of rows
   * const firstUser = resultset[0];      // First row
   * resultset.forEach(user => { ... });  // Iterate rows
   *
   * // Legacy access (deprecated)
   * console.log(resultset.count);  // Use .length instead
   * console.log(resultset.rows);   // Use array access instead
   * ```
   *
   * @example
   * ```typescript
   * // Working with column metadata
   * const result: IResultset<any[]> = await db`SELECT * FROM users`;
   *
   * // Inspect column information
   * result.fields.forEach(field => {
   *   console.log(`Column: ${field.name}, Type: ${field.type}`);
   *   if (field.parser) {
   *     console.log('Has custom parser');
   *   }
   * });
   * ```
   */
  export type IResultset<T extends readonly any[] = readonly any[]> =
    ReadonlyArray<any> & {
      /**
       * The SQL statement that was executed to produce this result set.
       */
      readonly statement: string;

      /**
       * Metadata about the executed command.
       * Contains information such as the command type (SELECT, INSERT, UPDATE, DELETE, etc.)
       * and other execution details.
       */
      readonly command: CommandMeta;

      /**
       * List of columns in this result set.
       * Each column includes its name, type, parser function (if applicable),
       * and other metadata useful for processing the results.
       */
      readonly fields: ColumnList<keyof T>;

      /**
       * The number of records in the result set.
       *
       * @deprecated Use {@link Array.length} instead for standard array length access.
       *
       * @example
       * ```typescript
       * // ❌ Deprecated
       * console.log(resultset.count);
       *
       * // ✅ Preferred
       * console.log(resultset.length);
       * ```
       */
      readonly count: number;

      /**
       * Records in this result set.
       *
       * @deprecated Access results directly via array syntax instead.
       *
       * @example
       * ```typescript
       * // ❌ Deprecated
       * resultset.rows.forEach(row => console.log(row));
       *
       * // ✅ Preferred
       * resultset.forEach(row => console.log(row));
       * // or
       * for (const row of resultset) { console.log(row); }
       * ```
       */
      readonly rows: Array<T>;
    };
}
