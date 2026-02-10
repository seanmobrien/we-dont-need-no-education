import { PaginationStats, PaginatedResultset } from '@/data-models/_types';
import { log } from '@compliance-theater/logger';
import { query, queryExt, TransformedFullQueryResults } from '@/lib/neondb';
import {
  FirstParameter,
  PartialExceptFor,
} from '@compliance-theater/typescript';
import {
  IObjectRepositoryExt,
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
  /**
   * The name of the table in the database.
   * @type {string}
   */
  protected readonly objectIdField: KId;
  /**
   * The name of the key field in the database table.
   * @type {string}
   */
  protected readonly tableIdField: string;

  /**
   * Constructs a new instance of BaseObjectRepository.
   *
   * @param {string} tableName - The name of the table in the database.
   * @param {KId | [KId, string]} idField - The key field in the database table.
   * @param {RecordToObjectImpl<T>} objectMap - Function to map database records to objects.
   * @param {RecordToSummaryImpl<T>} summaryMap - Function to map database records to summaries.
   */
  constructor({
    tableName,
    idField,
    objectMap,
    summaryMap,
  }: {
    tableName: string;
    idField: KId | [KId, string];
    objectMap: RecordToObjectImpl<T> | string;
    summaryMap: RecordToSummaryImpl<T> | string;
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
   * Gets the unique identifier of the model object.
   *
   * @returns {KId} The unique identifier of the object.
   */
  public get objectId(): KId {
    return this.objectIdField;
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
   * @returns {[string, Array<any>, string]} The list query properties.
   */
  protected getListQueryProperties():
    | [
        string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Array<any>,
        string,
      ]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    | Promise<[string, Array<any>, string]> {
    throw new Error('Method not implemented.');
  }

  /**
   * Gets the properties required to create a query.
   *
   * @returns {[string, Array<any>]} A tuple containing a `TemplateStringsArray` and an array of any type.
   * @throws {Error} An error indicating that the method is not implemented.
   */
  protected getCreateQueryProperties({}: FirstParameter<
    ObjectRepository<T, KId>['create']
  >): [
    string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Array<any>,
  ] {
    throw new Error('Method not implemented.');
  }

  /**
   * Retrieves the query properties.
   *
   * @returns {[string, Array<any>]} A tuple containing a TemplateStringsArray and an array of any type.
   * @throws {Error} If the method is not implemented.
   */
  protected getQueryProperties({}: FirstParameter<
    ObjectRepository<T, KId>['get']
  >):
    | [
        string,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Array<any>,
      ]
    | Promise<
        [
          string,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Array<any>,
        ]
      > {
    throw new Error('Method not implemented.');
  }

  /**
   * Gets the properties required to update a query.
   *
   * @returns {[Record<string, any>]} An object containing the properties for the update query.
   * @throws {Error} Throws an error if the method is not implemented.
   */
  protected getUpdateQueryProperties({}: FirstParameter<
    ObjectRepository<T, KId>['update']
  >): [
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Record<string, any>,
  ] {
    throw new Error('Method not implemented.');
  }

  /**
   * Retrieves a list of items with optional pagination.
   *
   * @param {PaginationStats} [pagination] - Optional pagination parameters.
   * @returns {Promise<PaginatedResultset<Partial<T>>>} A promise that resolves to a paginated result set of partial items.
   */
  async list(
    pagination?: PaginationStats,
  ): Promise<PaginatedResultset<Partial<T>>> {
    const queryProps = this.getListQueryProperties();
    const [sqlQuery, values, sqlCountQuery] = Array.isArray(queryProps)
      ? queryProps
      : await queryProps;
    return await this.defaultListImpl(
      { sqlQuery, values, sqlCountQuery },
      pagination,
    );
  }

  /**
   * Default implementation for listing items with optional pagination.
   *
   * @param {Object} params - The parameters for the list query.
   * @param {string} params.sqlQuery - The SQL query string.
   * @param {Array<any>} params.values - The values for the SQL query.
   * @param {string} params.sqlCountQuery - The SQL count query string.
   * @param {PaginationStats} [pagination] - Optional pagination parameters.
   * @returns {Promise<PaginatedResultset<Partial<T>>>} A promise that resolves to a paginated result set of partial items.
   */
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
    pagination?: PaginationStats,
  ): Promise<PaginatedResultset<Partial<T>>> {
    return this.innerList(
      () =>
        query(
          (sql) => this.forwardCallToDb<false, false>(sql, sqlQuery, values),
          {
            transform: this.mapRecordToSummary,
          },
        ),
      () =>
        query((sql) =>
          this.forwardCallToDb<false, false>(sql, sqlCountQuery, values),
        ),
      pagination,
    );
  }

  /**
   * Retrieves an item by its ID.
   *
   * @param {T[KId]} recordId - The ID of the record to retrieve.
   * @returns {Promise<T | null>} A promise that resolves to the retrieved item or null if not found.
   */
  get(recordId: T[KId]): Promise<T | null> {
    return this.innerGet(
      () => this.validate('get', recordId),
      async () => {
        const qp = this.getQueryProperties(recordId);
        const [sqlImp, sqlArgs] = Array.isArray(qp) ? qp : await qp;
        return await query(
          (sql) => this.forwardCallToDb<false, false>(sql, sqlImp, sqlArgs),
          {
            transform: this.mapRecordToObject,
          },
        );
      },
    );
  }

  /**
   * Creates a new item.
   *
   * @param {Omit<T, KId>} props - The properties of the item to create.
   * @returns {Promise<T>} A promise that resolves to the created item.
   */
  create(props: Omit<T, KId>): Promise<T> {
    return this.innerCreate(
      () => this.validate('create', props),
      () => {
        const [sqlImp, sqlArgs] = this.getCreateQueryProperties(props);
        return query(
          (sql) => this.forwardCallToDb<false, false>(sql, sqlImp, sqlArgs),
          {
            transform: this.mapRecordToObject,
          },
        );
      },
    );
  }

  /**
   * Updates an existing item.
   *
   * @param {PartialExceptFor<T, KId>} props - The properties of the item to update.
   * @returns {Promise<T>} A promise that resolves to the updated item.
   */
  update(props: PartialExceptFor<T, KId> & Required<Pick<T, KId>>): Promise<T> {
    return this.innerUpdate(
      () => this.validate('update', props),
      () => {
        const [fieldMap] = this.getUpdateQueryProperties(props);
        const updateFields: string[] = [];
        const values: unknown[] = [];
        let paramIndex = 1;
        Object.entries(fieldMap).forEach(([key, value]) => {
          if (value !== undefined) {
            updateFields.push(`"${key}" = $${paramIndex++}`);
            values.push(value);
          }
        });
        values.push(props[this.objectIdField]);
        const ret = queryExt(
          (sql) =>
            sql<false, true>(
              `UPDATE ${this.tableName} SET ${updateFields.join(
                ', ',
              )} WHERE "${String(
                this.tableIdField,
              )}" = $${paramIndex} RETURNING *`.toString(),
              values,
            ),
          { transform: this.mapRecordToObject },
        );
        return this.postProcessUpdate({ updateQuery: ret, props });
      },
    );
  }

  /**
   * Override to append post-processing logic to the update query.
   * @param updateQuery Update query promise
   * @returns The updateQuery argument
   */
  protected postProcessUpdate({
    updateQuery,
  }: {
    props: PartialExceptFor<T, KId> & Required<Pick<T, KId>>;
    updateQuery: Promise<TransformedFullQueryResults<T>>;
  }): Promise<TransformedFullQueryResults<T>> {
    return updateQuery;
  }

  /**
   * Deletes an item by its ID.
   *
   * @param {T[KId]} recordId - The ID of the record to delete.
   * @returns {Promise<boolean>} A promise that resolves to true if the item was deleted, otherwise false.
   */
  delete(recordId: T[KId]): Promise<boolean> {
    return this.innerDelete(
      () => this.validate('delete', recordId),
      () => {
        const sqlImpl = `DELETE FROM ${this.tableName} 
          WHERE ${String(this.tableIdField)}=$1`.toString();
        return queryExt<T>((sql) => sql<false, true>(sqlImpl, [recordId]));
      },
    );
  }

  /**
   * Validates the given object using the specified method.
   * This is a no-op by default but can be overridden in subclasses.
   *
   * @template TMethod - The type of the method in the ObjectRepository.
   * @param {TMethod} method - The method to use for validation.
   * @param {FirstParameter<Pick<ObjectRepository<T, KId>, TMethod>[TMethod]>} obj - The object to validate, which is the first parameter of the specified method.
   */
  validate<TMethod extends keyof ObjectRepository<T, KId>>(
    method: TMethod,
    obj: FirstParameter<Pick<ObjectRepository<T, KId>, TMethod>[TMethod]>,
  ): void {
    // NO-OP, but can be overridden
    log((l) =>
      l.silly(`Using ${method} so the squigglies leave me alone...`, obj),
    );
  }

  innerQuery<TRet>(query: (repo: IObjectRepositoryExt<T>) => TRet): TRet {
    return query({
      list: this.innerList.bind(this),
      get: this.innerGet.bind(this),
      create: this.innerCreate.bind(this),
      update: this.innerUpdate.bind(this),
      delete: this.innerDelete.bind(this),
    });
  }
}
