import { log } from '@compliance-theater/logger';
import { query, queryExt } from '@compliance-theater/database/driver';
import { snakeToCamel } from 'google-auth-library/build/src/util';
import { AbstractObjectRepository } from './abstractObjectRepository';
export class BaseObjectRepository extends AbstractObjectRepository {
    objectIdField;
    tableIdField;
    constructor({ tableName, idField, objectMap, summaryMap, }) {
        super({ tableName, objectMap, summaryMap });
        if (Array.isArray(idField)) {
            this.objectIdField = idField[0];
            this.tableIdField = idField[1];
        }
        else {
            this.objectIdField = idField;
            this.tableIdField = snakeToCamel(idField.toString());
        }
    }
    get objectId() {
        return this.objectIdField;
    }
    getListQueryProperties() {
        throw new Error('Method not implemented.');
    }
    getCreateQueryProperties({}) {
        throw new Error('Method not implemented.');
    }
    getQueryProperties({}) {
        throw new Error('Method not implemented.');
    }
    getUpdateQueryProperties({}) {
        throw new Error('Method not implemented.');
    }
    async list(pagination) {
        const queryProps = this.getListQueryProperties();
        const [sqlQuery, values, sqlCountQuery] = Array.isArray(queryProps)
            ? queryProps
            : await queryProps;
        return await this.defaultListImpl({ sqlQuery, values, sqlCountQuery }, pagination);
    }
    defaultListImpl({ sqlCountQuery, sqlQuery, values, }, pagination) {
        return this.innerList(() => query((sql) => this.forwardCallToDb(sql, sqlQuery, values), {
            transform: this.mapRecordToSummary,
        }), () => query((sql) => this.forwardCallToDb(sql, sqlCountQuery, values)), pagination);
    }
    get(recordId) {
        return this.innerGet(() => this.validate('get', recordId), async () => {
            const qp = this.getQueryProperties(recordId);
            const [sqlImp, sqlArgs] = Array.isArray(qp) ? qp : await qp;
            return await query((sql) => this.forwardCallToDb(sql, sqlImp, sqlArgs), {
                transform: this.mapRecordToObject,
            });
        });
    }
    create(props) {
        return this.innerCreate(() => this.validate('create', props), () => {
            const [sqlImp, sqlArgs] = this.getCreateQueryProperties(props);
            return query((sql) => this.forwardCallToDb(sql, sqlImp, sqlArgs), {
                transform: this.mapRecordToObject,
            });
        });
    }
    update(props) {
        return this.innerUpdate(() => this.validate('update', props), () => {
            const [fieldMap] = this.getUpdateQueryProperties(props);
            const updateFields = [];
            const values = [];
            let paramIndex = 1;
            Object.entries(fieldMap).forEach(([key, value]) => {
                if (value !== undefined) {
                    updateFields.push(`"${key}" = $${paramIndex++}`);
                    values.push(value);
                }
            });
            values.push(props[this.objectIdField]);
            const ret = queryExt((sql) => sql(`UPDATE ${this.tableName} SET ${updateFields.join(', ')} WHERE "${String(this.tableIdField)}" = $${paramIndex} RETURNING *`.toString(), values), { transform: this.mapRecordToObject });
            return this.postProcessUpdate({ updateQuery: ret, props });
        });
    }
    postProcessUpdate({ updateQuery, }) {
        return updateQuery;
    }
    delete(recordId) {
        return this.innerDelete(() => this.validate('delete', recordId), () => {
            const sqlImpl = `DELETE FROM ${this.tableName} 
          WHERE ${String(this.tableIdField)}=$1`.toString();
            return queryExt((sql) => sql(sqlImpl, [recordId]));
        });
    }
    validate(method, obj) {
        log((l) => l.silly(`Using ${method} so the squigglies leave me alone...`, obj));
    }
    innerQuery(query) {
        return query({
            list: this.innerList.bind(this),
            get: this.innerGet.bind(this),
            create: this.innerCreate.bind(this),
            update: this.innerUpdate.bind(this),
            delete: this.innerDelete.bind(this),
        });
    }
}
//# sourceMappingURL=_baseObjectRepository.js.map