import { BaseObjectRepository } from '../../../_baseObjectRepository';
import { ObjectRepository } from '../../../_types';
import { ValidationError } from '/lib/react-util/errors/validation-error';
import { FirstParameter, newUuid } from '/lib/typescript';
import { ViolationDetails } from '/data-models/api';
import {
  EmailPropertyRepository,
  mapEmailPropertyRecordToObject,
} from '../email-property-repository';
import { TransformedFullQueryResults } from '/lib/neondb';

const mapRecordToObject = (
  record: Record<string, unknown>,
): ViolationDetails => {
  return {
    ...mapEmailPropertyRecordToObject(record),
    attachmentId: record.attachment_id ? Number(record.attachment_id) : null,
    keyPointPropertyId: record.key_point_property_id
      ? String(record.key_point_property_id)
      : null,
    actionPropertyId: record.action_property_id
      ? String(record.action_property_id)
      : null,
    violationType: String(record.violation_type),
    severityLevel: record.severity_level ? Number(record.severity_level) : null,
    detectedBy: String(record.detected_by),
    detectedOn: new Date(String(record.detected_on)),
  };
};

export class ViolationDetailsRepository extends BaseObjectRepository<
  ViolationDetails,
  'propertyId'
> {
  constructor() {
    super({
      tableName: 'violation_details',
      idField: ['propertyId', 'property_id'],
      objectMap: mapRecordToObject,
      summaryMap: mapRecordToObject,
    });
  }

  validate<
    TMethod extends keyof ObjectRepository<ViolationDetails, 'propertyId'>,
  >(
    method: TMethod,
    obj: FirstParameter<
      Pick<ObjectRepository<ViolationDetails, 'propertyId'>, TMethod>[TMethod]
    >,
  ): void {
    const asModel = obj as ViolationDetails;
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
            source: 'ViolationDetailsRepository',
          });
        }
        break;
      default:
        break;
    }
  }

  protected getListQueryProperties(): [string, Array<unknown>, string] {
    return [
      `SELECT * FROM violation_details 
       JOIN document_property ON violation_details.property_id = document_property.property_id 
       ORDER BY violation_details.property_id`,
      [],
      `SELECT COUNT(*) as records FROM violation_details`,
    ];
  }

  protected getQueryProperties(recordId: string): [string, Array<unknown>] {
    return [
      `SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id,
            vd.attachment_id, vd.key_point_property_id, vd.action_property_id, vd.violation_type, vd.severity_level, vd.detected_by, vd.detected_on
            FROM document_property ep 
             JOIN violation_details vd ON vd.property_id = ep.property_id 
             JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
       WHERE vd.property_id = $1`,
      [recordId],
    ];
  }

  protected getCreateQueryProperties({
    propertyId,
    attachmentId,
    keyPointPropertyId,
    actionPropertyId,
    violationType,
    severityLevel,
    detectedBy,
    detectedOn,
    value,
    documentId,
    policy_basis,
    tags,
    createdOn,
  }: ViolationDetails): [string, Array<unknown>] {
    return [
      `WITH ins1 AS (
        INSERT INTO document_property (property_value, document_property_type_id, property_id, document_id, created_on, tags, policy_basis) 
        VALUES ($1, 7, $2, $3, $4, $12, $13) RETURNING property_id
      )
      INSERT INTO violation_details (property_id, attachment_id, key_point_property_id, action_property_id, violation_type, severity_level, detected_by, detected_on) 
      VALUES ((SELECT property_id FROM ins1), $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        value,
        propertyId,
        documentId,
        createdOn ?? new Date(),
        attachmentId,
        keyPointPropertyId,
        actionPropertyId,
        violationType,
        severityLevel,
        detectedBy,
        detectedOn ?? new Date(),
        tags?.length ? tags : null,
        policy_basis?.length ? policy_basis : null,
      ],
    ];
  }

  protected getUpdateQueryProperties({
    attachmentId,
    keyPointPropertyId,
    actionPropertyId,
    violationType,
    severityLevel,
    detectedBy,
    detectedOn,
  }: ViolationDetails): [Record<string, unknown>] {
    return [
      {
        attachment_id: attachmentId,
        key_point_property_id: keyPointPropertyId,
        action_property_id: actionPropertyId,
        violation_type: violationType,
        severity_level: severityLevel,
        detected_by: detectedBy,
        detected_on: detectedOn,
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
    props: ViolationDetails;
    updateQuery: Promise<TransformedFullQueryResults<ViolationDetails>>;
  }): Promise<TransformedFullQueryResults<ViolationDetails>> {
    return updateQuery.then((result) => {
      const repo = new EmailPropertyRepository();
      return repo.update(props).then(() => result);
    });
  }
}
