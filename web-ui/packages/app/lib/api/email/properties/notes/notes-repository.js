import { BaseObjectRepository } from '../../../_baseObjectRepository';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { newUuid } from '@compliance-theater/typescript';
import { EmailPropertyRepository, mapEmailPropertyRecordToObject, } from '../email-property-repository';
const mapRecordToObject = (record) => {
    return {
        ...mapEmailPropertyRecordToObject(record),
        propertyId: String(record.property_id),
    };
};
export class NotesRepository extends BaseObjectRepository {
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
      WHERE epc.email_property_category_id = 3 AND ep.document_property_type_id <> 9  
      ORDER BY document_id`,
            [],
            `SELECT COUNT(*) as records FROM document_property`,
        ];
    }
    getQueryProperties(recordId) {
        return [
            'SELECT COUNT(*) as records \
        FROM document_property ep \
            JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id \
            JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id \
      WHERE epc.email_property_category_id = 3 AND ep.document_property_type_id <> 9',
            [recordId],
        ];
    }
    getCreateQueryProperties({ propertyId, value, documentId, tags, policy_basis, createdOn, }) {
        return [
            `WITH ins1 AS (
        INSERT INTO document_property (property_value, document_property_type_id, property_id, document_id, created_on, tags, policy_basis) 
        VALUES ($1, 9, $2, $3, $4, $6, $7) RETURNING property_id
      ) RETURNING *`,
            [
                value,
                propertyId,
                documentId,
                createdOn ?? new Date(),
                tags ?? null,
                policy_basis ?? null,
            ],
        ];
    }
    getUpdateQueryProperties({}) {
        return [{}];
    }
    postProcessUpdate({ updateQuery, props, }) {
        return updateQuery.then((result) => {
            const repo = new EmailPropertyRepository();
            return repo.update(props).then(() => result);
        });
    }
}
//# sourceMappingURL=notes-repository.js.map