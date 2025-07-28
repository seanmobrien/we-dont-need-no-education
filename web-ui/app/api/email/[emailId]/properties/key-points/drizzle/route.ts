import { NextRequest } from 'next/server';
import { extractParams } from '@/lib/nextjs-util';
import { KeyPointsDetails } from '@/data-models';
import { drizDbWithInit } from '@/lib/drizzle-db';
import { schema } from '@/lib/drizzle-db/schema';
import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';
import { buildDrizzleAttachmentOrEmailFilter } from '@/lib/components/mui/data-grid/queryHelpers';
import { DefaultEmailColumnMap } from '@/lib/components/mui/data-grid/server';
import { PgColumn } from 'drizzle-orm/pg-core';

const keyPointColumnMap = {
  ...DefaultEmailColumnMap,
  propertyId: 'property_id',
  emailId: 'email_id',
  documentId: 'document_id',
  relevance: 'relevance',
  compliance: 'compliance',
  severityRanking: 'severity_ranking',
} as const;

export async function GET(
  req: NextRequest,
  args: { params: Promise<{ emailId: string; attachments: boolean }> },
) {
  const { emailId } = await extractParams<{ emailId: string }>(args);

  const db = await drizDbWithInit();

  // Based on the original query, this uses the "KeyPoints" table directly
  // Define the base query that matches the original SQL structure
  const baseQuery = db
    .select()
    .from(schema.keyPoints)
    .where(
      buildDrizzleAttachmentOrEmailFilter({
        attachments: req,
        email_id: emailId,
        email_id_column: schema.keyPoints.emailId,
        document_id_column: schema.keyPoints.documentId,
      })
    );

  // Column getter function for filtering and sorting
  const getColumn = (columnName: string): PgColumn | undefined => {
    switch (columnName) {
      case 'property_id': return schema.keyPoints.propertyId;
      case 'email_id': return schema.keyPoints.emailId;
      case 'document_id': return schema.keyPoints.documentId;
      case 'relevance': return schema.keyPoints.relevance;
      case 'compliance': return schema.keyPoints.compliance;
      case 'severity_ranking': return schema.keyPoints.severityRanking;
      case 'value': return schema.keyPoints.value;
      case 'created_on': return schema.keyPoints.createdOn;
      default: return undefined;
    }
  };

  // Record mapper to transform database records to KeyPointsDetails objects
  const recordMapper = (record: Record<string, unknown>): Partial<KeyPointsDetails> => {
    return {
      propertyId: record.propertyId as string,
      documentId: record.documentId as number,
      createdOn: record.createdOn ? new Date(Date.parse(record.createdOn as string)) : new Date(),
      relevance: record.relevance as number | null,
      compliance: record.compliance as number | null,
      severity: record.severityRanking as number | null,
      inferred: record.inferred as boolean,
      value: record.value as string,
    };
  };

  // Use selectForGrid to apply filtering, sorting, and pagination
  const result = await selectForGrid<Partial<KeyPointsDetails>>({
    req,
    emailId,
    query: baseQuery as any,
    getColumn,
    columnMap: keyPointColumnMap,
    recordMapper,
  });

  return Response.json(result);
}