import {
  PaginationStats,
  PaginatedResultset,
  parsePaginationStats,
} from '@/data-models';
import { isError, isTemplateStringsArray } from '@/lib/react-util';
import { log } from '../logger';
import type {
  TransformedFullQueryResults,
  DbQueryFunction,
} from '@/lib/neondb';
import { ValidationError } from '../react-util';
import { DataIntegrityError } from '../react-util/errors/data-integrity-error';
import { LoggedError } from '../react-util/errors/logged-error';
import { RecordToObjectImpl, RecordToSummaryImpl } from './_types';

/**
 * AbstractObjectRepository is a base class for handling database operations
 * and error logging for objects of type T.
 *
 * @template T - The type of object this repository handles.
 */
/**
 * AbstractObjectRepository is a generic class that provides common database operations
 * for objects of type `T`. It includes methods for logging database errors, mapping
 * database records to objects, and performing CRUD operations.
 *
 * @template T - The type of objects managed by this repository.
 */
export class AbstractObjectRepository<T extends object> {
  /**
   * Logs and throws a database error.
   *
   * This method processes different types of errors and throws a `LoggedError` with appropriate details.
   * It handles generic errors, data integrity errors, and validation errors, logging them accordingly.
   *
   * @param params - The parameters for logging the database error.
   * @param params.error - The error object to be logged and thrown.
   * @param params.source - The source of the error, typically indicating where the error originated.
   *
   * @throws {LoggedError} - Throws a `LoggedError` with details about the error, including its criticality and source.
   */
  static logDatabaseError(params: { error: unknown; source: string }): never;

  /**
   * Logs and throws a database error.
   *
   * This method processes different types of errors and throws a `LoggedError` with appropriate details.
   * It handles generic errors, data integrity errors, and validation errors, logging them accordingly.
   *
   * @param {string} source - The source of the error, typically indicating where the error originated.
   * @param {unknown} error - The error object to be logged and thrown.
   *
   * @throws {LoggedError} - Throws a `LoggedError` with details about the error, including its criticality and source.
   */
  static logDatabaseError(source: string, error: unknown): never;

  /**
   * Logs a database error and throws a `LoggedError` with appropriate details.
   *
   * @param paramsOrSource - Either an object containing the error and source, or a string representing the source.
   * @param errorFromArgs - The error to be logged if `paramsOrSource` is a string.
   * @throws {LoggedError} - Throws a `LoggedError` with details about the error.
   *
   * @overload
   * @param paramsOrSource - An object containing the error and source.
   * @param paramsOrSource.error - The error to be logged.
   * @param paramsOrSource.source - The source of the error.
   * @throws {LoggedError} - Throws a `LoggedError` with details about the error.
   *
   * @overload
   * @param paramsOrSource - A string representing the source of the error.
   * @param errorFromArgs - The error to be logged.
   * @throws {LoggedError} - Throws a `LoggedError` with details about the error.
   */
  static logDatabaseError(
    paramsOrSource: { error: unknown; source: string } | string,
    errorFromArgs?: unknown,
  ): never {
    let error: unknown;
    let source: string;
    if (typeof paramsOrSource === 'string') {
      source = paramsOrSource;
      error = errorFromArgs;
    } else {
      source = paramsOrSource.source;
      error = paramsOrSource.error;
    }
    if (typeof error !== 'object' || error === null) {
      throw LoggedError.isTurtlesAllTheWayDownBaby({
        error: new Error(String(error)),
        log: true,
        source,
        critical: true,
      });
    }
    if (DataIntegrityError.isDataIntegrityError(error)) {
      throw LoggedError.isTurtlesAllTheWayDownBaby({
        error,
        critical: false,
        source,
        log: true,
      });
    }
    if (ValidationError.isValidationError(error)) {
      throw LoggedError.isTurtlesAllTheWayDownBaby({
        error,
        critical: false,
        message: 'Validation error',
        source,
        log: true,
      });
    }
    throw LoggedError.isTurtlesAllTheWayDownBaby({
      error: isError(error) ? error : new Error(String(error)),
      critical: true,
      log: true,
      source,
      message: '[AUDIT] A database operation failed',
    });
  }

