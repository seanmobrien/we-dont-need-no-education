import { NextRequest } from 'next/server';
import {
  buildFallbackGrid,
  wrapRouteRequest,
  extractParams,
} from '@compliance-theater/nextjs/server/utils';
import { KeyPointsDetails } from '@/data-models/api/email-properties/extended-properties';
import { drizDbWithInit } from '@compliance-theater/database/orm';
import { schema } from '@compliance-theater/database/orm';
import { selectForGrid } from '@/lib/components/mui/data-grid/queryHelpers';
import { buildDrizzleAttachmentOrEmailFilter } from '@/lib/components/mui/data-grid/queryHelpers';
import { PgColumn } from 'drizzle-orm/pg-core';
import {
  checkCaseFileAuthorization,
  CaseFileScope,
} from '@compliance-theater/auth/lib/resources/case-file';
import { unauthorizedServiceResponse } from '@compliance-theater/nextjs/server/unauthorized-service-response';

export const GET = wrapRouteRequest(
  async (req: NextRequest, args: { params: Promise<{ emailId: string }> }) => {
    const { emailId } = await extractParams<{ emailId: string }>(args);

    // Check case file authorization
    const authCheck = await checkCaseFileAuthorization(req, emailId, {
      requiredScope: CaseFileScope.READ,
    });
    if (!authCheck.authorized) {
      return (
        authCheck.response ??
        unauthorizedServiceResponse({ req, scopes: ['case-file:read'] })
      );
    }

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
        }),
      );

    // Column getter function for filtering and sorting
    const getColumn = (columnName: string): PgColumn | undefined => {
      switch (columnName) {
        case 'property_id':
          return schema.keyPoints.propertyId;
        case 'email_id':
          return schema.keyPoints.emailId;
        case 'document_id':
          return schema.keyPoints.documentId;
        case 'relevance':
          return schema.keyPoints.relevance;
        case 'compliance':
          return schema.keyPoints.compliance;
        case 'severity_ranking':
          return schema.keyPoints.severityRanking;
        case 'value':
          return schema.keyPoints.propertyValue;
        case 'created_on':
          return schema.keyPoints.sentTimestamp;

        case 'tags':
          return schema.keyPoints.tags;
        case 'policy_basis':
          return schema.keyPoints.policyBasis;
        default:
          return columnName in schema.keyPoints
            ? (schema.keyPoints[
                columnName as keyof typeof schema.keyPoints
              ] as PgColumn)
            : undefined;
      }
    };

    // Record mapper to transform database records to KeyPointsDetails objects
    const recordMapper = (
      record: Record<string, unknown>,
    ): Partial<KeyPointsDetails> => {
      return {
        propertyId: record.propertyId as string,
        documentId: record.documentId as number,
        createdOn: record.createdOn
          ? new Date(Date.parse(record.createdOn as string))
          : new Date(),
        relevance: record.relevance as number | null,
        compliance: record.compliance as number | null,
        severity: record.severityRanking as number | null,
        inferred: record.inferred as boolean,
        value: record.propertyValue as string,
        policy_basis: record.policyBasis as string[] | undefined,
        tags: record.tags as string[] | undefined,
      };
    };

    // Use selectForGrid to apply filtering, sorting, and pagination
    const result = await selectForGrid<Partial<KeyPointsDetails>>({
      req,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      query: baseQuery as any,
      getColumn,
      recordMapper,
    });

    return Response.json(result);
  },
  { buildFallback: buildFallbackGrid },
);
