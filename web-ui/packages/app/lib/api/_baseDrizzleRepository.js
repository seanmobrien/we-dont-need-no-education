import { drizDbWithInit } from '@compliance-theater/database/orm';
import { unwrapPromise, } from '@compliance-theater/typescript';
import { eq, count } from 'drizzle-orm';
import { LoggedError, log } from '@compliance-theater/logger';
import { getTableConfig } from 'drizzle-orm/pg-core';
function detectPrimaryKey(config) {
    try {
        const tableConfig = getTableConfig(config.table);
        const tableName = config.tableName || tableConfig.name;
        const primaryKeyColumns = tableConfig.columns.filter((col) => col.primary);
        if (primaryKeyColumns.length === 0) {
            throw new Error(`No primary key found in table ${tableName}`);
        }
        if (primaryKeyColumns.length > 1) {
            throw new Error(`Multiple primary keys found in table ${tableName}. Please specify idColumn and idField manually.`);
        }
        const primaryKeyColumn = primaryKeyColumns[0];
        const databaseColumnName = primaryKeyColumn.name;
        const camelCaseFieldName = databaseColumnName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        return {
            idColumn: primaryKeyColumn,
            idField: camelCaseFieldName,
        };
    }
    catch (error) {
        const tableName = config.tableName || getTableConfig(config.table).name;
        throw new Error(`Unable to auto-detect primary key for table ${tableName}. ` +
            `Please provide idColumn and idField explicitly in the config. ` +
            `Error: ${error instanceof Error ? error.message : String(error)}`);
    }
}
export class BaseDrizzleRepository {
    config;
    idColumn;
    idField;
    tableName;
    constructor(config) {
        this.config = config;
        this.tableName = config.tableName || getTableConfig(config.table).name;
        if (!config.idColumn || !config.idField) {
            const detected = detectPrimaryKey(config);
            this.idColumn = config.idColumn || detected.idColumn;
            this.idField = config.idField || detected.idField;
        }
        else {
            this.idColumn = config.idColumn;
            this.idField = config.idField;
        }
    }
    validate(method, obj) {
        log((l) => l.silly(`Validating ${String(method)} operation`, {
            obj,
            tableName: this.tableName,
        }));
        return Promise.resolve();
    }
    async list(pagination) {
        try {
            const page = pagination?.page ?? 1;
            const num = pagination?.num ?? 10;
            const offset = (page - 1) * num;
            const queryConditions = await unwrapPromise(this.buildQueryConditions());
            const validDb = await drizDbWithInit();
            const countQueryBase = validDb
                .select({ count: count() })
                .from(this.config.table);
            const countQuery = queryConditions
                ? countQueryBase.where(queryConditions)
                : countQueryBase;
            const dataQueryBase = validDb.select().from(this.config.table);
            const dataQuery = queryConditions
                ? dataQueryBase.where(queryConditions)
                : dataQueryBase;
            const [countRecords, results] = await Promise.all([
                countQuery.execute(),
                dataQuery
                    .offset(offset)
                    .limit(num)
                    .execute()
                    .then((x) => x.map(this.config.summaryMapper)),
            ]);
            const [{ count: totalCount }] = countRecords;
            log((l) => l.verbose({
                message: `[[AUDIT]] - ${this.tableName} list retrieved ${results.length} of ${totalCount} records.`,
                data: {
                    results,
                    totalCount,
                    page,
                    num,
                },
            }));
            return {
                results,
                pageStats: {
                    total: totalCount,
                    page,
                    num,
                },
            };
        }
        catch (error) {
            throw this.logDatabaseError('list', error);
        }
    }
    async get(recordId) {
        try {
            await unwrapPromise(this.validate('get', { [this.idField]: recordId }));
            const records = await drizDbWithInit((db) => db
                .select()
                .from(this.config.table)
                .where(eq(this.idColumn, recordId))
                .execute());
            if (records.length === 0) {
                return null;
            }
            if (records.length > 1) {
                throw new Error(`Multiple records found for ${String(this.idField)}: ${recordId}`);
            }
            const result = this.config.recordMapper(records[0]);
            log((l) => l.verbose({
                message: `[[AUDIT]] - ${this.tableName} record retrieved:`,
                resultset: result,
            }));
            return result;
        }
        catch (error) {
            const le = this.logDatabaseError('get', error);
            throw le;
        }
    }
    async create(model) {
        try {
            await unwrapPromise(this.validate('create', model));
            const insertData = await unwrapPromise(this.prepareInsertData(model));
            const records = await drizDbWithInit((db) => db.insert(this.config.table).values(insertData).returning());
            if (records.length !== 1) {
                throw new Error(`Failed to create ${this.tableName} record`);
            }
            const result = this.config.recordMapper(records[0]);
            log((l) => l.verbose({
                message: `[[AUDIT]] - ${this.tableName} record created:`,
                resultset: result,
            }));
            return result;
        }
        catch (error) {
            throw this.logDatabaseError('create', error);
        }
    }
    async update(model) {
        try {
            await unwrapPromise(this.validate('update', model));
            const updateData = await unwrapPromise(this.prepareUpdateData(model));
            const records = await drizDbWithInit((db) => db
                .update(this.config.table)
                .set(updateData)
                .where(eq(this.idColumn, model[this.idField]))
                .returning());
            if (records.length === 0) {
                throw new Error(`${this.tableName} record not found for update`);
            }
            if (records.length > 1) {
                throw new Error(`Multiple ${this.tableName} records updated`);
            }
            const result = this.config.recordMapper(records[0]);
            log((l) => l.verbose({
                message: `[[AUDIT]] - ${this.tableName} record updated:`,
                resultset: result,
            }));
            return result;
        }
        catch (error) {
            throw this.logDatabaseError('update', error);
        }
    }
    async delete(recordId) {
        try {
            await unwrapPromise(this.validate('delete', { [this.idField]: recordId }));
            const record = await drizDbWithInit((db) => db
                .delete(this.config.table)
                .where(eq(this.idColumn, recordId))
                .returning()
                .then((records) => records.at(0)));
            if (!record) {
                return false;
            }
            const result = this.config.recordMapper(record);
            log((l) => l.verbose({
                message: `[[AUDIT]] - ${this.tableName} record deleted:`,
                resultset: result,
            }));
            return true;
        }
        catch (error) {
            throw this.logDatabaseError('delete', error);
        }
    }
    innerQuery(query) {
        return query(this);
    }
    buildQueryConditions() {
        return undefined;
    }
    logDatabaseError(operation, error) {
        return LoggedError.isTurtlesAllTheWayDownBaby(error, {
            log: true,
            source: `${this.tableName}DrizzleRepository::${operation}`,
        });
    }
}
//# sourceMappingURL=_baseDrizzleRepository.js.map