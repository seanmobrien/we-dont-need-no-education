import { ColumnList, ResultMeta } from 'postgres';

export type CommandMeta = ResultMeta<number>['command'];

/**
 * Represents a result set from a database query.
 *
 * @template T - The type of the records in the result set.
 *
 * @property {string} statement - The SQL statement that was executed.
 * @property {CommandMeta} command - Metadata about the executed command.
 * @property {ColumnList<keyof T>} fields - The list of columns in the result set.
 * @property {number} count - The number of rows in the result set.
 * @property {Array<T>} rows - The rows in the result set.
 */
export type IResultset<T extends Record<string, unknown>> = Array<T> & {
  /**
   * @property {string} statement The SQL statement that was executed.
   */
  readonly statement: string;
  /**
   * @property {CommandMeta} command Metadata about the executed command.
   */
  readonly command: CommandMeta;
  /**
   * @property {ColumnList} List of columns in this resultset.
   */
  readonly fields: ColumnList<keyof T>;
  /**
   * @property {number} count The number of records in the result.
   * @deprecated Use {@link Array.length} instead.
   */
  readonly count: number;
  /**
   * @property {Array} rows records in this resultset.
   * @deprecated Can be accesed directly via array syntax.
   */
  readonly rows: Array<T>;
};
