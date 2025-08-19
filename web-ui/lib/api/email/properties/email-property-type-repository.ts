import {
  EmailPropertyType,
  EmailPropertyCategoryTypeId,
  EmailPropertyCategoryType,
} from '@/data-models/api/email-properties/property-type';
import {
  PaginationStats,
  PaginatedResultset,
} from '@/data-models/_types';
import {
  lookupEmailPropertyCategory,
  lookupEmailPropertyType,
} from '@/data-models/_utilities';
import { ValidationError } from '@/lib/react-util/errors/validation-error';
import { FirstParameter } from '@/lib/typescript';
import { BaseObjectRepository } from '../../_baseObjectRepository';
import { ObjectRepository } from '../../_types';

export const mapPropertyTypeRecordToObject = (
  record: Record<string, unknown>,
): EmailPropertyType => ({
  categoryId: Number(record.email_property_category_id),
  typeId: Number(record.document_property_type_id),
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
      idField: ['typeId', 'document_property_type_id'],
      objectMap: mapPropertyTypeRecordToObject,
      summaryMap: mapPropertyTypeRecordToObject,
    });
  }

  async listForCategory(
    categoryId: EmailPropertyCategoryTypeId | EmailPropertyCategoryType,
    pagination: PaginationStats = { page: 1, num: 1000, total: 1000 },
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
      pagination,
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
    >,
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
      'SELECT * FROM email_property_type WHERE document_property_type_id = $1',
      [recordId],
    ];
  }
  protected getCreateQueryProperties({
    name,
    categoryId,
    createdOn,
  }: EmailPropertyType): [
    string,
    [
      string,
      number | EmailPropertyCategoryType | EmailPropertyCategoryTypeId,
      Date,
    ],
  ] {
    return [
      `INSERT INTO email_property_type (property_name, email_property_category_id, created_at) VALUES ($1, $2, $3) RETURNING *`,
      [name, categoryId, createdOn],
    ];
  }
  protected getUpdateQueryProperties({
    categoryId,
    name,
    createdOn,
  }: EmailPropertyType): [
    {
      email_property_category_id: number;
      property_name: string;
      created_at: Date | undefined;
    },
  ] {
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
