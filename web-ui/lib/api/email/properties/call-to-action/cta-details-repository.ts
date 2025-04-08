import { BaseObjectRepository } from '../../../_baseObjectRepository';
import { ObjectRepository } from '../../../_types';
import { ValidationError } from '@/lib/react-util';
import { FirstParameter, newUuid } from '@/lib/typescript';
import { CallToActionDetails } from '@/data-models/api';
import {
  EmailPropertyRepository,
  mapEmailPropertyRecordToObject,
} from '../email-property-repository';
import { TransformedFullQueryResults } from '@/lib/neondb';

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
      idField: ['propertyId', 'property_id'],
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
       JOIN document_property ON call_to_action_details.property_id = document_property.property_id 
       ORDER BY call_to_action_details.property_id`,
      [],
      `SELECT COUNT(*) as records FROM call_to_action_details`,
    ];
  }

  protected getQueryProperties(recordId: string): [string, Array<unknown>] {
    return [
      `SELECT ep.*, ept.property_name,epc.description, epc.email_property_category_id,
            cta.opened_date, cta.closed_date, cta.compliancy_close_date, cta.completion_percentage
            FROM document_property ep 
             JOIN call_to_action_details cta ON cta.property_id = ep.property_id 
             JOIN email_property_type ept ON ept.email_property_type_id = ep.email_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
       WHERE cta.property_id = $1`,
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
    documentId,
    tags,
    policy_basis,
    createdOn,
  }: CallToActionDetails): [string, Array<unknown>] {
    return [
      `WITH ins1 AS (
        INSERT INTO document_property (property_value, email_property_type_id, property_id, document_id, created_on, tags, policy_basis) 
        VALUES ($1, 4, $2, $3, $4, $10, $11) RETURNING property_id
      )
      INSERT INTO call_to_action_details (property_id, opened_date, closed_date, compliancy_close_date, completion_percentage, policy_id) 
      VALUES ((SELECT property_id FROM ins1), $5, $6, $7, $8, $9) RETURNING *`,
      [
        value,
        propertyId,
        documentId,
        createdOn ?? new Date(),
        openedDate ?? null,
        closedDate ?? null,
        compliancyCloseDate ?? null,
        completionPercentage ?? null,
        policyId ?? null,
        tags?.length ? tags : null,
        policy_basis?.length ? policy_basis : null,
      ],
    ];
  }

  protected getUpdateQueryProperties({
    openedDate,
    closedDate,
    compliancyCloseDate,
    completionPercentage,
    policyId,
  }: CallToActionDetails): [Record<string, unknown>] {
    return [
      {
        opened_date: openedDate,
        closed_date: closedDate,
        compliancy_close_date: compliancyCloseDate,
        completion_percentage: completionPercentage,
        policy_id: policyId,
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
    props: CallToActionDetails;
    updateQuery: Promise<TransformedFullQueryResults<CallToActionDetails>>;
  }): Promise<TransformedFullQueryResults<CallToActionDetails>> {
    return updateQuery.then((result) => {
      const repo = new EmailPropertyRepository();
      return repo.update(props).then(() => result);
    });
  }
}
