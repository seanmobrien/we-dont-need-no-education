import { BaseObjectRepository } from '../../../_baseObjectRepository';
import { ObjectRepository } from '../../../_types';
import { ValidationError } from '@/lib/react-util';
import { FirstParameter, newUuid } from '@/lib/typescript';
import { KeyPointsDetails } from '@/data-models/api';
import {
  EmailPropertyRepository,
  mapEmailPropertyRecordToObject,
} from '../email-property-repository';
import { TransformedFullQueryResults } from '@/lib/neondb';

const mapRecordToObject = (
  record: Record<string, unknown>,
): KeyPointsDetails => {
  return {
    ...mapEmailPropertyRecordToObject(record),
    policyId: record.policy_id ? Number(record.policy_id) : null,
  };
};

export class KeyPointsDetailsRepository extends BaseObjectRepository<
  KeyPointsDetails,
  'propertyId'
> {
  constructor() {
    super({
      tableName: 'key_points_details',
      idField: ['propertyId', 'property_id'],
      objectMap: mapRecordToObject,
      summaryMap: mapRecordToObject,
    });
  }

  validate<
    TMethod extends keyof ObjectRepository<KeyPointsDetails, 'propertyId'>,
  >(
    method: TMethod,
    obj: FirstParameter<
      Pick<ObjectRepository<KeyPointsDetails, 'propertyId'>, TMethod>[TMethod]
    >,
  ): void {
    const asModel = obj as KeyPointsDetails;
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
            source: 'KeyPointsDetailsRepository',
          });
        }
        break;
      default:
        break;
    }
  }

  protected getListQueryProperties(): [string, Array<unknown>, string] {
    return [
      `SELECT * FROM key_points_details 
       JOIN email_property ON key_points_details.property_id = email_property.property_id 
       ORDER BY key_points_details.property_id`,
      [],
      `SELECT COUNT(*) as records FROM key_points_details`,
    ];
  }

  protected getQueryProperties(recordId: string): [string, Array<unknown>] {
    return [
      `SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id,
            kpd.policy_id
            FROM email_property ep 
             JOIN key_points_details kpd ON kpd.property_id = ep.property_id 
             JOIN email_property_type ept ON ept.email_property_type_id = ep.email_property_type_id
             JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
       WHERE kpd.property_id = $1`,
      [recordId],
    ];
  }

  protected getCreateQueryProperties({
    propertyId,
    policyId,
    value,
    emailId,
    createdOn,
  }: KeyPointsDetails): [string, Array<unknown>] {
    return [
      `WITH ins1 AS (
        INSERT INTO email_property (property_value, email_property_type_id, property_id, email_id, created_on) 
        VALUES ($1, 9, $2, $3, $4) RETURNING property_id
      )
      INSERT INTO key_points_details (property_id, policy_id) 
      VALUES ((SELECT property_id FROM ins1), $5) RETURNING *`,
      [value, propertyId, emailId, createdOn ?? new Date(), policyId ?? null],
    ];
  }

  protected getUpdateQueryProperties({
    policyId,
  }: KeyPointsDetails): [Record<string, unknown>] {
    return [
      {
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
    props: KeyPointsDetails;
    updateQuery: Promise<TransformedFullQueryResults<KeyPointsDetails>>;
  }): Promise<TransformedFullQueryResults<KeyPointsDetails>> {
    return updateQuery.then((result) => {
      const repo = new EmailPropertyRepository();
      return repo.update(props).then(() => result);
    });
  }
}
