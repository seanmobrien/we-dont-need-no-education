import { BaseObjectRepository } from '../../../_baseObjectRepository';
import { ObjectRepository } from '../../../_types';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { FirstParameter, newUuid } from '@repo/lib-typescript';
import { EmailProperty } from '@/data-models/api';
import {
  EmailPropertyRepository,
  mapEmailPropertyRecordToObject,
} from '../email-property-repository';
import { TransformedFullQueryResults } from '@/lib/neondb';

const mapRecordToObject = (record: Record<string, unknown>): EmailProperty => {
  return {
    ...mapEmailPropertyRecordToObject(record),
    propertyId: String(record.property_id),
  };
};

export class NotesRepository extends BaseObjectRepository<
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
    >,
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
            source: 'EmailPropertyRepository',
          });
        }
        break;
      default:
        break;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getListQueryProperties(): [string, Array<any>, string] {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getQueryProperties(recordId: string): [string, Array<any>] {
    return [
      'SELECT COUNT(*) as records \
        FROM document_property ep \
            JOIN email_property_type ept ON ept.document_property_type_id = ep.document_property_type_id \
            JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id \
      WHERE epc.email_property_category_id = 3 AND ep.document_property_type_id <> 9',
      [recordId],
    ];
  }
  protected getCreateQueryProperties({
    propertyId,
    value,
    documentId,
    tags,
    policy_basis,
    createdOn,
  }: EmailProperty): [string, Array<unknown>] {
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

  protected getUpdateQueryProperties({}: EmailProperty): [
    Record<string, unknown>,
  ] {
    return [{}];
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
