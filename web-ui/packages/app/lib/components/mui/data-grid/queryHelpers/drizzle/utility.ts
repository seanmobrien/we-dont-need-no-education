import { schema } from '@compliance-theater/database/orm';
import { isKeyOf } from '@compliance-theater/typescript';
import { toCamelCase } from 'drizzle-orm/casing';
import { PgColumn, PgTable, TableConfig } from 'drizzle-orm/pg-core';

export const DefaultDrizzleEmailColumnMap = {
  propertyValue: 'property_value',
  propertyName: 'property_name',
};

export type DrizzleColumnCallback<
  TSchema extends PgTable<TTableConfig>,
  TTableConfig extends TableConfig = TableConfig,
  TOptions extends {
    columnName: keyof TSchema | Omit<string, keyof TSchema>;
  } = { columnName: keyof TSchema | Omit<string, keyof TSchema> }
> = (options: TOptions) => PgColumn | undefined;

export const getEmailColumn = <
  TSchema extends PgTable<TTableConfig>,
  TTableConfig extends TableConfig = TableConfig
>({
  columnName,
  table,
}: {
  columnName: keyof TSchema | Omit<string, keyof TSchema>;
  table: TSchema;
}): PgColumn | undefined => {
  switch (columnName) {
    case 'email_id':
      return schema.documentUnits.emailId as unknown as PgColumn;
    case 'property_id':
      return schema.documentProperty.propertyId as unknown as PgColumn;
    case 'property_value':
    case 'value':
      return schema.documentProperty.propertyValue as unknown as PgColumn;
    case 'document_property_type_id':
    case 'typeId':
      return schema.documentProperty.documentPropertyTypeId as unknown as PgColumn;
    case 'document_id':
      return schema.documentProperty.documentId as unknown as PgColumn;
    case 'created_on':
      return schema.documentProperty.createdOn as unknown as PgColumn;
    case 'policy_basis':
      return schema.documentProperty.policyBasis as unknown as PgColumn;
    case 'tags':
      return schema.documentProperty.tags as unknown as PgColumn;
    case 'property_name':
      return schema.emailPropertyType.propertyName as unknown as PgColumn;
    case 'description':
      return schema.emailPropertyCategory.description as unknown as PgColumn;
    case 'email_property_category_id':
      return schema.emailPropertyCategory.emailPropertyCategoryId as unknown as PgColumn;
    case 'compliance_chapter_13_reasons':
      return isKeyOf('complianceChapter13Reasons', table)
        ? (table['complianceChapter13Reasons' as keyof TSchema] as PgColumn)
        : isKeyOf('compliance_chapter_13_reasons', table)
        ? (table['compliance_chapter_13_reasons' as keyof TSchema] as PgColumn)
        : isKeyOf('complianceChapter13Reasons', table)
        ? (table['complianceChapter13Reasons' as keyof TSchema] as PgColumn)
        : undefined;
    case 'compliance_average_chapter_13':
      return isKeyOf('compliance_average_chapter_13', table)
        ? (table['compliance_average_chapter_13' as keyof TSchema] as PgColumn)
        : isKeyOf('compliance_chapter_13', table)
        ? (table['compliance_chapter_13' as keyof TSchema] as PgColumn)
        : isKeyOf('complianceAverageChapter13', table)
        ? (table['complianceAverageChapter13' as keyof TSchema] as PgColumn)
        : undefined;
    default:
      // First try no normalization
      if (isKeyOf(columnName, table)) {
        return table[columnName] as PgColumn;
      }
      // Then try snake-to-camel case
      const camelCase = toCamelCase(String(columnName));
      if (isKeyOf(camelCase, table)) {
        return table[camelCase] as PgColumn;
      }
      return undefined;
  }
};