  readonly #tableName: string;
  readonly #objectMap: RecordToObjectImpl<T>;
  readonly #summaryMap: RecordToSummaryImpl<T>;

  /**
   * Constructs a new instance of the class.
   *
   * @param tableName - The name of the table.
   * @param objectMap - A mapping of records to objects.
   * @param summaryMap - A mapping of records to summaries.
   */
  constructor({
    tableName,
    objectMap,
    summaryMap,
  }: {
    tableName: string;
    objectMap: RecordToObjectImpl<T>;
    summaryMap: RecordToSummaryImpl<T>;
  }) {
    this.#tableName = tableName;
    this.#objectMap = objectMap;
    this.#summaryMap = summaryMap;
  }

  /**
   * Maps a database record to a partial object of type T.
   * Set in constructor
   *
   * @type {(record: Record<string, unknown>) => Partial<T>}
   */
  protected get mapRecordToSummary(): RecordToSummaryImpl<T> {
    return this.#summaryMap;
  }

  /**
   * Gets the mapping function that converts a record to an object of type `T`.
   *
   * @returns {RecordToObjectImpl<T>} The function that maps a record to an object.
   */
  protected get mapRecordToObject(): RecordToObjectImpl<T> {
    return this.#objectMap;
  }

  /**
   * Gets the name of the table associated with this repository.
   *
   * @returns {string} The name of the table.
   */
  protected get tableName(): string {
    return this.#tableName;
  }
  /**
   * Gets the source string for the repository.
   * The source string is generated by taking the `tableName` property,
   * capitalizing the first letter, and appending "Repository" to the rest of the word.
   *
   * @returns {string} The formatted source string for the repository.
   */
  protected get source(): string {
    const restOfWord = this.tableName.slice(1);
    return `${this.tableName[0].toUpperCase()}${restOfWord}Repository`;
  }

  /**
   * Forwards a call to the database using the provided SQL query function.
   *
   * @template ArrayMode - Indicates if the result should be an array.
   * @template FullResults - Indicates if the full results should be returned.
   * @param sql - The SQL query function to execute.
   * @param sqlQuery - The SQL query string or template strings array.
   * @param values - The values to be used in the SQL query.
   * @returns The result of the SQL query execution.
   */
  protected forwardCallToDb = <
    ArrayMode extends boolean,
    FullResults extends boolean,
  >(
    sql: DbQueryFunction<ArrayMode, FullResults>,
    sqlQuery: string | TemplateStringsArray,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    values: Array<any>,
  ) => {
    return isTemplateStringsArray(sqlQuery)
      ? sql(sqlQuery, ...values)
      : sql(sqlQuery, values);
  };

  /**
   * Retrieves a paginated list of partial objects of type T.
   *
   * @template T - The type of the objects being retrieved.
   * @param getData - A function that fetches the data. It takes three parameters:
   *   - `num`: The number of items to retrieve.
   *   - `page`: The current page number.
   *   - `offset`: The offset from which to start retrieving items.
   *   The function returns a promise that resolves to an array of partial objects of type T.
   * @param getDataCount - A function that fetches the total count of records. It returns a promise that resolves to an array of records.
   * @param pagination - Optional pagination statistics. If not provided, default values will be used.
   * @returns A promise that resolves to a `PaginatedResultset` containing the results and pagination statistics.
   * @throws Will log an error if the data retrieval fails.
   */
  protected async innerList(
    getData: (
      num: number,
      page: number,
      offset: number,
    ) => Promise<Array<Partial<T>>>,
    getDataCount: () => Promise<Record<string, unknown>[]>,
    pagination?: PaginationStats,
  ): Promise<PaginatedResultset<Partial<T>>> {
    const { num, page, offset } = parsePaginationStats(pagination);
    try {
      const results = await getData(num, page, offset);
      if (results.length >= num) {
        const total = await getDataCount();
        return {
          results,
          pageStats: {
            num,
            page,
            total: total[0].records as number,
          },
        };
      } else {
        return {
          results,
          pageStats: {
            num,
            page,
            total: offset + results.length,
          },
        };
      }
    } catch (error) {
      AbstractObjectRepository.logDatabaseError({ source: this.source, error });
    }
    return {
      results: [],
      pageStats: {
        num: 0,
        page: 0,
        total: 0,
      },
    };
  }

