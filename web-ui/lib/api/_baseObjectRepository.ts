import { PaginationStats, PaginatedResultset } from '@/data-models';
import { log } from '../logger';
import { query, queryExt } from '../neondb';
import { FirstParameter, PartialExceptFor } from '../typescript';
import {
  ObjectRepository,
  RecordToObjectImpl,
  RecordToSummaryImpl,
} from './_types';
import { snakeToCamel } from 'google-auth-library/build/src/util';
import { AbstractObjectRepository } from './abstractObjectRepository';

/**
 * BaseObjectRepository is a generic class that provides basic CRUD operations for objects of type T.
 * It implements the ObjectRepository interface and provides methods for listing, getting, creating,
 * updating, and deleting records in a database.
 *
 * @template T - The type of the objects managed by this repository.
 * @template KId - The type of the key field in the objects managed by this repository.
 *
 * @implements {ObjectRepository<T, KId>}
 */
export class BaseObjectRepository<T extends object, KId extends keyof T>
  extends AbstractObjectRepository<T>
  implements ObjectRepository<T, KId>
{
  protected readonly objectIdField: KId;
  protected readonly tableIdField: string;

  constructor({
    tableName,
    idField,
    objectMap,
    summaryMap,
  }: {
    tableName: string;
    idField: KId | [KId, string];
    objectMap: RecordToObjectImpl<T>;
    summaryMap: RecordToSummaryImpl<T>;
  }) {
    super({ tableName, objectMap, summaryMap });
    if (Array.isArray(idField)) {
      this.objectIdField = idField[0];
      this.tableIdField = idField[1];
    } else {
      this.objectIdField = idField;
      this.tableIdField = snakeToCamel(idField.toString());
    }
  }

  /**
   * Gets the list query properties.
   *
   * This method should be overridden in derived classes to provide the necessary
   * query properties for listing objects. The returned value is a tuple containing
   * template strings arrays and an array of any type.
   *
   * @throws {Error} Method not implemented.
   *
   * @returns {[
   *   TemplateStringsArray,
   *   Array<any>,
   *   TemplateStringsArray
   * ]} The list query properties.
   */
  protected getListQueryProperties(): [
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array<any>,
    string
  ] {
    throw new Error('Method not implemented.');
  }

  /**
   * Gets the properties required to create a query.
   *
   * @returns A tuple containing a `TemplateStringsArray` and an array of any type.
   * @throws An error indicating that the method is not implemented.
   */
  protected getCreateQueryProperties({}: FirstParameter<
    ObjectRepository<T, KId>['create']
  >): [
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array<any>
  ] {
    throw new Error('Method not implemented.');
  }

  /**
   * Retrieves the query properties.
   *
   * @returns A tuple containing a TemplateStringsArray and an array of any type.
   * @throws Error if the method is not implemented.
   */
  protected getQueryProperties({}: FirstParameter<
    ObjectRepository<T, KId>['get']
  >): [
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array<any>
  ] {
    throw new Error('Method not implemented.');
  }

  /**
   * Gets the properties required to update a query.
   *
   * @returns {Record<string, any>} An object containing the properties for the update query.
   * @throws {Error} Throws an error if the method is not implemented.
   */
  protected getUpdateQueryProperties({}: FirstParameter<
    ObjectRepository<T, KId>['update']
  >): [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Record<string, any>
  ] {
    throw new Error('Method not implemented.');
  }

  list(pagination?: PaginationStats): Promise<PaginatedResultset<Partial<T>>> {
    const [sqlQuery, values, sqlCountQuery] = this.getListQueryProperties();
    return this.defaultListImpl(
      { sqlQuery, values, sqlCountQuery },
      pagination
    );
  }
  defaultListImpl(
    {
      sqlCountQuery,
      sqlQuery,
      values,
    }: {
      sqlQuery: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      values: Array<any>;
      sqlCountQuery: string;
    },
    pagination?: PaginationStats
  ): Promise<PaginatedResultset<Partial<T>>> {
    return this.innerList(
      () =>
        query(
          (sql) => this.forwardCallToDb<false, false>(sql, sqlQuery, values),
          {
            transform: this.mapRecordToSummary,
          }
        ),
      () =>
        query((sql) =>
          this.forwardCallToDb<false, false>(sql, sqlCountQuery, values)
        ),
      pagination
    );
  }

  get(recordId: T[KId]): Promise<T | null> {
    return this.innerGet(
      () => this.validate('get', recordId),
      () => {
        const [sqlImp, sqlArgs] = this.getQueryProperties(recordId);
        return query(
          (sql) => this.forwardCallToDb<false, false>(sql, sqlImp, sqlArgs),
          {
            transform: this.mapRecordToObject,
          }
        );
      }
    );
  }

  create(props: Omit<T, KId>): Promise<T> {
    return this.innerCreate(
      () => this.validate('create', props),
      () => {
        const [sqlImp, sqlArgs] = this.getCreateQueryProperties(props);
        return query(
          (sql) => this.forwardCallToDb<false, false>(sql, sqlImp, sqlArgs),
          {
            transform: this.mapRecordToObject,
          }
        );
      }
    );
  }

  update(props: PartialExceptFor<T, KId>): Promise<T> {
    return this.innerUpdate(
      () => this.validate('update', props),
      () => {
        const [fieldMap] = this.getUpdateQueryProperties(props);
        const updateFields: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;
        Object.entries(fieldMap).forEach(([key, value]) => {
          if (value !== undefined) {
            updateFields.push(`${key} = $${paramIndex++}`);
            values.push(value);
          }
        });
        values.push(props[this.objectIdField]);
        return queryExt(
          (sql) =>
            sql<false, true>(
              `UPDATE ${this.tableName} SET ${updateFields.join(
                ', '
              )} WHERE ${String(
                this.tableIdField
              )} = $${paramIndex} RETURNING *`.toString(),
              values
            ),
          { transform: this.mapRecordToObject }
        );
      }
    );
  }

  delete(recordId: T[KId]): Promise<boolean> {
    return this.innerDelete(
      () => this.validate('delete', recordId),
      () => {
        const sqlImpl = `DELETE FROM ${this.tableName} 
          WHERE ${String(this.tableIdField)}=$1`.toString();
        return queryExt<T>((sql) => sql<false, true>(sqlImpl, [recordId]));
      }
    );
  }

  /**
   * Validates the given object using the specified method.
   * This is a no-op by default but can be overridden in subclasses.
   *
   * @template TMethod - The type of the method in the ObjectRepository.
   * @param method - The method to use for validation.
   * @param obj - The object to validate, which is the first parameter of the specified method.
   */
  validate<TMethod extends keyof ObjectRepository<T, KId>>(
    method: TMethod,
    obj: FirstParameter<Pick<ObjectRepository<T, KId>, TMethod>[TMethod]>
  ): void {
    // NO-OP, but can be overridden
    log((l) =>
      l.silly(`Using ${method} so the squigglies leave me alone...`, obj)
    );
  }
}
