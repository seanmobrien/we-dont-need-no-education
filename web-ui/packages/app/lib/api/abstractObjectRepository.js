import { isTemplateStringsArray } from '@/lib/react-util/utility-methods';
import { isError, log } from '@compliance-theater/logger';
import { ValidationError } from '../react-util';
import { DataIntegrityError } from '../react-util/errors/data-integrity-error';
import { LoggedError } from '@compliance-theater/logger';
import { parsePaginationStats } from '@/lib/components/mui/data-grid/queryHelpers/utility';
export class AbstractObjectRepository {
    static logDatabaseError(paramsOrSource, errorFromArgs) {
        let error;
        let source;
        if (typeof paramsOrSource === 'string') {
            source = paramsOrSource;
            error = errorFromArgs;
        }
        else {
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
            shouldLog: true,
            source,
            message: '[AUDIT] A database operation failed',
        });
    }
    #tableName;
    #objectMap;
    #summaryMap;
    constructor({ tableName, objectMap, summaryMap, }) {
        this.#tableName = tableName;
        this.#objectMap = objectMap;
        this.#summaryMap = summaryMap;
    }
    get mapRecordToSummary() {
        if (typeof this.#summaryMap === 'string') {
            if (this.#summaryMap in this) {
                return this[this.#summaryMap];
            }
            throw new Error(`The summary map "${this.#summaryMap}" is not a valid function.`);
        }
        return this.#summaryMap;
    }
    get mapRecordToObject() {
        if (typeof this.#objectMap === 'string') {
            if (this.#objectMap in this) {
                return this[this.#objectMap];
            }
            throw new Error(`The object map "${this.#objectMap}" is not a valid function.`);
        }
        return this.#objectMap;
    }
    get tableName() {
        return this.#tableName;
    }
    get source() {
        const restOfWord = this.tableName.slice(1);
        return `${this.tableName[0].toUpperCase()}${restOfWord}Repository`;
    }
    forwardCallToDb = (sql, sqlQuery, values) => {
        values = values?.map((x) => (x instanceof Date ? x.toISOString() : x));
        return isTemplateStringsArray(sqlQuery)
            ? sql(sqlQuery, ...values)
            : sql(sqlQuery, values);
    };
    async innerList(getData, getDataCount, pagination) {
        const { num, page, offset, filter, sort } = parsePaginationStats(pagination);
        try {
            const results = await getData(num, page, offset, sort, filter);
            if (results.length >= num) {
                const totalRecord = await getDataCount(filter);
                let total = 0;
                if (totalRecord.length > 0) {
                    if ('records' in totalRecord[0])
                        total = Number(totalRecord[0].records);
                    else
                        total = Number(Object.values(totalRecord[0])[0]);
                }
                else {
                    total = 0;
                }
                return {
                    results,
                    pageStats: {
                        num,
                        page,
                        total,
                    },
                };
            }
            else {
                return {
                    results,
                    pageStats: {
                        num,
                        page,
                        total: offset + results.length,
                    },
                };
            }
        }
        catch (error) {
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
    async innerGet(validateData, doQuery) {
        validateData();
        try {
            const result = await doQuery();
            return result.length === 1 ? result[0] : null;
        }
        catch (error) {
            AbstractObjectRepository.logDatabaseError({ source: this.source, error });
        }
    }
    async innerUpdate(validateData, doQuery) {
        validateData();
        try {
            const result = await doQuery();
            if (result.rowCount === 0) {
                throw new DataIntegrityError(`Failed to update "${this.tableName}" record`, {
                    table: this.tableName,
                });
            }
            log((l) => l.verbose({
                message: `[[AUDIT]] -  ${this.tableName} updated:`,
                row: result.rows[0],
            }));
            return result.rows[0];
        }
        catch (error) {
            AbstractObjectRepository.logDatabaseError({ source: this.source, error });
        }
    }
    async innerCreate(validateData, doQuery) {
        validateData();
        try {
            const result = await doQuery();
            log((l) => l.verbose({
                message: `[[AUDIT]] -  ${this.tableName} record created:`,
                row: result[0],
            }));
            if (result.length !== 1) {
                throw new DataIntegrityError(`Failed to create "${this.tableName}" record.`, {
                    table: this.tableName,
                });
            }
            return result[0];
        }
        catch (error) {
            AbstractObjectRepository.logDatabaseError({ source: this.source, error });
        }
    }
    async innerDelete(validate, doQuery) {
        validate();
        try {
            const results = await doQuery();
            if (results.rowCount === 0) {
                throw new DataIntegrityError(`Failed to delete from ${this.tableName}`, {
                    table: this.tableName,
                });
            }
            log((l) => l.verbose({
                message: `[[AUDIT]] -  ${this.tableName} deleted a record.`,
            }));
            return true;
        }
        catch (error) {
            if (!AbstractObjectRepository.logDatabaseError(this.source, error)) {
                throw error;
            }
        }
        return false;
    }
}
//# sourceMappingURL=abstractObjectRepository.js.map