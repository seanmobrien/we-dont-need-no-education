import { NextRequest } from 'next/server';
import { extractParams } from '@/lib/nextjs-util';
import { EmailProperty } from '@/data-models';
import { eq, and } from 'drizzle-orm';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { schema } from '@/lib/drizzle-db/schema';
import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';
import { DefaultEmailColumnMap } from '@/lib/components/mui/data-grid/server';
import { PgColumn } from 'drizzle-orm/pg-core';

const columnMap = {
  ...DefaultEmailColumnMap,
} as const;

export async function GET(
  req: NextRequest,
  args: { params: Promise<{ emailId: string }> },
) {
  const { emailId } = await extractParams<{ emailId: string }>(args);

  const db = await drizDbWithInit();

  // Define the base query that matches the original SQL structure
  const baseQuery = db
    .select({
      // From document_property (ep)
      propertyId: schema.documentProperty.propertyId,
      propertyValue: schema.documentProperty.propertyValue,
      documentPropertyTypeId: schema.documentProperty.documentPropertyTypeId,
      documentId: schema.documentProperty.documentId,
      createdOn: schema.documentProperty.createdOn,
      policyBasis: schema.documentProperty.policyBasis,
      tags: schema.documentProperty.tags,

      // From email_property_type (ept)
      propertyName: schema.emailPropertyType.propertyName,

      // From email_property_category (epc)
      description: schema.emailPropertyCategory.description,
      emailPropertyCategoryId:
        schema.emailPropertyCategory.emailPropertyCategoryId,
    })
    .from(schema.documentProperty)
    .innerJoin(
      schema.emailPropertyType,
      eq(
        schema.emailPropertyType.documentPropertyTypeId,
        schema.documentProperty.documentPropertyTypeId,
      ),
    )
    .innerJoin(
      schema.emailPropertyCategory,
      eq(
        schema.emailPropertyCategory.emailPropertyCategoryId,
        schema.emailPropertyType.emailPropertyCategoryId,
      ),
    )
    .innerJoin(
      schema.documentUnits,
      eq(
        schema.documentUnits.unitId,
        schema.documentProperty.documentId,
      ),
    )
    .where(
      and(
        eq(schema.documentUnits.emailId, emailId),
        eq(schema.emailPropertyType.emailPropertyCategoryId, 1),
      ),
    );

  // Column getter function for filtering and sorting
  const getColumn = (columnName: string): PgColumn | undefined => {
    switch (columnName) {
      case 'property_id': return schema.documentProperty.propertyId;
      case 'property_value': return schema.documentProperty.propertyValue;
      case 'document_property_type_id': return schema.documentProperty.documentPropertyTypeId;
      case 'document_id': return schema.documentProperty.documentId;
      case 'created_on': return schema.documentProperty.createdOn;
      case 'policy_basis': return schema.documentProperty.policyBasis;
      case 'tags': return schema.documentProperty.tags;
      case 'property_name': return schema.emailPropertyType.propertyName;
      case 'description': return schema.emailPropertyCategory.description;
      case 'email_property_category_id': return schema.emailPropertyCategory.emailPropertyCategoryId;
      default: return undefined;
    }
  };

  // Record mapper to transform database records to EmailProperty objects
  const recordMapper = (record: Record<string, unknown>): Partial<EmailProperty> => {
    return {
      propertyId: record.propertyId as string,
      documentId: record.documentId as number,
      createdOn: new Date(Date.parse(record.createdOn as string)),
      policy_basis: record.policyBasis as string[],
      tags: record.tags as string[],
      value: record.propertyValue as string, // Map propertyValue to value field
    };
  };

  // Use selectForGrid to apply filtering, sorting, and pagination
  const result = await selectForGrid<Partial<EmailProperty>>({
    req,
    emailId, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: baseQuery as any,
    getColumn,
    columnMap,
    recordMapper,
  });

  return Response.json(result);
}