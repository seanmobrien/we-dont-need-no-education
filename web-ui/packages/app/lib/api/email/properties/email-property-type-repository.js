import { lookupEmailPropertyCategory, lookupEmailPropertyType, } from '@/data-models/_utilities';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { BaseObjectRepository } from '../../_baseObjectRepository';
export const mapPropertyTypeRecordToObject = (record) => ({
    categoryId: Number(record.email_property_category_id),
    typeId: Number(record.document_property_type_id),
    name: String(record.property_name),
    createdOn: record.created_at instanceof Date
        ? record.created_at
        : new Date(String(record.created_at)),
});
export class EmailPropertyTypeRepository extends BaseObjectRepository {
    constructor() {
        super({
            tableName: 'email_property_type',
            idField: ['typeId', 'document_property_type_id'],
            objectMap: mapPropertyTypeRecordToObject,
            summaryMap: mapPropertyTypeRecordToObject,
        });
    }
    async listForCategory(categoryId, pagination = { page: 1, num: 1000, total: 1000 }) {
        const [, , sqlCountQuery] = this.getListQueryProperties();
        const values = [lookupEmailPropertyCategory(categoryId)];
        const sqlQuery = 'SELECT * FROM email_property_type WHERE email_property_category_id = $1';
        const results = await this.defaultListImpl({
            sqlQuery,
            values,
            sqlCountQuery,
        }, pagination);
        return results;
    }
    validate(method, obj) {
        const asModel = obj;
        if ('typeId' in asModel &&
            asModel.typeId &&
            typeof asModel.typeId !== 'number') {
            const parsedTypeId = lookupEmailPropertyType(asModel.typeId);
            if (parsedTypeId === -1) {
                throw new ValidationError({
                    field: 'typeId',
                    value: asModel.typeId,
                    source: 'EmailPropertyTypeRepository',
                });
            }
            asModel.typeId = parsedTypeId;
        }
        if ('categoryId' in asModel &&
            asModel.categoryId &&
            typeof asModel.categoryId !== 'number') {
            const parsedCategoryId = lookupEmailPropertyCategory(asModel.categoryId);
            if (parsedCategoryId === -1) {
                throw new ValidationError({
                    field: 'categoryId',
                    value: asModel.categoryId,
                    source: 'EmailPropertyTypeRepository',
                });
            }
            asModel.categoryId = parsedCategoryId;
        }
        switch (method) {
            case 'create':
                if (!asModel.categoryId || !asModel.name) {
                    throw new ValidationError({
                        field: 'typeId||At least one field is required for update',
                        source: 'EmailPropertyTypeRepository',
                    });
                }
                break;
            case 'update':
                if (!asModel.typeId || (!asModel.name && !asModel.categoryId)) {
                    throw new ValidationError({
                        field: 'typeId||At least one field is required for update',
                        source: 'EmailPropertyTypeRepository',
                    });
                }
                break;
            default:
                break;
        }
    }
    getListQueryProperties() {
        return [
            `SELECT * FROM email_property_type ORDER BY email_property_category_id`,
            [],
            `SELECT COUNT(*) as records FROM email_property_type`,
        ];
    }
    getQueryProperties(recordId) {
        return [
            'SELECT * FROM email_property_type WHERE document_property_type_id = $1',
            [recordId],
        ];
    }
    getCreateQueryProperties({ name, categoryId, createdOn, }) {
        return [
            `INSERT INTO email_property_type (property_name, email_property_category_id, created_at) VALUES ($1, $2, $3) RETURNING *`,
            [name, categoryId, createdOn],
        ];
    }
    getUpdateQueryProperties({ categoryId, name, createdOn, }) {
        return [
            {
                email_property_category_id: Number(categoryId),
                property_name: String(name),
                created_at: !!createdOn
                    ? createdOn instanceof Date
                        ? createdOn
                        : new Date(String(createdOn))
                    : undefined,
            },
        ];
    }
}
//# sourceMappingURL=email-property-type-repository.js.map