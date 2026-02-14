import { BaseObjectRepository } from '../../../_baseObjectRepository';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { newUuid } from '@compliance-theater/typescript';
import { EmailPropertyRepository, mapEmailPropertyRecordToObject, } from '../email-property-repository';
const mapRecordToObject = (record) => {
    return {
        ...mapEmailPropertyRecordToObject(record),
        sentimentScore: record.sentiment_score
            ? Number(record.sentiment_score)
            : null,
        detectedHostility: Boolean(record.detected_hostility),
        flaggedPhrases: String(record.flagged_phrases),
        detectedOn: new Date(String(record.detected_on)),
    };
};
export class SentimentAnalysisDetailsRepository extends BaseObjectRepository {
    constructor() {
        super({
            tableName: 'email_sentiment_analysis_details',
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
                        source: 'SentimentAnalysisDetailsRepository',
                    });
                }
                break;
            default:
                break;
        }
    }
    getListQueryProperties() {
        return [
            `SELECT * FROM email_sentiment_analysis_details 
       JOIN document_property ON email_sentiment_analysis_details.property_id = document_property.property_id 
       ORDER BY email_sentiment_analysis_details.property_id`,
            [],
            `SELECT COUNT(*) as records FROM email_sentiment_analysis_details`,
        ];
    }
    getQueryProperties(recordId) {
        return [
            `SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id,
            esad.sentiment_score, esad.detected_hostility, esad.flagged_phrases, esad.detected_on
            FROM document_property ep 
             JOIN email_sentiment_analysis_details esad ON esad.property_id = ep.property_id 
             JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
       WHERE esad.property_id = $1`,
            [recordId],
        ];
    }
    getCreateQueryProperties({ propertyId, sentimentScore, detectedHostility, flaggedPhrases, detectedOn, value, documentId, tags, policy_basis, createdOn, }) {
        return [
            `WITH ins1 AS (
        INSERT INTO document_property (property_value, document_property_type_id, property_id, document_id, created_on, tags, policy_basis) 
        VALUES ($1, 8, $2, $3, $4, $9, $10) RETURNING property_id
      )
      INSERT INTO email_sentiment_analysis_details (property_id, sentiment_score, detected_hostility, flagged_phrases, detected_on) 
      VALUES ((SELECT property_id FROM ins1), $5, $6, $7, $8) RETURNING *`,
            [
                value,
                propertyId,
                documentId,
                createdOn ?? new Date(),
                sentimentScore,
                detectedHostility,
                flaggedPhrases,
                detectedOn ?? new Date(),
                tags?.length ? tags : null,
                policy_basis?.length ? policy_basis : null,
            ],
        ];
    }
    getUpdateQueryProperties({ sentimentScore, detectedHostility, flaggedPhrases, detectedOn, }) {
        return [
            {
                sentiment_score: sentimentScore,
                detected_hostility: detectedHostility,
                flagged_phrases: flaggedPhrases,
                detected_on: detectedOn,
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
//# sourceMappingURL=sentiment-analysis-details-repository.js.map