import { BaseObjectRepository } from '../../../_baseObjectRepository';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { newUuid } from '@compliance-theater/typescript';
import { EmailPropertyRepository, mapEmailPropertyRecordToObject, } from '../email-property-repository';
const mapRecordToObject = (record) => {
    return {
        ...mapEmailPropertyRecordToObject(record),
    };
};
export class EmailHeaderDetailsRepository extends BaseObjectRepository {
    constructor() {
        super({
            tableName: 'document_property',
            idField: ['propertyId', 'property_id'],
            objectMap: mapRecordToObject,
            summaryMap: mapRecordToObject,
        });
    }
    validate(method, obj) {
        const asModel = obj;
        switch (method) {
            case 'create':
                if (!asModel.propertyId) {
                    asModel.propertyId = newUuid();
                }
                break;
            case 'update':
                if (!asModel.propertyId) {
                    throw new ValidationError({
                        field: 'propertyId',
                        source: 'EmailHeaderDetailsRepository',
                    });
                }
                break;
            default:
                break;
        }
    }
    getListQueryProperties() {
        return [
            `SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id
       FROM document_property ep
       JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
       JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
       WHERE ept.email_property_category_id = 1
       ORDER BY ep.property_id`,
            [],
            `SELECT COUNT(*) as records 
       FROM document_property ep
       JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
       WHERE ept.email_property_category_id = 1`,
        ];
    }
    getQueryProperties(recordId) {
        return [
            `SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id
       FROM document_property ep
       JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
       JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
       WHERE ep.property_id = $1 AND ept.email_property_category_id = 1`,
            [recordId],
        ];
    }
    getCreateQueryProperties({ propertyId, value, documentId, createdOn, typeId, tags, policy_basis, }) {
        return [
            `INSERT INTO document_property (property_value, document_property_type_id, property_id, document_id, created_on, tags, policy_basis) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
            [
                value,
                typeId,
                propertyId,
                documentId,
                createdOn ?? new Date(),
                tags?.length ? tags : null,
                policy_basis?.length ? policy_basis : null,
            ],
        ];
    }
    getUpdateQueryProperties({ value, tags, policy_basis, }) {
        return [
            {
                property_value: value,
                tags: tags?.length ? tags : null,
                policy_basis: policy_basis?.length ? policy_basis : null,
            },
        ];
    }
    postProcessUpdate({ updateQuery, props, }) {
        return updateQuery.then((result) => {
            const repo = new EmailPropertyRepository();
            return repo.update(props).then(() => result);
        });
    }
}
//# sourceMappingURL=email-header-details-repository.js.map