import { drizDb, type DatabaseType } from '@/lib/drizzle-db';
import { ObjectRepository, DrizzleRepositoryConfig, IObjectRepositoryExt } from './_types';
import { PaginatedResultset, PaginationStats } from '@/data-models';
import { PartialExceptFor } from '@/lib/typescript';
import { eq, count, SQL } from 'drizzle-orm';
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
  try {
    const tableConfig = getTableConfig(config.table);
    const tableName = config.tableName || tableConfig.name;
    
    // Find the primary key column
    const primaryKeyColumns = tableConfig.columns.filter(col => col.primary);
    
    if (primaryKeyColumns.length === 0) {
      throw new Error(`No primary key found in table ${tableName}`);
    }
    
    if (primaryKeyColumns.length > 1) {
      throw new Error(`Multiple primary keys found in table ${tableName}. Please specify idColumn and idField manually.`);
    }
    
    const primaryKeyColumn = primaryKeyColumns[0];
    
    // Convert snake_case database column name to camelCase field name
    const databaseColumnName = primaryKeyColumn.name;
    const camelCaseFieldName = databaseColumnName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    
    return {
      idColumn: primaryKeyColumn,
      idField: camelCaseFieldName as KId
    };
  } catch (error) {
    const tableName = config.tableName || getTableConfig(config.table).name;
    throw new Error(
      `Unable to auto-detect primary key for table ${tableName}. ` +
      `Please provide idColumn and idField explicitly in the config. ` +
      `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
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
  protected readonly db: DatabaseType;
  protected readonly config: DrizzleRepositoryConfig<T, KId>;
  protected readonly idColumn: PgColumn;
  protected readonly idField: KId;
  protected readonly tableName: string;

  constructor(config: DrizzleRepositoryConfig<T, KId>) {
    this.db = drizDb();
    this.config = config;
    
    // Auto-detect table name if not provided
    this.tableName = config.tableName || getTableConfig(config.table).name;
    
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
      l.silly(`Validating ${String(method)} operation`, { obj, tableName: this.tableName }),
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

      // Get the query conditions from subclasses (if any)
      const queryConditions = this.buildQueryConditions();

      // Build count query with the same conditions
      const countQueryBase = this.db.select({ count: count() }).from(this.config.table);
      const countQuery = queryConditions ? countQueryBase.where(queryConditions) : countQueryBase;

      // Build data query with the same conditions
      const dataQueryBase = this.db.select().from(this.config.table);
      const dataQuery = queryConditions ? dataQueryBase.where(queryConditions) : dataQueryBase;

      // Execute both queries
      const [{ count: totalCount }] = await countQuery;
      const records = await dataQuery.offset(offset).limit(num);

      const results = records.map(this.config.summaryMapper);

      log((l) =>
        l.verbose({
          message: `[[AUDIT]] - ${this.tableName} list:`,
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
          message: `[[AUDIT]] - ${this.tableName} record retrieved:`,
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
        throw new Error(`Failed to create ${this.tableName} record`);
      }

      const result = this.config.recordMapper(records[0]);

      log((l) =>
        l.verbose({
          message: `[[AUDIT]] - ${this.tableName} record created:`,
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
        throw new Error(`${this.tableName} record not found for update`);
      }

      if (records.length > 1) {
        throw new Error(`Multiple ${this.tableName} records updated`);
      }

      const result = this.config.recordMapper(records[0]);

      log((l) =>
        l.verbose({
          message: `[[AUDIT]] - ${this.tableName} record updated:`,
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
          message: `[[AUDIT]] - ${this.tableName} record deleted:`,
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
  innerQuery<TRet>(query: (repo: IObjectRepositoryExt<T>) => TRet): TRet {
    // For Drizzle repositories, we simplify this interface by casting to the expected type
    return query(this as unknown as IObjectRepositoryExt<T>);
  }

  /**
   * Builds the query conditions for list operations.
   * Override this method in subclasses to add filtering logic.
   * This single method ensures perfect consistency between count and data results.
   * 
   * Example usage:
   * ```typescript
   * protected buildQueryConditions(): SQL | undefined {
   *   // Apply filters based on repository state or parameters
   *   if (this.emailId) {
   *     return eq(this.config.table.emailId, this.emailId);
   *   }
   *   if (this.statusFilter) {
   *     return eq(this.config.table.status, this.statusFilter);
   *   }
   *   return undefined; // No filtering
   * }
   * ```
   * 
   * @returns Query conditions that will be applied to both count and data queries
   */
  protected buildQueryConditions(): SQL | undefined {
    // By default, no additional conditions (return all records)
    return undefined;
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
      source: `${this.tableName}DrizzleRepository::${operation}`,
    });
  }
}