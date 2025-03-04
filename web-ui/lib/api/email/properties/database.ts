import {
  EmailProperty,
  EmailPropertyCategoryType,
  EmailPropertyCategoryTypeId,
  EmailPropertyType,
  EmailPropertyTypeTypeValues,
} from '@/data-models/api/import/email-message';
import { ValidationError } from '@/lib/react-util';
import { FirstParameter, newUuid } from '@/lib/typescript';
import { BaseObjectRepository } from '../../_baseObjectRepository';
import { ObjectRepository } from '../../_types';
import {
  lookupEmailPropertyCategory,
  lookupEmailPropertyType,
  PaginatedResultset,
  PaginationStats,
} from '@/data-models/api';

const mapRecordToObject = (record: Record<string, unknown>) => ({
  value: String(record.property_value),
  typeId: Number(record.email_property_type_id),
  propertyId: String(record.property_id),
  emailId: String(record.email_id),
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
      idField: 'propertyId',
      objectMap: mapRecordToObject,
      summaryMap: mapRecordToObject,
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
    >
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
      `SELECT * FROM email_property ORDER BY email_id`,
      [],
      `SELECT COUNT(*) as records FROM email_property`,
    ];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getQueryProperties(recordId: string): [string, Array<any>] {
    return ['SELECT * FROM email_property WHERE property_id = $1', [recordId]];
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
      [value, typeId, emailId, createdOn, propertyId],
    ];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected updateQueryProperties(obj: EmailProperty): [Record<string, any>] {
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

const mapPropertyTypeRecordToObject = (
  record: Record<string, unknown>
): EmailPropertyType => ({
  categoryId: Number(record.email_property_category_id),
  typeId: Number(record.email_property_type_id),
  name: String(record.property_name),
  createdOn:
    record.created_at instanceof Date
      ? record.created_at
      : new Date(String(record.created_at)),
});

export class EmailPropertyTypeRepository extends BaseObjectRepository<
  EmailPropertyType,
  'typeId'
> {
  constructor() {
    super({
      tableName: 'email_property_type',
      idField: 'typeId',
      objectMap: mapPropertyTypeRecordToObject,
      summaryMap: mapPropertyTypeRecordToObject,
    });
  }

  async listForCategory(
    categoryId: EmailPropertyCategoryTypeId | EmailPropertyCategoryType,
    pagination: PaginationStats = { page: 1, num: 1000, total: 1000 }
  ): Promise<PaginatedResultset<EmailPropertyType>> {
    const [, , sqlCountQuery] = this.getListQueryProperties();
    const values = [lookupEmailPropertyCategory(categoryId)];
    const sqlQuery =
      'SELECT * FROM email_property_type WHERE email_property_category_id = $1';
    const results = await this.defaultListImpl(
      {
        sqlQuery,
        values,
        sqlCountQuery,
      },
      pagination
    );
    return results as PaginatedResultset<EmailPropertyType>;
  }

  /**
   * Validates the input for a specific method.
   *
   * @template TMethod
   * @param {TMethod} method - The method to validate.
   * @param {FirstParameter<ObjectRepository<T, KId>[TMethod]>} obj - The input to validate.
   */
  validate<TMethod extends keyof ObjectRepository<EmailPropertyType, 'typeId'>>(
    method: TMethod,
    obj: FirstParameter<
      Pick<ObjectRepository<EmailPropertyType, 'typeId'>, TMethod>[TMethod]
    >
  ): void {
    const asModel = obj as EmailPropertyType;
    if (
      'typeId' in asModel &&
      asModel.typeId &&
      typeof asModel.typeId !== 'number'
    ) {
      const parsedTypeId = lookupEmailPropertyType(asModel.typeId);
      if (parsedTypeId === -1) {
        throw new ValidationError({
          field: 'typeId',
          value: asModel.typeId,
          source: 'EmailPropertyTypeRepository',
        });
      }
      asModel.typeId = parsedTypeId;
    }
    if (
      'categoryId' in asModel &&
      asModel.categoryId &&
      typeof asModel.categoryId !== 'number'
    ) {
      const parsedCategoryId = lookupEmailPropertyCategory(asModel.categoryId);
      if (parsedCategoryId === -1) {
        throw new ValidationError({
          field: 'categoryId',
          value: asModel.categoryId,
          source: 'EmailPropertyTypeRepository',
        });
      }
      asModel.categoryId = parsedCategoryId;
    }
    switch (method) {
      case 'create':
        if (!asModel.categoryId || !asModel.name) {
          throw new ValidationError({
            field: 'typeId||At least one field is required for update',
            source: 'EmailPropertyTypeRepository',
          });
        }
        break;
      case 'update':
        if (!asModel.typeId || (!asModel.name && !asModel.categoryId)) {
          throw new ValidationError({
            field: 'typeId||At least one field is required for update',
            source: 'EmailPropertyTypeRepository',
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
      `SELECT * FROM email_property_type ORDER BY email_property_category_id`,
      [],
      `SELECT COUNT(*) as records FROM email_property_type`,
    ];
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected getQueryProperties(recordId: number): [string, Array<any>] {
    return [
      'SELECT * FROM email_property_type WHERE email_property_type_id = $1',
      [recordId],
    ];
  }
  protected getCreateQueryProperties({
    name,
    categoryId,
    createdOn,
  }: // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EmailPropertyType): [string, Array<any>] {
    return [
      `INSERT INTO email_property_type (property_name, email_property_category_id, created_at) VALUES ($1, $2, $3) RETURNING *`,
      [name, categoryId, createdOn],
    ];
  }
  protected updateQueryProperties({
    categoryId,
    name,
    createdOn,
  }: // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EmailPropertyType): [Record<string, any>] {
    return [
      {
        email_property_category_id: Number(categoryId),
        property_name: String(name),
        created_at: !!createdOn
          ? createdOn instanceof Date
            ? createdOn
            : new Date(String(createdOn))
          : (undefined as unknown as Date),
      },
    ];
  }
}
