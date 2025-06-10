import { db, type Database } from '@/lib/drizzle-db';
import { ObjectRepository, DrizzleRepositoryConfig } from './_types';
import { PaginatedResultset, PaginationStats } from '@/data-models';
import { PartialExceptFor } from '@/lib/typescript';
import { eq, count } from 'drizzle-orm';
import { LoggedError } from '@/lib/react-util';
import { log } from '@/lib/logger';
import { getTableConfig } from 'drizzle-orm/pg-core';
import { PgColumn } from 'drizzle-orm/pg-core';

/**
 * Helper function to detect primary key column and field name from a Drizzle table schema
 */
function detectPrimaryKey<T extends object, KId extends keyof T>(
  config: DrizzleRepositoryConfig<T, KId>
): { idColumn: PgColumn; idField: KId } {
  const tableConfig = getTableConfig(config.table);
  
  // Find the primary key column
  const primaryKeyColumns = tableConfig.columns.filter(col => col.primary);
  
  if (primaryKeyColumns.length === 0) {
    throw new Error(`No primary key found in table ${config.tableName}`);
  }
  
  if (primaryKeyColumns.length > 1) {
    throw new Error(`Multiple primary keys found in table ${config.tableName}. Please specify idColumn and idField manually.`);
  }
  
  const primaryKeyColumn = primaryKeyColumns[0];
  
  // Convert snake_case database column name to camelCase field name
  const databaseColumnName = primaryKeyColumn.name;
  const camelCaseFieldName = databaseColumnName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  
  return {
    idColumn: primaryKeyColumn,
    idField: camelCaseFieldName as KId
  };
}

/**
 * BaseDrizzleRepository is a generic class that provides basic CRUD operations for objects of type T
 * using Drizzle ORM. It implements the ObjectRepository interface and provides methods for listing,
 * getting, creating, updating, and deleting records in a database.
 *
 * @template T - The type of the objects managed by this repository.
 * @template KId - The type of the key field in the objects managed by this repository.
 *
 * @implements {ObjectRepository<T, KId>}
 */
