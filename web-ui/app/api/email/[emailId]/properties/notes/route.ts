import { NextRequest } from 'next/server';
import { RepositoryCrudController } from '@/lib/api';
import { extractParams } from '@/lib/nextjs-util';
import { NotesRepository } from '@/lib/api/email/properties/notes/notes-repository';
import { EmailProperty } from '@/data-models';
import { eq, and, ne } from 'drizzle-orm';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { schema } from '@/lib/drizzle-db/schema';
import { DrizzleSelectQuery, getEmailColumn, selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';
import { buildDrizzleAttachmentOrEmailFilter } from '@/lib/components/mui/data-grid/queryHelpers';
import { PgColumn } from 'drizzle-orm/pg-core';

const repository = new NotesRepository();
const controller = new RepositoryCrudController(repository);

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
      eq(schema.documentUnits.unitId, schema.documentProperty.documentId),
    )
    .where(
      and(
        eq(schema.emailPropertyCategory.emailPropertyCategoryId, 3),
        ne(schema.documentProperty.documentPropertyTypeId, 9),
        buildDrizzleAttachmentOrEmailFilter({
          attachments: req,
          email_id: emailId,
          email_id_column: schema.documentUnits.emailId,
          document_id_column: schema.documentProperty.documentId,
        }),
      ),
    );

  // Column getter function for filtering and sorting
  const getColumn = (columnName: string): PgColumn | undefined => {
    return getEmailColumn({ columnName, table: schema.documentProperty });
  };

  // Record mapper to transform database records to EmailProperty objects
  const recordMapper = (
    record: Record<string, unknown>,
  ): Partial<EmailProperty> => {
    return {
      propertyId: record.propertyId as string,
      documentId: record.documentId as number,
      createdOn: new Date(Date.parse(record.createdOn as string)),
      policy_basis: record.policyBasis as string[],
      typeName: record.description as string,
      tags: record.tags as string[],
      value: record.propertyValue as string, // Map propertyValue to value field
    };
  };

  // Use selectForGrid to apply filtering, sorting, and pagination
  const result = await selectForGrid<Partial<EmailProperty>>({
    req,
    emailId,
    query: baseQuery as unknown as DrizzleSelectQuery,
    getColumn,
    recordMapper,
  });

  return Response.json(result);
};

export async function POST(
  req: NextRequest,
  args: { params: Promise<{ emailId: string; propertyId: string }> },
) {
  return controller.create(req, args);
}