  /**
   * Executes a query and returns a single result if exactly one item is found.
   *
   * @template T - The type of the items being queried.
   * @param validateData - A function to validate the data before executing the query.
   * @param doQuery - A function that performs the query and returns a promise that resolves to an array of items of type T.
   * @returns A promise that resolves to an item of type T if exactly one item is found, otherwise null.
   * @throws Will log an error if the query fails.
   */
  protected async innerGet(
    validateData: () => void,
    doQuery: () => Promise<T[]>,
  ): Promise<T | null> {
    validateData();
    try {
      const result = await doQuery();
      return result.length === 1 ? result[0] : null;
    } catch (error) {
      AbstractObjectRepository.logDatabaseError({ source: this.source, error });
    }
  }

  /**
   * Updates a record in the database.
   *
   * @protected
   * @async
   * @param {Record<KId, unknown>} props - The properties of the record to update.
   * @param {() => void} validateData - A function to validate the data before updating.
   * @param {() => Promise<TransformedFullQueryResults<T>>} doQuery - A function that performs the update query and returns the result.
   * @returns {Promise<T>} The updated record.
   * @throws {DataIntegrityError} If the update fails due to no rows being affected.
   */
  protected async innerUpdate(
    validateData: () => void,
    doQuery: () => Promise<TransformedFullQueryResults<T>>,
  ) {
    validateData();
    try {
      const result = await doQuery();

      if (result.rowCount === 0) {
        throw new DataIntegrityError(
          `Failed to update "${this.tableName}" record`,
          {
            table: this.tableName,
          },
        );
      }
      log((l) =>
        l.verbose({
          message: `[[AUDIT]] -  ${this.tableName} updated:`,
          row: result.rows[0],
        }),
      );
      return result.rows[0];
    } catch (error) {
      AbstractObjectRepository.logDatabaseError({ source: this.source, error });
    }
  }

  /**
   * Creates a new record in the repository.
   *
   * @protected
   * @template T The type of the record to be created.
   * @param {() => void} validateData - A function to validate the data before creating the record.
   * @param {() => Promise<T[]>} doQuery - A function that performs the query to create the record and returns a promise that resolves to an array of created records.
   * @returns {Promise<T>} A promise that resolves to the created record.
   * @throws {DataIntegrityError} If the number of created records is not exactly one.
   */
  protected async innerCreate(
    validateData: () => void,
    doQuery: () => Promise<T[]>,
  ): Promise<T> {
    validateData();
    try {
      const result = await doQuery();
      log((l) =>
        l.verbose({
          message: `[[AUDIT]] -  ${this.tableName} record created:`,
          row: result[0],
        }),
      );
      if (result.length !== 1) {
        throw new DataIntegrityError(
          `Failed to create "${this.tableName}" record.`,
          {
            table: this.tableName,
          },
        );
      }
      return result[0];
    } catch (error) {
      AbstractObjectRepository.logDatabaseError({ source: this.source, error });
    }
  }

  /**
   * Deletes a record from the repository after validation and query execution.
   *
   * @protected
   * @param validate - A function to validate the deletion process.
   * @param doQuery - A function that executes the deletion query and returns the results.
   * @returns A promise that resolves to `true` if the deletion was successful, otherwise `false`.
   * @throws {DataIntegrityError} If the deletion query does not affect any rows.
   */
  protected async innerDelete(
    validate: () => void,
    doQuery: () => Promise<TransformedFullQueryResults<T>>,
  ): Promise<boolean> {
    validate();
    try {
      const results = await doQuery();
      if (results.rowCount === 0) {
        throw new DataIntegrityError(
          `Failed to delete from ${this.tableName}`,
          {
            table: this.tableName,
          },
        );
      }
      log((l) =>
        l.verbose({
          message: `[[AUDIT]] -  ${this.tableName} deleted a record.`,
        }),
      );
      return true;
    } catch (error) {
      if (!AbstractObjectRepository.logDatabaseError(this.source, error)) {
        throw error;
      }
    }
    return false;
  }
}
