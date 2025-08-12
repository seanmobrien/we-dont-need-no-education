import { NextRequest } from 'next/server';
import { buildFallbackGrid, wrapRouteRequest } from '@/lib/nextjs-util/server/utils';
import {
  RepositoryCrudController,
  CallToActionResponseDetailsRepository,
} from '@/lib/api';
import { extractParams } from '@/lib/nextjs-util';
import { CallToActionResponseDetails } from '@/data-models';
import { eq, and, sql } from 'drizzle-orm';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { schema } from '@/lib/drizzle-db/schema';
import { getEmailColumn, selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';
import { buildDrizzleAttachmentOrEmailFilter } from '@/lib/components/mui/data-grid/queryHelpers';
import { DefaultEmailColumnMap } from '@/lib/components/mui/data-grid/server';
import { PgColumn } from 'drizzle-orm/pg-core';

const repository = new CallToActionResponseDetailsRepository();
const controller = new RepositoryCrudController(repository);
const columnMap = {
  ...DefaultEmailColumnMap,
} as const;

export const dynamic = 'force-dynamic';

export const GET = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ emailId: string }> },
) => {
  const { emailId } = await extractParams<{ emailId: string }>(args);

  const db = await drizDbWithInit();

  // Define the base query that matches the original SQL structure
  // Query from call_to_action_details_call_to_action_response, joining necessary tables.
  // Includes average of compliance_chapter_13 and aggregates all compliance_chapter_13_reasons into an array.
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
      // Aggregated fields from call_to_action_details_call_to_action_response
      compliance_average_chapter_13:
        sql`(SELECT AVG("call_to_action_details_call_to_action_response".compliance_chapter_13) FROM "call_to_action_details_call_to_action_response" WHERE "call_to_action_details_call_to_action_response".call_to_action_response_id = "document_property".property_id )`.as('compliance_average_chapter_13'),
      compliance_chapter_13_reasons:
        sql`(SELECT array_agg(reasons_raw_chapter_13) AS compliance_chapter_13_reasons FROM (
              SELECT UNNEST(car.compliance_chapter_13_reasons) AS reasons_raw_chapter_13
              FROM call_to_action_details_call_to_action_response car
              WHERE car.call_to_action_response_id=document_property.property_id
            ) sub)`.as('compliance_chapter_13_reasons'),
      // From call_to_action_response_details (ctar)
      responseTimestamp: schema.callToActionResponseDetails.responseTimestamp,
      severity: schema.callToActionResponseDetails.severity,
      inferred: schema.callToActionResponseDetails.inferred,
      sentiment: schema.callToActionResponseDetails.sentiment,
      sentimentReasons: schema.callToActionResponseDetails.sentimentReasons,
      severityReasons: schema.callToActionResponseDetails.severityReasons,
    })
    .from(schema.documentProperty)
    .innerJoin(
      schema.callToActionResponseDetails,
      eq(
        schema.callToActionResponseDetails.propertyId,
        schema.documentProperty.propertyId,
      ),
    )
    .innerJoin(
      schema.documentUnits,
      eq(schema.documentUnits.unitId, schema.documentProperty.documentId),
    )

    .where(
      and(
        eq(schema.documentProperty.documentPropertyTypeId, 5),
        buildDrizzleAttachmentOrEmailFilter({
          attachments: req,
          email_id: emailId,
          email_id_column: schema.documentUnits.emailId,
          document_id_column: schema.documentProperty.documentId,
        }),
      ),
    )
    .groupBy(
      schema.documentProperty.propertyId,
      schema.documentProperty.propertyValue,
      schema.documentProperty.documentPropertyTypeId,
      schema.documentProperty.documentId,
      schema.documentProperty.createdOn,
      schema.documentProperty.policyBasis,
      schema.documentProperty.tags,
      schema.callToActionResponseDetails.responseTimestamp,
      schema.callToActionResponseDetails.severity,
      schema.callToActionResponseDetails.inferred,
      schema.callToActionResponseDetails.sentiment,
      schema.callToActionResponseDetails.sentimentReasons,
      schema.callToActionResponseDetails.severityReasons,
    );

  // Column getter function for filtering and sorting
  const getColumn = (columnName: string): PgColumn | undefined =>
    getEmailColumn({ columnName, table: schema.callToActionResponseDetails });

  // Record mapper to transform database records to CallToActionResponseDetails objects
  const recordMapper = (record: Record<string, unknown>): Partial<CallToActionResponseDetails> => {
    return {
      propertyId: record.propertyId as string,
      documentId: record.documentId as number,
      createdOn: new Date(Date.parse(record.createdOn as string)),
      policy_basis: record.policyBasis as string[],
      tags: record.tags as string[],
      responseTimestamp: record.responseTimestamp
        ? new Date(Date.parse(record.responseTimestamp as string))
        : undefined,
      severity: record.severity as number | undefined,
      inferred: record.inferred as boolean,
      sentiment: record.sentiment as number | undefined,
      sentiment_reasons: record.sentimentReasons as string[],
      severity_reasons: record.severityReasons as string[],
      compliance_average_chapter_13: record.compliance_average_chapter_13 as
        | number
        | undefined,
      compliance_chapter_13_reasons: record.compliance_chapter_13_reasons as
        | string[]
        | undefined,
      value: record.propertyValue as string, // Map propertyValue to value field
    };
  };

  // Use selectForGrid to apply filtering, sorting, and pagination
  const result = await selectForGrid<Partial<CallToActionResponseDetails>>({
    req,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query: baseQuery as any,
    getColumn,
    columnMap,
    recordMapper,
  });

  return Response.json(result);
}, { buildFallback: buildFallbackGrid });

export const POST = wrapRouteRequest(async (
  req: NextRequest,
  args: { params: Promise<{ emailId: string; propertyId: string }> },
) => {
  return controller.create(req, args);
});
