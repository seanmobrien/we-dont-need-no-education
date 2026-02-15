import { BaseObjectRepository } from '../../../_baseObjectRepository';
import { ObjectRepository } from '../../../_types';
import { ValidationError } from '@compliance-theater/react/errors/validation-error';
import { FirstParameter, newUuid } from '@compliance-theater/typescript';
import { CallToActionResponseDetails } from '@/data-models/api';
import {
  EmailPropertyRepository,
  mapEmailPropertyRecordToObject,
} from '../email-property-repository';
import { TransformedFullQueryResults } from '@compliance-theater/database/driver';

const mapRecordToObject = (
  record: Record<string, unknown>
): CallToActionResponseDetails => {
  return {
    ...mapEmailPropertyRecordToObject(record),
    actionPropertyId: String(record.action_property_id),
    completionPercentage: Number(record.completion_percentage),
    responseTimestamp: new Date(String(record.response_timestamp)),
    severity:
      record.severity == null || record.severity === undefined
        ? undefined
        : Number(record.severity),
    severity_reasons:
      record.severity_reasons == null ||
      record.severity_reasons === undefined ||
      !Array.isArray(record.severity_reasons) ||
      record.severity_reasons.length === 0
        ? undefined
        : (record.severity_reasons as string[]),
    inferred:
      record.inferred == null || record.inferred === undefined
        ? undefined
        : Boolean(record.inferred),
    compliance_average_chapter_13:
      record.compliance_average_chapter_13 == null ||
      record.compliance_average_chapter_13 === undefined
        ? undefined
        : Number(record.compliance_average_chapter_13),
    compliance_chapter_13_reasons:
      record.compliance_chapter_13_reasons == null ||
      record.compliance_chapter_13_reasons === undefined ||
      !Array.isArray(record.compliance_chapter_13_reasons) ||
      record.compliance_chapter_13_reasons.length === 0
        ? undefined
        : (record.compliance_chapter_13_reasons as string[]),
    sentiment:
      record.sentiment == null || record.sentiment === undefined
        ? undefined
        : Number(record.sentiment),
    sentiment_reasons:
      record.sentiment_reasons == null ||
      record.sentiment_reasons === undefined ||
      !Array.isArray(record.sentiment_reasons) ||
      record.sentiment_reasons.length === 0
        ? undefined
        : (record.sentiment_reasons as string[]),
  };
};

export class CallToActionResponseDetailsRepository extends BaseObjectRepository<
  CallToActionResponseDetails,
  'propertyId'
> {
  constructor() {
    super({
      tableName: 'call_to_action_response_details',
      idField: ['propertyId', 'property_id'],
      objectMap: mapRecordToObject,
      summaryMap: mapRecordToObject,
    });
  }

  validate<
    TMethod extends keyof ObjectRepository<
      CallToActionResponseDetails,
      'propertyId'
    >
  >(
    method: TMethod,
    obj: FirstParameter<
      Pick<
        ObjectRepository<CallToActionResponseDetails, 'propertyId'>,
        TMethod
      >[TMethod]
    >
  ): void {
    const asModel = obj as CallToActionResponseDetails;
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
            source: 'CallToActionResponseDetailsRepository',
          });
        }
        break;
      default:
        break;
    }
  }

  protected getListQueryProperties(): [string, Array<unknown>, string] {
    return [
      `SELECT * FROM call_to_action_response_details 
       JOIN document_property ON call_to_action_response_details.property_id = document_property.property_id 
       ORDER BY call_to_action_response_details.property_id`,
      [],
      `SELECT COUNT(*) as records FROM call_to_action_response_details`,
    ];
  }

  protected getQueryProperties(recordId: string): [string, Array<unknown>] {
    return [
      `SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id,
            ctar.action_property_id, ctar.completion_percentage, ctar.response_timestamp
            FROM document_property ep 
             JOIN call_to_action_response_details ctar ON ctar.property_id = ep.property_id 
             JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
       WHERE ctar.property_id = $1`,
      [recordId],
    ];
  }

  protected getCreateQueryProperties({
    propertyId,
    actionPropertyId,
    completionPercentage,
    responseTimestamp,
    value,
    documentId,
    tags,
    policy_basis,
    createdOn,
  }: CallToActionResponseDetails): [string, Array<unknown>] {
    return [
      `WITH ins1 AS (
        INSERT INTO document_property (property_value, document_property_type_id, property_id, document_id, created_on, tags, policy_basis) 
        VALUES ($1, 7, $2, $3, $4, $8, $9) RETURNING property_id
      )
      INSERT INTO call_to_action_response_details (property_id, action_property_id, completion_percentage, response_timestamp) 
      VALUES ((SELECT property_id FROM ins1), $5, $6, $7) RETURNING *`,
      [
        value,
        propertyId,
        documentId,
        createdOn ?? new Date(),
        actionPropertyId,
        completionPercentage,
        responseTimestamp ?? new Date(),
        tags?.length ? tags : null,
        policy_basis?.length ? policy_basis : null,
      ],
    ];
  }

  protected getUpdateQueryProperties({
    actionPropertyId,
    completionPercentage,
    responseTimestamp,
  }: CallToActionResponseDetails): [Record<string, unknown>] {
    return [
      {
        action_property_id: actionPropertyId,
        completion_percentage: completionPercentage,
        response_timestamp: responseTimestamp,
      },
    ];
  }

  /**
   * Override to append post-processing logic to the update query.
   * @param updateQuery Update query promise
   * @returns The updateQuery argument
   */
  protected postProcessUpdate({
    updateQuery,
    props,
  }: {
    props: CallToActionResponseDetails;
    updateQuery: Promise<
      TransformedFullQueryResults<CallToActionResponseDetails>
    >;
  }): Promise<TransformedFullQueryResults<CallToActionResponseDetails>> {
    return updateQuery.then((result) => {
      const repo = new EmailPropertyRepository();
      return repo.update(props).then(() => result);
    });
  }
}
