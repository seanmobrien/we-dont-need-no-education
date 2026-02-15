import { BaseObjectRepository } from '../../../_baseObjectRepository';
import { ObjectRepository } from '../../../_types';
import { ValidationError } from '@compliance-theater/react/errors/validation-error';
import { FirstParameter, newUuid } from '@compliance-theater/typescript';
import { EmailProperty } from '@/data-models/api';
import {
  EmailPropertyRepository,
  mapEmailPropertyRecordToObject,
} from '../email-property-repository';
import { TransformedFullQueryResults } from '@compliance-theater/database/driver';

const mapRecordToObject = (record: Record<string, unknown>): EmailProperty => {
  return {
    ...mapEmailPropertyRecordToObject(record),
  };
};

export class EmailHeaderDetailsRepository extends BaseObjectRepository<
  EmailProperty,
  'propertyId'
> {
  constructor() {
    super({
      tableName: 'document_property',
      idField: ['propertyId', 'property_id'],
      objectMap: mapRecordToObject,
      summaryMap: mapRecordToObject,
    });
  }

  validate<TMethod extends keyof ObjectRepository<EmailProperty, 'propertyId'>>(
    method: TMethod,
    obj: FirstParameter<
      Pick<ObjectRepository<EmailProperty, 'propertyId'>, TMethod>[TMethod]
    >
  ): void {
    const asModel = obj as EmailProperty;
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

  protected getListQueryProperties(): [string, Array<unknown>, string] {
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

  protected getQueryProperties(recordId: string): [string, Array<unknown>] {
    return [
      `SELECT ep.*, ept.property_name, epc.description, epc.email_property_category_id
       FROM document_property ep
       JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id
       JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id
       WHERE ep.property_id = $1 AND ept.email_property_category_id = 1`,
      [recordId],
    ];
  }

  protected getCreateQueryProperties({
    propertyId,
    value,
    documentId,
    createdOn,
    typeId,
    tags,
    policy_basis,
  }: EmailProperty): [string, Array<unknown>] {
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

  protected getUpdateQueryProperties({
    value,
    tags,
    policy_basis,
  }: EmailProperty): [Record<string, unknown>] {
    return [
      {
        property_value: value,
        tags: tags?.length ? tags : null,
        policy_basis: policy_basis?.length ? policy_basis : null,
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
    props: EmailProperty;
    updateQuery: Promise<TransformedFullQueryResults<EmailProperty>>;
  }): Promise<TransformedFullQueryResults<EmailProperty>> {
    return updateQuery.then((result) => {
      const repo = new EmailPropertyRepository();
      return repo.update(props).then(() => result);
    });
  }
}
