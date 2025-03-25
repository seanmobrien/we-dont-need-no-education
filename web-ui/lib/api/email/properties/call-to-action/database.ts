import { BaseObjectRepository } from '../../../_baseObjectRepository';
import { ObjectRepository } from '../../../_types';
import { ValidationError } from '@/lib/react-util';
import { FirstParameter, newUuid } from '@/lib/typescript';
import { CallToActionDetails } from '@/data-models/api';
import { mapEmailPropertyRecordToObject } from '../email-property-repository';

const mapRecordToObject = (
  record: Record<string, unknown>,
): CallToActionDetails => {
  return {
    ...mapEmailPropertyRecordToObject(record),
    openedDate: record.opened_date
      ? new Date(String(record.opened_date))
      : null,
    closedDate: record.closed_date
      ? new Date(String(record.closed_date))
      : null,
    compliancyCloseDate: record.compliancy_close_date
      ? new Date(String(record.compliancy_close_date))
      : null,
    completionPercentage: Number(record.completion_percentage),
    policyId: record.policy_id ? Number(record.policy_id) : null,
  };
};

export class CallToActionDetailsRepository extends BaseObjectRepository<
  CallToActionDetails,
  'propertyId'
> {
  constructor() {
    super({
      tableName: 'call_to_action_details',
      idField: 'propertyId',
      objectMap: mapRecordToObject,
      summaryMap: mapRecordToObject,
    });
  }

  validate<
    TMethod extends keyof ObjectRepository<CallToActionDetails, 'propertyId'>,
  >(
    method: TMethod,
    obj: FirstParameter<
      Pick<
        ObjectRepository<CallToActionDetails, 'propertyId'>,
        TMethod
      >[TMethod]
    >,
  ): void {
    const asModel = obj as CallToActionDetails;
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
            source: 'CallToActionDetailsRepository',
          });
        }
        break;
      default:
        break;
    }
  }

  protected getListQueryProperties(): [string, Array<unknown>, string] {
    return [
      `SELECT * FROM call_to_action_details 
       JOIN email_property ON call_to_action_details.property_id = email_property.property_id 
       ORDER BY call_to_action_details.property_id`,
      [],
      `SELECT COUNT(*) as records FROM call_to_action_details`,
    ];
  }

  protected getQueryProperties(recordId: string): [string, Array<unknown>] {
    return [
      `SELECT * FROM call_to_action_details 
       JOIN email_property ON call_to_action_details.property_id = email_property.property_id 
       WHERE call_to_action_details.property_id = $1`,
      [recordId],
    ];
  }

  protected getCreateQueryProperties({
    propertyId,
    openedDate,
    closedDate,
    compliancyCloseDate,
    completionPercentage,
    policyId,
    value,
    emailId,
    createdOn,
  }: CallToActionDetails): [string, Array<unknown>] {
    return [
      `WITH ins1 AS (
        INSERT INTO email_property (property_value, email_property_type_id, property_id, email_id, created_on) 
        VALUES ($1, 4, $2, $3, $4) RETURNING property_id
      )
      INSERT INTO call_to_action_details (property_id, opened_date, closed_date, compliancy_close_date, completion_percentage, policy_id) 
      VALUES ((SELECT property_id FROM ins1), $5, $6, $7, $8, $9) RETURNING *`,
      [
        value,
        propertyId,
        emailId,
        createdOn ?? new Date(),
        openedDate ?? null,
        closedDate ?? null,
        compliancyCloseDate ?? null,
        completionPercentage ?? null,
        policyId ?? null,
      ],
    ];
  }

  protected getUpdateQueryProperties({
    propertyId,
    openedDate,
    closedDate,
    compliancyCloseDate,
    completionPercentage,
    policyId,
    value,
    emailId,
    createdOn,
  }: CallToActionDetails): [Record<string, unknown>] {
    return [
      {
        property_value: value,
        email_property_type_id: 4,
        property_id: propertyId,
        email_id: emailId,
        created_on: createdOn,
        opened_date: openedDate,
        closed_date: closedDate,
        compliancy_close_date: compliancyCloseDate,
        completion_percentage: completionPercentage,
        policy_id: policyId,
      },
    ];
  }
}
