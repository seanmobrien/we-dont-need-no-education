import { BaseObjectRepository } from '../../../_baseObjectRepository';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { newUuid } from '@compliance-theater/typescript';
import { EmailPropertyRepository, mapEmailPropertyRecordToObject, } from '../email-property-repository';
const mapRecordToObject = (record) => {
    return {
        ...mapEmailPropertyRecordToObject(record),
        actionPropertyId: record.action_property_id
            ? String(record.action_property_id)
            : null,
        complianceScore: record.compliance_score
            ? Number(record.compliance_score)
            : null,
        violationsFound: record.violations_found
            ? Number(record.violations_found)
            : 0,
        responseDelayDays: record.response_delay_days
            ? Number(record.response_delay_days)
            : 0,
        overallGrade: record.overall_grade ? String(record.overall_grade) : null,
        evaluatedOn: new Date(String(record.evaluated_on)),
    };
};
export class ComplianceScoresDetailsRepository extends BaseObjectRepository {
    constructor() {
        super({
            tableName: 'compliance_scores_details',
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
                        source: 'ComplianceScoresDetailsRepository',
                    });
                }
                break;
            default:
                break;
        }
    }
    getListQueryProperties() {
        return [
            `SELECT * FROM compliance_scores_details 
       JOIN document_property ON compliance_scores_details.property_id = document_property.property_id 
       ORDER BY compliance_scores_details.property_id`,
            [],
            `SELECT COUNT(*) as records FROM compliance_scores_details`,
        ];
    }
    getQueryProperties(recordId) {
        return [
            `SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id,
            csd.action_property_id, csd.compliance_score, csd.violations_found, csd.response_delay_days, csd.overall_grade, csd.evaluated_on
            FROM document_property ep 
             JOIN compliance_scores_details csd ON csd.property_id = ep.property_id 
             JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
       WHERE csd.property_id = $1`,
            [recordId],
        ];
    }
    getCreateQueryProperties({ propertyId, actionPropertyId, complianceScore, violationsFound, responseDelayDays, overallGrade, evaluatedOn, value, documentId, tags, policy_basis, createdOn, }) {
        return [
            `WITH ins1 AS (
        INSERT INTO document_property (property_value, document_property_type_id, property_id, document_id, created_on, tags, policy_basis) 
        VALUES ($1, 6, $2, $3, $4, $11, $12) RETURNING property_id
      )
      INSERT INTO compliance_scores_details (property_id, action_property_id, compliance_score, violations_found, response_delay_days, overall_grade, evaluated_on) 
      VALUES ((SELECT property_id FROM ins1), $5, $6, $7, $8, $9, $10) RETURNING *`,
            [
                value,
                propertyId,
                documentId,
                createdOn ?? new Date(),
                actionPropertyId,
                complianceScore,
                violationsFound,
                responseDelayDays,
                overallGrade,
                evaluatedOn ?? new Date(),
                tags?.length ? tags : null,
                policy_basis?.length ? policy_basis : null,
            ],
        ];
    }
    getUpdateQueryProperties({ actionPropertyId, complianceScore, violationsFound, responseDelayDays, overallGrade, evaluatedOn, }) {
        return [
            {
                action_property_id: actionPropertyId,
                compliance_score: complianceScore,
                violations_found: violationsFound,
                response_delay_days: responseDelayDays,
                overall_grade: overallGrade,
                evaluated_on: evaluatedOn,
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
//# sourceMappingURL=compliance-scores-details-repository.js.map