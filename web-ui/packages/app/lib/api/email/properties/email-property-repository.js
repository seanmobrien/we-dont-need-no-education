import { EmailPropertyTypeTypeValues, } from '@/data-models/api/email-properties/property-type';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { newUuid } from '@compliance-theater/typescript';
import { BaseObjectRepository } from '../../_baseObjectRepository';
export const mapEmailPropertyRecordToObject = (record) => ({
    value: String(record.property_value),
    typeId: Number(record.document_property_type_id),
    propertyId: String(record.property_id),
    documentId: Number(record.document_id),
    typeName: record.property_name ? String(record.property_name) : undefined,
    categoryName: record.description ? String(record.description) : undefined,
    tags: record.tags ? record.tags : [],
    policy_basis: record.policy_basis ? record.policy_basis : [],
    categoryId: !!record.email_property_category_id
        ? Number(record.email_property_category_id)
        : undefined,
    propertyUnitId: !!record.property_unit_id
        ? Number(record.property_unit_id)
        : undefined,
    createdOn: record.created_on instanceof Date
        ? record.created_on
        : new Date(String(record.created_on)),
});
export class EmailPropertyRepository extends BaseObjectRepository {
    constructor() {
        super({
            tableName: 'document_property',
            idField: ['propertyId', 'property_id'],
            objectMap: mapEmailPropertyRecordToObject,
            summaryMap: mapEmailPropertyRecordToObject,
        });
    }
    validate(method, obj) {
        const asModel = obj;
        if (asModel.typeId && typeof asModel.typeId !== 'number') {
            const parsedTypeId = EmailPropertyTypeTypeValues.indexOf(asModel.typeId);
            if (parsedTypeId === -1) {
                throw new ValidationError({
                    field: 'typeId',
                    value: asModel.typeId,
                    source: 'EmailPropertyRepository',
                });
            }
            asModel.typeId = parsedTypeId;
        }
        switch (method) {
            case 'create':
                if (!asModel.documentId || !asModel.typeId) {
                    throw new ValidationError({
                        field: 'propertyId||At least one field is required for update',
                        source: 'EmailPropertyRepository',
                    });
                }
                if (!asModel.propertyId) {
                    asModel.propertyId = newUuid();
                }
                break;
            case 'update':
                if (!asModel.propertyId ||
                    (!asModel.documentId && !asModel.typeId && !asModel.value)) {
                    throw new ValidationError({
                        field: 'propertyId||At least one field is required for update',
                        source: 'EmailPropertyRepository',
                    });
                }
                break;
            default:
                break;
        }
    }
    getListQueryProperties() {
        return [
            `SELECT ep.* ,ept.property_name,epc.description, epc.email_property_category_id
            FROM document_property ep
            JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
            JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id      
      ORDER BY document_id`,
            [],
            `SELECT COUNT(*) as records FROM document_property`,
        ];
    }
    getQueryProperties(recordId) {
        return [
            'SELECT ep.* ,ept.property_name,epc.description, epc.email_property_category_id \
            FROM document_property ep \
            JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id \
            JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id WHERE property_id = $1',
            [recordId],
        ];
    }
    getCreateQueryProperties({ value, typeId, documentId, createdOn, propertyId, policy_basis, tags, }) {
        return [
            `INSERT INTO document_property (property_value, document_property_type_id, document_id, created_on, property_id, tags, policy_basis) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                value,
                typeId,
                documentId,
                createdOn ?? new Date(),
                propertyId,
                (tags ?? []).length ? tags : null,
                (policy_basis ?? []).length ? policy_basis : null,
            ],
        ];
    }
    getUpdateQueryProperties(obj) {
        return [
            {
                property_value: obj.value,
                document_property_type_id: obj.typeId,
                property_id: obj.propertyId,
                document_id: obj.documentId,
                created_on: obj.createdOn,
                tags: (obj.tags ?? []).length ? obj.tags : null,
                policy_basis: (obj.policy_basis ?? []).length ? obj.policy_basis : null,
            },
        ];
    }
}
//# sourceMappingURL=email-property-repository.js.map