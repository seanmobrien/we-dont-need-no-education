import {
  EmailProperty,
  EmailPropertyTypeTypeValues,
} from '@/data-models/api/email-properties/property-type';
import { ValidationError } from '@/lib/react-util';
import { FirstParameter, newUuid } from '@/lib/typescript';
import { BaseObjectRepository } from '../../_baseObjectRepository';
import { ObjectRepository } from '../../_types';

export const mapEmailPropertyRecordToObject = (
  record: Record<string, unknown>,
) => ({
  value: String(record.property_value),
  typeId: Number(record.email_property_type_id),
  propertyId: String(record.property_id),
  emailId: String(record.email_id),
  typeName: record.property_name ? String(record.property_name) : undefined,
  categoryName: record.description ? String(record.description) : undefined,
  categoryId: !!record.email_property_category_id
    ? Number(record.email_property_category_id)
    : undefined,
  createdOn:
    record.created_on instanceof Date
      ? record.created_on
      : new Date(String(record.created_on)),
});

export class EmailPropertyRepository extends BaseObjectRepository<
  EmailProperty,
  'propertyId'
> {
  constructor() {
    super({
      tableName: 'email_property',
      idField: ['propertyId', 'property_id'],
      objectMap: mapEmailPropertyRecordToObject,
      summaryMap: mapEmailPropertyRecordToObject,
    });
  }
  /**
   * Validates the input for a specific method.
   *
   * @template TMethod
   * @param {TMethod} method - The method to validate.
   * @param {FirstParameter<ObjectRepository<T, KId>[TMethod]>} obj - The input to validate.
   */
  validate<TMethod extends keyof ObjectRepository<EmailProperty, 'propertyId'>>(
    method: TMethod,
    obj: FirstParameter<
      Pick<ObjectRepository<EmailProperty, 'propertyId'>, TMethod>[TMethod]
    >,
  ): void {
    const asModel = obj as EmailProperty;
    if (asModel.typeId && typeof asModel.typeId !== 'number') {
      const parsedTypeId = EmailPropertyTypeTypeValues.indexOf(asModel.typeId);
      if (parsedTypeId === -1) {
        throw new ValidationError({
          field: 'typeId',
          value: asModel.typeId,
          source: 'EmailPropertyRepository',
        });
      }
      asModel.typeId = parsedTypeId;
    }
    switch (method) {
      case 'create':
        if (!asModel.emailId || !asModel.typeId) {
          throw new ValidationError({
            field: 'propertyId||At least one field is required for update',
            source: 'EmailPropertyRepository',
          });
        }
        if (!asModel.propertyId) {
          asModel.propertyId = newUuid();
        }
        break;
      case 'update':
        if (
          !asModel.propertyId ||
          (!asModel.emailId && !asModel.typeId && !asModel.value)
        ) {
          throw new ValidationError({
            field: 'propertyId||At least one field is required for update',
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
            FROM email_property ep
            JOIN email_property_type ept ON ept.email_property_type_id = ep.email_property_type_id
            JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id      
      ORDER BY email_id`,
      [],
      `SELECT COUNT(*) as records FROM email_property`,
    ];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getQueryProperties(recordId: string): [string, Array<any>] {
    return [
      'SELECT ep.* ,ept.property_name,epc.description, epc.email_property_category_id \
            FROM email_property ep \
            JOIN email_property_type ept ON ept.email_property_type_id = ep.email_property_type_id \
            JOIN email_property_category epc ON ept.email_property_category_id = epc.email_property_category_id WHERE property_id = $1',
      [recordId],
    ];
  }
  protected getCreateQueryProperties({
    value,
    typeId,
    emailId,
    createdOn,
    propertyId,
  }: // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EmailProperty): [string, Array<any>] {
    return [
      `INSERT INTO email_property (property_value, email_property_type_id, email_id, created_on, property_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [value, typeId, emailId, createdOn ?? new Date(), propertyId],
    ];
  }
  protected getUpdateQueryProperties(
    obj: EmailProperty,
  ): [Record<string, unknown>] {
    return [
      {
        property_value: obj.value,
        email_property_type_id: obj.typeId,
        property_id: obj.propertyId,
        email_id: obj.emailId,
        created_on: obj.createdOn,
      },
    ];
  }
}