export abstract class BaseDrizzleRepository<T extends object, KId extends keyof T>
  implements ObjectRepository<T, KId>
{
  protected readonly db: Database;
  protected readonly config: DrizzleRepositoryConfig<T, KId>;
  protected readonly idColumn: PgColumn;
  protected readonly idField: KId;

  constructor(config: DrizzleRepositoryConfig<T, KId>) {
    this.db = db;
    this.config = config;
    
    // Auto-detect primary key if not provided
    if (!config.idColumn || !config.idField) {
      const detected = detectPrimaryKey(config);
      this.idColumn = config.idColumn || detected.idColumn;
      this.idField = config.idField || detected.idField;
    } else {
      this.idColumn = config.idColumn;
      this.idField = config.idField;
    }
  }

  /**
   * Validates the input for a specific repository method.
   * Override this method in subclasses to provide custom validation.
   */
  protected validate<TMethod extends keyof ObjectRepository<T, KId>>(
    method: TMethod,
    obj: Record<string, unknown>,
  ): void {
    // NO-OP by default, can be overridden
    log((l) =>
      l.silly(`Validating ${String(method)} operation`, { obj, tableName: this.config.tableName }),
    );
  }

  /**
   * Retrieves a paginated list of objects.
   */
  async list(pagination?: PaginationStats): Promise<PaginatedResultset<Partial<T>>> {
    try {
      const page = pagination?.page ?? 1;
      const num = pagination?.num ?? 10;
      const offset = (page - 1) * num;

      // Build count query with any filters that subclasses may apply
      const countQuery = this.buildCountQuery();

      // Build data query with any filters that subclasses may apply  
      const dataQuery = this.buildDataQuery();

      // Get total count
      const [{ count: totalCount }] = await countQuery;

      // Get paginated data
      const records = await dataQuery.offset(offset).limit(num);

      const results = records.map(this.config.summaryMapper);

      log((l) =>
        l.verbose({
          message: `[[AUDIT]] - ${this.config.tableName} list:`,
          result: results,
          num,
          offset,
        }),
      );

      return {
        results,
        pageStats: {
          total: totalCount,
          page,
          num,
        },
      };
    } catch (error) {
      this.logDatabaseError('list', error);
      throw error;
    }
  }

  /**
   * Retrieves a single object by its unique identifier.
   */
  async get(recordId: T[KId]): Promise<T | null> {
    try {
      this.validate('get', { [this.idField]: recordId });

      const records = await this.db
        .select()
        .from(this.config.table)
        .where(eq(this.idColumn, recordId as string | number));

      if (records.length === 0) {
        return null;
      }

      if (records.length > 1) {
        throw new Error(`Multiple records found for ${String(this.idField)}: ${recordId}`);
      }

      const result = this.config.recordMapper(records[0]);

      log((l) =>
        l.verbose({
          message: `[[AUDIT]] - ${this.config.tableName} record retrieved:`,
          result,
        }),
      );

      return result;
    } catch (error) {
      this.logDatabaseError('get', error);
      throw error;
    }
  }

  /**
   * Creates a new object.
   */
  async create(model: Omit<T, KId>): Promise<T> {
    try {
      this.validate('create', model);

      const insertData = this.prepareInsertData(model);
      const records = await this.db
        .insert(this.config.table)
        .values(insertData)
        .returning();

      if (records.length !== 1) {
        throw new Error(`Failed to create ${this.config.tableName} record`);
      }

      const result = this.config.recordMapper(records[0]);

      log((l) =>
        l.verbose({
          message: `[[AUDIT]] - ${this.config.tableName} record created:`,
          result,
        }),
      );

      return result;
    } catch (error) {
      this.logDatabaseError('create', error);
      throw error;
    }
  }

  /**
   * Updates an existing object.
   */
  async update(model: PartialExceptFor<T, KId> & Required<Pick<T, KId>>): Promise<T> {
    try {
      this.validate('update', model);

      const updateData = this.prepareUpdateData(model);
      const records = await this.db
        .update(this.config.table)
        .set(updateData)
        .where(eq(this.idColumn, model[this.idField] as string | number))
        .returning();

      if (records.length === 0) {
        throw new Error(`${this.config.tableName} record not found for update`);
      }

      if (records.length > 1) {
        throw new Error(`Multiple ${this.config.tableName} records updated`);
      }

      const result = this.config.recordMapper(records[0]);

      log((l) =>
        l.verbose({
          message: `[[AUDIT]] - ${this.config.tableName} record updated:`,
          result,
        }),
      );

      return result;
    } catch (error) {
      this.logDatabaseError('update', error);
      throw error;
    }
  }

  /**
   * Deletes an object by its unique identifier.
   */
  async delete(recordId: T[KId]): Promise<boolean> {
    try {
      this.validate('delete', { [this.idField]: recordId });

      const records = await this.db
        .delete(this.config.table)
        .where(eq(this.idColumn, recordId as string | number))
        .returning();

      if (records.length === 0) {
        return false;
      }

      const result = this.config.recordMapper(records[0]);

      log((l) =>
        l.verbose({
          message: `[[AUDIT]] - ${this.config.tableName} record deleted:`,
          result,
        }),
      );

      return true;
    } catch (error) {
      this.logDatabaseError('delete', error);
      throw error;
    }
  }

  /**
   * Inner query method for accessing repository functionality.
   * Note: This is a simplified implementation for Drizzle compatibility.
   */
  innerQuery<TRet>(query: (repo: BaseDrizzleRepository<T, KId>) => TRet): TRet {
    // For Drizzle repositories, we simplify this interface
    return query(this);
  }

  /**
   * Builds the count query for list operations.
   * Override this method in subclasses to add filtering logic.
   * This ensures the count query uses the same filters as the data query.
   * 
   * @returns Count query with same filters as data query
   */
  protected buildCountQuery() {
    return this.db.select({ count: count() }).from(this.config.table);
  }

  /**
   * Builds the data query for list operations.
   * Override this method in subclasses to add filtering logic.
   * This ensures the data query uses the same filters as the count query.
   * 
   * @returns Data query with same filters as count query
   */
  protected buildDataQuery() {
    return this.db.select().from(this.config.table);
  }

  /**
   * Prepares data for insert operations.
   * Override this method to customize how domain objects are mapped to database inserts.
   */
  protected abstract prepareInsertData(model: Omit<T, KId>): Record<string, unknown>;

  /**
   * Prepares data for update operations.
   * Override this method to customize how domain objects are mapped to database updates.
   */
  protected abstract prepareUpdateData(model: Partial<T>): Record<string, unknown>;

  /**
   * Logs database errors with consistent formatting.
   */
  protected logDatabaseError(operation: string, error: unknown): void {
    LoggedError.isTurtlesAllTheWayDownBaby(error, {
      log: true,
      source: `${this.config.tableName}DrizzleRepository::${operation}`,
    });
  }
}