import { NextRequest } from 'next/server';
import { extractParams } from '@/lib/nextjs-util';
import { CallToActionResponseDetails } from '@/data-models';
import { eq, and } from 'drizzle-orm';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { schema } from '@/lib/drizzle-db/schema';
import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';
import { buildDrizzleAttachmentOrEmailFilter } from '@/lib/components/mui/data-grid/queryHelpers';
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
      eq(schema.callToActionResponseDetails.propertyId, schema.documentProperty.propertyId)
    )
    .innerJoin(
      schema.documentUnits,
      eq(schema.documentUnits.unitId, schema.documentProperty.documentId)
    )
    .where(
      and(
        eq(schema.documentProperty.documentPropertyTypeId, 5),
        buildDrizzleAttachmentOrEmailFilter({
          attachments: req,
          email_id: emailId,
          email_id_column: schema.documentUnits.emailId,
          document_id_column: schema.documentProperty.documentId,
        })
      )
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
      case 'response_timestamp': return schema.callToActionResponseDetails.responseTimestamp;
      case 'severity': return schema.callToActionResponseDetails.severity;
      case 'inferred': return schema.callToActionResponseDetails.inferred;
      case 'sentiment': return schema.callToActionResponseDetails.sentiment;
      case 'sentiment_reasons': return schema.callToActionResponseDetails.sentimentReasons;
      case 'severity_reasons': return schema.callToActionResponseDetails.severityReasons;
      default: return undefined;
    }
  };

  // Record mapper to transform database records to CallToActionResponseDetails objects
  const recordMapper = (record: Record<string, unknown>): Partial<CallToActionResponseDetails> => {
    return {
      propertyId: record.propertyId as string,
      documentId: record.documentId as number,
      createdOn: new Date(Date.parse(record.createdOn as string)),
      policy_basis: record.policyBasis as string[],
      tags: record.tags as string[],
      responseTimestamp: record.responseTimestamp ? new Date(Date.parse(record.responseTimestamp as string)) : undefined,
      severity: record.severity as number | undefined,
      inferred: record.inferred as boolean,
      sentiment: record.sentiment as number | undefined,
      sentiment_reasons: record.sentimentReasons as string[],
      severityReasons: record.severityReasons as string[],
      value: record.propertyValue as string, // Map propertyValue to value field
    };
  };

  // Use selectForGrid to apply filtering, sorting, and pagination
  const result = await selectForGrid<Partial<CallToActionResponseDetails>>({
    req,
    emailId,
    query: baseQuery as any,
    getColumn,
    columnMap,
    recordMapper,
  });

  return Response.json(result);
}